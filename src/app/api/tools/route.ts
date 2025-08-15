import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateToolSchema } from '@/lib/validations'
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

// GET /api/tools - Get all tools with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const search = searchParams.get('search') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const condition = searchParams.get('condition') || undefined
    const availability = searchParams.get('availability') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Build filters
    const where: any = {
      ...buildSearchFilter(search, ['name', 'supplier', 'location']),
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (condition && ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].includes(condition)) {
      where.condition = condition
    }

    if (availability === 'available') {
      where.availableQuantity = { gt: 0 }
    } else if (availability === 'unavailable') {
      where.availableQuantity = 0
    } else if (availability === 'borrowed') {
      // For borrowed tools, we need to use a different approach
      // We'll handle this in the query result filtering instead
      // since Prisma doesn't support field references in where clauses
    }

    // Get tools with pagination
    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
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
              borrowingItems: {
                where: {
                  borrowingTransaction: {
                    status: { in: ['ACTIVE', 'OVERDUE'] }
                  }
                }
              }
            }
          }
        },
      }),
      prisma.tool.count({ where }),
    ])

    // Add computed fields and filter for borrowed if needed
    let toolsWithStatus = tools.map(tool => ({
      ...tool,
      hasActiveBorrowing: tool._count.borrowingItems > 0,
      borrowedQuantity: tool.totalQuantity - tool.availableQuantity,
    }))

    // Apply borrowed filter if specified (since we can't do it in Prisma where clause)
    if (availability === 'borrowed') {
      toolsWithStatus = toolsWithStatus.filter(tool => tool.availableQuantity < tool.totalQuantity)
    }

    const totalPages = Math.ceil(total / limit)

    return successResponse(toolsWithStatus, undefined, {
      page,
      limit,
      total,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching tools:', error)
    return handleDatabaseError(error)
  }
}

// POST /api/tools - Create new tool
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, CreateToolSchema)
    if (!validation.success) {
      return validation.response
    }

    const data = validation.data

    // Verify category exists and is of type TOOL
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })

    if (!category) {
      return errorResponse('Category not found', 404)
    }

    if (category.type !== 'TOOL') {
      return errorResponse('Category must be of type TOOL', 400)
    }

    // Create tool
    const tool = await prisma.tool.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        condition: data.condition,
        totalQuantity: data.totalQuantity,
        availableQuantity: data.availableQuantity,
        location: data.location,
        supplier: data.supplier,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice,
        notes: data.notes,
      },
      include: {
        category: {
          select: { name: true, type: true }
        },
        _count: {
          select: {
            borrowingItems: {
              where: {
                borrowingTransaction: {
                  status: { in: ['ACTIVE', 'OVERDUE'] }
                }
              }
            }
          }
        }
      },
    })

    // Log activity
    await logActivity('TOOL', tool.id, 'CREATE', undefined, undefined, tool)

    return successResponse({
      ...tool,
      hasActiveBorrowing: tool._count.borrowingItems > 0,
      borrowedQuantity: tool.totalQuantity - tool.availableQuantity,
    }, 'Tool created successfully')
  } catch (error) {
    console.error('Error creating tool:', error)
    return handleDatabaseError(error)
  }
}
