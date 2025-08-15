import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ExtendBorrowingSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  validateRequest,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

// POST /api/borrowings/[id]/extend - Extend due date of borrowing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validation = await validateRequest(request, ExtendBorrowingSchema)
    if (!validation.success) {
      return validation.response
    }

    const { newDueDate, reason } = validation.data

    // Get existing borrowing
    const borrowing = await prisma.borrowingTransaction.findUnique({
      where: { id },
      include: {
        borrowingItems: {
          include: {
            tool: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!borrowing) {
      return errorResponse('Borrowing transaction not found', 404)
    }

    if (borrowing.status !== 'ACTIVE' && borrowing.status !== 'OVERDUE') {
      return errorResponse('Can only extend active or overdue borrowings', 400)
    }

    const newDate = new Date(newDueDate)
    const currentDate = new Date()

    // Validate new due date
    if (newDate <= currentDate) {
      return errorResponse('New due date must be in the future', 400)
    }

    if (newDate <= borrowing.dueDate) {
      return errorResponse('New due date must be later than current due date', 400)
    }

    // Check if extension is reasonable (not more than 30 days from now)
    const maxExtensionDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    if (newDate > maxExtensionDate) {
      return errorResponse('Extension cannot be more than 30 days from today', 400)
    }

    // Update borrowing
    const updatedBorrowing = await prisma.borrowingTransaction.update({
      where: { id },
      data: {
        dueDate: newDate,
        status: 'ACTIVE', // Reset to ACTIVE if it was OVERDUE
        notes: borrowing.notes
          ? `${borrowing.notes}\n\nExtended on ${currentDate.toLocaleDateString()}: ${reason}`
          : `Extended on ${currentDate.toLocaleDateString()}: ${reason}`,
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
      'EXTEND',
      borrowing.borrowerName,
      borrowing,
      updatedBorrowing,
      {
        oldDueDate: borrowing.dueDate,
        newDueDate: newDate,
        reason,
        extensionDays: Math.ceil((newDate.getTime() - borrowing.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    )

    // Add computed fields
    const enrichedBorrowing = {
      ...updatedBorrowing,
      isOverdue: false,
      daysOverdue: 0,
      totalItems: (updatedBorrowing.borrowingItems || []).reduce((sum: number, item: any) => sum + item.quantity, 0),
      itemsReturned: (updatedBorrowing.borrowingItems || []).filter((item: any) => item.returnDate).length,
      canExtend: true
    }

    return successResponse(enrichedBorrowing, 'Due date extended successfully')
  } catch (error) {
    console.error('Error extending borrowing:', error)
    return handleDatabaseError(error)
  }
}
