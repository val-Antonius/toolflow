import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReturnBorrowingSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  validateRequest,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

// POST /api/borrowings/[id]/return - Process return of borrowed items
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validation = await validateRequest(request, ReturnBorrowingSchema)
    if (!validation.success) {
      return validation.response
    }

    const { items, notes } = validation.data

    // Get existing borrowing
    const borrowing = await prisma.borrowingTransaction.findUnique({
      where: { id },
      include: {
        borrowingItems: {
          include: {
            tool: true
          }
        }
      }
    })

    if (!borrowing) {
      return errorResponse('Borrowing transaction not found', 404)
    }

    if (borrowing.status === 'COMPLETED') {
      return errorResponse('Borrowing already completed', 400)
    }

    if (borrowing.status === 'CANCELLED') {
      return errorResponse('Cannot return items from cancelled borrowing', 400)
    }

    // Validate return items
    const returnItemIds = items.map((item: any) => item.borrowingItemId)
    const borrowingItemIds = (borrowing.borrowingItems || []).map((item: any) => item.id)

    const invalidItems = returnItemIds.filter((id: any) => !borrowingItemIds.includes(id))
    if (invalidItems.length > 0) {
      return errorResponse(`Invalid borrowing item IDs: ${invalidItems.join(', ')}`, 400)
    }

    // Check for already returned items
    const alreadyReturned = (borrowing.borrowingItems || []).filter(
      (item: any) => returnItemIds.includes(item.id) && item.returnDate
    )
    if (alreadyReturned.length > 0) {
      return errorResponse(
        `Items already returned: ${alreadyReturned.map((item: any) => item.tool.name).join(', ')}`,
        400
      )
    }

    // Process returns
    const returnResults = await prisma.$transaction(async (tx) => {
      const returnedItems = []

      for (const returnItem of items) {
        const borrowingItem = (borrowing.borrowingItems || []).find(
          (item: any) => item.id === returnItem.borrowingItemId
        )

        if (!borrowingItem) continue

        // Update borrowing item with return info
        const updatedItem = await tx.borrowingItem.update({
          where: { id: returnItem.borrowingItemId },
          data: {
            returnDate: new Date(),
            returnCondition: returnItem.returnCondition,
            notes: returnItem.notes,
          },
          include: {
            tool: true
          }
        })

        // Update tool availability
        await tx.tool.update({
          where: { id: borrowingItem.toolId },
          data: {
            availableQuantity: {
              increment: borrowingItem.quantity
            }
          },
        })

        // Update tool condition if it has deteriorated
        if (returnItem.returnCondition !== borrowingItem.originalCondition) {
          const conditionPriority = { 'EXCELLENT': 4, 'GOOD': 3, 'FAIR': 2, 'POOR': 1 }
          const currentPriority = conditionPriority[borrowingItem.tool.condition as keyof typeof conditionPriority]
          const returnPriority = conditionPriority[returnItem.returnCondition as keyof typeof conditionPriority]

          if (returnPriority < currentPriority) {
            await tx.tool.update({
              where: { id: borrowingItem.toolId },
              data: { condition: returnItem.returnCondition },
            })
          }
        }

        returnedItems.push(updatedItem)
      }

      // Check if all items are returned
      const allBorrowingItems = await tx.borrowingItem.findMany({
        where: { borrowingTransactionId: id }
      })

      const allReturned = allBorrowingItems.every((item: any) => item.returnDate !== null)

      // Update borrowing status if all items returned
      let updatedBorrowing = borrowing
      if (allReturned) {
        updatedBorrowing = await tx.borrowingTransaction.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            returnDate: new Date(),
            notes: notes ? `${borrowing.notes || ''}\n\nReturn Notes: ${notes}`.trim() : borrowing.notes,
          },
          include: {
            borrowingItems: {
              include: {
                tool: true
              }
            }
          }
        })
      }

      return { returnedItems, updatedBorrowing, allReturned }
    })

    // Log activity
    await logActivity(
      'BORROWING_TRANSACTION',
      id,
      'RETURN',
      borrowing.borrowerName,
      undefined,
      returnResults.updatedBorrowing,
      {
        returnedItemsCount: returnResults.returnedItems.length,
        allItemsReturned: returnResults.allReturned,
        returnedItems: returnResults.returnedItems.map((item: any) => ({
          toolName: item.tool.name,
          quantity: item.quantity,
          condition: item.returnCondition
        }))
      }
    )

    return successResponse({
      borrowing: returnResults.updatedBorrowing,
      returnedItems: returnResults.returnedItems,
      allItemsReturned: returnResults.allReturned
    }, `Successfully returned ${returnResults.returnedItems.length} item(s)`)
  } catch (error) {
    console.error('Error processing return:', error)
    return handleDatabaseError(error)
  }
}
