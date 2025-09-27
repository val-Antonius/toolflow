import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { ToolCondition, BorrowingTransactionStatus } from '@prisma/client'
import { CreateBorrowingSchema } from '@/lib/validations'

import {
  successResponse,
  validateRequest,
  handleDatabaseError,
  logActivity,
  buildSearchFilter,
  buildSortOrder,
  getPaginationParams
} from '@/lib/api-utils'
import { generateBorrowingDisplayId } from '@/lib/display-id-utils'

// Type for tool with units
type ToolWithUnits = {
  id: string;
  name: string;
  units: Array<{
    id: string;
    unitNumber: number;
    condition: ToolCondition;
    isAvailable: boolean;
  }>;
};
// GET /api/borrowings - Get all borrowing transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const search = searchParams.get('search') || undefined
    const statuses = searchParams.getAll('status') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Build filters
    const where: Prisma.BorrowingTransactionWhereInput = {
      ...buildSearchFilter(search, ['purpose', 'borrowerName']),
      ...(statuses.length > 0 && { status: { in: statuses as BorrowingTransactionStatus[]} })
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
                select: { id: true, name: true }
              },
              borrowedUnits: {
                include: {
                  toolUnit: {
                    select: { id: true, unitNumber: true, condition: true }
                  }
                }
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
      // const isOverdue = borrowing.status === 'ACTIVE' && borrowing.dueDate < now
      const isOverdue = borrowing.status === 'OVERDUE';
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

    // Generate display ID
    const displayId = await generateBorrowingDisplayId();

    // Create borrowing transaction in a transaction
    const borrowing = await prisma.$transaction(async (tx) => {
      const newBorrowing = await tx.borrowingTransaction.create({
        data: {
          displayId,
          borrowerName,
          dueDate: new Date(dueDate),
          purpose,
          notes,
          status: 'ACTIVE',
        },
      })

      // Process each tool and its units
      const borrowingItems = [];
      
      for (const item of items) {
        // Get the tool and its units
        const toolWithUnits = await tx.tool.findUnique({
          where: { id: item.toolId },
          include: {
            units: {
              where: {
                id: { in: item.units },
                isAvailable: true
              }
            }
          }
        }) as ToolWithUnits;

        if (!toolWithUnits) {
          throw new Error(`Tool ${item.toolId} not found`);
        }

        if (toolWithUnits.units.length !== item.units.length) {
          throw new Error(`Some units of tool ${toolWithUnits.name} are not available`);
        }

        // Create borrowing item
        const borrowingItem = await tx.borrowingItem.create({
          data: {
            borrowingTransactionId: newBorrowing.id,
            toolId: item.toolId,
            quantity: item.units.length,
            originalCondition: ToolCondition.GOOD,
            notes: item.notes
          }
        });

        borrowingItems.push(borrowingItem);

        // Create borrowing item units and update unit availability
        for (const unit of toolWithUnits.units) {
          await tx.borrowingItemUnit.create({
            data: {
              borrowingItemId: borrowingItem.id,
              toolUnitId: unit.id,
              condition: unit.condition
            }
          });

          // Update unit availability
          await tx.toolUnit.update({
            where: { id: unit.id },
            data: { isAvailable: false }
          });
        }

        // Update tool's available quantity
        await tx.tool.update({
          where: { id: toolWithUnits.id },
          data: {
            availableQuantity: {
              decrement: item.units.length
            }
          }
        });
      }

      return { ...newBorrowing, borrowingItems };
    })

    const result = await prisma.borrowingTransaction.findUnique({
      where: { id: borrowing.id },
      include: {
        borrowingItems: {
          include: {
            tool: true,
            borrowedUnits: {
              include: {
                toolUnit: true
              }
            }
          }
        }
      }
    });

    if (!result) {
      throw new Error('Failed to create borrowing transaction')
    }

    // Log activity
    await logActivity(
      'BORROWING_TRANSACTION',
      result.id,
      'BORROW',
      borrowerName,
      undefined,
      result,
      { itemCount: items.length, totalQuantity: items.reduce((sum, item) => sum + item.units.length, 0) }
    )

    return successResponse(result, 'Borrowing transaction created successfully')
  } catch (error) {
    console.error('Error creating borrowing:', error)
    return handleDatabaseError(error)
  }
}
