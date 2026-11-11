/**
 * GET /api/inventory/items?search=""&lowStock=false
 * Get inventory items with status and summary meta
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search')?.toLowerCase().trim() || ''
    const lowStockOnly = request.nextUrl.searchParams.get('lowStock') === 'true'

    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    })

    let formatted = items
      .map((item) => {
        const qty = Number(item.quantity)
        const minStock = Number(item.minStock)
        const criticalStock = Number(item.criticalStock)

        const status: 'ok' | 'low' | 'critical' =
          qty <= criticalStock
            ? 'critical'
            : qty <= minStock
            ? 'low'
            : 'ok'

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          quantity: qty,
          unit: item.unit,
          reorderLevel: minStock,
          minStock,
          criticalStock,
          price: Number(item.unitPrice),
          unitPrice: Number(item.unitPrice),
          supplier: '',
          lastRestockDate: item.updatedAt?.toISOString().split('T')[0] || '',
          expiryDate: '',
          status,
        }
      })
      .filter((item) => !lowStockOnly || item.status !== 'ok')

    if (search) {
      formatted = formatted.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          i.sku.toLowerCase().includes(search) ||
          (i.category?.toLowerCase() || '').includes(search)
      )
    }

    const criticalCount = formatted.filter((i) => i.status === 'critical').length
    const lowStockCount = formatted.filter((i) => i.status === 'low').length

    return NextResponse.json(
      successResponse({
        data: formatted,
        meta: {
          total: formatted.length,
          lowStockCount,
          criticalCount,
        },
      })
    )
  } catch (error: any) {
    console.error('Error fetching inventory items:', error)
    return NextResponse.json(
      errorResponse(error.message, 'INVENTORY_ERROR'),
      { status: 500 }
    )
  }
}
