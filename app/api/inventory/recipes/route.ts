import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRecipeForDish, RecipeIngredient } from '@/lib/inventory-deduction'
import { invalidateAllMenuCaches } from '@/lib/menu-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const menuItemId = request.nextUrl.searchParams.get('menuItemId')

    if (!menuItemId) {
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
      select: { id: true, metadata: true },
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

