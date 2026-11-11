import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') || 'all'
    const search = searchParams.get('search') || ''
    const branchId = searchParams.get('branchId')
    let restaurantId = searchParams.get('restaurantId')

    // If branchId is provided, resolve restaurantId
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { restaurantId: true },
      })
      if (branch) {
        restaurantId = branch.restaurantId
      }
    }

    // Fallback to first restaurant if not resolved
    if (!restaurantId) {
      const defaultRest = await prisma.restaurant.findFirst({
        select: { id: true },
      })
      if (defaultRest) {
        restaurantId = defaultRest.id
      }
    }

    const where: any = {
      deletedAt: null,
    }

    if (restaurantId) {
      where.restaurantId = restaurantId
    }

    if (category && category !== 'all') {
      where.categoryId = category
    }

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: { deletedAt: null },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    const formatted = items.map((item) => ({
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
      spiceLevel: item.spiceLevel || 0,
      isAvailable: item.isAvailable,
      prepTime: item.preparationTimeMinutes || 15,
      rating: 4.8,
      tags: item.isSpicy ? ['spicy'] : [],
      variants: item.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.priceModifier || 0),
      })) || [],
    }))

    return NextResponse.json({
      success: true,
      data: formatted,
      meta: {
        total: formatted.length,
      },
    })
  } catch (error: any) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch menu items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const {
      name,
      categoryId,
      price,
      basePrice,
      costPrice,
      description,
      isVeg,
      isVegetarian,
      isVegan,
      isSpicy,
      spiceLevel,
      prepTime,
      preparationTimeMinutes,
      imageUrl,
      isAvailable,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Item name is required' },
        { status: 400 }
      )
    }

    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Category is required' },
        { status: 400 }
      )
    }

    const finalPrice = parseFloat(price ?? basePrice)
    if (isNaN(finalPrice) || finalPrice < 0) {
      return NextResponse.json(
        { success: false, message: 'A valid price is required' },
        { status: 400 }
      )
    }

    // Verify category exists
    const categoryRecord = await prisma.menuCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, restaurantId: true, organizationId: true },
    })

    if (!categoryRecord) {
      return NextResponse.json(
        { success: false, message: 'Selected category does not exist' },
        { status: 400 }
      )
    }

    const restaurantId = categoryRecord.restaurantId
    const organizationId = categoryRecord.organizationId

    const count = await prisma.menuItem.count({
      where: { restaurantId, deletedAt: null },
    })

    const newItem = await prisma.menuItem.create({
      data: {
        restaurantId,
        organizationId,
        categoryId,
        name: name.trim(),
        description: description ? String(description).trim() : null,
        basePrice: finalPrice,
        costPrice: costPrice !== undefined && !isNaN(parseFloat(costPrice)) ? parseFloat(costPrice) : null,
        isVegetarian: Boolean(isVegetarian ?? isVeg ?? false),
        isVegan: Boolean(isVegan ?? false),
        isSpicy: Boolean(isSpicy ?? false),
        spiceLevel: parseInt(spiceLevel || '0') || 0,
        preparationTimeMinutes: parseInt(prepTime || preparationTimeMinutes || '15') || 15,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        displayOrder: count + 1,
        status: 'active',
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item created successfully',
      data: {
        id: newItem.id,
        name: newItem.name,
        description: newItem.description || '',
        categoryId: newItem.categoryId,
        category: newItem.category?.name || 'Uncategorized',
        price: Number(newItem.basePrice),
        costPrice: newItem.costPrice ? Number(newItem.costPrice) : undefined,
        image: newItem.imageUrl || '',
        isVeg: newItem.isVegetarian,
        isVegan: newItem.isVegan,
        isSpicy: newItem.isSpicy,
        isAvailable: newItem.isAvailable,
        prepTime: newItem.preparationTimeMinutes || 15,
      },
    })
  } catch (error: any) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create menu item' },
      { status: 500 }
    )
  }
}
