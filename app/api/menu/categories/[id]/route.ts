import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { invalidateAllMenuCaches, updateCachedCategory } from '@/lib/menu-cache'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => null)

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Category ID is required' },
        { status: 400 }
      )
    }

    const name = body?.name !== undefined ? String(body.name).trim() : undefined
    const description =
      body?.description !== undefined
        ? body.description
          ? String(body.description).trim()
          : null
        : undefined

    if (name !== undefined && !name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      )
    }

    if (name && name.toLowerCase() === 'inventory') {
      return NextResponse.json(
        { success: false, message: '"Inventory" is a reserved category name' },
        { status: 400 }
      )
    }

    if (name === undefined && description === undefined) {
      return NextResponse.json(
        { success: false, message: 'Nothing to update' },
        { status: 400 }
      )
    }

    // Single round-trip lookup to verify existence & detect duplicate name in the same restaurant
    const matches = await prisma.menuCategory.findMany({
      where: {
        deletedAt: null,
        OR: [
          { id },
          ...(name ? [{ name: { equals: name, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        restaurantId: true,
      },
    })

    const existing = matches.find((c) => c.id === id)
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      )
    }

    if (name) {
      const duplicate = matches.find(
        (c) =>
          c.id !== id &&
          c.restaurantId === existing.restaurantId &&
          c.name.toLowerCase() === name.toLowerCase()
      )
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Category "${name}" already exists` },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        status: true,
      },
    })

    updateCachedCategory(id, {
      name: updated.name,
      description: updated.description || '',
    })

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description || '',
        displayOrder: updated.displayOrder,
        isActive: updated.isActive,
        status: updated.status,
      },
    })
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update category' },
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
    const searchParams = request.nextUrl.searchParams
    const force = searchParams.get('force') === 'true'
    const reassignTo = searchParams.get('reassignTo')?.trim() || ''

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Category ID is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.menuCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, restaurantId: true, organizationId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Category not found or already deleted' },
        { status: 404 }
      )
    }

    // Count only actual customer-facing menu items (exclude hidden SKU: inventory placeholders)
    const menuItemsWhere = {
      categoryId: id,
      deletedAt: null,
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
    }

    const [realMenuItemCount, skuPlaceholderCount] = await Promise.all([
      prisma.menuItem.count({ where: menuItemsWhere }),
      prisma.menuItem.count({
        where: {
          categoryId: id,
          deletedAt: null,
          description: { startsWith: 'SKU:' },
        },
      }),
    ])

    if (realMenuItemCount > 0 && !force && !reassignTo) {
      return NextResponse.json(
        {
          success: false,
          code: 'CATEGORY_HAS_ITEMS',
          itemCount: realMenuItemCount,
          message: `Category has ${realMenuItemCount} active menu ${realMenuItemCount === 1 ? 'item' : 'items'}. Move items or delete with items.`,
        },
        { status: 400 }
      )
    }

    if (reassignTo) {
      if (reassignTo === id) {
        return NextResponse.json(
          { success: false, message: 'Cannot reassign items to the same category being deleted' },
          { status: 400 }
        )
      }
      const targetCat = await prisma.menuCategory.findFirst({
        where: { id: reassignTo, deletedAt: null },
        select: { id: true, name: true },
      })
      if (!targetCat) {
        return NextResponse.json(
          { success: false, message: 'Target category for reassignment not found' },
          { status: 404 }
        )
      }
    }

    const now = new Date()
    // Free up the unique (restaurantId, name) constraint so the name can be reused later
    const archivedName = `${existing.name.slice(0, 75)}__del_${Date.now().toString().slice(-6)}`

    await prisma.$transaction(async (tx) => {
      // Preserve any hidden SKU: inventory items by moving them to the 'Inventory' category
      if (skuPlaceholderCount > 0) {
        let inventoryCategory = await tx.menuCategory.findFirst({
          where: {
            restaurantId: existing.restaurantId,
            name: 'Inventory',
            deletedAt: null,
            id: { not: id },
          },
          select: { id: true },
        })

        if (!inventoryCategory) {
          inventoryCategory = await tx.menuCategory.create({
            data: {
              restaurantId: existing.restaurantId,
              organizationId: existing.organizationId,
              name: 'Inventory',
              description: 'Warehouse & raw inventory items',
              displayOrder: 999,
              isActive: true,
              status: 'active',
            },
            select: { id: true },
          })
        }

        await tx.menuItem.updateMany({
          where: {
            categoryId: id,
            deletedAt: null,
            description: { startsWith: 'SKU:' },
          },
          data: { categoryId: inventoryCategory.id },
        })
      }

      if (realMenuItemCount > 0) {
        if (reassignTo) {
          await tx.menuItem.updateMany({
            where: menuItemsWhere,
            data: { categoryId: reassignTo },
          })
        } else if (force) {
          await tx.menuItem.updateMany({
            where: menuItemsWhere,
            data: {
              deletedAt: now,
              isAvailable: false,
              status: 'inactive',
            },
          })
        }
      }

      await tx.menuCategory.update({
        where: { id },
        data: {
          name: archivedName,
          deletedAt: now,
          isActive: false,
          status: 'inactive',
        },
      })
    })

    invalidateAllMenuCaches()

    return NextResponse.json({
      success: true,
      message:
        realMenuItemCount > 0 && reassignTo
          ? `Moved ${realMenuItemCount} ${realMenuItemCount === 1 ? 'item' : 'items'} and deleted "${existing.name}"`
          : realMenuItemCount > 0 && force
            ? `Category "${existing.name}" and its ${realMenuItemCount} ${realMenuItemCount === 1 ? 'item' : 'items'} deleted`
            : `Category "${existing.name}" deleted successfully`,
    })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete category' },
      { status: 500 }
    )
  }
}
