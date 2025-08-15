import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create categories
  console.log('Creating categories...')
  const toolCategories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Power Tools',
        type: 'TOOL',
        description: 'Electric and battery-powered tools'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Hand Tools',
        type: 'TOOL',
        description: 'Manual tools and equipment'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Measuring Tools',
        type: 'TOOL',
        description: 'Measurement and precision tools'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Safety Equipment',
        type: 'TOOL',
        description: 'Personal protective equipment'
      }
    })
  ])

  const materialCategories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Construction Materials',
        type: 'MATERIAL',
        description: 'Building and construction materials'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Electrical Materials',
        type: 'MATERIAL',
        description: 'Electrical components and wiring'
      }
    })
  ])

  // Create tools
  console.log('Creating tools...')
  const tools = await Promise.all([
    prisma.tool.create({
      data: {
        name: 'Kunci Angin',
        categoryId: toolCategories[0].id, // Power Tools
        condition: 'GOOD',
        totalQuantity: 10,
        availableQuantity: 8,
        location: 'Warehouse A',
        supplier: 'Tool Corp',
        purchasePrice: 1500000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Set Bor',
        categoryId: toolCategories[0].id, // Power Tools
        condition: 'EXCELLENT',
        totalQuantity: 15,
        availableQuantity: 15,
        location: 'Warehouse A',
        supplier: 'Tool Corp',
        purchasePrice: 2500000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Meteran',
        categoryId: toolCategories[2].id, // Measuring Tools
        condition: 'GOOD',
        totalQuantity: 25,
        availableQuantity: 22,
        location: 'Warehouse B',
        supplier: 'Precision Tools Ltd',
        purchasePrice: 150000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Perlengkapan Keselamatan',
        categoryId: toolCategories[3].id, // Safety Equipment
        condition: 'GOOD',
        totalQuantity: 10,
        availableQuantity: 7,
        location: 'Safety Storage',
        supplier: 'Safety First Inc',
        purchasePrice: 500000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Gergaji Listrik',
        categoryId: toolCategories[0].id, // Power Tools
        condition: 'GOOD',
        totalQuantity: 5,
        availableQuantity: 4,
        location: 'Warehouse A',
        supplier: 'Tool Corp',
        purchasePrice: 3500000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Obeng Set',
        categoryId: toolCategories[1].id, // Hand Tools
        condition: 'GOOD',
        totalQuantity: 20,
        availableQuantity: 20,
        location: 'Warehouse B',
        supplier: 'Handy Tools',
        purchasePrice: 200000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Tang Kombinasi',
        categoryId: toolCategories[1].id, // Hand Tools
        condition: 'GOOD',
        totalQuantity: 18,
        availableQuantity: 18,
        location: 'Warehouse B',
        supplier: 'Handy Tools',
        purchasePrice: 180000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Waterpass',
        categoryId: toolCategories[2].id, // Measuring Tools
        condition: 'GOOD',
        totalQuantity: 12,
        availableQuantity: 12,
        location: 'Warehouse B',
        supplier: 'Precision Tools Ltd',
        purchasePrice: 120000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Helm Safety',
        categoryId: toolCategories[3].id, // Safety Equipment
        condition: 'GOOD',
        totalQuantity: 30,
        availableQuantity: 30,
        location: 'Safety Storage',
        supplier: 'Safety First Inc',
        purchasePrice: 100000
      }
    }),
    prisma.tool.create({
      data: {
        name: 'Sepatu Boot',
        categoryId: toolCategories[3].id, // Safety Equipment
        condition: 'GOOD',
        totalQuantity: 15,
        availableQuantity: 15,
        location: 'Safety Storage',
        supplier: 'Safety First Inc',
        purchasePrice: 250000
      }
    })
  ])

  // Create materials
  console.log('Creating materials...')
  const materials = await Promise.all([
    prisma.material.create({
      data: {
        name: 'Besi Beton',
        categoryId: materialCategories[0].id, // Construction Materials
        currentQuantity: 150,
        thresholdQuantity: 50,
        unit: 'kg',
        location: 'Storage Section B-12',
        supplier: 'Materials Ltd',
        unitPrice: 15000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Semen Cor',
        categoryId: materialCategories[0].id, // Construction Materials
        currentQuantity: 500,
        thresholdQuantity: 100,
        unit: 'kg',
        location: 'Storage Section A-5',
        supplier: 'Materials Ltd',
        unitPrice: 12000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Kabel Listrik',
        categoryId: materialCategories[1].id, // Electrical Materials
        currentQuantity: 1000,
        thresholdQuantity: 200,
        unit: 'meter',
        location: 'Electrical Storage',
        supplier: 'Electric Supply Co',
        unitPrice: 25000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Kawat Las',
        categoryId: materialCategories[1].id, // Electrical Materials
        currentQuantity: 25,
        thresholdQuantity: 50,
        unit: 'kg',
        location: 'Welding Section',
        supplier: 'Welding Supplies Inc',
        unitPrice: 45000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Paku Beton',
        categoryId: materialCategories[0].id, // Construction Materials
        currentQuantity: 200,
        thresholdQuantity: 40,
        unit: 'box',
        location: 'Storage Section B-10',
        supplier: 'Materials Ltd',
        unitPrice: 30000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Cat Tembok',
        categoryId: materialCategories[0].id, // Construction Materials
        currentQuantity: 60,
        thresholdQuantity: 20,
        unit: 'can',
        location: 'Storage Section C-2',
        supplier: 'Paint Supplies',
        unitPrice: 80000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Pipa PVC',
        categoryId: materialCategories[1].id, // Electrical Materials
        currentQuantity: 120,
        thresholdQuantity: 30,
        unit: 'meter',
        location: 'Plumbing Storage',
        supplier: 'Plumbing Co',
        unitPrice: 20000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Batu Bata',
        categoryId: materialCategories[0].id, // Construction Materials
        currentQuantity: 1000,
        thresholdQuantity: 200,
        unit: 'pcs',
        location: 'Storage Section D-1',
        supplier: 'Materials Ltd',
        unitPrice: 1000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Triplek',
        categoryId: materialCategories[0].id, // Construction Materials
        currentQuantity: 80,
        thresholdQuantity: 20,
        unit: 'sheet',
        location: 'Storage Section E-3',
        supplier: 'Wood Supplies',
        unitPrice: 70000
      }
    }),
    prisma.material.create({
      data: {
        name: 'Siku Besi',
        categoryId: materialCategories[0].id, // Construction Materials
        currentQuantity: 60,
        thresholdQuantity: 15,
        unit: 'batang',
        location: 'Storage Section F-4',
        supplier: 'Materials Ltd',
        unitPrice: 40000
      }
    })
  ])

  console.log('✅ Database seeding completed successfully!')
  console.log(`Created:
  - ${toolCategories.length + materialCategories.length} categories
  - ${tools.length} tools
  - ${materials.length} materials`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
