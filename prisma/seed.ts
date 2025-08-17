import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create 3 fixed categories for both tools and materials
  console.log('Creating categories...')
  // Create categories only if not exist
  const categories = [];
  // Use correct enum for type field
  const CATEGORY_TYPE = {
    TOOL: 'TOOL',
    MATERIAL: 'MATERIAL'
  } as const;
  for (const cat of [
    { name: 'Peralatan Lapangan', type: CATEGORY_TYPE.TOOL, description: 'Peralatan untuk operasional lapangan' },
    { name: 'Peralatan Kantor', type: CATEGORY_TYPE.TOOL, description: 'Peralatan untuk kebutuhan kantor' },
    { name: 'Peralatan Jaringan', type: CATEGORY_TYPE.TOOL, description: 'Peralatan untuk kebutuhan jaringan' },
    { name: 'Peralatan Lapangan', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk operasional lapangan' },
    { name: 'Peralatan Kantor', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk kebutuhan kantor' },
    { name: 'Peralatan Jaringan', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk kebutuhan jaringan' }
  ]) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name, type: cat.type } });
    if (existing) {
      categories.push(existing);
    } else {
      const created = await prisma.category.create({ data: {
        name: cat.name,
        type: cat.type,
        description: cat.description
      }});
      categories.push(created);
    }
  }

  // Create tools
  console.log('Creating tools...')
  const tools = await Promise.all([
    prisma.tool.create({
      data: {
        name: 'Kunci Angin',
        categoryId: categories[0].id, // Peralatan Lapangan (TOOL)
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
        categoryId: categories[1].id, // Peralatan Kantor (TOOL)
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
        categoryId: categories[2].id, // Peralatan Jaringan (TOOL)
        condition: 'GOOD',
        totalQuantity: 25,
        availableQuantity: 22,
        location: 'Warehouse B',
        supplier: 'Precision Tools Ltd',
        purchasePrice: 150000
      }
    })
  ])

  // Create materials
  console.log('Creating materials...')
  const materials = await Promise.all([
    prisma.material.create({
      data: {
        name: 'Besi Beton',
        categoryId: categories[3].id, // Peralatan Lapangan (MATERIAL)
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
        categoryId: categories[4].id, // Peralatan Kantor (MATERIAL)
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
        name: 'Kabel Jaringan',
        categoryId: categories[5].id, // Peralatan Jaringan (MATERIAL)
        currentQuantity: 1000,
        thresholdQuantity: 200,
        unit: 'meter',
        location: 'Network Storage',
        supplier: 'Network Supply Co',
        unitPrice: 25000
      }
    })
  ])

  console.log('✅ Database seeding completed successfully!')
  console.log(`Created:
  - ${categories.length} categories
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
