const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:3000'

async function testAPI() {
  console.log('🧪 Testing API endpoints...')
  
  try {
    // Test simple endpoint
    console.log('\n1. Testing simple endpoint...')
    const simpleResponse = await fetch(`${BASE_URL}/api/test-simple`)
    const simpleData = await simpleResponse.json()
    console.log('✅ Simple test:', simpleData.success ? 'PASSED' : 'FAILED')
    
    // Test prisma endpoint
    console.log('\n2. Testing Prisma endpoint...')
    const prismaResponse = await fetch(`${BASE_URL}/api/test-prisma`)
    const prismaData = await prismaResponse.json()
    console.log('✅ Prisma test:', prismaData.success ? 'PASSED' : 'FAILED')
    if (prismaData.success) {
      console.log('   Data counts:', prismaData.data)
    } else {
      console.log('   Error:', prismaData.error)
    }
    
    // Test materials endpoint
    console.log('\n3. Testing Materials endpoint...')
    const materialsResponse = await fetch(`${BASE_URL}/api/test-materials`)
    const materialsData = await materialsResponse.json()
    console.log('✅ Materials test:', materialsData.success ? 'PASSED' : 'FAILED')
    if (materialsData.success) {
      console.log('   Materials found:', materialsData.count)
    } else {
      console.log('   Error:', materialsData.error)
    }
    
    // Test actual materials API
    console.log('\n4. Testing actual Materials API...')
    const actualMaterialsResponse = await fetch(`${BASE_URL}/api/materials`)
    if (actualMaterialsResponse.ok) {
      const actualMaterialsData = await actualMaterialsResponse.json()
      console.log('✅ Actual Materials API:', actualMaterialsData.success ? 'PASSED' : 'FAILED')
      if (actualMaterialsData.success) {
        console.log('   Materials count:', actualMaterialsData.data?.length || 0)
      }
    } else {
      console.log('❌ Actual Materials API: FAILED')
      console.log('   Status:', actualMaterialsResponse.status)
      const errorText = await actualMaterialsResponse.text()
      console.log('   Error preview:', errorText.substring(0, 200) + '...')
    }
    
    // Test tools API
    console.log('\n5. Testing Tools API...')
    const toolsResponse = await fetch(`${BASE_URL}/api/tools`)
    if (toolsResponse.ok) {
      const toolsData = await toolsResponse.json()
      console.log('✅ Tools API:', toolsData.success ? 'PASSED' : 'FAILED')
      if (toolsData.success) {
        console.log('   Tools count:', toolsData.data?.length || 0)
      }
    } else {
      console.log('❌ Tools API: FAILED')
      console.log('   Status:', toolsResponse.status)
      const errorText = await toolsResponse.text()
      console.log('   Error preview:', errorText.substring(0, 200) + '...')
    }
    
    console.log('\n🎉 API testing completed!')
    
  } catch (error) {
    console.error('❌ API testing failed:', error.message)
  }
}

testAPI()
