import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateCategorySchema } from '@/lib/validations'
import { 
  successResponse, 
  errorResponse, 
  validateRequest, 
  handleDatabaseError,
  logActivity,
  buildSearchFilter,
  buildSortOrder,
  getPaginationParams
} from '@/lib/api-utils'

// GET /api/categories - Get all categories with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Ambil hanya 3 kategori tetap
    const categories = await prisma.category.findMany({
      where: {
        name: { in: ['Peralatan Lapangan', 'Peralatan Kantor', 'Peralatan Jaringan'] }
      }
    });
    return successResponse(categories);
  } catch (error) {
    console.error('Error fetching categories:', error)
    return handleDatabaseError(error);
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, CreateCategorySchema)
    if (!validation.success) {
      return validation.response
    }

    const { name, type, description } = validation.data

    // Check if category with same name and type already exists
    const existingCategory = await prisma.category.findFirst({
      where: { name, type },
    })

    if (existingCategory) {
      return errorResponse('Category with this name and type already exists', 409)
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        type,
        description,
      },
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
    await logActivity('CATEGORY', category.id, 'CREATE', undefined, undefined, category)

    return successResponse(category, 'Category created successfully')
  } catch (error) {
    console.error('Error creating category:', error)
    return handleDatabaseError(error)
  }
}
