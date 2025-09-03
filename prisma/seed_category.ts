import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create categories only
  console.log('Creating categories...')
  const categories = [];
  const CATEGORY_TYPE = {
    TOOL: 'TOOL',
    MATERIAL: 'MATERIAL'
  } as const;

  for (const cat of [
    { name: 'Peralatan Lapangan', type: CATEGORY_TYPE.TOOL, description: 'Peralatan untuk operasional lapangan' },
    { name: 'Peralatan Kantor', type: CATEGORY_TYPE.TOOL, description: 'Peralatan untuk kebutuhan kantor' },
    { name: 'Peralatan Jaringan', type: CATEGORY_TYPE.TOOL, description: 'Peralatan untuk kebutuhan jaringan' },
    { name: 'Material Lapangan', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk operasional lapangan' },
    { name: 'Material Kantor', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk kebutuhan kantor' },
    { name: 'Material Jaringan', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk kebutuhan jaringan' }
  ]) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name, type: cat.type } });
    if (existing) {
      categories.push(existing);
      console.log(`✓ Category "${cat.name}" already exists`);
    } else {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          description: cat.description
        }
      });
      categories.push(created);
      console.log(`✓ Created category "${cat.name}"`);
    }
  }

  console.log('✅ Database seeding completed successfully!')
  console.log(`Created: ${categories.length} categories`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })