import { PrismaClient, Prisma, ToolCondition } from '@prisma/client'

const prisma = new PrismaClient()

// Type for creating a tool with units
type ToolCreateWithUnits = Prisma.ToolCreateInput & {
  units?: {
    create: Array<{
      unitNumber: number;
      condition: ToolCondition;
      isAvailable: boolean;
      notes?: string;
    }>;
  };
};

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create categories
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
    { name: 'Peralatan Lapangan', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk operasional lapangan' },
    { name: 'Peralatan Kantor', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk kebutuhan kantor' },
    { name: 'Peralatan Jaringan', type: CATEGORY_TYPE.MATERIAL, description: 'Material untuk kebutuhan jaringan' }
  ]) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name, type: cat.type } });
    if (existing) {
      categories.push(existing);
    } else {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          description: cat.description
        }
      });
      categories.push(created);
    }
  }

  // Create tools with units
  console.log('Creating tools with units...')
  const toolsData: ToolCreateWithUnits[] = [
    {
      name: 'Kunci Angin',
      categoryId: categories[0].id,
      totalQuantity: 10,
      availableQuantity: 8,
      location: 'Warehouse A',
      supplier: 'Tool Corp',
      purchasePrice: new Prisma.Decimal(1500000),
      units: {
        create: [
          ...Array(5).fill(null).map((_, i) => ({
            unitNumber: i + 1,
            condition: ToolCondition.GOOD,
            isAvailable: true
          })),
          ...Array(3).fill(null).map((_, i) => ({
            unitNumber: i + 6,
            condition: ToolCondition.EXCELLENT,
            isAvailable: true
          })),
          ...Array(2).fill(null).map((_, i) => ({
            unitNumber: i + 9,
            condition: ToolCondition.FAIR,
            isAvailable: false
          }))
        ]
      }
    },
    {
      name: 'Set Bor',
      categoryId: categories[1].id,
      totalQuantity: 15,
      availableQuantity: 15,
      location: 'Warehouse A',
      supplier: 'Tool Corp',
      purchasePrice: new Prisma.Decimal(2500000),
      units: {
        create: [
          ...Array(10).fill(null).map((_, i) => ({
            unitNumber: i + 1,
            condition: ToolCondition.EXCELLENT,
            isAvailable: true
          })),
          ...Array(5).fill(null).map((_, i) => ({
            unitNumber: i + 11,
            condition: ToolCondition.GOOD,
            isAvailable: true
          }))
        ]
      }
    },
    {
      name: 'Meteran',
      categoryId: categories[2].id,
      totalQuantity: 25,
      availableQuantity: 22,
      location: 'Warehouse B',
      supplier: 'Precision Tools Ltd',
      purchasePrice: new Prisma.Decimal(150000),
      units: {
        create: [
          ...Array(12).fill(null).map((_, i) => ({
            unitNumber: i + 1,
            condition: ToolCondition.GOOD,
            isAvailable: true
          })),
          ...Array(10).fill(null).map((_, i) => ({
            unitNumber: i + 13,
            condition: ToolCondition.EXCELLENT,
            isAvailable: true
          })),
          ...Array(3).fill(null).map((_, i) => ({
            unitNumber: i + 23,
            condition: ToolCondition.FAIR,
            isAvailable: false
          }))
        ]
      }
    }
  ];

  const tools = await Promise.all(
    toolsData.map(data =>
      prisma.tool.create({
        data: data,
        include: {
          units: true
        }
      })
    )
  );

  // Create materials
  console.log('Creating materials...')
  const materials = await Promise.all([
    prisma.material.create({
      data: {
        name: 'Besi Beton',
        categoryId: categories[3].id,
        currentQuantity: new Prisma.Decimal(150),
        thresholdQuantity: new Prisma.Decimal(50),
        unit: 'kg',
        location: 'Storage Section B-12',
        supplier: 'Materials Ltd',
        unitPrice: new Prisma.Decimal(15000)
      }
    }),
    prisma.material.create({
      data: {
        name: 'Semen Cor',
        categoryId: categories[4].id,
        currentQuantity: new Prisma.Decimal(500),
        thresholdQuantity: new Prisma.Decimal(100),
        unit: 'kg',
        location: 'Storage Section A-5',
        supplier: 'Materials Ltd',
        unitPrice: new Prisma.Decimal(12000)
      }
    }),
    prisma.material.create({
      data: {
        name: 'Kabel Jaringan',
        categoryId: categories[5].id,
        currentQuantity: new Prisma.Decimal(1000),
        thresholdQuantity: new Prisma.Decimal(200),
        unit: 'meter',
        location: 'Network Storage',
        supplier: 'Network Supply Co',
        unitPrice: new Prisma.Decimal(25000)
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