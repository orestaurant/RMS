import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { invalidatePOSMenuCache, invalidateMenuItemsCache } from '@/lib/pos-cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const item = await prisma.menuItem.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        variants: { where: { deletedAt: null } },
      },
    })

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Menu item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        description: item.description || '',
        categoryId: item.categoryId,
        category: item.category?.name || 'Uncategorized',
        price: Number(item.basePrice),
        costPrice: item.costPrice ? Number(item.costPrice) : undefined,
        image: item.imageUrl || '',
        isVeg: item.isVegetarian,
        isVegan: item.isVegan,
        isSpicy: item.isSpicy,
        isAvailable: item.isAvailable,
        prepTime: item.preparationTimeMinutes || 15,
      },
    })
  } catch (error: any) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch menu item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      )
    }

    const existing = await prisma.menuItem.findUnique({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Menu item not found' },
        { status: 404 }
      )
    }

    const data: any = {}

    if (body.name !== undefined) data.name = String(body.name).trim()
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
    if (body.categoryId !== undefined) data.categoryId = String(body.categoryId)
    if (body.price !== undefined || body.basePrice !== undefined) {
      const price = parseFloat(body.price ?? body.basePrice)
      if (!isNaN(price) && price >= 0) data.basePrice = price
    }
    if (body.costPrice !== undefined) {
      data.costPrice = body.costPrice ? parseFloat(body.costPrice) : null
    }
    if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable)
    if (body.isVeg !== undefined || body.isVegetarian !== undefined) {
      data.isVegetarian = Boolean(body.isVegetarian ?? body.isVeg)
    }
    if (body.isVegan !== undefined) data.isVegan = Boolean(body.isVegan)
    if (body.isSpicy !== undefined) data.isSpicy = Boolean(body.isSpicy)
    if (body.prepTime !== undefined || body.preparationTimeMinutes !== undefined) {
      data.preparationTimeMinutes = parseInt(body.prepTime ?? body.preparationTimeMinutes) || 15
    }
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null

    const updated = await prisma.menuItem.update({
      where: { id },
      data,
      include: { category: true },
    })

    invalidateMenuItemsCache()
    invalidatePOSMenuCache()

    return NextResponse.json({
      success: true,
      message: 'Menu item updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description || '',
        categoryId: updated.categoryId,
        category: updated.category?.name || 'Uncategorized',
        price: Number(updated.basePrice),
        costPrice: updated.costPrice ? Number(updated.costPrice) : undefined,
        image: updated.imageUrl || '',
        isVeg: updated.isVegetarian,
        isVegan: updated.isVegan,
        isSpicy: updated.isSpicy,
        isAvailable: updated.isAvailable,
        prepTime: updated.preparationTimeMinutes || 15,
      },
    })
  } catch (error: any) {
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update menu item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.menuItem.findUnique({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Menu item not found' },
        { status: 404 }
      )
    }

    // Soft delete
    await prisma.menuItem.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isAvailable: false,
        status: 'inactive',
      },
    })

    invalidateMenuItemsCache()
    invalidatePOSMenuCache()

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}

