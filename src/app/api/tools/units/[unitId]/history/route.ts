import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  handleDatabaseError
} from '@/lib/api-utils'

// First, let's add an interface for the values structure
interface ConditionValues {
  condition?: string;
  notes?: string;
}

// GET /api/tools/units/[unitId]/history - Get unit borrowing and condition history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    // Await params in Next.js 15+
    const resolvedParams = await params
    const unitId = resolvedParams.unitId

    // Get unit details with complete history
    const unit = await prisma.toolUnit.findUnique({
      where: { id: unitId },
      include: {
        tool: {
          select: {
            name: true,
            category: {
              select: { name: true }
            }
          }
        },
        borrowings: {
          orderBy: { createdAt: 'desc' },
          include: {
            borrowingItem: {
              include: {
                borrowingTransaction: {
                  select: {
                    id: true,
                    borrowerName: true,
                    borrowDate: true,
                    dueDate: true,
                    returnDate: true,
                    status: true,
                    purpose: true,
                    notes: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!unit) {
      return errorResponse('Tool unit not found', 404)
    }

    // Get condition change history from activity log
    const conditionHistory = await prisma.activityLog.findMany({
      where: {
        entityType: 'TOOL',
        entityId: unit.toolId,
        metadata: {
          path: 'unitId', 
          string_contains: unitId // Using string_contains instead of equals for JSON field
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform and combine history
    const history = [
      ...unit.borrowings.map(borrowing => ({
        date: borrowing.borrowingItem.borrowingTransaction.borrowDate,
        type: 'BORROW',
        condition: borrowing.condition,
        returnCondition: borrowing.returnCondition,
        borrowerName: borrowing.borrowingItem.borrowingTransaction.borrowerName,
        purpose: borrowing.borrowingItem.borrowingTransaction.purpose,
        notes: borrowing.borrowingItem.borrowingTransaction.notes,
        returnDate: borrowing.borrowingItem.borrowingTransaction.returnDate
      })),
      ...conditionHistory.map(log => ({
        date: log.createdAt,
        type: 'CONDITION_CHANGE',
        oldCondition: (log.oldValues as ConditionValues)?.condition,
        newCondition: (log.newValues as ConditionValues)?.condition,
        notes: (log.newValues as ConditionValues)?.notes
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return successResponse({
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        currentCondition: unit.condition,
        isAvailable: unit.isAvailable,
        notes: unit.notes,
        tool: unit.tool
      },
      history
    })
  } catch (error) {
    console.error('Error fetching unit history:', error)
    return handleDatabaseError(error)
  }
}