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
import { generateToolDisplayId, generateUnitDisplayId } from '@/lib/display-id-utils'

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

    // Note: condition filter now needs to be handled through units
    // if (condition && ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].includes(condition)) {
    //   where.units = {
    //     some: {
    //       condition: condition as any
    //     }
    //   }
    // }

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
          units: {
            select: {
              id: true,
              unitNumber: true,
              condition: true,
              isAvailable: true,
              notes: true
            }
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

    // Add computed fields and unit display IDs
    let toolsWithStatus = tools.map(tool => ({
      ...tool,
      hasActiveBorrowing: tool._count.borrowingItems > 0,
      borrowedQuantity: tool.totalQuantity - tool.availableQuantity,
      // Add displayId to each unit
      units: tool.units?.map(unit => ({
        ...unit,
        displayId: tool.displayId ? generateUnitDisplayId(tool.displayId, unit.unitNumber) : `U${unit.unitNumber.toString().padStart(2, '0')}`
      })) || []
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

    // Verify category exists and is one of the 3 allowed
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })

    if (!category || !['Peralatan Lapangan', 'Peralatan Kantor', 'Peralatan Jaringan'].includes(category.name)) {
      return errorResponse('Category not found or not allowed', 404)
    }

    if (category.type !== 'TOOL') {
      return errorResponse('Category must be of type TOOL', 400)
    }

    // Generate display ID
    const displayId = await generateToolDisplayId();

    // Create tool with units
    const tool = await prisma.$transaction(async (tx) => {
      const createdTool = await tx.tool.create({
        data: {
          displayId,
          name: data.name,
          categoryId: data.categoryId,
          totalQuantity: data.totalQuantity,
          availableQuantity: data.totalQuantity, // Initially all units are available
          location: data.location,
          supplier: data.supplier,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          purchasePrice: data.purchasePrice,
          notes: data.notes,
        }
      });

      // Create units for the tool
      const units = [];
      for (let i = 1; i <= data.totalQuantity; i++) {
        const unit = await tx.toolUnit.create({
          data: {
            toolId: createdTool.id,
            unitNumber: i,
            condition: 'GOOD', // Default condition
            isAvailable: true
          }
        });
        units.push(unit);
      }

      return {
        ...createdTool,
        units
      };
    });

    // Fetch the complete tool with relations
    const completeToolData = await prisma.tool.findUnique({
      where: { id: tool.id },
      include: {
        category: {
          select: { name: true, type: true }
        },
        units: {
          select: {
            id: true,
            unitNumber: true,
            condition: true,
            isAvailable: true,
            notes: true
          }
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
    await logActivity('TOOL', tool.id, 'CREATE', undefined, undefined, completeToolData)

    return successResponse({
      ...completeToolData,
      hasActiveBorrowing: completeToolData?._count.borrowingItems > 0,
      borrowedQuantity: (completeToolData?.totalQuantity || 0) - (completeToolData?.availableQuantity || 0),
      // Add displayId to each unit in response
      units: completeToolData?.units?.map(unit => ({
        ...unit,
        displayId: completeToolData.displayId ? generateUnitDisplayId(completeToolData.displayId, unit.unitNumber) : `U${unit.unitNumber.toString().padStart(2, '0')}`
      })) || []
    }, 'Tool created successfully')
  } catch (error) {
    console.error('Error creating tool:', error)
    return handleDatabaseError(error)
  }
}
