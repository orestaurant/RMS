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
import { deductStockForPreparedOrder } from '@/lib/inventory-deduction'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import {
  notifyOrderPrepared,
  markOrderPreparedNotificationsRead,
} from '@/lib/notifications-store'

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

    // RBAC: Waiters can only accept orders ('accepted') or mark them served ('served').
    // Starting cooking ('cooking') or marking ready ('ready') is strictly reserved for Chef & Admins.
    const authCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    let requesterRole = ''
    if (authCookie) {
      try {
        const payload = await verifyJWT(authCookie)
        requesterRole = String(payload?.role || '').toLowerCase().trim()
      } catch (err) {}
    }

    if (requesterRole === 'waiter') {
      if (normalizedKdsStatus === 'cooking' || normalizedKdsStatus === 'ready') {
        return NextResponse.json(
          errorResponse(
            'Access Denied: Waiters can only Accept orders or Mark them Served. Preparation and Ready statuses are controlled by Kitchen Staff (Chef).',
            'FORBIDDEN'
          ),
          { status: 403 }
        )
      }
    }

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
      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

      const orderSelect = {
        id: true,
        orderNumber: true,
        organizationId: true,
        customerId: true,
        vehicleNumber: true,
        metadata: true,
        table: { select: { tableNumber: true } },
        items: { select: { itemName: true, quantity: true } },
      } as const

      // Fast primary-key lookup if valid UUID
      if (fullId && isUuid(fullId)) {
        existing = await prisma.order.findUnique({
          where: { id: fullId },
          select: orderSelect,
        })
      } else if (id && isUuid(id)) {
        existing = await prisma.order.findUnique({
          where: { id },
          select: orderSelect,
        })
      }

      // If not found by UUID, lookup by indexed orderNumber
      if (!existing) {
        const orderNum = orderNumber || (!isUuid(id) ? id : null)
        if (orderNum) {
          existing = await prisma.order.findFirst({
            where: { orderNumber: orderNum },
            select: orderSelect,
          })
        }
      }

      if (existing) {
        const updateData: any = {
          updatedAt: new Date(),
        }

        if (normalizedKdsStatus && dbStatusMap[normalizedKdsStatus]) {
          updateData.status = dbStatusMap[normalizedKdsStatus] as any
          if (normalizedKdsStatus === 'ready') {
            updateData.preparedAt = new Date()
            // Real-time automatic inventory recipe deduction (asynchronous non-blocking)
            deductStockForPreparedOrder(existing.id).catch((err) =>
              console.error('Inventory auto-deduction error:', err?.message)
            )
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

        // Fast parallel update for linked KitchenTickets
        const ktStatusMap: Record<string, any> = {
          pending: 'pending',
          accepted: 'pending',
          cooking: 'preparing',
          ready: 'ready',
          served: 'served',
        }

        if (normalizedKdsStatus && ktStatusMap[normalizedKdsStatus]) {
          await prisma.kitchenTicket.updateMany({
            where: { orderId: existing.id },
            data: {
              status: ktStatusMap[normalizedKdsStatus],
              ...(normalizedKdsStatus === 'cooking' ? { startedAt: new Date() } : {}),
              ...(normalizedKdsStatus === 'ready' ? { completedAt: new Date() } : {}),
            },
          })
        }

        // If toggling an item status
        if (toggleItemId) {
          const item = await prisma.orderItem.findUnique({
            where: { id: toggleItemId },
            select: { status: true },
          })
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

    // Invalidate both caches immediately on any status change for real-time reactivity
    invalidateKDSCache()
    invalidateLiveOrdersCache()

    // Emit server-side food-ready notification (for Waiters, Staff & Customer) or mark read on served
    if (normalizedKdsStatus === 'ready') {
      const meta = (existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}) as Record<string, any>
      const tableNum =
        existing?.table?.tableNumber ||
        (existing?.vehicleNumber ? `🚗 ${existing.vehicleNumber}` : null) ||
        meta.tableNumber ||
        body.tableNumber ||
        'Table'
      const itemsSummary =
        Array.isArray(existing?.items) && existing.items.length > 0
          ? existing.items.map((i: any) => `${i.quantity}× ${i.itemName}`).join(', ')
          : body.itemsSummary || null

      await notifyOrderPrepared({
        orderId: existing?.id || fullId || id,
        orderNumber: existing?.orderNumber || orderNumber || id,
        tableNumber: String(tableNum),
        customerName: meta.customerName || body.customerName || null,
        customerId: existing?.customerId || null,
        organizationId: existing?.organizationId || null,
        itemsSummary,
      }).catch((err) => console.warn('Failed to emit order_prepared notification:', err))
    } else if (normalizedKdsStatus === 'served') {
      await markOrderPreparedNotificationsRead(
        existing?.orderNumber || orderNumber || id,
        existing?.organizationId || null
      ).catch(() => {})
    }

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
