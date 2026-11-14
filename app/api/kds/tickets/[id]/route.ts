import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import {
  updateFallbackOrder,
  removeFallbackOrder,
  updateKDSCacheTicket,
  invalidateKDSCache,
  invalidateLiveOrdersCache,
  normalizeKdsStatus,
} from '@/lib/kds-utils'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId || '').trim()
    const body = await request.json().catch(() => ({}))
    const { status, priority, toggleItemId, notes, fullId, orderNumber } = body

    const normalizedKdsStatus = status ? normalizeKdsStatus(status) : null

    // Status mapping from KDS to DB OrderStatusEnum
    // KDS: pending | accepted | cooking | ready | served
    // DB:  pending | confirmed | preparing | ready | served
    const dbStatusMap: Record<string, string> = {
      pending: 'pending',
      accepted: 'ACCEPTED',
      confirmed: 'ACCEPTED',
      cooking: 'PREPARING',
      preparing: 'PREPARING',
      ready: 'READY',
      served: 'SERVED',
    }

    let updatedDbOrder = null
    let existing: any = null

    try {
      const matchKeys = Array.from(
        new Set([id, fullId, orderNumber].filter(Boolean))
      ) as string[]

      const orClauses: any[] = []
      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

      for (const k of matchKeys) {
        orClauses.push({ orderNumber: k })
        orClauses.push({ orderNumber: { equals: k, mode: 'insensitive' } })
        if (isUuid(k)) {
          orClauses.push({ id: k })
        }
      }

      existing = await (prisma.order as any).findFirst({
        where: {
          OR: orClauses,
        },
        include: {
          kitchenTickets: true,
          items: true,
        },
      })

      if (existing) {
        const updateData: any = {
          updatedAt: new Date(),
        }

        if (normalizedKdsStatus && dbStatusMap[normalizedKdsStatus]) {
          updateData.status = dbStatusMap[normalizedKdsStatus] as any
          if (normalizedKdsStatus === 'ready') {
            updateData.preparedAt = new Date()
          } else if (normalizedKdsStatus === 'served') {
            updateData.servedAt = new Date()
          }
        }
        if (notes) {
          updateData.notes = notes
        }

        updatedDbOrder = await prisma.order.update({
          where: { id: existing.id },
          data: updateData,
        })

        // Also update any linked KitchenTickets if present
        if (existing.kitchenTickets && existing.kitchenTickets.length > 0) {
          const ktStatusMap: Record<string, any> = {
            pending: 'pending',
            accepted: 'pending',
            cooking: 'preparing',
            ready: 'ready',
            served: 'served',
          }

          if (normalizedKdsStatus && ktStatusMap[normalizedKdsStatus]) {
            for (const kt of existing.kitchenTickets) {
              await prisma.kitchenTicket.update({
                where: { id: kt.id },
                data: {
                  status: ktStatusMap[normalizedKdsStatus],
                  ...(normalizedKdsStatus === 'cooking' ? { startedAt: new Date() } : {}),
                  ...(normalizedKdsStatus === 'ready' ? { completedAt: new Date() } : {}),
                },
              })
            }
          }
        }

        // If toggling an item status
        if (toggleItemId && existing.items) {
          const item = existing.items.find((i: any) => i.id === toggleItemId)
          if (item) {
            const nextItemStatus = item.status === 'ready' ? 'preparing' : 'ready'
            await prisma.orderItem.update({
              where: { id: toggleItemId },
              data: { status: nextItemStatus },
            })
          }
        }
      }
    } catch (dbErr) {
      console.warn('Database update fallback:', (dbErr as any)?.message)
    }

    // Always update server-side memory store & KDS cache immediately
    const allKeys = Array.from(
      new Set([id, fullId, orderNumber, existing?.id, existing?.orderNumber].filter(Boolean))
    ) as string[]

    const fallbackUpdate: any = {}
    if (normalizedKdsStatus) fallbackUpdate.status = normalizedKdsStatus
    if (priority) fallbackUpdate.priority = priority
    if (notes) fallbackUpdate.specialNotes = notes

    for (const k of allKeys) {
      if (normalizedKdsStatus === 'served') {
        removeFallbackOrder(k)
      } else {
        updateFallbackOrder(k, fallbackUpdate)
      }
      updateKDSCacheTicket(k, fallbackUpdate)
    }

    if (normalizedKdsStatus === 'served') {
      invalidateKDSCache()
    }
    invalidateLiveOrdersCache()

    return NextResponse.json(
      successResponse({
        id,
        fullId: existing?.id || fullId,
        orderNumber: existing?.orderNumber || orderNumber || id,
        status: normalizedKdsStatus || status,
        priority,
        updated: true,
        ticket: fallbackUpdate,
      }),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    console.error('Error updating KDS ticket:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to update KDS ticket', 'KDS_UPDATE_ERROR'),
      { status: 500 }
    )
  }
}
