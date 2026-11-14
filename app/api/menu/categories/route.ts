import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  getCachedCategories,
  setCachedCategories,
  invalidateAllMenuCaches,
  CachedCategory,
} from '@/lib/menu-cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurantId') || 'all'

    // 1. Check in-memory cache (< 1ms)
    const cached = getCachedCategories(restaurantId)
    if (cached) {
      return NextResponse.json(
        {
          success: true,
          data: cached,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
            'X-Category-Cache': 'HIT',
          },
        }
      )
    }

    const where: any = {
      deletedAt: null,
    }

    if (restaurantId !== 'all') {
      where.restaurantId = restaurantId
    }

    const categories = await prisma.menuCategory.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        status: true,
        _count: {
          select: { items: { where: { deletedAt: null } } },
        },
      },
    })

    const formatted: CachedCategory[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      status: c.status,
      itemCount: c._count.items,
    }))

    setCachedCategories(restaurantId, formatted)

    return NextResponse.json(
      {
        success: true,
        data: formatted,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
          'X-Category-Cache': 'MISS',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.name || !String(body.name).trim()) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      )
    }

    const name = String(body.name).trim()
    const description = body.description ? String(body.description).trim() : null

    // Resolve restaurant and organization
    let restaurantId = body.restaurantId
    let organizationId = body.organizationId

    if (!restaurantId || !organizationId) {
      const defaultRest = await prisma.restaurant.findFirst({
        select: { id: true, organizationId: true },
      })
      if (defaultRest) {
        restaurantId = defaultRest.id
        organizationId = defaultRest.organizationId
      }
    }

    if (!restaurantId || !organizationId) {
      return NextResponse.json(
        { success: false, message: 'Restaurant or Organization not found' },
        { status: 400 }
      )
    }

    // Check if category name already exists for this restaurant
    const existing = await prisma.menuCategory.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Category "${name}" already exists` },
        { status: 400 }
      )
    }

    const count = await prisma.menuCategory.count({
      where: { restaurantId, deletedAt: null },
    })

    const category = await prisma.menuCategory.create({
      data: {
        name,
        description,
        displayOrder: count + 1,
        restaurantId,
        organizationId,
        isActive: true,
        status: 'active',
      },
    })

    invalidateAllMenuCaches()

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      data: category,
    })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create category' },
      { status: 500 }
    )
  }
}
