import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateBorrowingSchema } from '@/lib/validations'
import {
  successResponse,
  validateRequest,
  handleDatabaseError,
  logActivity,
  buildSearchFilter,
  buildSortOrder,
  getPaginationParams,
  checkToolAvailability
} from '@/lib/api-utils'
// GET /api/borrowings - Get all borrowing transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Build filters
    const where: any = {
      ...buildSearchFilter(search, ['purpose', 'borrowerName']),
    }
    if (status && ['ACTIVE', 'OVERDUE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status
    }

    // Auto-update overdue status
    await prisma.borrowingTransaction.updateMany({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: new Date() }
      },
      data: { status: 'OVERDUE' }
    })

    // Get borrowings with pagination
    const [borrowings, total] = await Promise.all([
      prisma.borrowingTransaction.findMany({
        where,
        orderBy: buildSortOrder(sortBy, sortOrder),
        skip,
        take: limit,
        include: {
          borrowingItems: {
            include: {
              tool: {
                select: { id: true, name: true, condition: true }
              }
            }
          }
        },
      }),
      prisma.borrowingTransaction.count({ where }),
    ])

    // Add computed fields
    const borrowingsWithStatus = borrowings.map(borrowing => {
      const now = new Date()
      const isOverdue = borrowing.status === 'ACTIVE' && borrowing.dueDate < now
      const daysOverdue = isOverdue ? Math.floor((now.getTime() - borrowing.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      return {
        ...borrowing,
        isOverdue,
        daysOverdue,
        totalItems: borrowing.borrowingItems.reduce((sum, item) => sum + item.quantity, 0),
        itemsReturned: borrowing.borrowingItems.filter(item => item.returnDate).length,
        canExtend: borrowing.status === 'ACTIVE' && !isOverdue
      }
    })

    const totalPages = Math.ceil(total / limit)

    return successResponse(borrowingsWithStatus, undefined, {
      page,
      limit,
      total,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching borrowings:', error)
    return handleDatabaseError(error)
  }
}

// POST /api/borrowings - Create new borrowing transaction
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, CreateBorrowingSchema)
    if (!validation.success) {
      return validation.response
    }

    const { borrowerName, dueDate, purpose, notes, items } = validation.data

    // Check tool availability for all items
    const toolChecks = await Promise.all(
      items.map(async (item) => {
        try {
          const tool = await checkToolAvailability(item.toolId, item.quantity)
          return { ...item, tool }
        } catch (error) {
          throw new Error(`${error}`)
        }
      })
    )

    // Create borrowing transaction
    const borrowing = await prisma.$transaction(async (tx) => {
      const newBorrowing = await tx.borrowingTransaction.create({
        data: {
          borrowerName,
          dueDate: new Date(dueDate),
          purpose,
          notes,
          status: 'ACTIVE',
        },
      })

      const borrowingItems = await Promise.all(
        toolChecks.map(async (item) => {
          const borrowingItem = await tx.borrowingItem.create({
            data: {
              borrowingTransactionId: newBorrowing.id,
              toolId: item.toolId,
              quantity: item.quantity,
              originalCondition: item.tool.condition || 'GOOD',
            },
          })

          await tx.tool.update({
            where: { id: item.toolId },
            data: {
              availableQuantity: {
                decrement: item.quantity
              }
            },
          })

          return borrowingItem
        })
      )

      return { ...newBorrowing, borrowingItems }
    })

    // Log activity
    await logActivity(
      'BORROWING_TRANSACTION',
      borrowing.id,
      'BORROW',
      borrowerName,
      undefined,
      borrowing,
      { itemCount: items.length, totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0) }
    )

    // Fetch complete borrowing data for response
    const completeBorrowing = await prisma.borrowingTransaction.findUnique({
      where: { id: borrowing.id },
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

    return successResponse(completeBorrowing, 'Borrowing transaction created successfully')
  } catch (error) {
    console.error('Error creating borrowing:', error)
    return handleDatabaseError(error)
  }
}
