import { prisma } from '@/lib/prisma';

/**
 * Utility functions for generating display IDs for various entities
 * Display ID formats:
 * - Tools: TL-001, TL-002, etc.
 * - Materials: MT-001, MT-002, etc.
 * - Borrowing Transactions: BR-2024-001, BR-2024-002, etc.
 * - Consumption Transactions: CS-2024-001, CS-2024-002, etc.
 */

/**
 * Generate next display ID for tools
 * Format: TL-001, TL-002, etc.
 */
export async function generateToolDisplayId(): Promise<string> {
  try {
    // Get the latest tool with displayId
    const latestTool = await prisma.tool.findFirst({
      where: {
        displayId: {
          not: null,
          startsWith: 'TL-'
        }
      },
      orderBy: {
        displayId: 'desc'
      },
      select: {
        displayId: true
      }
    });

    let nextNumber = 1;
    
    if (latestTool?.displayId) {
      // Extract number from displayId (e.g., "TL-001" -> 1)
      const match = latestTool.displayId.match(/TL-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `TL-${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating tool display ID:', error);
    // Fallback: use timestamp-based ID
    return `TL-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Generate next display ID for materials
 * Format: MT-001, MT-002, etc.
 */
export async function generateMaterialDisplayId(): Promise<string> {
  try {
    // Get the latest material with displayId
    const latestMaterial = await prisma.material.findFirst({
      where: {
        displayId: {
          not: null,
          startsWith: 'MT-'
        }
      },
      orderBy: {
        displayId: 'desc'
      },
      select: {
        displayId: true
      }
    });

    let nextNumber = 1;
    
    if (latestMaterial?.displayId) {
      // Extract number from displayId (e.g., "MT-001" -> 1)
      const match = latestMaterial.displayId.match(/MT-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `MT-${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating material display ID:', error);
    // Fallback: use timestamp-based ID
    return `MT-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Generate next display ID for borrowing transactions
 * Format: BR-2024-001, BR-2024-002, etc.
 */
export async function generateBorrowingDisplayId(): Promise<string> {
  try {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `BR-${currentYear}-`;

    // Get the latest borrowing transaction with displayId for current year
    const latestBorrowing = await prisma.borrowingTransaction.findFirst({
      where: {
        displayId: {
          not: null,
          startsWith: yearPrefix
        }
      },
      orderBy: {
        displayId: 'desc'
      },
      select: {
        displayId: true
      }
    });

    let nextNumber = 1;
    
    if (latestBorrowing?.displayId) {
      // Extract number from displayId (e.g., "BR-2024-001" -> 1)
      const match = latestBorrowing.displayId.match(/BR-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating borrowing display ID:', error);
    // Fallback: use timestamp-based ID
    const currentYear = new Date().getFullYear();
    return `BR-${currentYear}-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Generate next display ID for consumption transactions
 * Format: CS-2024-001, CS-2024-002, etc.
 */
export async function generateConsumptionDisplayId(): Promise<string> {
  try {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `CS-${currentYear}-`;

    // Get the latest consumption transaction with displayId for current year
    const latestConsumption = await prisma.consumptionTransaction.findFirst({
      where: {
        displayId: {
          not: null,
          startsWith: yearPrefix
        }
      },
      orderBy: {
        displayId: 'desc'
      },
      select: {
        displayId: true
      }
    });

    let nextNumber = 1;
    
    if (latestConsumption?.displayId) {
      // Extract number from displayId (e.g., "CS-2024-001" -> 1)
      const match = latestConsumption.displayId.match(/CS-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating consumption display ID:', error);
    // Fallback: use timestamp-based ID
    const currentYear = new Date().getFullYear();
    return `CS-${currentYear}-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Generate display ID for categories (if needed in the future)
 * Format: CAT-001, CAT-002, etc.
 */
export async function generateCategoryDisplayId(): Promise<string> {
  try {
    // Get the latest category with displayId
    const latestCategory = await prisma.category.findFirst({
      where: {
        // Note: Category model doesn't have displayId field yet
        // This is prepared for future use
        id: {
          not: undefined
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true
      }
    });

    // For now, just return a simple incremental ID
    // This can be enhanced when displayId is added to Category model
    const count = await prisma.category.count();
    return `CAT-${(count + 1).toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating category display ID:', error);
    // Fallback: use timestamp-based ID
    return `CAT-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Validate display ID format
 */
export function validateDisplayId(displayId: string, type: 'tool' | 'material' | 'borrowing' | 'consumption' | 'category'): boolean {
  const patterns = {
    tool: /^TL-\d{3}$/,
    material: /^MT-\d{3}$/,
    borrowing: /^BR-\d{4}-\d{3}$/,
    consumption: /^CS-\d{4}-\d{3}$/,
    category: /^CAT-\d{3}$/
  };

  return patterns[type].test(displayId);
}

/**
 * Generate display ID for tool unit
 * Format: {ToolDisplayId}-U{UnitNumber} (e.g., TL-001-U01, TL-002-U03)
 */
export function generateUnitDisplayId(toolDisplayId: string, unitNumber: number): string {
  if (!toolDisplayId) {
    // Fallback if tool doesn't have displayId yet
    return `UNIT-${unitNumber.toString().padStart(2, '0')}`;
  }

  return `${toolDisplayId}-U${unitNumber.toString().padStart(2, '0')}`;
}

/**
 * Generate display ID for tool unit with tool info
 * This version takes tool object and generates unit display ID
 */
export function generateUnitDisplayIdFromTool(
  tool: { displayId?: string | null; id: string },
  unitNumber: number
): string {
  const toolDisplayId = tool.displayId || `T-${tool.id.slice(0, 6)}`;
  return generateUnitDisplayId(toolDisplayId, unitNumber);
}

/**
 * Parse unit display ID to extract tool and unit info
 * Returns { toolDisplayId, unitNumber } or null if invalid format
 */
export function parseUnitDisplayId(unitDisplayId: string): { toolDisplayId: string; unitNumber: number } | null {
  // Match patterns like TL-001-U01, MT-002-U03, etc.
  const match = unitDisplayId.match(/^(.+)-U(\d+)$/);
  if (!match) {
    return null;
  }

  const [, toolDisplayId, unitNumberStr] = match;
  const unitNumber = parseInt(unitNumberStr, 10);

  if (isNaN(unitNumber)) {
    return null;
  }

  return { toolDisplayId, unitNumber };
}

/**
 * Get display ID or fallback to shortened regular ID
 */
export function getDisplayIdOrFallback(item: { displayId?: string | null; id: string }): string {
  return item.displayId || `${item.id.slice(0, 8)}...`;
}

/**
 * Get unit display ID or fallback
 */
export function getUnitDisplayIdOrFallback(
  unit: { unitNumber: number; id: string },
  tool: { displayId?: string | null; id: string }
): string {
  if (tool.displayId) {
    return generateUnitDisplayId(tool.displayId, unit.unitNumber);
  }

  // Fallback to unit number with tool ID prefix
  return `${tool.id.slice(0, 4)}-U${unit.unitNumber.toString().padStart(2, '0')}`;
}
