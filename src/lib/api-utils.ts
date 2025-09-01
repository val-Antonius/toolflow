import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import type { InputJsonValue } from '@prisma/client/runtime/library'
import type { NullableJsonNullValueInput } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// Query Parameter Types
export type QueryParamValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryParamValue>

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Database Error Type
export interface DatabaseError extends Error {
  code?: string
  meta?: Record<string, unknown>
}

// Activity Log Data Types
export type ActivityEntityType = 'TOOL' | 'MATERIAL' | 'BORROWING_TRANSACTION' | 'CONSUMPTION_TRANSACTION' | 'USER' | 'CATEGORY'
export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'BORROW' | 'RETURN' | 'CONSUME' | 'EXTEND'
export type ActivityData = InputJsonValue | NullableJsonNullValueInput | undefined

// Error Response Helper
export function errorResponse(message: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  )
}

// Helper to convert Decimal fields to numbers for JSON serialization
function convertDecimalFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj

  if (Array.isArray(obj)) {
    return obj.map(convertDecimalFields)
  }

  if (typeof obj === 'object' && obj !== null && obj.constructor === Object) {
    const converted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Convert Decimal objects to numbers
      if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as Decimal).toNumber === 'function') {
        converted[key] = Number((value as Decimal).toNumber())
      } else if (typeof value === 'object') {
        converted[key] = convertDecimalFields(value)
      } else {
        converted[key] = value
      }
    }
    return converted
  }

  return obj
}

// Success Response Helper
export function successResponse<T>(
  data: T,
  message?: string,
  pagination?: ApiResponse['pagination']
): NextResponse<ApiResponse<T>> {
  // Convert Decimal fields to numbers for JSON serialization
  let convertedData = convertDecimalFields(data) as T
  // Ensure payload is always an object (never null)
  if (convertedData === null || convertedData === undefined) {
    convertedData = {} as T;
  }
  return NextResponse.json({
    success: true,
    data: convertedData,
    message,
    pagination,
  })
}

// Validation Helper
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return {
        success: false,
        response: errorResponse(`Validation error: ${errorMessage}`, 422)
      }
    }
    return {
      success: false,
      response: errorResponse('Invalid request body', 400)
    }
  }
}

// Query Parameters Helper
export function getQueryParams(request: NextRequest): QueryParams {
  const { searchParams } = new URL(request.url)
  const params: QueryParams = {}

  searchParams.forEach((value, key) => {
    // Convert numeric strings to numbers
    if (!isNaN(Number(value)) && value !== '') {
      params[key] = Number(value)
    } else if (value === 'true' || value === 'false') {
      params[key] = value === 'true'
    } else {
      params[key] = value
    }
  })

  return params
}

// Pagination Helper
export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

// Database Error Handler
export function handleDatabaseError(error: unknown): NextResponse<ApiResponse> {
  console.error('Database error:', error)

  const dbError = error as DatabaseError

  // Prisma specific errors
  if (dbError.code === 'P2002') {
    return errorResponse('A record with this information already exists', 409)
  }

  if (dbError.code === 'P2025') {
    return errorResponse('Record not found', 404)
  }

  if (dbError.code === 'P2003') {
    return errorResponse('Related record not found', 400)
  }

  // Database connection errors
  if (dbError.code === 'P1001') {
    return errorResponse('Database connection failed', 503)
  }

  if (dbError.code === 'P1008') {
    return errorResponse('Database operation timeout', 504)
  }

  // Generic database errors
  if (dbError.message && dbError.message.includes('connect')) {
    return errorResponse('Database connection error', 503)
  }

  if (dbError.message && dbError.message.includes('timeout')) {
    return errorResponse('Database operation timeout', 504)
  }

  return errorResponse('Internal server error', 500)
}

// Activity Logger
export async function logActivity(
  entityType: ActivityEntityType,
  entityId: string,
  action: ActivityAction,
  actorName?: string,
  oldValues?: ActivityData,
  newValues?: ActivityData,
  metadata?: ActivityData
) {
  try {
    // Safe JSON serialization helper
    const safeSerialize = (obj: ActivityData): ActivityData => {
      if (!obj) return Prisma.DbNull as NullableJsonNullValueInput;
      try {
        // Remove circular references and non-serializable data
        const cleaned = JSON.parse(JSON.stringify(obj, (_key: string, value: unknown) => {
          // Skip functions, undefined, and symbols
          if (typeof value === 'function' || typeof value === 'undefined' || typeof value === 'symbol') {
            return undefined;
          }
          // Skip circular references (basic check)
          if (typeof value === 'object' && value !== null) {
            if (value.constructor && value.constructor.name === 'Date') {
              return (value as Date).toISOString();
            }
          }
          return value;
        }));
        return cleaned;
      } catch (error) {
        console.error('Error serializing object for activity log:', error);
        return { error: 'Serialization failed', type: typeof obj };
      }
    };

    await prisma.activityLog.create({
      data: {
        entityType,
        entityId,
        action,
        actorName: actorName || 'System',
        oldValues: oldValues ? safeSerialize(oldValues) : undefined,
        newValues: newValues ? safeSerialize(newValues) : undefined,
        metadata: metadata ? safeSerialize(metadata) : undefined,
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
    // Don't throw error to prevent breaking the main operation
  }
}

// Search Helper
export function buildSearchFilter(search?: string, fields: string[] = ['name']) {
  if (!search) return {}

  return {
    OR: fields.map(field => ({
      [field]: {
        contains: search,
        mode: 'insensitive' as const,
      },
    })),
  }
}

// Sort Helper
export function buildSortOrder(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  if (!sortBy) return { createdAt: sortOrder }

  return { [sortBy]: sortOrder }
}

// Check if tool is available for borrowing
export async function checkToolAvailability(toolId: string, requestedQuantity: number) {
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { availableQuantity: true, totalQuantity: true, name: true },
  })

  if (!tool) {
    throw new Error('Tool not found')
  }

  if (tool.availableQuantity < requestedQuantity) {
    throw new Error(`Insufficient quantity for ${tool.name}. Available: ${tool.availableQuantity}, Requested: ${requestedQuantity}`)
  }

  return tool
}

// Check if material has sufficient stock
export async function checkMaterialStock(materialId: string, requestedQuantity: number) {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { currentQuantity: true, name: true, unit: true },
  })

  if (!material) {
    throw new Error('Material not found')
  }

  if (Number(material.currentQuantity) < requestedQuantity) {
    throw new Error(`Insufficient stock for ${material.name}. Available: ${material.currentQuantity} ${material.unit}, Requested: ${requestedQuantity} ${material.unit}`)
  }

  return material
}
