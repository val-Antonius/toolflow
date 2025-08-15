import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateCategorySchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  validateRequest,
  handleDatabaseError,
  logActivity
} from '@/lib/api-utils'

// GET /api/categories/[id] - Get category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tools: true,
            materials: true,
          },
        },
      },
    })

    if (!category) {
      return errorResponse('Category not found', 404)
    }

    return successResponse(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return handleDatabaseError(error)
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validation = await validateRequest(request, UpdateCategorySchema)
    if (!validation.success) {
      return validation.response
    }

    // Get existing category
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    })

    if (!existingCategory) {
      return errorResponse('Category not found', 404)
    }

    // Check if name is being changed and if it conflicts
    if (validation.data.name && validation.data.name !== existingCategory.name) {
      const nameConflict = await prisma.category.findUnique({
        where: { name: validation.data.name },
      })

      if (nameConflict) {
        return errorResponse('Category with this name already exists', 409)
      }
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: validation.data,
      include: {
        _count: {
          select: {
            tools: true,
            materials: true,
          },
        },
      },
    })

    // Log activity
    await logActivity('CATEGORY', id, 'UPDATE', undefined, existingCategory, updatedCategory)

    return successResponse(updatedCategory, 'Category updated successfully')
  } catch (error) {
    console.error('Error updating category:', error)
    return handleDatabaseError(error)
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tools: true,
            materials: true,
          },
        },
      },
    })

    if (!category) {
      return errorResponse('Category not found', 404)
    }

    // Check if category has associated tools or materials
    if (category._count.tools > 0 || category._count.materials > 0) {
      return errorResponse(
        `Cannot delete category. It has ${category._count.tools} tools and ${category._count.materials} materials associated with it.`,
        400
      )
    }

    // Delete category
    await prisma.category.delete({
      where: { id },
    })

    // Log activity
    await logActivity('CATEGORY', id, 'DELETE', undefined, category, undefined)

    return successResponse(null, 'Category deleted successfully')
  } catch (error) {
    console.error('Error deleting category:', error)
    return handleDatabaseError(error)
  }
}
