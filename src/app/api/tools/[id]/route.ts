import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateToolSchema } from '@/lib/validations'
import { Tool } from '@prisma/client'
import {
  successResponse,
  errorResponse,
  validateRequest,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

// GET /api/tools/[id] - Get tool by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        category: {
          select: { name: true, type: true }
        },
        borrowingItems: {
          where: {
            borrowingTransaction: {
              status: { in: ['ACTIVE', 'OVERDUE'] }
            }
          },
          include: {
            borrowingTransaction: true
          }
        },
        _count: {
          select: {
            borrowingItems: true
          }
        }
      },
    })

    if (!tool) {
      return errorResponse('Tool not found', 404)
    }

    return successResponse({
      ...tool,
      hasActiveBorrowing: tool._count.borrowingItems > 0,
      borrowedQuantity: Number(tool.totalQuantity) - Number(tool.availableQuantity),
    })
  } catch (error) {
    console.error('Error fetching tool:', error)
    return handleDatabaseError(error)
  }
}

// PUT /api/tools/[id] - Update tool
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validation = await validateRequest(request, UpdateToolSchema)
    if (!validation.success) {
      return validation.response
    }

    // Get existing tool
    const existingTool: Tool | null = await prisma.tool.findUnique({
      where: { id },
    })

    if (!existingTool) {
      return errorResponse('Tool not found', 404)
    }

    const data = validation.data

    // Verify category exists and is of type TOOL if categoryId is being updated
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      })

      if (!category) {
        return errorResponse('Category not found', 404)
      }

      if (category.type !== 'TOOL') {
        return errorResponse('Category must be of type TOOL', 400)
      }
    }

    // Business logic validation
    if (data.totalQuantity !== undefined || data.availableQuantity !== undefined) {
      const newTotalQuantity = data.totalQuantity !== undefined ? Number(data.totalQuantity) : Number(existingTool.totalQuantity)
      const newAvailableQuantity = data.availableQuantity !== undefined ? Number(data.availableQuantity) : Number(existingTool.availableQuantity)

      // Check if available quantity doesn't exceed total quantity
      if (newAvailableQuantity > newTotalQuantity) {
        return errorResponse('Available quantity cannot exceed total quantity', 400)
      }

      // Check if reducing total quantity below borrowed amount
      const borrowedQuantity = Number(existingTool.totalQuantity) - Number(existingTool.availableQuantity)
      if (newTotalQuantity < borrowedQuantity) {
        return errorResponse(
          `Cannot reduce total quantity below borrowed amount (${borrowedQuantity} currently borrowed)`,
          400
        )
      }

      // Adjust available quantity if total quantity is reduced
      if (data.totalQuantity !== undefined && data.availableQuantity === undefined) {
        data.availableQuantity = newTotalQuantity - borrowedQuantity
      }
    }

    // Update tool
    const updatedTool = await prisma.tool.update({
      where: { id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
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
    await logActivity('TOOL', id, 'UPDATE', undefined, existingTool, updatedTool)

    return successResponse({
      ...updatedTool,
      hasActiveBorrowing: updatedTool._count.borrowingItems > 0,
      borrowedQuantity: Number(updatedTool.totalQuantity) - Number(updatedTool.availableQuantity),
    }, 'Tool updated successfully')
  } catch (error) {
    console.error('Error updating tool:', error)
    return handleDatabaseError(error as unknown)
  }
}

// DELETE /api/tools/[id] - Delete tool
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if tool exists
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
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

    if (!tool) {
      return errorResponse('Tool not found', 404)
    }

    // Check if tool has active borrowings
    if (tool._count.borrowingItems > 0) {
      return errorResponse(
        'Cannot delete tool. It has active borrowings.',
        400
      )
    }

    // Delete tool
    await prisma.tool.delete({
      where: { id },
    })

    // Log activity
    await logActivity('TOOL', id, 'DELETE', undefined, tool, undefined)

    return successResponse({}, 'Tool deleted successfully')
  } catch (error) {
    console.error('Error deleting tool:', error)
    return handleDatabaseError(error as unknown)
  }
}
