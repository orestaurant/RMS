import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    const qty = Number(item.quantity)
    const minStock = Number(item.minStock)
    const criticalStock = Number(item.criticalStock)

    const status =
      qty <= criticalStock
        ? 'critical'
        : qty <= minStock
        ? 'low-stock'
        : 'in-stock'

    return NextResponse.json({ success: true, data: { ...item, status } })
  } catch (error: any) {
    console.error('Failed to get item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, sku, category, quantity, unit, minStock, criticalStock, unitPrice } = body

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    if (sku && sku.trim().toUpperCase() !== existing.sku) {
      const collision = await prisma.inventoryItem.findUnique({
        where: { sku: sku.trim().toUpperCase() },
      })
      if (collision) {
        return NextResponse.json(
          { success: false, error: `SKU "${sku.trim().toUpperCase()}" already exists` },
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
    console.error('Failed to update item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    // Support delta adjustment (e.g. { deltaQuantity: 5 } or direct fields)
    let newQuantity = existing.quantity ?? 0
    if (body.deltaQuantity !== undefined) {
      newQuantity = Math.max(0, (existing.quantity ?? 0) + parseFloat(body.deltaQuantity))
    } else if (body.quantity !== undefined) {
      newQuantity = Math.max(0, parseFloat(body.quantity))
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        quantity: newQuantity,
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.unitPrice !== undefined && { unitPrice: Math.max(0, parseFloat(body.unitPrice)) }),
        ...(body.minStock !== undefined && { minStock: Math.max(0, parseFloat(body.minStock)) }),
        ...(body.criticalStock !== undefined && { criticalStock: Math.max(0, parseFloat(body.criticalStock)) }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Failed to patch item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    await prisma.inventoryItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Item deleted successfully', id })
  } catch (error: any) {
    console.error('Failed to delete item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

