import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { updateFallbackOrder } from '@/lib/kds-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        table: true,
        items: true,
        customer: true,
        createdBy: true,
      },
    })

    if (!order) {
      return NextResponse.json(errorResponse('Order not found', 'NOT_FOUND'), { status: 404 })
    }

    return NextResponse.json(successResponse(order))
  } catch (err: any) {
    return NextResponse.json(errorResponse(err.message, 'ORDER_FETCH_ERROR'), { status: 500 })
  }
}

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

    updateFallbackOrder(id, {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(notes ? { specialNotes: notes } : {}),
    })

    return NextResponse.json(successResponse({ id, status, updated: true }))
  } catch (error: any) {
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to update order', 'ORDER_UPDATE_ERROR'),
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

    const existing = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
    })

    if (!existing) {
      return NextResponse.json(
        errorResponse('Order not found', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    // Soft-delete order and update status to cancelled
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: 'cancelled',
      },
    })

    // Remove from active KDS in-memory queue
    updateFallbackOrder(id, { status: 'served' })

    return NextResponse.json(
      successResponse({
        id: existing.id,
        orderNumber: existing.orderNumber,
        deleted: true,
        message: 'Order deleted successfully',
      })
    )
  } catch (error: any) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to delete order', 'ORDER_DELETE_ERROR'),
      { status: 500 }
    )
  }
}


