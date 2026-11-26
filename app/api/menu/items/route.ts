import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  getCachedMenuItems,
  setCachedMenuItems,
  addCachedMenuItem,
  invalidateAllMenuCaches,
  CachedMenuItem,
} from '@/lib/menu-cache'
import { getCachedBranchMeta, setCachedBranchMeta } from '@/lib/dashboard-cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') || 'all'
    const search = searchParams.get('search') || ''
    const dietary = searchParams.get('dietary') || 'all'
    const onlyAvailable = searchParams.get('available') === 'true'
    const branchId = searchParams.get('branchId')
    const explicitRestId = searchParams.get('restaurantId')
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    let restaurantId = explicitRestId

    // 1. High-speed in-memory cache check (< 1ms response time)
    let allItems: CachedMenuItem[] | null = getCachedMenuItems()
    let isHit = true

    if (!allItems) {
      isHit = false
      // 2. Fetch from DB using ultra-lean select query (Strictly exclude raw inventory/warehouse items, while safely handling NULL descriptions)
      const dbItems = await prisma.menuItem.findMany({
        where: {
          deletedAt: null,
          category: {
            name: { not: 'Inventory' },
          },
          OR: [
            { description: null },
            {
              NOT: {
                description: {
                  startsWith: 'SKU:',
                },
              },
            },
          ],
        },
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

      allItems = dbItems
        .filter(
          (item) =>
            (item.category?.name || '').toLowerCase().trim() !== 'inventory' &&
            (!item.description || !/^sku:\s*[^\s|]+\s*\|/i.test(item.description))
        )
        .map((item) => ({
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

      setCachedMenuItems(allItems)
    }

    // Resolve branch to restaurantId if branchId provided (using cache if available)
    if (branchId && !restaurantId) {
      const cachedBranch = getCachedBranchMeta(branchId)
      if (cachedBranch) {
        restaurantId = cachedBranch.restaurantId
      } else {
        const branch = await prisma.branch.findUnique({
          where: { id: branchId },
          select: { id: true, restaurantId: true, organizationId: true },
        })
        if (branch) {
          restaurantId = branch.restaurantId
          setCachedBranchMeta(branch)
        }
      }
    }

    // 3. In-memory filtering (instantaneous sub-millisecond)
    let filtered = allItems

    if (restaurantId && (explicitRestId || branchId)) {
      filtered = filtered.filter((i) => i.restaurantId === restaurantId)
    }

    if (onlyAvailable) {
      filtered = filtered.filter((i) => i.isAvailable !== false)
    }

    if (dietary === 'veg') {
      filtered = filtered.filter((i) => Boolean(i.isVeg))
    } else if (dietary === 'non-veg') {
      filtered = filtered.filter((i) => !i.isVeg)
    }

    if (category && category !== 'all') {
      const catLower = category.toLowerCase()
      filtered = filtered.filter(
        (i) =>
          i.categoryId === category ||
          (i.category || '').toLowerCase() === catLower
      )
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered
        .filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q)
        )
        .sort((a, b) => {
          const aName = a.name.toLowerCase()
          const bName = b.name.toLowerCase()
          const aScore = aName === q ? 0 : aName.startsWith(q) ? 1 : aName.includes(q) ? 2 : 3
          const bScore = bName === q ? 0 : bName.startsWith(q) ? 1 : bName.includes(q) ? 2 : 3
          return aScore - bScore
        })
    }

    const total = filtered.length

    // 4. Pagination support (if requested)
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
      category,
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
      image,
      isAvailable,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Item name is required' },
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

    // Resolve category by categoryId or category name
    let targetCat: { id: string; restaurantId: string; organizationId: string } | null = null
    if (categoryId && typeof categoryId === 'string') {
      targetCat = await prisma.menuCategory.findUnique({
        where: { id: categoryId },
        select: { id: true, restaurantId: true, organizationId: true },
      })
    }

    if (!targetCat && (category || categoryId)) {
      const searchCatName = String(category || categoryId).trim()
      targetCat = await prisma.menuCategory.findFirst({
        where: {
          name: { equals: searchCatName, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { id: true, restaurantId: true, organizationId: true },
      })
    }

    if (!targetCat) {
      // Find default active category
      targetCat = await prisma.menuCategory.findFirst({
        where: { deletedAt: null },
        select: { id: true, restaurantId: true, organizationId: true },
      })
    }

    if (!targetCat) {
      // Create a default category under the first active restaurant
      const firstRest = await prisma.restaurant.findFirst()
      if (firstRest) {
        targetCat = await prisma.menuCategory.create({
          data: {
            name: String(category || 'Main Course').trim(),
            restaurantId: firstRest.id,
            organizationId: firstRest.organizationId,
          },
          select: { id: true, restaurantId: true, organizationId: true },
        })
      }
    }

    if (!targetCat) {
      return NextResponse.json(
        { success: false, message: 'Could not resolve or create category for dish' },
        { status: 400 }
      )
    }

    const finalImageUrl = (imageUrl || image) ? String(imageUrl || image).trim() : null

    const newItem = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        categoryId: targetCat.id,
        restaurantId: targetCat.restaurantId,
        organizationId: targetCat.organizationId,
        basePrice: Number(itemPrice),
        costPrice: costPrice !== undefined && costPrice !== null ? Number(costPrice) : null,
        description: description ? String(description).trim() : null,
        isVegetarian: isVegetarian !== undefined ? Boolean(isVegetarian) : Boolean(isVeg),
        isVegan: Boolean(isVegan),
        isSpicy: Boolean(isSpicy),
        spiceLevel: spiceLevel ? Number(spiceLevel) : 0,
        preparationTimeMinutes: prepTime || preparationTimeMinutes ? Number(prepTime || preparationTimeMinutes) : 15,
        imageUrl: finalImageUrl,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      },
      include: {
        category: true,
      },
    })

    const formattedItem: CachedMenuItem = {
      id: newItem.id,
      name: newItem.name,
      description: newItem.description || '',
      categoryId: newItem.categoryId,
      restaurantId: newItem.restaurantId,
      category: newItem.category?.name || 'Uncategorized',
      price: Number(newItem.basePrice),
      costPrice: newItem.costPrice ? Number(newItem.costPrice) : undefined,
      image: newItem.imageUrl || '',
      isVeg: newItem.isVegetarian,
      isVegan: newItem.isVegan,
      isSpicy: newItem.isSpicy,
      spiceLevel: newItem.spiceLevel || 0,
      isAvailable: newItem.isAvailable,
      prepTime: newItem.preparationTimeMinutes || 15,
      rating: 4.8,
      tags: newItem.isSpicy ? ['spicy'] : [],
      variants: [],
    }

    // Immediately cache newly added item so next GET call is 0ms HIT
    addCachedMenuItem(formattedItem)

    return NextResponse.json({
      success: true,
      message: 'Menu item created successfully',
      data: formattedItem,
    })
  } catch (error: any) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create menu item' },
      { status: 500 }
    )
  }
}
