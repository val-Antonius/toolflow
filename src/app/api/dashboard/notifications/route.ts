import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, handleDatabaseError } from '@/lib/api-utils'

// GET /api/dashboard/notifications - Get system notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    const now = new Date()
    const notifications: any[] = []

    // Get overdue borrowings
    const overdueBorrowings: any[] = await prisma.borrowingTransaction.findMany({
      where: {
        status: 'OVERDUE',
        dueDate: { lt: now }
      },
      include: {
        borrowingItems: {
          include: {
            tool: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 5
    })

    // Add overdue notifications
  overdueBorrowings.forEach((borrowing: any) => {
      const daysPastDue = Math.floor((now.getTime() - borrowing.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const itemsText = (borrowing.borrowingItems || [])
        .map((item: any) => item.tool?.name || '-')
        .join(', ')

      notifications.push({
        id: `overdue-${borrowing.id}`,
        type: "overdue",
        title: "Pengembalian Terlambat",
        message: `${itemsText} yang dipinjam ${borrowing.borrowerName || '-'} sudah terlambat ${daysPastDue} hari`,
        priority: daysPastDue > 7 ? "high" : "medium",
        time: `${daysPastDue} hari yang lalu`,
        createdAt: borrowing.dueDate
      })
    })

    // Get low stock materials using raw query
    const lowStockMaterialsRaw: any[] = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      currentQuantity: number;
      thresholdQuantity: number;
      unit: string;
      updatedAt: Date;
    }>>`
      SELECT id, name, currentQuantity, thresholdQuantity, unit, updatedAt
      FROM materials
      WHERE currentQuantity <= thresholdQuantity
      ORDER BY currentQuantity ASC
      LIMIT 5
    `

    // Add low stock notifications
  lowStockMaterialsRaw.forEach((material: any) => {
      const isOutOfStock = material.currentQuantity <= 0

      notifications.push({
        id: `low-stock-${material.id}`,
        type: "low_stock",
        title: isOutOfStock ? "Stok Habis" : "Peringatan Stok Menipis",
        message: isOutOfStock
          ? `${material.name} sudah habis`
          : `Stok ${material.name} di bawah batas minimal (tersisa ${material.currentQuantity}${material.unit})`,
        priority: isOutOfStock ? "high" : "medium",
        time: "Hari ini",
        createdAt: material.updatedAt
      })
    })

    // Get recent poor condition returns
    const poorConditionReturns: any[] = await prisma.borrowingItem.findMany({
      where: {
        returnCondition: 'POOR',
        returnDate: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        tool: {
          select: { name: true }
        },
        borrowingTransaction: {
          select: {
            borrowerName: true
          }
        }
      },
      orderBy: { returnDate: 'desc' },
      take: 3
    })

    // Add damaged item notifications
  poorConditionReturns.forEach((item: any) => {
      const daysAgo = Math.floor((now.getTime() - (item.returnDate?.getTime() || 0)) / (1000 * 60 * 60 * 24))

      notifications.push({
        id: `damaged-${item.id}`,
        type: "damaged",
        title: "Laporan Barang Rusak",
        message: `${item.tool?.name || '-'} dikembalikan dalam kondisi buruk oleh ${item.borrowingTransaction?.borrowerName || '-'}`,
        priority: "high",
        time: daysAgo === 0 ? "Hari ini" : `${daysAgo} hari yang lalu`,
        createdAt: item.returnDate
      })
    })

    // Add system notification (placeholder)
    notifications.push({
      id: "system-sync",
      type: "system",
      title: "Pembaruan Sistem",
      message: "Sinkronisasi inventori berhasil diselesaikan",
      priority: "low",
      time: "1 hari yang lalu",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    })

    // Sort by priority and time, then limit
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const sortedNotifications = notifications
      .sort((a, b) => {
        // First sort by priority
        const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
        if (priorityDiff !== 0) return priorityDiff

        // Then by creation time
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, limit)
      .map(({ createdAt, ...notification }) => notification) // Remove createdAt from response

    return successResponse(sortedNotifications)
  } catch (error) {
    console.error('Error fetching dashboard notifications:', error)
    return handleDatabaseError(error as any)
  }
}
