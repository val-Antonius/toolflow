import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { CreateConsumptionSchema } from '@/lib/validations'

import {
  successResponse,
  handleDatabaseError,
  logActivity,
  buildSearchFilter,
  buildSortOrder,
  getPaginationParams,
  checkMaterialStock,
  validateRequest
} from '@/lib/api-utils'
import { generateConsumptionDisplayId } from '@/lib/display-id-utils'

// Type definitions for consumption queries
type ConsumptionWithItems = Prisma.ConsumptionTransactionGetPayload<{
  include: {
    consumptionItems: {
      include: {
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: { select: { name: true } },
          },
        },
      },
    },
  },
}>

type ConsumptionItemWithMaterial = Prisma.ConsumptionItemGetPayload<{
  include: {
    material: {
      select: {
        id: true,
        name: true,
        unit: true,
        category: { select: { name: true } },
      },
    },
  },
}>

// GET /api/consumptions - Get all consumption transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const search = searchParams.get('search') || undefined;
    const projectName = searchParams.get('projectName') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Build filters
    const where: Prisma.ConsumptionTransactionWhereInput = {
      ...buildSearchFilter(search, ['purpose', 'projectName', 'consumerName']),
    };
    if (projectName) {
      where.projectName = {
        contains: projectName,
        mode: 'insensitive',
      };
    }

    // Get consumptions with pagination
    const [consumptions, total] = await Promise.all([
      prisma.consumptionTransaction.findMany({
        where,
        orderBy: buildSortOrder(sortBy, sortOrder),
        skip,
        take: limit,
        include: {
          consumptionItems: {
            include: {
              material: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.consumptionTransaction.count({ where }),
    ]);

    // Add computed fields
    const consumptionsWithTotals = consumptions.map((consumption: ConsumptionWithItems) => ({
      ...consumption,
      totalItems: consumption.consumptionItems?.length || 0,
      totalQuantity: (consumption.consumptionItems || []).reduce((sum: number, item: ConsumptionItemWithMaterial) => sum + Number(item.quantity), 0),
      calculatedTotalValue: (consumption.consumptionItems || []).reduce(
        (sum: number, item: ConsumptionItemWithMaterial) => sum + (Number(item.totalValue) || 0), 0
      ),
    }));

    const totalPages = Math.ceil((total || 0) / limit);

    return successResponse(consumptionsWithTotals, undefined, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching consumptions:', error);
    return handleDatabaseError(error);
  }
}

// POST /api/consumptions - Create new consumption transaction
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, CreateConsumptionSchema)
    if (!validation.success) {
      return validation.response
    }

    const { consumerName, purpose, projectName, notes, items } = validation.data

    // Check material stock for all items
    const materialChecks = await Promise.all(
      items.map(async (item) => {
        try {
          const material = await checkMaterialStock(item.materialId, item.quantity)
          return { ...item, material }
        } catch (error) {
          throw new Error(`${error}`)
        }
      })
    )

    // Calculate total value
    const totalValue = items.reduce((sum, item) => {
      const itemTotal = item.unitPrice ? item.quantity * item.unitPrice : 0
      return sum + itemTotal
    }, 0)

    // Generate display ID
    const displayId = await generateConsumptionDisplayId();

    // Create consumption transaction
    const consumption = await prisma.$transaction(async (tx) => {
      // Create consumption transaction
      const newConsumption = await tx.consumptionTransaction.create({
        data: {
          displayId,
          consumerName,
          purpose,
          projectName,
          notes,
          totalValue: totalValue > 0 ? totalValue : null,
        },
      })

      // Create consumption items and update material stock
      const consumptionItems = await Promise.all(
        materialChecks.map(async (item) => {
          const itemTotalValue = item.unitPrice ? item.quantity * item.unitPrice : null

          // Create consumption item
          const consumptionItem = await tx.consumptionItem.create({
            data: {
              consumptionTransactionId: newConsumption.id,
              materialId: item.materialId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalValue: itemTotalValue,
              notes: item.notes,
            },
          })

          // Update material stock
          await tx.material.update({
            where: { id: item.materialId },
            data: {
              currentQuantity: {
                decrement: item.quantity,
              },
            },
          })

          return consumptionItem
        })
      )

      return { ...newConsumption, consumptionItems }
    })

    // Log activity
    await logActivity(
      'CONSUMPTION_TRANSACTION',
      consumption.id,
      'CONSUME',
      consumerName,
      undefined,
      consumption,
      {
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: totalValue,
      }
    )

    // Fetch complete consumption data for response
    const completeConsumption = await prisma.consumptionTransaction.findUnique({
      where: { id: consumption.id },
      include: {
        consumptionItems: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    return successResponse(completeConsumption, 'Consumption transaction created successfully')
  } catch (error) {
    console.error('Error creating consumption:', error)
    return handleDatabaseError(error)
  }
}
