import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleDatabaseError } from '@/lib/api-utils'

interface Activity {
  id: string
  time: string
  activity: string
  user: string
  items: string
  status: string
  type: string
}

interface ActivityWithDate extends Activity {
  createdAt: Date
}

// GET /api/dashboard/activities - Get recent activities for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '5')))

    // Get recent borrowing and consumption activities
    const [recentBorrowings, recentConsumptions, recentReturns] = await Promise.all([
      // Recent borrowings
      prisma.borrowingTransaction.findMany({
        where: {
          status: { in: ['ACTIVE', 'OVERDUE'] }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          borrowingItems: {
            include: {
              tool: {
                select: { name: true }
              }
            }
          }
        }
      }),

      // Recent consumptions
      prisma.consumptionTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          consumptionItems: {
            include: {
              material: {
                select: { name: true, unit: true }
              }
            }
          }
        }
      }),

      // Recent returns
      prisma.borrowingTransaction.findMany({
        where: {
          status: 'COMPLETED',
          returnDate: { not: null }
        },
        orderBy: { returnDate: 'desc' },
        take: limit,
        include: {
          borrowingItems: {
            include: {
              tool: {
                select: { name: true }
              }
            }
          }
        }
      })
    ])

    // Transform and combine activities
    const activities: ActivityWithDate[] = []

    // Add borrowing activities
    recentBorrowings.forEach(borrowing => {
      const itemsText = borrowing.borrowingItems
        .map(item => `${item.tool.name} (x${item.quantity})`)
        .join(', ')

      activities.push({
        id: `borrow-${borrowing.id}`,
        time: borrowing.createdAt.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        activity: "Peminjaman Alat",
        user: borrowing.borrowerName || '-',
        items: itemsText,
        status: borrowing.status.toLowerCase(),
        type: 'borrowing',
        createdAt: borrowing.createdAt
      })
    })

    // Add consumption activities
    recentConsumptions.forEach(consumption => {
      const itemsText = consumption.consumptionItems
        .map(item => `${item.material.name} (${item.quantity}${item.material.unit})`)
        .join(', ')

      activities.push({
        id: `consume-${consumption.id}`,
        time: consumption.createdAt.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        activity: "Konsumsi Material",
        user: consumption.consumerName || '-',
        items: itemsText,
        status: 'completed',
        type: 'consumption',
        createdAt: consumption.createdAt
      })
    })

    // Add return activities
    recentReturns.forEach(borrowing => {
      const itemsText = borrowing.borrowingItems
        .map(item => `${item.tool.name} (x${item.quantity})`)
        .join(', ')

      activities.push({
        id: `return-${borrowing.id}`,
        time: borrowing.returnDate!.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        activity: "Pengembalian Alat",
        user: borrowing.borrowerName || '-',
        items: itemsText,
        status: 'completed',
        type: 'return',
        createdAt: borrowing.returnDate!
      })
    })

    // Sort by creation time and limit results
    const sortedActivities = activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(activity => ({
        id: activity.id,
        time: activity.time,
        activity: activity.activity,
        user: activity.user,
        items: activity.items,
        status: activity.status,
        type: activity.type
      }))

    return successResponse(sortedActivities)
  } catch (error) {
    console.error('Error fetching dashboard activities:', error)
    return handleDatabaseError(error)
  }
}
