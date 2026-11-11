/**
 * GET /api/pos/menu?branchId=<id>
 * Get menu items with full data for POS Terminal
 * Returns: categories, menu items with variants, modifiers, preparation time, availability, prices
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get('branchId')

    if (!branchId) {
      throw new ValidationError('branchId is required')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Get the branch to resolve restaurantId
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { restaurantId: true },
    })

    if (!branch) {
      throw new ValidationError('Branch not found')
    }

    // Fetch all categories for this restaurant
    const categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId: branch.restaurantId,
        organizationId: tenantContext.organizationId,
        deletedAt: null,
      },
      orderBy: { displayOrder: 'asc' },
    })

    // Fetch all menu items with variants and modifiers
    const items = await prisma.menuItem.findMany({
      where: {
        restaurantId: branch.restaurantId,
        organizationId: tenantContext.organizationId,
        isAvailable: true,
        deletedAt: null,
      },
      include: {
        category: true,
        variants: {
          where: { deletedAt: null },
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                modifiers: true,
              },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    // Format response
    const formattedCategories = categories.map((cat) => ({
      id: cat.id,
      label: cat.name,
      icon: '🍽️', // TODO: Use actual category icon if available
    }))

    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      category: item.category?.id || '',
      price: Number(item.basePrice),
      image: item.imageUrl || '',
      isVeg: item.isVegetarian,
      isAvailable: item.isAvailable,
      gst: 5, // TODO: Get from tax configuration table
      rating: 4.5, // TODO: Calculate from customer ratings
      prepTime: item.preparationTimeMinutes || 15,
      variants: item.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.priceModifier || 0),
      })) || [],
      modifiers: item.modifierGroups?.map((mg) => ({
        id: mg.modifierGroup.id,
        name: mg.modifierGroup.name,
        isMultiSelect: mg.modifierGroup.maxSelections > 1,
        options: mg.modifierGroup.modifiers?.map((m) => ({
          id: m.id,
          name: m.name,
          price: Number(m.priceModifier || 0),
        })) || [],
      })) || [],
      tags: item.isSpicy ? ['spicy'] : [],
    }))

    return NextResponse.json(successResponse({
      categories: formattedCategories,
      items: formattedItems,
      meta: {
        totalItems: formattedItems.length,
        totalCategories: formattedCategories.length,
      },
    }))
  } catch (error: any) {
    console.error('Error fetching POS menu:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'POS_MENU_ERROR'),
      { status: 500 }
    )
  }
}
