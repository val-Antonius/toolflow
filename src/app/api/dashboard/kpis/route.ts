import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleDatabaseError } from '@/lib/api-utils'

// GET /api/dashboard/kpis - Get dashboard KPI metrics
export async function GET(request: NextRequest) {
  try {
    console.log('KPI API: Starting to fetch dashboard KPIs...')

    // Parallel queries for better performance
    const [
      tools,
      totalMaterials,
    ] = await Promise.all([
      // Get all tools with their units and conditions
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
      // Get total materials count
      prisma.material.count(),
    ])

    // Calculate tool and unit statistics
    const toolStats = tools.reduce((acc, tool) => {
      acc.totalTools++;
      tool.units.forEach(unit => {
        acc.totalUnits++;
        if (unit.condition === "FAIR" || unit.condition === "POOR") {
          acc.fairAndPoorCondition++;
        }
      });
      return acc;
    }, {
      totalTools: 0,
      totalUnits: 0,
      fairAndPoorCondition: 0
    });

    const kpis = [
      {
        title: "Total Tools",
        value: toolStats.totalTools.toString(),
        icon: "wrench",
        description: `${tools.length} different tool types`
      },
      {
        title: "Total Units",
        value: toolStats.totalUnits.toString(),
        icon: "package",
        description: "Total tool units available"
      },
      {
        title: "Fair & Poor Condition",
        value: toolStats.fairAndPoorCondition.toString(),
        icon: "alert-triangle",
        description: "Units needing attention"
      },
      {
        title: "Total Materials",
        value: totalMaterials.toString(),
        icon: "package",
        description: "Different material types"
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
