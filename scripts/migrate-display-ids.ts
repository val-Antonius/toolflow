import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateDisplayIds() {
  try {
    // Tools
    const tools = await prisma.tool.findMany({ orderBy: { createdAt: 'asc' } });
    for (let i = 0; i < tools.length; i++) {
      await prisma.tool.update({
        where: { id: tools[i].id },
        data: { displayId: `TL-${(i + 1).toString().padStart(3, '0')}` }
      });
    }
    console.log(`✅ ${tools.length} tools migrated`);

    // Materials
    const materials = await prisma.material.findMany({ orderBy: { createdAt: 'asc' } });
    for (let i = 0; i < materials.length; i++) {
      await prisma.material.update({
        where: { id: materials[i].id },
        data: { displayId: `MT-${(i + 1).toString().padStart(3, '0')}` }
      });
    }
    console.log(`✅ ${materials.length} materials migrated`);

    // Borrowings
    const borrowings = await prisma.borrowingTransaction.findMany({ orderBy: { createdAt: 'asc' } });
    for (let i = 0; i < borrowings.length; i++) {
      const year = borrowings[i].createdAt.getFullYear();
      await prisma.borrowingTransaction.update({
        where: { id: borrowings[i].id },
        data: { displayId: `BR-${year}-${(i + 1).toString().padStart(3, '0')}` }
      });
    }
    console.log(`✅ ${borrowings.length} borrowings migrated`);

    // Consumptions
    const consumptions = await prisma.consumptionTransaction.findMany({ orderBy: { createdAt: 'asc' } });
    for (let i = 0; i < consumptions.length; i++) {
      const year = consumptions[i].createdAt.getFullYear();
      await prisma.consumptionTransaction.update({
        where: { id: consumptions[i].id },
        data: { displayId: `CS-${year}-${(i + 1).toString().padStart(3, '0')}` }
      });
    }
    console.log(`✅ ${consumptions.length} consumptions migrated`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDisplayIds();
}

export { migrateDisplayIds };
