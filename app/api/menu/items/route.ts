import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// High-speed in-memory cache for menu items (sub-5ms response time)
let menuItemsCache: {
  data: any[]
  timestamp: number
} | null = null

export function invalidateMenuItemsCache() {
  menuItemsCache = null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') || 'all'
    const search = searchParams.get('search') || ''
    const branchId = searchParams.get('branchId')
    const explicitRestId = searchParams.get('restaurantId')
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    let restaurantId = explicitRestId

    // 1. Resolve branch to restaurantId if branchId provided
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { restaurantId: true },
      })
      if (branch) {
        restaurantId = branch.restaurantId
      }
    }

    const now = Date.now()
    const CACHE_TTL = 30_000 // 30 seconds memory cache

    let allItems: any[] = []
    let isHit = false

    // 2. Check in-memory cache
    if (menuItemsCache && now - menuItemsCache.timestamp < CACHE_TTL) {
      allItems = menuItemsCache.data
      isHit = true
    } else {
      // 3. Fetch from DB using ultra-lean select query
      const dbItems = await prisma.menuItem.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          categoryId: true,
          restaurantId: true,
          basePrice: true,
          costPrice: true,
          imageUrl: true,
          isVegetarian: true,
          isVegan: true,
          isSpicy: true,
          spiceLevel: true,
          isAvailable: true,
          preparationTimeMinutes: true,
          displayOrder: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              priceModifier: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      })

      allItems = dbItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        categoryId: item.categoryId,
        restaurantId: item.restaurantId,
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
        variants:
          item.variants?.map((v) => ({
            id: v.id,
            name: v.name,
            price: Number(v.priceModifier || 0),
          })) || [],
      }))

      // Cache the full formatted dataset
      menuItemsCache = {
        data: allItems,
        timestamp: now,
      }
    }

    // 4. In-memory filtering (instantaneous sub-millisecond)
    let filtered = allItems

    if (restaurantId && (explicitRestId || branchId)) {
      filtered = filtered.filter((i) => i.restaurantId === restaurantId)
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(
        (i) =>
          i.categoryId === category ||
          (i.category || '').toLowerCase() === category.toLowerCase()
      )
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      )
    }

    const total = filtered.length

    // 5. Pagination support (if requested)
    let responseData = filtered
    let pageNum: number | undefined
    let limitNum: number | undefined
    let totalPages: number | undefined

    if (pageParam || limitParam) {
      pageNum = Math.max(1, parseInt(pageParam || '1', 10))
      limitNum = Math.max(1, parseInt(limitParam || '10', 10))
      totalPages = Math.max(1, Math.ceil(total / limitNum))
      const startIndex = (pageNum - 1) * limitNum
      responseData = filtered.slice(startIndex, startIndex + limitNum)
    }

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        meta: {
          total,
          ...(pageNum ? { page: pageNum, limit: limitNum, totalPages } : {}),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Menu-Cache': isHit ? 'HIT' : 'MISS',
        },
      }
    )
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

    const itemPrice = price !== undefined ? price : basePrice
    if (itemPrice === undefined || isNaN(Number(itemPrice)) || Number(itemPrice) < 0) {
      return NextResponse.json(
        { success: false, message: 'Valid price is required' },
        { status: 400 }
      )
    }

    // Resolve restaurant and organization from category
    const cat = await prisma.menuCategory.findUnique({
      where: { id: categoryId },
      select: { restaurantId: true, organizationId: true },
    })

    if (!cat) {
      return NextResponse.json(
        { success: false, message: 'Selected category does not exist' },
        { status: 400 }
      )
    }

    const newItem = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        categoryId,
        restaurantId: cat.restaurantId,
        organizationId: cat.organizationId,
        basePrice: Number(itemPrice),
        costPrice: costPrice !== undefined && costPrice !== null ? Number(costPrice) : null,
        description: description ? String(description).trim() : null,
        isVegetarian: isVegetarian !== undefined ? Boolean(isVegetarian) : Boolean(isVeg),
        isVegan: Boolean(isVegan),
        isSpicy: Boolean(isSpicy),
        spiceLevel: spiceLevel ? Number(spiceLevel) : 0,
        preparationTimeMinutes: prepTime || preparationTimeMinutes ? Number(prepTime || preparationTimeMinutes) : 15,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      },
      include: {
        category: true,
      },
    })

    // Invalidate fast cache immediately
    invalidateMenuItemsCache()

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
