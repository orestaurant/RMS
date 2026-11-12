/**
 * GET /api/pos/menu?branchId=<id>
 * Dynamic Menu & Inventory API for POS Terminal
 * Returns real items from Menu & Inventory (zero mock items)
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'

export async function GET(request: NextRequest) {
  try {
    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    let branchId = request.nextUrl.searchParams.get('branchId') || tenantContext.branchId
    let restaurantId = tenantContext.restaurantId
    let organizationId = tenantContext.organizationId

    // Resolve branch and restaurant if needed
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, restaurantId: true, organizationId: true },
      })
      if (branch) {
        restaurantId = branch.restaurantId
        organizationId = branch.organizationId
      }
    }

    if (!restaurantId) {
      const defaultBranch = await prisma.branch.findFirst({
        where: { deletedAt: null },
        select: { id: true, restaurantId: true, organizationId: true },
      })
      if (defaultBranch) {
        branchId = defaultBranch.id
        restaurantId = defaultBranch.restaurantId
        organizationId = defaultBranch.organizationId
      }
    }

    // 1. Fetch real active menu items from database
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        deletedAt: null,
        ...(restaurantId ? { restaurantId } : {}),
      },
      include: {
        category: true,
      },
      orderBy: { displayOrder: 'asc' },
    })

    // 2. Fetch real inventory items from database
    const dbInventoryItems = await prisma.inventoryItem.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    })

    const existingMenuItemNames = new Set(
      dbMenuItems.map((m) => m.name.toLowerCase().trim())
    )

    // 3. For any inventory items not already represented in Menu, sync them so POS can order them
    const additionalMenuItems: any[] = []
    for (const inv of dbInventoryItems) {
      const normName = inv.name.toLowerCase().trim()
      if (!existingMenuItemNames.has(normName) && restaurantId && organizationId) {
        try {
          // Find or create category
          const catName = inv.category?.trim() || 'Inventory'
          let category = await prisma.menuCategory.findFirst({
            where: {
              restaurantId,
              name: { equals: catName, mode: 'insensitive' },
              deletedAt: null,
            },
          })

          if (!category) {
            category = await prisma.menuCategory.create({
              data: {
                restaurantId,
                organizationId,
                name: catName,
                displayOrder: 99,
              },
            })
          }

          // Create menuItem entry to satisfy OrderItem foreign key constraints
          const newMenuItem = await prisma.menuItem.create({
            data: {
              restaurantId,
              organizationId,
              categoryId: category.id,
              name: inv.name.trim(),
              basePrice: Number(inv.unitPrice || 0),
              isVegetarian: true,
              isAvailable: (inv.quantity ?? 0) > 0,
              preparationTimeMinutes: 10,
              description: `SKU: ${inv.sku} | In Stock: ${inv.quantity} ${inv.unit}`,
            },
            include: {
              category: true,
            },
          })

          existingMenuItemNames.add(normName)
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
    }

    const allCombined = [...dbMenuItems, ...additionalMenuItems]

    // 4. Build dynamic items array
    const formattedItems = allCombined.map((item) => {
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

    // 5. Dynamic Categories list
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

    return NextResponse.json(
      successResponse({
        categories: formattedCategories,
        items: formattedItems,
        meta: {
          totalItems: formattedItems.length,
          totalCategories: formattedCategories.length,
        },
      })
    )
  } catch (error: any) {
    console.error('Error fetching dynamic POS menu:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to fetch POS menu', 'POS_MENU_ERROR'),
      { status: 500 }
    )
  }
}
