import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleDatabaseError } from '@/lib/api-utils'

// GET /api/analytics - Get analytics data for charts and insights
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const type = searchParams.get('type') || 'overview'

    const days = parseInt(period)
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const endDate = new Date()

    let analyticsData: any = {}

    switch (type) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(startDate, endDate)
        break
      case 'borrowing-trends':
        analyticsData = await getBorrowingTrends(startDate, endDate)
        break
      case 'consumption-trends':
        analyticsData = await getConsumptionTrends(startDate, endDate)
        break
      case 'inventory-status':
        analyticsData = await getInventoryStatus()
        break
      case 'user-activity':
        analyticsData = await getUserActivity(startDate, endDate)
        break
      default:
        analyticsData = await getOverviewAnalytics(startDate, endDate)
    }

    return successResponse({
      type,
      period: days,
      dateRange: { from: startDate, to: endDate },
      data: analyticsData,
      generatedAt: new Date()
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return handleDatabaseError(error)
  }
}

// Overview Analytics
async function getOverviewAnalytics(startDate: Date, endDate: Date) {
  const [
    totalBorrowings,
    totalConsumptions,
    activeBorrowings,
    overdueBorrowings,
  // totalUsers,
    totalTools,
    totalMaterials,
    lowStockMaterialsResult,
    recentActivities
  ] = await Promise.all([
    prisma.borrowingTransaction.count({
      where: { createdAt: { gte: startDate, lte: endDate } }
    }),
    prisma.consumptionTransaction.count({
      where: { createdAt: { gte: startDate, lte: endDate } }
    }),
    prisma.borrowingTransaction.count({
      where: { status: 'ACTIVE' }
    }),
    prisma.borrowingTransaction.count({
      where: { status: 'OVERDUE' }
    }),
  // prisma.user.count({ where: { isActive: true } }),
    prisma.tool.count(),
    prisma.material.count(),
    // Count materials where current quantity is less than or equal to threshold
    prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count
      FROM materials
      WHERE currentQuantity <= thresholdQuantity
    `,
    prisma.activityLog.count({
      where: { createdAt: { gte: startDate, lte: endDate } }
    })
  ])

  // Extract count value from raw query result
  const lowStockMaterials = Number(lowStockMaterialsResult[0]?.count || 0)

  return {
    summary: {
      totalBorrowings,
      totalConsumptions,
      activeBorrowings,
      overdueBorrowings,
  // totalUsers,
      totalTools,
      totalMaterials,
      lowStockMaterials,
      recentActivities
    },
    trends: await getDailyTrends(startDate, endDate)
  }
}

// Borrowing Trends
async function getBorrowingTrends(startDate: Date, endDate: Date) {
  const borrowings = await prisma.borrowingTransaction.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    include: {
      borrowingItems: {
        include: {
          tool: {
            include: { category: true }
          }
        }
      }
    }
  })

  // Group by status
  const statusBreakdown = borrowings.reduce((acc: any, borrowing) => {
    acc[borrowing.status] = (acc[borrowing.status] || 0) + 1
    return acc
  }, {})

  // Group by category
  const categoryBreakdown = borrowings.reduce((acc: any, borrowing) => {
    borrowing.borrowingItems.forEach(item => {
      const category = item.tool.category.name
      acc[category] = (acc[category] || 0) + item.quantity
    })
    return acc
  }, {})

  // Daily borrowing trend
  const dailyTrend = await getDailyBorrowingTrend(startDate, endDate)

  return {
    statusBreakdown,
    categoryBreakdown,
    dailyTrend,
    totalBorrowings: borrowings.length,
    averageItemsPerBorrowing: borrowings.length > 0
      ? borrowings.reduce((sum, b) => sum + b.borrowingItems.length, 0) / borrowings.length
      : 0
  }
}

// Consumption Trends
async function getConsumptionTrends(startDate: Date, endDate: Date) {
  const consumptions = await prisma.consumptionTransaction.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    include: {
      consumptionItems: {
        include: {
          material: {
            include: { category: true }
          }
        }
      }
    }
  })

  // Group by category
  const categoryBreakdown = consumptions.reduce((acc: any, consumption) => {
    consumption.consumptionItems.forEach(item => {
      const category = item.material.category.name
      acc[category] = (acc[category] || 0) + Number(item.quantity)
    })
    return acc
  }, {})

  // Group by project
  const projectBreakdown = consumptions.reduce((acc: any, consumption) => {
    const project = consumption.projectName || 'No Project'
    acc[project] = (acc[project] || 0) + 1
    return acc
  }, {})

  // Daily consumption trend
  const dailyTrend = await getDailyConsumptionTrend(startDate, endDate)

  // Total value
  const totalValue = consumptions.reduce((sum, c) =>
    sum + (Number(c.totalValue) || 0), 0
  )

  return {
    categoryBreakdown,
    projectBreakdown,
    dailyTrend,
    totalConsumptions: consumptions.length,
    totalValue,
    averageValuePerConsumption: consumptions.length > 0 ? totalValue / consumptions.length : 0
  }
}

// Inventory Status
async function getInventoryStatus() {
  const [tools, materials] = await Promise.all([
    prisma.tool.findMany({
      include: {
        category: true,
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
      include: { category: true }
    })
  ])

  // Tool condition breakdown
  const toolConditionBreakdown = tools.reduce((acc: any, tool) => {
    acc[tool.condition] = (acc[tool.condition] || 0) + 1
    return acc
  }, {})

  // Tool category breakdown
  const toolCategoryBreakdown = tools.reduce((acc: any, tool) => {
    acc[tool.category.name] = (acc[tool.category.name] || 0) + 1
    return acc
  }, {})

  // Material stock status
  const materialStockStatus = materials.reduce((acc: any, material) => {
    const currentQty = Number(material.currentQuantity)
    const thresholdQty = Number(material.thresholdQuantity)
    const status = currentQty <= 0 ? 'out' :
                  currentQty <= thresholdQty ? 'low' : 'normal'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  // Tools utilization
  const toolsInUse = tools.filter(tool => tool._count.borrowingItems > 0).length
  const utilizationRate = tools.length > 0 ? (toolsInUse / tools.length) * 100 : 0

  return {
    tools: {
      total: tools.length,
      inUse: toolsInUse,
      available: tools.length - toolsInUse,
      utilizationRate,
      conditionBreakdown: toolConditionBreakdown,
      categoryBreakdown: toolCategoryBreakdown
    },
    materials: {
      total: materials.length,
      stockStatus: materialStockStatus,
      lowStock: materialStockStatus.low || 0,
      outOfStock: materialStockStatus.out || 0
    }
  }
}

// User Activity
async function getUserActivity(startDate: Date, endDate: Date) {
  // User activity analytics removed (no user references)
  return {
    borrowingUserActivity: {},
    consumptionUserActivity: {},
    departmentActivity: {},
    totalActiveUsers: 0
  }
}

// Helper functions for daily trends
async function getDailyTrends(startDate: Date, endDate: Date) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const trends = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)

    const [borrowings, consumptions] = await Promise.all([
      prisma.borrowingTransaction.count({
        where: { createdAt: { gte: date, lt: nextDate } }
      }),
      prisma.consumptionTransaction.count({
        where: { createdAt: { gte: date, lt: nextDate } }
      })
    ])

    trends.push({
      date: date.toISOString().split('T')[0],
      borrowings,
      consumptions
    })
  }

  return trends
}

async function getDailyBorrowingTrend(startDate: Date, endDate: Date) {
  // Similar implementation to getDailyTrends but more detailed for borrowings
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const trends = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)

    const count = await prisma.borrowingTransaction.count({
      where: { createdAt: { gte: date, lt: nextDate } }
    })

    trends.push({
      date: date.toISOString().split('T')[0],
      count
    })
  }

  return trends
}

async function getDailyConsumptionTrend(startDate: Date, endDate: Date) {
  // Similar implementation for consumptions
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 1000))
  const trends = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)

    const count = await prisma.consumptionTransaction.count({
      where: { createdAt: { gte: date, lt: nextDate } }
    })

    trends.push({
      date: date.toISOString().split('T')[0],
      count
    })
  }

  return trends
}
