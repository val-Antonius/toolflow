import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { prisma } from './prisma'

// API Response Types
export interface ApiResponse<T = any> {
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

// Error Response Helper
export function errorResponse(message: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  )
}

// Helper to convert Decimal fields to numbers for JSON serialization
function convertDecimalFields(obj: any): any {
  if (obj === null || obj === undefined) return obj

  if (Array.isArray(obj)) {
    return obj.map(convertDecimalFields)
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Convert Decimal objects to numbers
      if (value && typeof value === 'object' && 'toNumber' in value) {
        converted[key] = Number(value)
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
  let convertedData = convertDecimalFields(data)
  // Ensure payload is always an object (never null)
  if (convertedData === null || convertedData === undefined) {
    convertedData = {};
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
export function getQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const params: Record<string, any> = {}

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
export function handleDatabaseError(error: any): NextResponse<ApiResponse> {
  console.error('Database error:', error)

  // Prisma specific errors
  if (error.code === 'P2002') {
    return errorResponse('A record with this information already exists', 409)
  }

  if (error.code === 'P2025') {
    return errorResponse('Record not found', 404)
  }

  if (error.code === 'P2003') {
    return errorResponse('Related record not found', 400)
  }

  // Database connection errors
  if (error.code === 'P1001') {
    return errorResponse('Database connection failed', 503)
  }

  if (error.code === 'P1008') {
    return errorResponse('Database operation timeout', 504)
  }

  // Generic database errors
  if (error.message && error.message.includes('connect')) {
    return errorResponse('Database connection error', 503)
  }

  if (error.message && error.message.includes('timeout')) {
    return errorResponse('Database operation timeout', 504)
  }

  return errorResponse('Internal server error', 500)
}

// Activity Logger
export async function logActivity(
  entityType: 'TOOL' | 'MATERIAL' | 'BORROWING_TRANSACTION' | 'CONSUMPTION_TRANSACTION' | 'USER' | 'CATEGORY',
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BORROW' | 'RETURN' | 'CONSUME' | 'EXTEND',
  actorName?: string,
  oldValues?: any,
  newValues?: any,
  metadata?: any
) {
  try {
    await prisma.activityLog.create({
      data: {
        entityType,
        entityId,
        action,
        actorName,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
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
    select: { availableQuantity: true, totalQuantity: true, name: true, condition: true },
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
