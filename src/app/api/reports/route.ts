import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { 
  successResponse, 
  errorResponse, 
  validateRequest, 
  handleDatabaseError
} from '@/lib/api-utils'

// Enhanced Report generation schema - FIXED: Multi-select support
const ReportSchema = z.object({
  type: z.enum(['borrowing', 'consuming', 'tools', 'material', 'history', 'activity']),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  borrowerName: z.string().optional(),
  consumerName: z.string().optional(),
  categoryId: z.union([z.string(), z.array(z.string())]).optional(), // Support single string or array
  categoryIds: z.array(z.string()).optional(), // Alternative field for arrays
  status: z.union([z.string(), z.array(z.string())]).optional(), // Support multi-select status
  itemType: z.enum(['all', 'tools', 'materials']).default('all'),
  format: z.enum(['json', 'csv', 'excel']).default('json'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(100),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// POST /api/reports - Generate reports
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, ReportSchema)
    if (!validation.success) {
      return validation.response
    }

  const {
    type,
    dateFrom,
    dateTo,
    borrowerName,
    consumerName,
    categoryId,
    categoryIds,
    status,
    itemType,
    format,
    page,
    limit,
    sortBy,
    sortOrder
  } = validation.data

  // Process categories - support both single and multi-select
  const processedCategoryIds = (() => {
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      return categoryIds;
    }
    if (categoryId) {
      return Array.isArray(categoryId) ? categoryId : [categoryId];
    }
    return [];
  })();

  // Process status - support multi-select
  const processedStatuses = (() => {
    if (status) {
      return Array.isArray(status) ? status : [status];
    }
    return [];
  })();

    // Date range setup
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: 30 days ago
    const endDate = dateTo ? new Date(dateTo) : new Date() // Default: now

    let reportData: any = {}
    let summary: any = {}

    switch (type) {
      case 'borrowing':
        reportData = await generateBorrowingReport(startDate, endDate, borrowerName, processedStatuses, processedCategoryIds, page, limit, sortBy, sortOrder)
        break
      case 'consuming':
        reportData = await generateConsumptionReport(startDate, endDate, consumerName, processedCategoryIds, page, limit, sortBy, sortOrder)
        break
      case 'tools':
        reportData = await generateToolsReport(processedCategoryIds, processedStatuses, page, limit, sortBy, sortOrder)
        break
      case 'material':
        reportData = await generateMaterialReport(processedCategoryIds, processedStatuses, page, limit, sortBy, sortOrder)
        break
      case 'history':
        reportData = await generateHistoryReport(startDate, endDate, itemType, processedCategoryIds, page, limit, sortBy, sortOrder)
        break
      case 'activity':
        reportData = await generateActivityReport(startDate, endDate, borrowerName, page, limit, sortBy, sortOrder)
        break
      default:
        return errorResponse('Invalid report type', 400)
    }

    // Generate summary - handle both paginated and non-paginated data
    const summaryData = reportData.data || reportData
    summary = generateReportSummary(type, summaryData)

    // Get category names for better filter display
    let categoryNames: string[] = [];
    if (processedCategoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: processedCategoryIds } },
        select: { id: true, name: true }
      });
      categoryNames = categories.map(cat => cat.name);
    }

    const response = {
      type,
      dateRange: { from: startDate, to: endDate },
      filters: {
        borrowerName,
        consumerName,
        categoryId,
        categoryNames, // Add category names for better display
        status,
        itemType,
        page,
        limit,
        sortBy,
        sortOrder
      },
      summary,
      data: reportData.data || reportData,
      pagination: reportData.pagination || null,
      generatedAt: new Date(),
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(type, reportData)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return successResponse(response, 'Report generated successfully')
  } catch (error) {
    console.error('Error generating report:', error)
    return handleDatabaseError(error)
  }
}

// Enhanced Borrowing Report with pagination
async function generateBorrowingReport(
  startDate: Date,
  endDate: Date,
  borrowerName?: string,
  statuses?: string[],
  categoryIds?: string[],
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate }
  }
  if (borrowerName) where.borrowerName = { contains: borrowerName, mode: 'insensitive' }

  // Multi-select status support
  if (statuses && statuses.length > 0 && !statuses.includes('all')) {
    where.status = { in: statuses }
  }

  // Multi-select category support - filter by tool categories
  if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
    where.borrowingItems = {
      some: {
        tool: {
          categoryId: { in: categoryIds }
        }
      }
    }
  }

  // Build sort order
  const orderBy: any = {}
  if (sortBy) {
    orderBy[sortBy] = sortOrder
  } else {
    orderBy.createdAt = sortOrder
  }

  const [borrowings, totalCount] = await Promise.all([
    prisma.borrowingTransaction.findMany({
      where,
      include: {
        borrowingItems: {
          include: {
            tool: {
              select: { name: true, category: { select: { name: true } } }
            },
            borrowedUnits: {
              include: {
                toolUnit: {
                  select: { unitNumber: true, condition: true }
                }
              }
            }
          }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.borrowingTransaction.count({ where })
  ])

  const data = borrowings.map(borrowing => ({
    id: borrowing.displayId || borrowing.id,
    displayId: borrowing.displayId,
    originalId: borrowing.id,
    borrower: borrowing.borrowerName,
    borrowDate: borrowing.borrowDate,
    dueDate: borrowing.dueDate,
    returnDate: borrowing.returnDate,
    status: borrowing.status,
    purpose: borrowing.purpose,
    items: borrowing.borrowingItems.map(item => ({
      id: item.id,
      toolName: item.tool.name,
      category: item.tool.category.name,
      quantity: item.quantity,
      originalCondition: item.originalCondition,
      returnCondition: item.returnCondition,
      returnDate: item.returnDate,
      units: item.borrowedUnits.map(unit => ({
        id: unit.id,
        unitNumber: unit.toolUnit.unitNumber,
        condition: unit.toolUnit.condition,
        returnCondition: unit.returnCondition
      }))
    })),
    totalItems: borrowing.borrowingItems.reduce((sum, item) => sum + item.quantity, 0),
    isOverdue: borrowing.status === 'OVERDUE' || (borrowing.status === 'ACTIVE' && borrowing.dueDate < new Date()),
    daysOverdue: borrowing.status === 'ACTIVE' && borrowing.dueDate < new Date()
      ? Math.ceil((new Date().getTime() - borrowing.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0
  }))

  return {
    data,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    }
  }
}

// Enhanced Consumption Report with pagination
async function generateConsumptionReport(
  startDate: Date,
  endDate: Date,
  consumerName?: string,
  categoryIds?: string[],
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate }
  }
  if (consumerName) where.consumerName = { contains: consumerName, mode: 'insensitive' }

  // Multi-select category support - filter by material categories
  if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
    where.consumptionItems = {
      some: {
        material: {
          categoryId: { in: categoryIds }
        }
      }
    }
  }

  // Build sort order
  const orderBy: any = {}
  if (sortBy) {
    orderBy[sortBy] = sortOrder
  } else {
    orderBy.createdAt = sortOrder
  }

  const [consumptions, totalCount] = await Promise.all([
    prisma.consumptionTransaction.findMany({
      where,
      include: {
        consumptionItems: {
          include: {
            material: {
              select: {
                name: true,
                unit: true,
                currentQuantity: true,
                category: { select: { name: true } }
              }
            }
          },
          where: categoryId && categoryId !== 'all' ? {
            material: { categoryId }
          } : undefined
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.consumptionTransaction.count({ where })
  ])

  const data = consumptions.map(consumption => ({
    id: consumption.displayId || consumption.id,
    displayId: consumption.displayId,
    originalId: consumption.id,
    consumer: consumption.consumerName,
    consumptionDate: consumption.consumptionDate,
    purpose: consumption.purpose,
    projectName: consumption.projectName,
    items: consumption.consumptionItems.map(item => ({
      id: item.id,
      materialName: item.material.name,
      category: item.material.category.name,
      quantity: item.quantity,
      unit: item.material.unit,
      unitPrice: item.unitPrice,
      totalValue: item.totalValue,
      remainingStock: item.material.currentQuantity
    })),
    totalItems: consumption.consumptionItems.length,
    totalValue: consumption.totalValue || consumption.consumptionItems.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0)
  }))

  return {
    data,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    }
  }
}

// Enhanced Inventory Report with pagination
async function generateInventoryReport(
  categoryId?: string,
  itemType: 'all' | 'tools' | 'materials' = 'all',
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const items: any[] = []

  // Build sort order
  const orderBy: any = {}
  if (sortBy) {
    orderBy[sortBy] = sortOrder
  } else {
    orderBy.name = sortOrder
  }

  // Fetch tools if needed
  if (itemType === 'all' || itemType === 'tools') {
    const toolsWhere: any = {}
    if (categoryId && categoryId !== 'all') {
      toolsWhere.categoryId = categoryId
    }

    const tools = await prisma.tool.findMany({
      where: toolsWhere,
      include: {
        category: { select: { name: true } },
        _count: {
          select: {
            borrowingItems: {
              where: {
                borrowingTransaction: { status: { in: ['ACTIVE', 'OVERDUE'] } }
              }
            }
          }
        }
      },
      orderBy
    })

    items.push(...tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      category: tool.category.name,
      type: 'TOOL',
      condition: 'N/A', // Tool model doesn't have condition field
      total: tool.totalQuantity,
      available: tool.availableQuantity,
      borrowed: tool.totalQuantity - tool.availableQuantity,
      status: tool.availableQuantity > 0 ? 'Available' : 'Out of Stock',
      location: tool.location
    })))
  }

  // Fetch materials if needed
  if (itemType === 'all' || itemType === 'materials') {
    const materialsWhere: any = {}
    if (categoryId && categoryId !== 'all') {
      materialsWhere.categoryId = categoryId
    }

    const materials = await prisma.material.findMany({
      where: materialsWhere,
      include: {
        category: { select: { name: true } }
      },
      orderBy
    })

    items.push(...materials.map(material => ({
      id: material.id,
      name: material.name,
      category: material.category.name,
      type: 'MATERIAL',
      condition: 'N/A',
      total: Number(material.currentQuantity),
      available: Number(material.currentQuantity),
      borrowed: 0,
      status: Number(material.currentQuantity) > Number(material.thresholdQuantity) ? 'In Stock' : 'Low Stock',
      unit: material.unit
    })))
  }

  // Apply pagination
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedItems = items.slice(startIndex, endIndex)



  return {
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
      hasNext: page < Math.ceil(items.length / limit),
      hasPrev: page > 1
    }
  }
}

// Return Report - Tools that have been returned
async function generateReturnReport(
  startDate: Date,
  endDate: Date,
  categoryId?: string,
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const where: any = {
    status: 'COMPLETED',
    returnDate: {
      gte: startDate,
      lte: endDate
    }
  }

  if (categoryId && categoryId !== 'all') {
    where.borrowingItems = {
      some: {
        tool: {
          categoryId: categoryId
        }
      }
    }
  }

  const [borrowings, total] = await Promise.all([
    prisma.borrowingTransaction.findMany({
      where,
      include: {
        borrowingItems: {
          include: {
            tool: {
              include: {
                category: { select: { name: true } }
              }
            },
            borrowedUnits: {
              include: {
                toolUnit: true
              }
            }
          }
        }
      },
      orderBy: sortBy ? { [sortBy]: sortOrder } : { returnDate: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.borrowingTransaction.count({ where })
  ])

  return {
    data: borrowings.map(borrowing => ({
      id: borrowing.id,
      borrower: borrowing.borrowerName,
      returnDate: borrowing.returnDate,
      items: borrowing.borrowingItems.map(item => ({
        toolName: item.tool.name,
        category: item.tool.category.name,
        quantity: item.quantity,
        returnCondition: item.borrowedUnits.map(unit => unit.returnCondition).join(', ')
      })),
      totalItems: borrowing.borrowingItems.reduce((sum, item) => sum + item.quantity, 0),
      purpose: borrowing.purpose,
      notes: borrowing.notes
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  }
}

// Tools Report - All tools with availability status
async function generateToolsReport(
  categoryIds?: string[],
  statuses?: string[],
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const where: any = {}

  // Multi-select category support
  if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
    where.categoryId = { in: categoryIds }
  }

  // Multi-select status support
  if (statuses && statuses.length > 0 && !statuses.includes('all')) {
    const statusConditions: any[] = []

    statuses.forEach(status => {
      if (status === 'available') {
        statusConditions.push({ availableQuantity: { gt: 0 } })
      } else if (status === 'in-use') {
        statusConditions.push({
          AND: [
            { availableQuantity: { gte: 0 } },
            { availableQuantity: { lt: { _ref: 'totalQuantity' } } }
          ]
        })
      } else if (status === 'maintenance') {
        // Add maintenance logic if needed
        statusConditions.push({ status: 'MAINTENANCE' })
      }
    })

    if (statusConditions.length > 0) {
      where.OR = statusConditions
    }
  }

  const [tools, total] = await Promise.all([
    prisma.tool.findMany({
      where,
      include: {
        category: { select: { name: true } }
      },
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.tool.count({ where })
  ])

  return {
    data: tools.map(tool => ({
      id: tool.displayId || tool.id,
      displayId: tool.displayId,
      originalId: tool.id,
      name: tool.name,
      category: tool.category.name,
      condition: 'GOOD', // Default condition since Tool model doesn't have condition field
      total: tool.totalQuantity,
      available: tool.availableQuantity,
      inUse: tool.totalQuantity - tool.availableQuantity,
      location: tool.location,
      status: tool.availableQuantity > 0 ? 'Available' : 'In Use',
      createdAt: tool.createdAt
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  }
}

// Material Report - All materials with stock status
async function generateMaterialReport(
  categoryIds?: string[],
  statuses?: string[],
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const where: any = {}

  // Multi-select category support
  if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
    where.categoryId = { in: categoryIds }
  }

  // Multi-select status support
  if (statuses && statuses.length > 0 && !statuses.includes('all')) {
    const statusConditions: any[] = []

    statuses.forEach(status => {
      if (status === 'in-stock') {
        statusConditions.push({ currentQuantity: { gt: 0 } })
      } else if (status === 'low-stock') {
        statusConditions.push({
          AND: [
            { currentQuantity: { gt: 0 } },
            { currentQuantity: { lte: { _ref: 'thresholdQuantity' } } }
          ]
        })
      } else if (status === 'out-of-stock') {
        statusConditions.push({ currentQuantity: { lte: 0 } })
      }
    })

    if (statusConditions.length > 0) {
      where.OR = statusConditions
    }
  }

  const [materials, total] = await Promise.all([
    prisma.material.findMany({
      where,
      include: {
        category: { select: { name: true } }
      },
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.material.count({ where })
  ])

  return {
    data: materials.map(material => ({
      id: material.displayId || material.id,
      displayId: material.displayId,
      originalId: material.id,
      name: material.name,
      category: material.category.name,
      currentQuantity: Number(material.currentQuantity),
      unit: material.unit,
      thresholdQuantity: Number(material.thresholdQuantity),
      location: material.location,
      status: Number(material.currentQuantity) <= 0 ? 'Out of Stock' :
               Number(material.currentQuantity) <= Number(material.thresholdQuantity) ? 'Low Stock' : 'In Stock',
      createdAt: material.createdAt
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  }
}

// History Report - Combined completed transactions
async function generateHistoryReport(
  startDate: Date,
  endDate: Date,
  itemType: 'all' | 'tools' | 'materials' = 'all',
  categoryIds?: string[],
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const transactions: any[] = []

  // Get completed borrowing transactions
  if (itemType === 'all' || itemType === 'tools') {
    const borrowingWhere: any = {
      status: 'COMPLETED',
      returnDate: { gte: startDate, lte: endDate }
    }

    // Add category filter for borrowing transactions
    if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
      borrowingWhere.borrowingItems = {
        some: {
          tool: {
            categoryId: { in: categoryIds }
          }
        }
      }
    }

    const completedBorrowings = await prisma.borrowingTransaction.findMany({
      where: borrowingWhere,
      include: {
        borrowingItems: {
          include: {
            tool: {
              select: { name: true, category: { select: { name: true } } }
            }
          }
        }
      },
      orderBy: { returnDate: sortOrder }
    })

    transactions.push(...completedBorrowings.map(borrowing => ({
      id: borrowing.displayId || borrowing.id,
      displayId: borrowing.displayId,
      originalId: borrowing.id,
      type: 'borrowing',
      date: borrowing.returnDate,
      person: borrowing.borrowerName,
      purpose: borrowing.purpose,
      items: borrowing.borrowingItems.map(item => ({
        name: item.tool.name,
        category: item.tool.category.name,
        quantity: item.quantity,
        condition: item.returnCondition
      })),
      totalItems: borrowing.borrowingItems.reduce((sum, item) => sum + item.quantity, 0),
      status: 'COMPLETED'
    })))
  }

  // Get consumption transactions
  if (itemType === 'all' || itemType === 'materials') {
    const consumptionWhere: any = {
      consumptionDate: { gte: startDate, lte: endDate }
    }

    // Add category filter for consumption transactions
    if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
      consumptionWhere.consumptionItems = {
        some: {
          material: {
            categoryId: { in: categoryIds }
          }
        }
      }
    }

    const consumptions = await prisma.consumptionTransaction.findMany({
      where: consumptionWhere,
      include: {
        consumptionItems: {
          include: {
            material: {
              select: { name: true, unit: true, category: { select: { name: true } } }
            }
          }
        }
      },
      orderBy: { consumptionDate: sortOrder }
    })

    transactions.push(...consumptions.map(consumption => ({
      id: consumption.displayId || consumption.id,
      displayId: consumption.displayId,
      originalId: consumption.id,
      type: 'consumption',
      date: consumption.consumptionDate,
      person: consumption.consumerName,
      purpose: consumption.purpose,
      projectName: consumption.projectName,
      items: consumption.consumptionItems.map(item => ({
        name: item.material.name,
        category: item.material.category.name,
        quantity: item.quantity,
        unit: item.material.unit,
        value: item.totalValue
      })),
      totalItems: consumption.consumptionItems.length,
      totalValue: consumption.totalValue,
      status: 'COMPLETED'
    })))
  }

  // Sort combined transactions
  transactions.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
  })

  // Apply pagination
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedData = transactions.slice(startIndex, endIndex)

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: transactions.length,
      totalPages: Math.ceil(transactions.length / limit),
      hasNext: page < Math.ceil(transactions.length / limit),
      hasPrev: page > 1
    }
  }
}

// Activity Report
async function generateActivityReport(
  startDate: Date,
  endDate: Date,
  actorName?: string,
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate }
  }
  if (actorName) where.actorName = { contains: actorName, mode: 'insensitive' }

  // Build sort order
  const orderBy: any = {}
  if (sortBy) {
    orderBy[sortBy] = sortOrder
  } else {
    orderBy.createdAt = sortOrder
  }

  const [activities, totalCount] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.activityLog.count({ where })
  ])

  return {
    data: activities.map(activity => ({
      id: activity.displayId || activity.id,
      displayId: activity.displayId,
      originalId: activity.id,
      entityType: activity.entityType,
      entityId: activity.entityId,
      action: activity.action,
      actorName: activity.actorName,
      createdAt: activity.createdAt,
      metadata: activity.metadata
    })),
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    }
  }
}

// Generate Report Summary
function generateReportSummary(type: string, data: any) {
  switch (type) {
    case 'borrowing':
      return {
        totalBorrowings: data.length,
        activeBorrowings: data.filter((b: any) => b.status === 'ACTIVE').length,
        overdueBorrowings: data.filter((b: any) => b.isOverdue).length,
        completedBorrowings: data.filter((b: any) => b.status === 'COMPLETED').length,
        totalItemsBorrowed: data.reduce((sum: number, b: any) => sum + b.totalItems, 0)
      }
    case 'consumption':
      return {
        totalConsumptions: data.length,
        totalItemsConsumed: data.reduce((sum: number, c: any) => sum + c.totalItems, 0),
        totalValue: data.reduce((sum: number, c: any) => sum + (c.totalValue || 0), 0),
        uniqueProjects: [...new Set(data.map((c: any) => c.projectName).filter(Boolean))].length
      }
    case 'inventory':
      return {
        totalTools: data.tools.length,
        totalMaterials: data.materials.length,
        toolsInUse: data.tools.filter((t: any) => t.hasActiveBorrowing).length,
        lowStockMaterials: data.materials.filter((m: any) => m.isLowStock).length,
        outOfStockMaterials: data.materials.filter((m: any) => m.stockStatus === 'out').length
      }
    case 'activity':
      return {
        totalActivities: data.length,
  uniqueUsers: [...new Set(data.map((a: any) => a.actorName).filter(Boolean))].length,
        actionBreakdown: data.reduce((acc: any, activity: any) => {
          acc[activity.action] = (acc[activity.action] || 0) + 1
          return acc
        }, {})
      }
    default:
      return {}
  }
}

// Convert to CSV
function convertToCSV(_type: string, data: any): string {
  if (!data || data.length === 0) return ''

  // This is a simplified CSV conversion
  // In a real application, you'd want a more robust CSV library
  const actualData = data.data || data
  if (!actualData || actualData.length === 0) return ''

  const headers = Object.keys(actualData[0]).join(',')
  const rows = actualData.map((item: any) =>
    Object.values(item).map(value =>
      typeof value === 'object' ? JSON.stringify(value) : value
    ).join(',')
  ).join('\n')

  return `${headers}\n${rows}`
}
