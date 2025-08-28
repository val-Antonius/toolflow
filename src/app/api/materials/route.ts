import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateMaterialSchema } from '@/lib/validations'

import {
  successResponse,
  errorResponse,
  validateRequest,
  handleDatabaseError,
  logActivity,
  buildSearchFilter,
  buildSortOrder,
  getPaginationParams
} from '@/lib/api-utils'

// GET /api/materials - Get all materials with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const search = searchParams.get('search') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const stockStatus = searchParams.get('stockStatus') || undefined
    const unit = searchParams.get('unit') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Build filters
    const where: any = {
      ...buildSearchFilter(search, ['name', 'supplier', 'location', 'unit']),
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (unit) {
      where.unit = unit
    }

    // Stock status filtering - we'll handle low/normal after query
    // since Prisma doesn't support field references in where clauses
    if (stockStatus === 'out') {
      where.currentQuantity = 0
    }

    // Get materials with pagination
    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: buildSortOrder(sortBy, sortOrder),
        skip,
        take: limit,
        include: {
          category: {
            select: { name: true, type: true }
          },
          _count: {
            select: {
              consumptionItems: true
            }
          }
        },
      }),
      prisma.material.count({ where }),
    ])

    // Add computed fields - use Number() for Decimal comparison
    let materialsWithStatus = materials.map(material => {
      const currentQty = Number(material.currentQuantity)
      const thresholdQty = Number(material.thresholdQuantity)

      return {
        ...material,
        isLowStock: currentQty <= thresholdQty,
        stockStatus: currentQty <= 0 ? 'out' :
                    currentQty <= thresholdQty ? 'low' : 'normal',
      }
    })

    // Apply stock status filter if specified (since we can't do it in Prisma where clause)
    if (stockStatus === 'low') {
      materialsWithStatus = materialsWithStatus.filter(material => {
        const currentQty = Number(material.currentQuantity)
        const thresholdQty = Number(material.thresholdQuantity)
        return currentQty <= thresholdQty && currentQty > 0
      })
    } else if (stockStatus === 'normal') {
      materialsWithStatus = materialsWithStatus.filter(material => {
        const currentQty = Number(material.currentQuantity)
        const thresholdQty = Number(material.thresholdQuantity)
        return currentQty > thresholdQty
      })
    }

    const totalPages = Math.ceil(total / limit)

    return successResponse(materialsWithStatus, undefined, {
      page,
      limit,
      total,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching materials:', error)
    return handleDatabaseError(error as any)
  }
}

// POST /api/materials - Create new material
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, CreateMaterialSchema)
    if (!validation.success) {
      return validation.response
    }

    const data = validation.data

    // Verify category exists and is one of the 3 allowed
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })

    if (!category || !['Material Lapangan', 'Material Kantor', 'Material Jaringan'].includes(category.name)) {
      return errorResponse('Category not found or not allowed', 404)
    }

    if (category.type !== 'MATERIAL') {
      return errorResponse('Category must be of type MATERIAL', 400)
    }

    // Create material
    const material = await prisma.material.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        currentQuantity: data.currentQuantity,
        thresholdQuantity: data.thresholdQuantity,
        unit: data.unit,
        location: data.location,
        supplier: data.supplier,
        unitPrice: data.unitPrice,
        notes: data.notes,
      },
      include: {
        category: {
          select: { name: true, type: true }
        },
        _count: {
          select: {
            consumptionItems: true
          }
        }
      },
    })

    // Log activity
    await logActivity('MATERIAL', material.id, 'CREATE', undefined, undefined, material)

    const currentQty = Number(material.currentQuantity)
    const thresholdQty = Number(material.thresholdQuantity)
    return successResponse({
      ...material,
      isLowStock: currentQty <= thresholdQty,
      stockStatus: currentQty <= 0 ? 'out' :
                  currentQty <= thresholdQty ? 'low' : 'normal',
    }, 'Material created successfully')
  } catch (error) {
    console.error('Error creating material:', error)
    return handleDatabaseError(error)
  }
}
