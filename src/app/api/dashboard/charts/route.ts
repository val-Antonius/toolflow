import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleDatabaseError } from '@/lib/api-utils'

// GET /api/dashboard/charts - Get chart data for dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const months = Math.min(12, Math.max(1, parseInt(searchParams.get('months') || '6')))
    const filter = searchParams.get('filter') || 'tools'

    console.log(`Chart API: Fetching ${filter} data for ${months} months`)

    // Calculate date ranges for the specified months
    const now = new Date()
    const monthsData = []
    
    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      
      monthsData.push({
        month: startDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        startDate,
        endDate
      })
    }

    let chartData = []

    switch (filter) {
      case 'tools':
        chartData = await getToolsComparisonData(monthsData)
        break
      case 'materials':
        chartData = await getMaterialsComparisonData(monthsData)
        break
      case 'borrowing':
        chartData = await getBorrowingComparisonData(monthsData)
        break
      case 'conditions':
        chartData = await getConditionsComparisonData(monthsData)
        break
      default:
        chartData = await getToolsComparisonData(monthsData)
    }

    return successResponse({
      filter,
      months,
      data: chartData
    })
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return handleDatabaseError(error as any)
  }
}

// Get tools comparison data
async function getToolsComparisonData(monthsData: any[]) {
  const data = []
  
  for (const monthInfo of monthsData) {
    // Get tools created in this month
    const toolsCreated = await prisma.tool.count({
      where: {
        createdAt: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        }
      }
    })

    // Get total tools at end of month
    const totalTools = await prisma.tool.count({
      where: {
        createdAt: {
          lte: monthInfo.endDate
        }
      }
    })

    data.push({
      month: monthInfo.month,
      created: toolsCreated,
      total: totalTools
    })
  }

  return data
}

// Get materials comparison data
async function getMaterialsComparisonData(monthsData: any[]) {
  const data = []
  
  for (const monthInfo of monthsData) {
    // Get materials created in this month
    const materialsCreated = await prisma.material.count({
      where: {
        createdAt: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        }
      }
    })

    // Get total materials at end of month
    const totalMaterials = await prisma.material.count({
      where: {
        createdAt: {
          lte: monthInfo.endDate
        }
      }
    })

    // Get consumption in this month
    const consumptionTransactions = await prisma.consumptionTransaction.count({
      where: {
        consumptionDate: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        }
      }
    })

    data.push({
      month: monthInfo.month,
      created: materialsCreated,
      total: totalMaterials,
      consumed: consumptionTransactions
    })
  }

  return data
}

// Get borrowing activities comparison data
async function getBorrowingComparisonData(monthsData: any[]) {
  const data = []
  
  for (const monthInfo of monthsData) {
    // Get borrowing transactions in this month
    const borrowingTransactions = await prisma.borrowingTransaction.count({
      where: {
        borrowDate: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        }
      }
    })

    // Get returns in this month
    const returns = await prisma.borrowingTransaction.count({
      where: {
        returnDate: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        },
        status: 'COMPLETED'
      }
    })

    // Get overdue in this month
    const overdue = await prisma.borrowingTransaction.count({
      where: {
        dueDate: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        },
        status: 'OVERDUE'
      }
    })

    data.push({
      month: monthInfo.month,
      borrowed: borrowingTransactions,
      returned: returns,
      overdue: overdue
    })
  }

  return data
}

// Get tool conditions comparison data
async function getConditionsComparisonData(monthsData: any[]) {
  const data = []
  
  for (const monthInfo of monthsData) {
    // Get poor condition returns in this month
    const poorReturns = await prisma.borrowingItem.count({
      where: {
        returnDate: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        },
        returnCondition: 'POOR'
      }
    })

    // Get fair condition returns in this month
    const fairReturns = await prisma.borrowingItem.count({
      where: {
        returnDate: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        },
        returnCondition: 'FAIR'
      }
    })

    // Get good condition returns in this month
    const goodReturns = await prisma.borrowingItem.count({
      where: {
        returnDate: {
          gte: monthInfo.startDate,
          lte: monthInfo.endDate
        },
        returnCondition: {
          in: ['GOOD', 'EXCELLENT']
        }
      }
    })

    data.push({
      month: monthInfo.month,
      poor: poorReturns,
      fair: fairReturns,
      good: goodReturns
    })
  }

  return data
}
