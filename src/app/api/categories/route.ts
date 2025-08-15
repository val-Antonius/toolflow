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
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const search = searchParams.get('search') || undefined
    const type = searchParams.get('type') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Build filters
    const where: any = {
      ...buildSearchFilter(search, ['name', 'description']),
    }

    if (type && (type === 'TOOL' || type === 'MATERIAL')) {
      where.type = type
    }

    // Get categories with pagination
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: buildSortOrder(sortBy, sortOrder),
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              tools: true,
              materials: true,
            },
          },
        },
      }),
      prisma.category.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return successResponse(categories, undefined, {
      page,
      limit,
      total,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return handleDatabaseError(error)
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

    // Check if category with same name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name },
    })

    if (existingCategory) {
      return errorResponse('Category with this name already exists', 409)
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
