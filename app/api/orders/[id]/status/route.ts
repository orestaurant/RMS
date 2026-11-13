import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { updateFallbackOrder, invalidateKDSCache, invalidateLiveOrdersCache } from '@/lib/kds-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, priority, notes } = body

    const dbStatusMap: Record<string, string> = {
      pending: 'pending',
      accepted: 'confirmed',
      confirmed: 'confirmed',
      cooking: 'preparing',
      preparing: 'preparing',
      ready: 'ready',
      served: 'served',
      completed: 'completed',
      cancelled: 'cancelled',
    }

    try {
      const existing = await prisma.order.findFirst({
        where: {
          OR: [{ id }, { orderNumber: id }],
        },
      })

      if (existing) {
        const updateData: any = { updatedAt: new Date() }
        if (status && dbStatusMap[status]) {
          updateData.status = dbStatusMap[status] as any
        }
        if (notes) updateData.notes = notes

        await prisma.order.update({
          where: { id: existing.id },
          data: updateData,
        })
      }
    } catch (dbErr) {
      console.warn('Prisma order update fallback:', (dbErr as any)?.message)
    }

    // Also sync fallback store
    updateFallbackOrder(id, {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(notes ? { specialNotes: notes } : {}),
    })

    // Invalidate KDS and Live Orders caches for instant UI updates
    invalidateKDSCache()
    invalidateLiveOrdersCache()

    return NextResponse.json(successResponse({ id, status, updated: true }))
  } catch (error: any) {
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to update order status', 'ORDER_STATUS_ERROR'),
      { status: 500 }
    )
  }
}

