import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { updateFallbackOrder } from '@/lib/kds-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId || '').trim()
    const body = await request.json().catch(() => ({}))
    const { status, priority, toggleItemId, notes, fullId, orderNumber } = body

    // Status mapping from KDS to DB OrderStatusEnum
    // KDS: pending | accepted | cooking | ready | served
    // DB: pending | confirmed | preparing | ready | served
    const dbStatusMap: Record<string, string> = {
      pending: 'pending',
      accepted: 'confirmed',
      cooking: 'preparing',
      ready: 'ready',
      served: 'served',
    }

    let updatedDbOrder = null
    let existing: any = null

    try {
      const matchKeys = Array.from(new Set([id, fullId, orderNumber].filter(Boolean))) as string[]

      // Find matching order in DB by ID or orderNumber
      const orClauses: any[] = [
        ...matchKeys.map((k) => ({ orderNumber: k })),
        { orderNumber: { equals: id, mode: 'insensitive' } },
      ]

      // Only check UUID if string looks like UUID
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
      for (const k of matchKeys) {
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

        if (status && dbStatusMap[status]) {
          updateData.status = dbStatusMap[status] as any
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

          if (status && ktStatusMap[status]) {
            for (const kt of existing.kitchenTickets) {
              await prisma.kitchenTicket.update({
                where: { id: kt.id },
                data: {
                  status: ktStatusMap[status],
                  ...(status === 'cooking' ? { startedAt: new Date() } : {}),
                  ...(status === 'ready' ? { completedAt: new Date() } : {}),
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

    // Always update fallback memory store as well
    const fallbackUpdate: any = {}
    if (status) fallbackUpdate.status = status
    if (priority) fallbackUpdate.priority = priority
    if (notes) fallbackUpdate.specialNotes = notes

    let updatedFallback = updateFallbackOrder(id, fallbackUpdate)
    if (fullId && fullId !== id) updateFallbackOrder(fullId, fallbackUpdate)
    if (orderNumber && orderNumber !== id) updateFallbackOrder(orderNumber, fallbackUpdate)
    if (existing?.id) updateFallbackOrder(existing.id, fallbackUpdate)
    if (existing?.orderNumber) updateFallbackOrder(existing.orderNumber, fallbackUpdate)

    return NextResponse.json(
      successResponse({
        id,
        status,
        priority,
        updated: true,
        ticket: updatedFallback || updatedDbOrder,
      })
    )
  } catch (error: any) {
    console.error('Error updating KDS ticket:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to update KDS ticket', 'KDS_UPDATE_ERROR'),
      { status: 500 }
    )
  }
}

