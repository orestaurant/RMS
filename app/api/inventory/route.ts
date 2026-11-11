import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search')?.toLowerCase().trim() || ''
    const category = request.nextUrl.searchParams.get('category')?.trim() || ''
    const statusFilter = request.nextUrl.searchParams.get('status')?.trim() || ''

    // Fetch all inventory items ordered by updated date
    const allItems = await prisma.inventoryItem.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    // Compute stats across all items
    let totalValue = 0
    let lowStockCount = 0
    let criticalCount = 0
    let inStockCount = 0

    const itemsWithStatus = allItems.map((item) => {
      const qty = Number(item.quantity)
      const minStock = Number(item.minStock)
      const criticalStock = Number(item.criticalStock)
      const unitPrice = Number(item.unitPrice)

      totalValue += qty * unitPrice

      let status: 'in-stock' | 'low-stock' | 'critical'
      if (qty <= criticalStock) {
        status = 'critical'
        criticalCount++
      } else if (qty <= minStock) {
        status = 'low-stock'
        lowStockCount++
      } else {
        status = 'in-stock'
        inStockCount++
      }

      return {
        ...item,
        status,
        totalItemValue: qty * unitPrice,
      }
    })

    // Apply filters
    const filtered = itemsWithStatus.filter((item) => {
      // Search filter
      if (search) {
        const matchesName = item.name.toLowerCase().includes(search)
        const matchesSku = item.sku.toLowerCase().includes(search)
        const matchesCategory = (item.category?.toLowerCase() || '').includes(search)
        if (!matchesName && !matchesSku && !matchesCategory) return false
      }

      // Category filter
      if (category && category !== 'all' && item.category !== category) {
        return false
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      return true
    })

    return NextResponse.json({
      success: true,
      data: filtered,
      stats: {
        total: allItems.length,
        totalValue,
        lowStockCount,
        criticalCount,
        inStockCount,
      },
    })
  } catch (error: any) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch inventory items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, sku, category, quantity, unit, minStock, criticalStock, unitPrice } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Item name is required' }, { status: 400 })
    }

    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      return NextResponse.json({ success: false, error: 'SKU is required' }, { status: 400 })
    }

    const trimmedSku = sku.trim().toUpperCase()

    // Check for unique SKU
    const existingSku = await prisma.inventoryItem.findUnique({
      where: { sku: trimmedSku },
    })

    if (existingSku) {
      return NextResponse.json(
        { success: false, error: `An item with SKU "${trimmedSku}" already exists` },
        { status: 409 }
      )
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name: name.trim(),
        sku: trimmedSku,
        category: category?.trim() || 'General',
        quantity: Math.max(0, parseFloat(quantity) || 0),
        unit: unit?.trim() || 'units',
        minStock: Math.max(0, parseFloat(minStock) || 10),
        criticalStock: Math.max(0, parseFloat(criticalStock) || 5),
        unitPrice: Math.max(0, parseFloat(unitPrice) || 0),
      },
    })

    return NextResponse.json({ success: true, data: newItem }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create inventory item:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, sku, category, quantity, unit, minStock, criticalStock, unitPrice } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Item id is required' }, { status: 400 })
    }

    // Check if item exists
    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 })
    }

    // If sku is modified, check collision
    if (sku && sku.trim().toUpperCase() !== existing.sku) {
      const collision = await prisma.inventoryItem.findUnique({
        where: { sku: sku.trim().toUpperCase() },
      })
      if (collision) {
        return NextResponse.json(
          { success: false, error: `An item with SKU "${sku.trim().toUpperCase()}" already exists` },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(sku !== undefined && { sku: sku.trim().toUpperCase() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(quantity !== undefined && { quantity: Math.max(0, parseFloat(quantity) || 0) }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(minStock !== undefined && { minStock: Math.max(0, parseFloat(minStock) || 0) }),
        ...(criticalStock !== undefined && { criticalStock: Math.max(0, parseFloat(criticalStock) || 0) }),
        ...(unitPrice !== undefined && { unitPrice: Math.max(0, parseFloat(unitPrice) || 0) }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const idFromQuery = request.nextUrl.searchParams.get('id')
    let id = idFromQuery

    if (!id) {
      try {
        const body = await request.json()
        id = body?.id
      } catch {
        // no body
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Item id is required' }, { status: 400 })
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 })
    }

    await prisma.inventoryItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Item deleted successfully', id })
  } catch (error: any) {
    console.error('Failed to delete inventory item:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}

