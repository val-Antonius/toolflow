import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

type ConsumptionItemWithMaterial = Prisma.ConsumptionItemGetPayload<{
  include: {
    material: {
      select: {
        id: true,
        name: true,
        unit: true,
        currentQuantity: true,
        thresholdQuantity: true,
        category: { select: { name: true } },
        location: true,
        supplier: true
      }
    }
  }
}>

// GET /api/consumptions/[id] - Get consumption transaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const consumption = await prisma.consumptionTransaction.findUnique({
      where: { id },
      include: {
        consumptionItems: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentQuantity: true,
                thresholdQuantity: true,
                category: { select: { name: true } },
                location: true,
                supplier: true
              }
            }
          }
        }
      },
    })

    if (!consumption) {
      return errorResponse('Consumption transaction not found', 404)
    }

    // Add computed fields (handle missing consumptionItems)
    const items = (consumption && consumption.consumptionItems) ? consumption.consumptionItems : []
    const enrichedConsumption = {
      ...consumption,
      totalItems: items.length,
      totalQuantity: items.reduce((sum: number, item: ConsumptionItemWithMaterial) => sum + Number(item.quantity), 0),
      calculatedTotalValue: items.reduce((sum: number, item: ConsumptionItemWithMaterial) => sum + (Number(item.totalValue) || 0), 0)
    }

    return successResponse(enrichedConsumption)
  } catch (error) {
    console.error('Error fetching consumption:', error)
    return handleDatabaseError(error)
  }
}

// PUT /api/consumptions/[id] - Update consumption transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { purpose, projectName, notes } = body

    // Get existing consumption
    const existingConsumption = await prisma.consumptionTransaction.findUnique({
      where: { id },
      include: {
        consumptionItems: true
      }
    })

    if (!existingConsumption) {
      return errorResponse('Consumption transaction not found', 404)
    }

    // Update consumption
    const updatedConsumption = await prisma.consumptionTransaction.update({
      where: { id },
      data: {
        purpose,
        projectName,
        notes,
        updatedAt: new Date(),
      },
      include: {
        consumptionItems: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: { select: { name: true } }
              }
            }
          }
        }
      },
    })

    // Log activity
    await logActivity(
      'CONSUMPTION_TRANSACTION',
      id,
      'UPDATE',
      undefined,
      existingConsumption,
      updatedConsumption
    )

    return successResponse(updatedConsumption, 'Consumption transaction updated successfully')
  } catch (error) {
    console.error('Error updating consumption:', error)
    return handleDatabaseError(error)
  }
}

// DELETE /api/consumptions/[id] - Delete consumption transaction (restore stock)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Get existing consumption
    const consumption = await prisma.consumptionTransaction.findUnique({
      where: { id },
      include: {
        consumptionItems: true
      }
    })

    if (!consumption) {
      return errorResponse('Consumption transaction not found', 404)
    }

    // Check if consumption is recent (within 24 hours) - business rule
    const now = new Date()
    const consumptionAge = now.getTime() - consumption.createdAt.getTime()
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (consumptionAge > twentyFourHours) {
      return errorResponse('Cannot delete consumption older than 24 hours', 400)
    }

    // Delete consumption and restore material stock
    await prisma.$transaction(async (tx) => {
      // Restore material stock
      for (const item of consumption.consumptionItems) {
        await tx.material.update({
          where: { id: item.materialId },
          data: {
            currentQuantity: {
              increment: Number(item.quantity)
            }
          },
        })
      }

      // Delete consumption items first (due to foreign key constraints)
      await tx.consumptionItem.deleteMany({
        where: { consumptionTransactionId: id }
      })

      // Delete consumption transaction
      await tx.consumptionTransaction.delete({
        where: { id }
      })
    })

    // Log activity
    await logActivity(
      'CONSUMPTION_TRANSACTION',
      id,
      'DELETE',
      undefined,
      consumption,
      undefined,
      {
        reason: 'Deleted and stock restored',
        restoredItems: consumption.consumptionItems.length,
        restoredQuantity: consumption.consumptionItems.reduce((sum, item) => sum + Number(item.quantity), 0)
      }
    )

    return successResponse(null, 'Consumption transaction deleted and stock restored successfully')
  } catch (error) {
    console.error('Error deleting consumption:', error)
    return handleDatabaseError(error)
  }
}
