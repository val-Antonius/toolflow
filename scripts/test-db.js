const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn', 'info'],
})

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Basic query successful:', result)
    
    // Test table existence
    const tables = await prisma.$queryRaw`SHOW TABLES`
    console.log('✅ Tables found:', tables.length)
    
    // Test count queries
    try {
      const toolCount = await prisma.tool.count()
      console.log('✅ Tool count:', toolCount)
    } catch (error) {
      console.log('❌ Tool count failed:', error.message)
    }
    
    try {
      const materialCount = await prisma.material.count()
      console.log('✅ Material count:', materialCount)
    } catch (error) {
      console.log('❌ Material count failed:', error.message)
    }
    
    try {
      const userCount = await prisma.user.count()
      console.log('✅ User count:', userCount)
    } catch (error) {
      console.log('❌ User count failed:', error.message)
    }
    
    console.log('🎉 Database test completed successfully!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
