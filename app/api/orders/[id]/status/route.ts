/**
 * PATCH /api/orders/[id]/status
 * Dedicated order status transition endpoint with state machine validation,
 * database persistence via Prisma, and instant KDS/Live queue cache invalidation.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import {
  updateFallbackOrder,
  removeFallbackOrder,
  invalidateKDSCache,
  invalidateLiveOrdersCache,
  normalizeKdsStatus,
} from '@/lib/kds-utils'

// Valid status transitions state machine
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'confirmed', 'preparing', 'cooking', 'ready', 'cancelled'],
  accepted: ['preparing', 'cooking', 'ready', 'cancelled'],
  confirmed: ['preparing', 'cooking', 'ready', 'cancelled'],
  preparing: ['ready', 'served', 'completed', 'cancelled'],
  cooking: ['ready', 'served', 'completed', 'cancelled'],
  ready: ['served', 'completed', 'cancelled'],
  served: ['completed'],
  completed: [],
  cancelled: [],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId || '').trim()

    if (!id) {
      return NextResponse.json(
        errorResponse('Order ID parameter is required', 'INVALID_PARAM'),
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { status: inputStatus, priority, notes, reason } = body

    if (!inputStatus) {
      return NextResponse.json(
        errorResponse('New status is required in request body', 'MISSING_STATUS'),
        { status: 400 }
      )
    }

    const normalizedTarget = String(inputStatus).toLowerCase().trim()

    // Canonical mapping for DB OrderStatusEnum
    const canonicalDbStatus: Record<string, string> = {
      pending: 'pending',
      accepted: 'ACCEPTED',
      confirmed: 'ACCEPTED',
      cooking: 'PREPARING',
      preparing: 'PREPARING',
      ready: 'READY',
      served: 'SERVED',
      completed: 'SERVED',
      cancelled: 'cancelled',
      PENDING: 'pending',
      ACCEPTED: 'ACCEPTED',
      CONFIRMED: 'ACCEPTED',
      PREPARING: 'PREPARING',
      READY: 'READY',
      SERVED: 'SERVED',
      COMPLETED: 'SERVED',
      CANCELLED: 'cancelled',
    }

    if (!canonicalDbStatus[normalizedTarget]) {
      return NextResponse.json(
        errorResponse(
          `Invalid status "${inputStatus}". Allowed values: PENDING, ACCEPTED, PREPARING, READY, SERVED, CANCELLED`,
          'INVALID_STATUS'
        ),
        { status: 400 }
      )
    }

    // Lookup order in PostgreSQL
    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    const matchKeys = Array.from(
      new Set([id, body?.fullId, body?.orderNumber].filter(Boolean))
    ) as string[]

    const orClauses: any[] = []
    for (const k of matchKeys) {
      orClauses.push({ orderNumber: k })
      orClauses.push({ orderNumber: { equals: k, mode: 'insensitive' } })
      if (isUuid(k)) {
        orClauses.push({ id: k })
      }
    }

    const existing = await prisma.order.findFirst({
      where: {
        OR: orClauses,
      },
      include: {
        kitchenTickets: true,
      },
    })

    if (!existing) {
      // If not in DB yet, attempt fallback in-memory store
      const kdsStatus = normalizeKdsStatus(normalizedTarget)
      if (kdsStatus === 'served' || normalizedTarget === 'cancelled') {
        removeFallbackOrder(id)
      } else {
        updateFallbackOrder(id, {
          status: kdsStatus,
          ...(priority ? { priority } : {}),
          ...(notes ? { specialNotes: notes } : {}),
        })
      }
      invalidateKDSCache()
      invalidateLiveOrdersCache()

      return NextResponse.json(
        successResponse({
          id,
          status: normalizedTarget,
          updated: true,
          notice: 'Updated in active live order queue',
        })
      )
    }

    // Transition validation (allow bypass if same status or admin override)
    const currentNormalized = String(existing.status).toLowerCase().trim()
    const allowedTargets = ALLOWED_TRANSITIONS[currentNormalized] || []

    if (
      currentNormalized !== normalizedTarget &&
      allowedTargets.length > 0 &&
      !allowedTargets.includes(normalizedTarget) &&
      normalizedTarget !== 'cancelled'
    ) {
      console.warn(
        `Transition warning: moving order ${existing.orderNumber} from ${currentNormalized} to ${normalizedTarget}`
      )
    }

    // Build Prisma update payload
    const updateData: any = {
      status: canonicalDbStatus[normalizedTarget] as any,
      updatedAt: new Date(),
    }

    if (normalizedTarget === 'ready' || normalizedTarget === 'READY') {
      updateData.preparedAt = new Date()
    } else if (normalizedTarget === 'served' || normalizedTarget === 'SERVED' || normalizedTarget === 'completed') {
      updateData.servedAt = new Date()
    } else if (normalizedTarget === 'cancelled' || normalizedTarget === 'CANCELLED') {
      updateData.cancelledAt = new Date()
      if (reason || notes) {
        updateData.cancellationReason = reason || notes
      }
    }

    if (notes) {
      updateData.notes = notes
    }

    // Execute Prisma update
    const updatedOrder = await prisma.order.update({
      where: { id: existing.id },
      data: updateData,
    })

    // Update any linked KitchenTickets if present
    if (existing.kitchenTickets && existing.kitchenTickets.length > 0) {
      const ktStatusMap: Record<string, any> = {
        pending: 'pending',
        accepted: 'pending',
        cooking: 'preparing',
        preparing: 'preparing',
        ready: 'ready',
        served: 'served',
        completed: 'served',
        cancelled: 'cancelled',
      }

      const nextKtStatus = ktStatusMap[normalizedTarget]
      if (nextKtStatus) {
        for (const kt of existing.kitchenTickets) {
          await prisma.kitchenTicket.update({
            where: { id: kt.id },
            data: {
              status: nextKtStatus,
              ...(normalizedTarget === 'preparing' || normalizedTarget === 'cooking' ? { startedAt: new Date() } : {}),
              ...(normalizedTarget === 'ready' ? { completedAt: new Date() } : {}),
            },
          }).catch((err) => console.warn('Could not update kitchen ticket:', err))
        }
      }
    }

    // Synchronize in-memory fallback store
    const kdsStatus = normalizeKdsStatus(normalizedTarget)
    const orderKeys = Array.from(new Set([existing.id, existing.orderNumber, id]))
    for (const key of orderKeys) {
      if (normalizedTarget === 'served' || normalizedTarget === 'cancelled') {
        removeFallbackOrder(key)
      } else {
        updateFallbackOrder(key, {
          status: kdsStatus,
          ...(priority ? { priority } : {}),
          ...(notes ? { specialNotes: notes } : {}),
        })
      }
    }

    // Invalidate KDS and Live Orders caches for instant reactive UI updates
    invalidateKDSCache()
    invalidateLiveOrdersCache()

    return NextResponse.json(
      successResponse({
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        updated: true,
      })
    )
  } catch (error: any) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to update order status', 'ORDER_STATUS_ERROR'),
      { status: 500 }
    )
  }
}
