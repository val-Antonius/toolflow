import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'

// GET /api/health - Health check endpoint
export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Get basic stats
    const [toolCount, materialCount] = await Promise.all([
      prisma.tool.count().catch(() => 0),
      prisma.material.count().catch(() => 0)
    ])

    return successResponse({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      stats: {
        tools: toolCount,
        materials: materialCount
      }
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return errorResponse('Service unhealthy', 503)
  }
}
