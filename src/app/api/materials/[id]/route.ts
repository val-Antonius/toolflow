import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateMaterialSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  validateRequest,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

// GET /api/materials/[id] - Get material by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        category: {
          select: { name: true, type: true }
        },
        consumptionItems: {
          include: {
            consumptionTransaction: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            consumptionItems: true
          }
        }
      },
    })

    if (!material) {
      return errorResponse('Material not found', 404)
    }

    return successResponse({
      ...material,
      isLowStock: Number(material.currentQuantity) <= Number(material.thresholdQuantity),
      stockStatus: Number(material.currentQuantity) <= 0 ? 'out' :
                  Number(material.currentQuantity) <= Number(material.thresholdQuantity) ? 'low' : 'normal',
    })
  } catch (error) {
    console.error('Error fetching material:', error)
    return handleDatabaseError(error)
  }
}

// Utility function to remove undefined values with proper typing
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

// PUT /api/materials/[id] - Update material
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validation = await validateRequest(request, UpdateMaterialSchema)
    if (!validation.success) {
      return validation.response
    }

    // Get existing material
    const existingMaterial = await prisma.material.findUnique({
      where: { id },
    })

    if (!existingMaterial) {
      return errorResponse('Material not found', 404)
    }

    const data = validation.data

    // Verify category exists and is of type MATERIAL if categoryId is being updated
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      })

      if (!category) {
        return errorResponse('Category not found', 404)
      }

      if (category.type !== 'MATERIAL') {
        return errorResponse('Category must be of type MATERIAL', 400)
      }
    }

    // Business logic validation
    if (data.currentQuantity !== undefined && data.currentQuantity < 0) {
      return errorResponse('Current quantity cannot be negative', 400)
    }

    if (data.thresholdQuantity !== undefined && data.thresholdQuantity < 0) {
      return errorResponse('Threshold quantity cannot be negative', 400)
    }

    // Prepare update data using Prisma types - more type-safe approach
    const updateData: Prisma.MaterialUpdateInput = removeUndefined({
      name: data.name,
      categoryId: data.categoryId,
      currentQuantity: data.currentQuantity,
      thresholdQuantity: data.thresholdQuantity,
      unit: data.unit,
      location: data.location,
      supplier: data.supplier,
      unitPrice: data.unitPrice,
      notes: data.notes,
    })

    console.log('Update data:', updateData) // Debug log

    // Update material
    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { name: true, type: true }
        },
        _count: {
          select: {
            consumptionItems: true
          }
        }
      },
    })

    console.log('Updated material:', updatedMaterial) // Debug log

    // Log activity
    await logActivity('MATERIAL', id, 'UPDATE', undefined, existingMaterial, updatedMaterial)

    return successResponse({
      ...updatedMaterial,
      isLowStock: Number(updatedMaterial.currentQuantity) <= Number(updatedMaterial.thresholdQuantity),
      stockStatus: Number(updatedMaterial.currentQuantity) <= 0 ? 'out' :
                  Number(updatedMaterial.currentQuantity) <= Number(updatedMaterial.thresholdQuantity) ? 'low' : 'normal',
    }, 'Material updated successfully')
  } catch (error) {
    console.error('Error updating material:', error)
    return handleDatabaseError(error)
  }
}

// DELETE /api/materials/[id] - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if material exists
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            consumptionItems: true
          }
        }
      },
    })

    if (!material) {
      return errorResponse('Material not found', 404)
    }

    // Check if material has consumption history
    if (material._count.consumptionItems > 0) {
      return errorResponse(
        'Cannot delete material. It has consumption history.',
        400
      )
    }

    // Delete material
    await prisma.material.delete({
      where: { id },
    })

    // Log activity
    await logActivity('MATERIAL', id, 'DELETE', undefined, material, undefined)

    return successResponse(null, 'Material deleted successfully')
  } catch (error) {
    console.error('Error deleting material:', error)
    return handleDatabaseError(error)
  }
}
