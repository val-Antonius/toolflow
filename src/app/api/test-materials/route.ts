import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/test-materials - Test materials query
export async function GET() {
  try {
    console.log('Testing materials query...')
    
    // Test simple materials query without complex filtering
    const materials = await prisma.material.findMany({
      take: 5,
      include: {
        category: {
          select: { name: true, type: true }
        }
      }
    })
    
    console.log('Materials found:', materials.length)
    
    // Convert Decimal to number for JSON serialization
    const materialsWithNumbers = materials.map(material => ({
      ...material,
      currentQuantity: Number(material.currentQuantity),
      thresholdQuantity: Number(material.thresholdQuantity),
      unitPrice: material.unitPrice ? Number(material.unitPrice) : null
    }))
    
    return NextResponse.json({
      success: true,
      message: 'Materials test successful',
      data: materialsWithNumbers,
      count: materials.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Materials test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Materials test failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
