import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '50', 10),
      100
    )

    const movements = await prisma.stockMovement.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: {
          select: { name: true },
        },
      },
    })

    // Fetch matching inventory items for readable names
    const itemIds = Array.from(new Set(movements.map((m) => m.inventoryItemId)))
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, sku: true, unit: true },
    })

    const itemMap = new Map(items.map((i) => [i.id, i]))

    const formatted = movements.map((m) => {
      const item = itemMap.get(m.inventoryItemId)
      return {
        id: m.id,
        inventoryItemId: m.inventoryItemId,
        itemName: item?.name || 'Raw Ingredient',
        sku: item?.sku || 'RAW',
        unit: item?.unit || 'kg',
        quantity: Number(m.quantity),
        movementType: m.movementType,
        referenceId: m.referenceId,
        referenceType: m.referenceType,
        notes: m.notes,
        createdAt: m.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (error: any) {
    console.error('Failed to fetch stock movements:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}

