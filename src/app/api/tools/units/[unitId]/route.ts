import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

// GET /api/tools/units/:unitId - Get unit details with history
export async function GET(
  request: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const unit = await prisma.toolUnit.findUnique({
      where: { id: params.unitId },
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
                    borrowerName: true,
                    borrowDate: true,
                    returnDate: true,
                    status: true
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

    return successResponse(unit)
  } catch (error) {
    console.error('Error fetching tool unit:', error)
    return handleDatabaseError(error)
  }
}

// PATCH /api/tools/units/:unitId - Update unit condition
export async function PATCH(
  request: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const data = await request.json()
    const { condition, notes } = data

    const unit = await prisma.toolUnit.findUnique({
      where: { id: params.unitId },
      include: { tool: true }
    })

    if (!unit) {
      return errorResponse('Tool unit not found', 404)
    }

    const updatedUnit = await prisma.toolUnit.update({
      where: { id: params.unitId },
      data: {
        condition,
        notes
      },
      include: {
        tool: true
      }
    })

    await logActivity(
      'TOOL',
      unit.toolId,
      'UPDATE',
      undefined,
      { condition: unit.condition, notes: unit.notes },
      { condition, notes },
      { unitId: unit.id, unitNumber: unit.unitNumber }
    )

    return successResponse(updatedUnit)
  } catch (error) {
    console.error('Error updating tool unit:', error)
    return handleDatabaseError(error)
  }
}
