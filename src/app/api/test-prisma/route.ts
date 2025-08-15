import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/test-prisma - Test prisma connection
export async function GET(request: NextRequest) {
  try {
    console.log('Testing Prisma connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('Prisma connected successfully')
    
    // Test simple query
    const userCount = await prisma.user.count()
    console.log('User count:', userCount)
    
    const toolCount = await prisma.tool.count()
    console.log('Tool count:', toolCount)
    
    const materialCount = await prisma.material.count()
    console.log('Material count:', materialCount)
    
    return NextResponse.json({
      success: true,
      message: 'Prisma test successful',
      data: {
        users: userCount,
        tools: toolCount,
        materials: materialCount
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Prisma test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Prisma test failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
