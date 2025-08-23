import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleDatabaseError } from '@/lib/api-utils'

// GET /api/dashboard/kpis - Get dashboard KPI metrics
export async function GET(request: NextRequest) {
  try {
    console.log('KPI API: Starting to fetch dashboard KPIs...')
    // Get date range for trend calculation (last 30 days vs previous 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Parallel queries for better performance
    const [
      tools,
      totalMaterials,
      activeBorrowings,
      overdueBorrowings,
      recentConsumptions,
      poorConditionReturns,
      // Previous period data for trends
      previousPeriodBorrowings,
      previousPeriodConsumptions,
      previousPeriodReturns,
    ] = await Promise.all([
      // Current totals with unit conditions
      prisma.tool.findMany({
        include: {
          units: {
            select: {
              condition: true,
              isAvailable: true
            }
          }
        }
      }),
      prisma.material.count(),
      prisma.borrowingTransaction.count({
        where: { status: 'ACTIVE' }
      }),
      prisma.borrowingTransaction.count({
        where: { status: 'OVERDUE' }
      }),
      prisma.consumptionTransaction.count({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.borrowingItem.count({
        where: {
          returnCondition: 'POOR',
          returnDate: { gte: thirtyDaysAgo }
        }
      }),

      // Previous period data for trend calculation
      prisma.borrowingTransaction.count({
        where: {
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      }),
      prisma.consumptionTransaction.count({
        where: {
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      }),
      prisma.borrowingItem.count({
        where: {
          returnCondition: 'POOR',
          returnDate: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      }),
    ])

    // Calculate trends (percentage change)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const borrowingTrend = calculateTrend(activeBorrowings + overdueBorrowings, previousPeriodBorrowings)
    const consumptionTrend = calculateTrend(recentConsumptions, previousPeriodConsumptions)
    const returnTrend = calculateTrend(poorConditionReturns, previousPeriodReturns)

    // Get additional metrics
    const [lowStockMaterials, toolsInUse, totalValue] = await Promise.all([
      // Count materials where current quantity is less than or equal to threshold
      prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count
        FROM materials
        WHERE currentQuantity <= thresholdQuantity
      `,
      // Count tools that are currently in use (available < total)
      prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count
        FROM tools
        WHERE availableQuantity < totalQuantity
      `,
      prisma.consumptionTransaction.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: {
          totalValue: true
        }
      })
    ])

    // Extract count values from raw query results
    const lowStockCount = Number(lowStockMaterials[0]?.count || 0)
    const toolsInUseCount = Number(toolsInUse[0]?.count || 0)

    // Calculate tool unit statistics
    const toolStats = tools.reduce((acc, tool) => {
      tool.units.forEach(unit => {
        if (unit.condition === "POOR") acc.poorCondition++;
        if (!unit.isAvailable) acc.inUse++;
      });
      return acc;
    }, { total: tools.reduce((sum, t) => sum + t.units.length, 0), poorCondition: 0, inUse: 0 });

    const kpis = [
      {
        title: "Total Tool Units",
        value: toolStats.total,
        trend: 0, // No trend for total inventory
        unit: "units"
      },
      {
        title: "Units In Use",
        value: toolStats.inUse,
        trend: 0,
        unit: "units"
      },
      {
        title: "Poor Condition Units",
        value: toolStats.poorCondition,
        trend: 0,
        unit: "units"
      },
      {
        title: "Total Materials",
        value: totalMaterials.toLocaleString(),
        trend: {
          value: Math.abs(consumptionTrend),
          isPositive: consumptionTrend >= 0
        },
        icon: "package",
        description: `${lowStockCount} materials below threshold`
      },
      {
        title: "Active Borrowings",
        value: (activeBorrowings + overdueBorrowings).toString(),
        trend: {
          value: Math.abs(borrowingTrend),
          isPositive: borrowingTrend <= 0 // Lower borrowings is better
        },
        icon: "arrow-right-left",
        description: `${overdueBorrowings} overdue`
      },
      {
        title: "Material Value",
        value: `Rp ${(Number(totalValue._sum.totalValue) || 0).toLocaleString()}`,
        trend: {
          value: Math.abs(consumptionTrend),
          isPositive: consumptionTrend >= 0
        },
        icon: "trending-up",
        description: "Consumed last 30 days"
      },
      {
        title: "Poor Condition Returns",
        value: poorConditionReturns.toString(),
        trend: {
          value: Math.abs(returnTrend),
          isPositive: returnTrend <= 0 // Lower poor returns is better
        },
        icon: "alert-triangle",
        description: "Last 30 days"
      }
    ]

    console.log('KPI API: Successfully generated KPIs:', kpis.length)
    return successResponse(kpis)
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error)
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', {
        message: (error as any).message,
        code: (error as any).code,
        stack: (error as any).stack
      })
    }
    return handleDatabaseError(error as any)
  }
}
