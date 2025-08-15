import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { 
  successResponse, 
  errorResponse, 
  validateRequest, 
  handleDatabaseError
} from '@/lib/api-utils'

// Report generation schema
const ReportSchema = z.object({
  type: z.enum(['borrowing', 'consumption', 'inventory', 'activity']),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  borrowerName: z.string().optional(),
  consumerName: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
})

// POST /api/reports - Generate reports
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, ReportSchema)
    if (!validation.success) {
      return validation.response
    }

  const { type, dateFrom, dateTo, borrowerName, consumerName, categoryId, status, format } = validation.data

    // Date range setup
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: 30 days ago
    const endDate = dateTo ? new Date(dateTo) : new Date() // Default: now

    let reportData: any = {}
    let summary: any = {}

    switch (type) {
      case 'borrowing':
        reportData = await generateBorrowingReport(startDate, endDate, borrowerName, status)
        break
      case 'consumption':
        reportData = await generateConsumptionReport(startDate, endDate, consumerName, categoryId)
        break
      case 'inventory':
        reportData = await generateInventoryReport(categoryId)
        break
      case 'activity':
        reportData = await generateActivityReport(startDate, endDate, borrowerName)
        break
      default:
        return errorResponse('Invalid report type', 400)
    }

    // Generate summary
    summary = generateReportSummary(type, reportData)

    const response = {
      type,
      dateRange: { from: startDate, to: endDate },
  filters: { borrowerName, consumerName, categoryId, status },
      summary,
      data: reportData,
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

// Borrowing Report
async function generateBorrowingReport(startDate: Date, endDate: Date, borrowerName?: string, status?: string) {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate }
  }
  if (borrowerName) where.borrowerName = { contains: borrowerName, mode: 'insensitive' }
  if (status) where.status = status

  const borrowings = await prisma.borrowingTransaction.findMany({
    where,
    include: {
      borrowingItems: {
        include: {
          tool: {
            select: { name: true, category: { select: { name: true } } }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return borrowings.map(borrowing => ({
    id: borrowing.id,
    borrowDate: borrowing.borrowDate,
    dueDate: borrowing.dueDate,
    returnDate: borrowing.returnDate,
    status: borrowing.status,
    purpose: borrowing.purpose,
    borrowerName: borrowing.borrowerName,
    items: borrowing.borrowingItems.map(item => ({
      toolName: item.tool.name,
      category: item.tool.category.name,
      quantity: item.quantity,
      originalCondition: item.originalCondition,
      returnCondition: item.returnCondition,
      returnDate: item.returnDate
    })),
    totalItems: borrowing.borrowingItems.reduce((sum, item) => sum + item.quantity, 0),
    isOverdue: borrowing.status === 'OVERDUE' || (borrowing.status === 'ACTIVE' && borrowing.dueDate < new Date())
  }))
}

// Consumption Report
async function generateConsumptionReport(startDate: Date, endDate: Date, consumerName?: string, categoryId?: string) {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate }
  }
  if (consumerName) where.consumerName = { contains: consumerName, mode: 'insensitive' }

  const consumptions = await prisma.consumptionTransaction.findMany({
    where,
    include: {
      consumptionItems: {
        include: {
          material: {
            select: { 
              name: true, 
              unit: true,
              category: { select: { name: true } }
            }
          }
        },
        where: categoryId ? {
          material: { categoryId }
        } : undefined
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return consumptions.map(consumption => ({
    id: consumption.id,
    consumptionDate: consumption.consumptionDate,
    purpose: consumption.purpose,
    projectName: consumption.projectName,
    consumerName: consumption.consumerName,
    items: consumption.consumptionItems.map(item => ({
      materialName: item.material.name,
      category: item.material.category.name,
      quantity: item.quantity,
      unit: item.material.unit,
      unitPrice: item.unitPrice,
      totalValue: item.totalValue
    })),
    totalItems: consumption.consumptionItems.length,
    totalValue: consumption.totalValue || consumption.consumptionItems.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0)
  }))
}

// Inventory Report
async function generateInventoryReport(categoryId?: string) {
  const toolsWhere: any = {}
  const materialsWhere: any = {}

  if (categoryId) {
    toolsWhere.categoryId = categoryId
    materialsWhere.categoryId = categoryId
  }

  const [tools, materials] = await Promise.all([
    prisma.tool.findMany({
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
      }
    }),
    prisma.material.findMany({
      where: materialsWhere,
      include: {
        category: { select: { name: true } }
      }
    })
  ])

  return {
    tools: tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      category: tool.category.name,
      condition: tool.condition,
      totalQuantity: tool.totalQuantity,
      availableQuantity: tool.availableQuantity,
      borrowedQuantity: tool.totalQuantity - tool.availableQuantity,
      hasActiveBorrowing: tool._count.borrowingItems > 0,
      location: tool.location,
      supplier: tool.supplier,
      purchasePrice: tool.purchasePrice
    })),
    materials: materials.map(material => ({
      id: material.id,
      name: material.name,
      category: material.category.name,
      currentQuantity: material.currentQuantity,
      thresholdQuantity: material.thresholdQuantity,
      unit: material.unit,
  isLowStock: Number(material.currentQuantity) <= Number(material.thresholdQuantity),
  stockStatus: Number(material.currentQuantity) <= 0 ? 'out' : 
      Number(material.currentQuantity) <= Number(material.thresholdQuantity) ? 'low' : 'normal',
      location: material.location,
      supplier: material.supplier,
      unitPrice: material.unitPrice
    }))
  }
}

// Activity Report
async function generateActivityReport(startDate: Date, endDate: Date, actorName?: string) {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate }
  }
  if (actorName) where.actorName = { contains: actorName, mode: 'insensitive' }

  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  return activities.map(activity => ({
    id: activity.id,
    entityType: activity.entityType,
    entityId: activity.entityId,
    action: activity.action,
    actorName: activity.actorName,
    createdAt: activity.createdAt,
    metadata: activity.metadata
  }))
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
function convertToCSV(type: string, data: any): string {
  if (!data || data.length === 0) return ''

  // This is a simplified CSV conversion
  // In a real application, you'd want a more robust CSV library
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map((item: any) => 
    Object.values(item).map(value => 
      typeof value === 'object' ? JSON.stringify(value) : value
    ).join(',')
  ).join('\n')

  return `${headers}\n${rows}`
}
