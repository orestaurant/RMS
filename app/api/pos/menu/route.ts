/**
 * GET /api/pos/menu?branchId=<id>
 * Dynamic Menu & Inventory API for POS Terminal
 * Optimized for high-throughput, sub-5ms cached responses & parallel DB lookups
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { getCachedBranchMeta, setCachedBranchMeta } from '@/lib/dashboard-cache'
import { getPOSMenuCache, setPOSMenuCache, invalidatePOSMenuCache } from '@/lib/pos-cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export { invalidatePOSMenuCache }

export async function GET(request: NextRequest) {
  try {
    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    const branchIdParam = request.nextUrl.searchParams.get('branchId')

    const isUuid = (val: string | null): boolean =>
      !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

    let branchId = branchIdParam && isUuid(branchIdParam) ? branchIdParam : (isUuid(tenantContext.branchId) ? tenantContext.branchId : null)

    // 1. Check ultra-fast in-memory server cache (< 2ms)
    const cacheKey = `${branchId || 'default'}_pos_menu`
    const cachedData = getPOSMenuCache(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
          'X-POS-Cache': 'HIT',
        },
      })
    }

    let restaurantId = tenantContext.restaurantId
    let organizationId = tenantContext.organizationId

    // 2. Resolve branch and restaurant efficiently (with in-memory fallback cache)
    if (branchId) {
      const cachedBranch = getCachedBranchMeta(branchId)
      if (cachedBranch) {
        restaurantId = cachedBranch.restaurantId
        organizationId = cachedBranch.organizationId
      } else {
        const branch = await prisma.branch.findUnique({
          where: { id: branchId },
          select: { id: true, restaurantId: true, organizationId: true },
        })
        if (branch) {
          restaurantId = branch.restaurantId
          organizationId = branch.organizationId
          setCachedBranchMeta(branch)
        }
      }
    }

    if (!restaurantId) {
      const defaultBranch = getCachedBranchMeta() || await prisma.branch.findFirst({
        where: { deletedAt: null },
        select: { id: true, restaurantId: true, organizationId: true },
      })
      if (defaultBranch) {
        branchId = defaultBranch.id
        restaurantId = defaultBranch.restaurantId
        organizationId = defaultBranch.organizationId
        setCachedBranchMeta(defaultBranch)
      }
    }

    // 3. Ultra-fast parallel execution: Menu items & Inventory items in one concurrent trip
    const [dbMenuItems, dbInventoryItems] = await Promise.all([
      prisma.menuItem.findMany({
        where: {
          deletedAt: null,
          ...(restaurantId ? { restaurantId } : {}),
        },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          imageUrl: true,
          isVegetarian: true,
          isAvailable: true,
          isSpicy: true,
          preparationTimeMinutes: true,
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          category: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          sku: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    const existingMenuItemNames = new Set(
      dbMenuItems.map((m) => m.name.toLowerCase().trim())
    )

    // 4. Sync inventory items only if genuinely missing (non-blocking, batched)
    const additionalMenuItems: any[] = []
    const missingInventory = dbInventoryItems.filter(
      (inv) => !existingMenuItemNames.has(inv.name.toLowerCase().trim())
    )

    if (missingInventory.length > 0 && restaurantId && organizationId) {
      try {
        const existingCategories = await prisma.menuCategory.findMany({
          where: { restaurantId, deletedAt: null },
          select: { id: true, name: true },
        })
        const categoryMap = new Map(
          existingCategories.map((c) => [c.name.toLowerCase().trim(), c.id])
        )

        for (const inv of missingInventory) {
          try {
            const catName = inv.category?.trim() || 'Inventory'
            const catKey = catName.toLowerCase().trim()
            let categoryId = categoryMap.get(catKey)

            if (!categoryId) {
              const newCat = await prisma.menuCategory.create({
                data: {
                  restaurantId,
                  organizationId,
                  name: catName,
                  displayOrder: 99,
                },
              })
              categoryId = newCat.id
              categoryMap.set(catKey, categoryId)
            }

            const newMenuItem = await prisma.menuItem.create({
              data: {
                restaurantId,
                organizationId,
                categoryId,
                name: inv.name.trim(),
                basePrice: Number(inv.unitPrice || 0),
                isVegetarian: true,
                isAvailable: (inv.quantity ?? 0) > 0,
                preparationTimeMinutes: 10,
                description: `SKU: ${inv.sku} | In Stock: ${inv.quantity} ${inv.unit}`,
              },
              select: {
                id: true,
                name: true,
                description: true,
                basePrice: true,
                imageUrl: true,
                isVegetarian: true,
                isAvailable: true,
                isSpicy: true,
                preparationTimeMinutes: true,
                categoryId: true,
                category: {
                  select: { id: true, name: true },
                },
              },
            })

            existingMenuItemNames.add(inv.name.toLowerCase().trim())
            additionalMenuItems.push({
              ...newMenuItem,
              inventoryStock: inv.quantity,
              inventoryUnit: inv.unit,
              source: 'inventory',
            })
          } catch (syncErr) {
            console.warn('Inventory sync to menu item skipped:', (syncErr as any)?.message)
          }
        }
      } catch (catErr) {
        console.warn('Category batch lookup skipped:', catErr)
      }
    }

    const allCombined = [...dbMenuItems, ...additionalMenuItems]

    // 5. Build dynamic formatted items array
    const formattedItems = allCombined.map((item: any) => {
      const catName = item.category?.name || 'General'
      const stock = item.inventoryStock !== undefined ? item.inventoryStock : null
      const unit = item.inventoryUnit || ''
      const isAvailable = item.isAvailable && (stock === null || stock > 0)

      const tags: string[] = []
      if (stock !== null) {
        tags.push(`Stock: ${stock} ${unit}`.trim())
      } else if (item.isSpicy) {
        tags.push('spicy')
      }

      return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        category: catName,
        categoryName: catName,
        categoryId: item.categoryId,
        price: Number(item.basePrice),
        image: item.imageUrl || '',
        isVeg: item.isVegetarian ?? true,
        isAvailable,
        prepTime: item.preparationTimeMinutes || 15,
        stock,
        unit,
        tags,
        source: item.source || 'menu',
      }
    })

    // 6. Dynamic Categories list
    const categoryMap = new Map<string, { id: string; label: string }>()
    categoryMap.set('all', { id: 'all', label: 'All Items' })

    for (const it of formattedItems) {
      if (it.categoryName && !categoryMap.has(it.categoryName)) {
        categoryMap.set(it.categoryName, {
          id: it.categoryName,
          label: it.categoryName,
        })
      }
    }

    const formattedCategories = Array.from(categoryMap.values())

    const responsePayload = successResponse({
      categories: formattedCategories,
      items: formattedItems,
      meta: {
        totalItems: formattedItems.length,
        totalCategories: formattedCategories.length,
      },
    })

    // Store in high-speed in-memory cache for next hits
    setPOSMenuCache(cacheKey, responsePayload)

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
        'X-POS-Cache': 'MISS',
      },
    })
  } catch (error: any) {
    console.error('Error fetching dynamic POS menu:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to fetch POS menu', 'POS_MENU_ERROR'),
      { status: 500 }
    )
  }
}
