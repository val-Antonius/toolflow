import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ToolConditionSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  validateRequest,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

const BulkUpdateSchema = z.object({
  units: z.array(z.object({
    unitId: z.string(),
    condition: ToolConditionSchema,
    notes: z.string().optional()
  }))
})

// POST /api/tools/units/bulk-update - Update multiple units' conditions
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, BulkUpdateSchema)
    if (!validation.success) {
      return validation.response
    }

    const { units } = validation.data

    const updatedUnits = await prisma.$transaction(async (tx) => {
      const updates = []
      
      for (const update of units) {
        // Get current unit state for activity log
        const currentUnit = await tx.toolUnit.findUnique({
          where: { id: update.unitId },
          include: { tool: true }
        })

        if (!currentUnit) {
          throw new Error(`Unit ${update.unitId} not found`)
        }

        // Update unit
        const updatedUnit = await tx.toolUnit.update({
          where: { id: update.unitId },
          data: {
            condition: update.condition,
            notes: update.notes
          }
        })

        // Log activity
        await logActivity(
          'TOOL',
          currentUnit.toolId,
          'UPDATE',
          undefined,
          { condition: currentUnit.condition, notes: currentUnit.notes },
          { condition: update.condition, notes: update.notes },
          { unitId: update.unitId, unitNumber: currentUnit.unitNumber }
        )

        updates.push(updatedUnit)
      }

      return updates
    })

    return successResponse(updatedUnits)
  } catch (error) {
    console.error('Error updating unit conditions:', error)
    return handleDatabaseError(error)
  }
}
