import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  getRecipeForDish,
  RecipeIngredient,
  syncMenuAvailabilityFromInventory,
} from '@/lib/inventory-deduction'
import { invalidateAllMenuCaches } from '@/lib/menu-cache'

export const dynamic = 'force-dynamic'

export interface InventoryOptionItem {
  key: string
  name: string
  sku: string
  quantity: number
  unit: string
  source: 'inventory' | 'raw_material' | 'both'
  inventoryItemId?: string
  rawMaterialId?: string
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
}

async function getUnifiedInventoryOptions(): Promise<InventoryOptionItem[]> {
  const [invItems, rawMaterials] = await Promise.all([
    prisma.inventoryItem
      .findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      })
      .catch(() => []),
    prisma.rawMaterial
      .findMany({
        orderBy: { name: 'asc' },
      })
      .catch(() => []),
  ])

  const byKey = new Map<string, InventoryOptionItem>()

  for (const inv of invItems) {
    const qty = Number(inv.quantity ?? inv.quantityInStock ?? 0)
    const min = Number(inv.minStock ?? 5)
    const key = (inv.sku || inv.name).toLowerCase().trim()
    byKey.set(key, {
      key: `inv_${inv.id}`,
      name: inv.name || inv.itemName || 'Inventory Item',
      sku: inv.sku || '',
      quantity: qty,
      unit: inv.unit || inv.unitOfMeasure || 'kg',
      source: 'inventory',
      inventoryItemId: inv.id,
      status: qty <= 0 ? 'out-of-stock' : qty <= min ? 'low-stock' : 'in-stock',
    })
  }

  for (const raw of rawMaterials) {
    const qty = Number(raw.quantity ?? 0)
    const min = Number(raw.minThreshold ?? 10)
    const skuKey = (raw.sku || '').toLowerCase().trim()
    const nameKey = (raw.name || '').toLowerCase().trim()
    const existing = (skuKey && byKey.get(skuKey)) || byKey.get(nameKey)

    if (existing) {
      existing.rawMaterialId = raw.id
      existing.source = 'both'
      existing.quantity = qty
      existing.unit = raw.weightUnit || existing.unit
      existing.status = qty <= 0 ? 'out-of-stock' : qty <= min ? 'low-stock' : 'in-stock'
    } else {
      byKey.set(skuKey || nameKey, {
        key: `raw_${raw.id}`,
        name: raw.name,
        sku: raw.sku,
        quantity: qty,
        unit: raw.weightUnit || 'kg',
        source: 'raw_material',
        rawMaterialId: raw.id,
        status: qty <= 0 ? 'out-of-stock' : qty <= min ? 'low-stock' : 'in-stock',
      })
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export async function GET(request: NextRequest) {
  try {
    const menuItemId = request.nextUrl.searchParams.get('menuItemId')
    const optionsOnly = request.nextUrl.searchParams.get('optionsOnly') === 'true'

    const inventoryOptions = await getUnifiedInventoryOptions()

    if (optionsOnly || !menuItemId) {
      if (optionsOnly) {
        return NextResponse.json({
          success: true,
          data: { inventoryOptions },
        })
      }
      return NextResponse.json(
        { success: false, error: 'menuItemId parameter is required' },
        { status: 400 }
      )
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true, name: true, metadata: true },
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      )
    }

    const customRecipe = (item.metadata as any)?.recipe as RecipeIngredient[] | undefined
    const isCustom = Boolean(customRecipe && customRecipe.length > 0)
    const effectiveRecipe = getRecipeForDish(item.name, customRecipe)

    return NextResponse.json({
      success: true,
      data: {
        menuItemId: item.id,
        dishName: item.name,
        isCustom,
        recipe: effectiveRecipe,
        inventoryOptions,
      },
    })
  } catch (error: any) {
    console.error('Failed to get recipe:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get recipe' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.menuItemId) {
      return NextResponse.json(
        { success: false, error: 'menuItemId and recipe array are required' },
        { status: 400 }
      )
    }

    const { menuItemId, recipe } = body

    if (!Array.isArray(recipe)) {
      return NextResponse.json(
        { success: false, error: 'recipe must be an array of ingredients' },
        { status: 400 }
      )
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true, organizationId: true, metadata: true },
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      )
    }

    const existingMeta = (item.metadata as any) || {}
    const updatedMeta = {
      ...existingMeta,
      recipe: recipe.map((r: any) => ({
        inventoryItemId: r.inventoryItemId || undefined,
        rawMaterialId: r.rawMaterialId || undefined,
        sku: r.sku || undefined,
        ingredientName: String(r.ingredientName || r.name).trim(),
        quantity: Math.max(0.001, parseFloat(r.quantity) || 0.1),
        unit: String(r.unit || 'kg').trim(),
      })),
      recipeUpdatedAt: new Date().toISOString(),
    }

    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { metadata: updatedMeta },
    })

    invalidateAllMenuCaches()
    await syncMenuAvailabilityFromInventory(item.organizationId).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Recipe updated successfully',
      data: updatedMeta.recipe,
    })
  } catch (error: any) {
    console.error('Failed to save recipe:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save recipe' },
      { status: 500 }
    )
  }
}

