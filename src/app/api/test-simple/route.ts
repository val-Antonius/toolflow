import { NextResponse } from 'next/server'

// GET /api/test-simple - Simple test endpoint
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Simple API test successful',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Simple test error:', error)
    return NextResponse.json(
      { success: false, error: 'Simple test failed' },
      { status: 500 }
    )
  }
}
