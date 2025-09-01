import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { 
  successResponse, 
  errorResponse, 
  validateRequest, 
  handleDatabaseError
} from '@/lib/api-utils'

// Type definitions for report data structures
interface BorrowingItem {
  id: string;
  toolName: string;
  category: string;
  quantity: number;
  originalCondition?: string;
  returnCondition?: string;
  returnDate?: Date;
  units: BorrowingUnit[];
}

interface BorrowingUnit {
  id: string;
  unitNumber: string;
  condition: string;
  returnCondition?: string;
}

interface BorrowingReportItem {
  id: string;
  displayId?: string;
  originalId: string;
  borrower: string;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: string;
  purpose?: string;
  items: BorrowingItem[];
  totalItems: number;
  isOverdue: boolean;
  daysOverdue: number;
}

interface ConsumptionItem {
  id: string;
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalValue?: number;
  remainingStock: number;
}

interface ConsumptionReportItem {
  id: string;
  displayId?: string;
  originalId: string;
  consumer: string;
  consumptionDate: Date;
  purpose?: string;
  projectName?: string;
  items: ConsumptionItem[];
  totalItems: number;
  totalValue: number;
}


interface HistoryItem {
  name: string;
  category: string;
  quantity: number;
  condition?: string | null;
  unit?: string;
  value?: number | null;
}

interface HistoryReportItem {
  id: string;
  displayId?: string | null;
  originalId: string;
  type: 'borrowing' | 'consumption';
  date: Date | null;
  person: string;
  purpose?: string;
  projectName?: string | null;
  items: HistoryItem[];
  totalItems: number;
  totalValue?: number | null;
  status: string;
}

interface ActivityReportItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

interface BorrowingSummary {
  totalBorrowings: number;
  activeBorrowings: number;
  overdueBorrowings: number;
  completedBorrowings: number;
  totalItemsBorrowed: number;
}

interface ConsumptionSummary {
  totalConsumptions: number;
  totalItemsConsumed: number;
  totalValue: number;
  uniqueProjects: number;
}

interface ActivitySummary {
  totalActivities: number;
  uniqueUsers: number;
  actionBreakdown: Record<string, number>;
}

type ReportSummary = BorrowingSummary | ConsumptionSummary | ActivitySummary | Record<string, unknown>;


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

    let reportData: Record<string, unknown> = {}
    let summary: ReportSummary = {}

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
  const where: Record<string, unknown> = {
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
  const orderBy: Record<string, 'asc' | 'desc'> = {}
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
  const where: Record<string, unknown> = {
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
  const orderBy: Record<string, 'asc' | 'desc'> = {}
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
          }
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



// Tools Report - All tools with availability status
async function generateToolsReport(
  categoryIds?: string[],
  statuses?: string[],
  page: number = 1,
  limit: number = 100,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const where: Record<string, unknown> = {}

  // Multi-select category support
  if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
    where.categoryId = { in: categoryIds }
  }

  // Multi-select status support
  if (statuses && statuses.length > 0 && !statuses.includes('all')) {
    const statusConditions: Record<string, unknown>[] = []

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
  const where: Record<string, unknown> = {}

  // Multi-select category support
  if (categoryIds && categoryIds.length > 0 && !categoryIds.includes('all')) {
    where.categoryId = { in: categoryIds }
  }

  // Multi-select status support
  if (statuses && statuses.length > 0 && !statuses.includes('all')) {
    const statusConditions: Record<string, unknown>[] = []

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
  const transactions: HistoryReportItem[] = []

  // Get completed borrowing transactions
  if (itemType === 'all' || itemType === 'tools') {
    const borrowingWhere: Record<string, unknown> = {
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
      type: 'borrowing' as const,
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
    const consumptionWhere: Record<string, unknown> = {
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
      type: 'consumption' as const,
      date: consumption.consumptionDate,
      person: consumption.consumerName,
      purpose: consumption.purpose,
      projectName: consumption.projectName,
      items: consumption.consumptionItems.map(item => ({
        name: item.material.name,
        category: item.material.category.name,
        quantity: Number(item.quantity),
        unit: item.material.unit,
        value: item.totalValue ? Number(item.totalValue) : null
      })),
      totalItems: consumption.consumptionItems.length,
      totalValue: consumption.totalValue ? Number(consumption.totalValue) : null,
      status: 'COMPLETED'
    })))
  }

  // Sort combined transactions
  transactions.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
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
  const where: Record<string, unknown> = {
    createdAt: { gte: startDate, lte: endDate }
  }
  if (actorName) where.actorName = { contains: actorName, mode: 'insensitive' }

  // Build sort order
  const orderBy: Record<string, 'asc' | 'desc'> = {}
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
      id: activity.id,
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
function generateReportSummary(type: string, data: unknown): ReportSummary {
  const dataArray = Array.isArray(data) ? data : []
  switch (type) {
    case 'borrowing':
      return {
        totalBorrowings: dataArray.length,
        activeBorrowings: dataArray.filter((b: BorrowingReportItem) => b.status === 'ACTIVE').length,
        overdueBorrowings: dataArray.filter((b: BorrowingReportItem) => b.isOverdue).length,
        completedBorrowings: dataArray.filter((b: BorrowingReportItem) => b.status === 'COMPLETED').length,
        totalItemsBorrowed: dataArray.reduce((sum: number, b: BorrowingReportItem) => sum + b.totalItems, 0)
      }
    case 'consumption':
      return {
        totalConsumptions: dataArray.length,
        totalItemsConsumed: dataArray.reduce((sum: number, c: ConsumptionReportItem) => sum + c.totalItems, 0),
        totalValue: dataArray.reduce((sum: number, c: ConsumptionReportItem) => sum + (c.totalValue || 0), 0),
        uniqueProjects: [...new Set(dataArray.map((c: ConsumptionReportItem) => c.projectName).filter(Boolean))].length
      }
    case 'inventory':
      const inventoryData = data as {
        tools?: { hasActiveBorrowing: boolean }[];
        materials?: { isLowStock: boolean; stockStatus: string }[];
      }
      return {
        totalTools: inventoryData.tools?.length || 0,
        totalMaterials: inventoryData.materials?.length || 0,
        toolsInUse: inventoryData.tools?.filter((t) => t.hasActiveBorrowing).length || 0,
        lowStockMaterials: inventoryData.materials?.filter((m) => m.isLowStock).length || 0,
        outOfStockMaterials: inventoryData.materials?.filter((m) => m.stockStatus === 'out').length || 0
      }
    case 'activity':
      return {
        totalActivities: dataArray.length,
        uniqueUsers: [...new Set(dataArray.map((a: ActivityReportItem) => a.actorName).filter(Boolean))].length,
        actionBreakdown: dataArray.reduce((acc: Record<string, number>, activity: ActivityReportItem) => {
          acc[activity.action] = (acc[activity.action] || 0) + 1
          return acc
        }, {})
      }
    default:
      return {}
  }
}

// Convert to CSV
function convertToCSV(_type: string, data: unknown): string {
  if (!data) return ''

  // This is a simplified CSV conversion
  // In a real application, you'd want a more robust CSV library
  const actualData = (data as Record<string, unknown>).data || data
  if (!actualData || !Array.isArray(actualData) || actualData.length === 0) return ''

  const headers = Object.keys(actualData[0]).join(',')
  const rows = actualData.map((item: Record<string, unknown>) =>
    Object.values(item).map(value =>
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    ).join(',')
  ).join('\n')

  return `${headers}\n${rows}`
}
