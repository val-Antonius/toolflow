import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

// GET /api/borrowings/[id] - Get borrowing transaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const borrowing = await prisma.borrowingTransaction.findUnique({
      where: { id },
      include: {
        borrowingItems: {
          include: {
            tool: {
              select: {
                id: true,
                name: true,
                condition: true,
                category: { select: { name: true } },
                location: true
              }
            }
          }
        }
      },
    })

    if (!borrowing) {
      return errorResponse('Borrowing transaction not found', 404)
    }

    // Add computed fields
    const now = new Date()
    const isOverdue = borrowing.status === 'ACTIVE' && borrowing.dueDate < now
    const daysOverdue = isOverdue ? Math.floor((now.getTime() - borrowing.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

    const enrichedBorrowing = {
      ...borrowing,
      isOverdue,
      daysOverdue,
      totalItems: (borrowing.borrowingItems || []).reduce((sum: number, item: any) => sum + item.quantity, 0),
      itemsReturned: (borrowing.borrowingItems || []).filter((item: any) => item.returnDate).length,
      canExtend: borrowing.status === 'ACTIVE' && !isOverdue
    }

    return successResponse(enrichedBorrowing)
  } catch (error) {
    console.error('Error fetching borrowing:', error)
    return handleDatabaseError(error)
  }
}

// PUT /api/borrowings/[id] - Update borrowing transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    // Get existing borrowing
    const existingBorrowing = await prisma.borrowingTransaction.findUnique({
      where: { id },
      include: {
        borrowingItems: true
      }
    })

    if (!existingBorrowing) {
      return errorResponse('Borrowing transaction not found', 404)
    }

    // Validate status transition
    if (status && !['ACTIVE', 'OVERDUE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return errorResponse('Invalid status', 400)
    }

    // Update borrowing
    const updatedBorrowing = await prisma.borrowingTransaction.update({
      where: { id },
      data: {
        status,
        notes,
        updatedAt: new Date(),
      },
      include: {
        borrowingItems: {
          include: {
            tool: {
              select: { id: true, name: true, condition: true }
            }
          }
        }
      },
    })

    // Log activity
    await logActivity(
      'BORROWING_TRANSACTION',
      id,
      'UPDATE',
      undefined,
      existingBorrowing,
      updatedBorrowing
    )

    return successResponse(updatedBorrowing, 'Borrowing transaction updated successfully')
  } catch (error) {
    console.error('Error updating borrowing:', error)
    return handleDatabaseError(error)
  }
}

// DELETE /api/borrowings/[id] - Cancel borrowing transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Get existing borrowing
    const borrowing = await prisma.borrowingTransaction.findUnique({
      where: { id },
      include: {
        borrowingItems: {
          where: { returnDate: null } // Only unreturned items
        }
      }
    })

    if (!borrowing) {
      return errorResponse('Borrowing transaction not found', 404)
    }

    if (borrowing.status === 'COMPLETED') {
      return errorResponse('Cannot cancel completed borrowing', 400)
    }

    if (borrowing.status === 'CANCELLED') {
      return errorResponse('Borrowing already cancelled', 400)
    }

    // Cancel borrowing and restore tool availability
    await prisma.$transaction(async (tx) => {
      // Update borrowing status
      await tx.borrowingTransaction.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      })

      // Restore tool availability for unreturned items
      for (const item of borrowing.borrowingItems) {
        await tx.tool.update({
          where: { id: item.toolId },
          data: {
            availableQuantity: {
              increment: item.quantity
            }
          },
        })
      }
    })

    // Log activity
    await logActivity(
      'BORROWING_TRANSACTION',
      id,
      'DELETE',
      undefined,
      borrowing,
      undefined,
      { reason: 'Cancelled', restoredItems: borrowing.borrowingItems.length }
    )

    return successResponse(null, 'Borrowing transaction cancelled successfully')
  } catch (error) {
    console.error('Error cancelling borrowing:', error)
    return handleDatabaseError(error)
  }
}
