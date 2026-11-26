import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { updateFallbackOrder, removeFallbackOrder, invalidateLiveOrdersCache, invalidateKDSCache } from '@/lib/kds-utils'
import { syncCustomerOrderStats } from '@/lib/customer-stats'
import {
  notifyOrderPrepared,
  markOrderPreparedNotificationsRead,
} from '@/lib/notifications-store'

const isUuid = (val: string) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const whereClause = isUuid(id) ? { OR: [{ id }, { orderNumber: id }] } : { orderNumber: id }
    const order = await prisma.order.findFirst({
      where: whereClause,
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
    const body = await request.json().catch(() => ({}))
    const {
      status,
      priority,
      notes,
      isLocationLocked,
      vehicleName,
      vehicleNumber,
      landmarkNote,
      customerLat,
      customerLng,
      locationAccuracy,
      locationCapturedAt,
      unlockOverride,
    } = body

    const dbStatusMap: Record<string, string> = {
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

    let updatedOrder: any = null

    try {
      const whereClause = isUuid(id) ? { OR: [{ id }, { orderNumber: id }] } : { orderNumber: id }
      const existing = await prisma.order.findFirst({
        where: whereClause,
        include: {
          table: { select: { tableNumber: true } },
          items: { select: { itemName: true, quantity: true } },
        },
      })

      if (existing) {
        // Enforce lock protection: if isLocationLocked is true, reject overwrites unless unlockOverride: true
        const isAttemptingLocationUpdate =
          vehicleName !== undefined ||
          vehicleNumber !== undefined ||
          landmarkNote !== undefined ||
          customerLat !== undefined ||
          customerLng !== undefined ||
          locationAccuracy !== undefined ||
          locationCapturedAt !== undefined

        if (existing.isLocationLocked && isAttemptingLocationUpdate && !unlockOverride) {
          return NextResponse.json(
            errorResponse(
              'Location and vehicle details are locked. Provide unlockOverride: true to edit.',
              'LOCATION_LOCKED'
            ),
            { status: 423 }
          )
        }

        const updateData: any = { updatedAt: new Date() }
        if (status && dbStatusMap[status]) {
          updateData.status = dbStatusMap[status] as any
        }
        if (notes !== undefined) updateData.notes = notes

        if (isLocationLocked !== undefined) {
          updateData.isLocationLocked = Boolean(isLocationLocked)
        }
        if (vehicleNumber !== undefined) {
          updateData.vehicleNumber = vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : null
        }
        if (landmarkNote !== undefined) {
          updateData.landmarkNote = landmarkNote ? String(landmarkNote).trim() : null
        }
        if (customerLat !== undefined) {
          updateData.customerLat =
            customerLat !== null && !isNaN(Number(customerLat)) ? Number(customerLat) : null
        }
        if (customerLng !== undefined) {
          updateData.customerLng =
            customerLng !== null && !isNaN(Number(customerLng)) ? Number(customerLng) : null
        }
        if (locationAccuracy !== undefined) {
          updateData.locationAccuracy =
            locationAccuracy !== null && !isNaN(Number(locationAccuracy)) ? Number(locationAccuracy) : null
        }
        if (locationCapturedAt !== undefined) {
          updateData.locationCapturedAt = locationCapturedAt ? new Date(locationCapturedAt) : null
        }

        const prevMeta = (existing.metadata as Record<string, any>) || {}
        const parsedVehicleName =
          vehicleName !== undefined ? (vehicleName ? String(vehicleName).trim().slice(0, 80) : null) : undefined
        updateData.metadata = {
          ...prevMeta,
          ...(isLocationLocked !== undefined ? { isLocationLocked: updateData.isLocationLocked } : {}),
          ...(parsedVehicleName !== undefined ? { vehicleName: parsedVehicleName } : {}),
          ...(vehicleNumber !== undefined ? { vehicleNumber: updateData.vehicleNumber } : {}),
          ...(landmarkNote !== undefined ? { landmarkNote: updateData.landmarkNote } : {}),
          ...(customerLat !== undefined ? { customerLat: updateData.customerLat } : {}),
          ...(customerLng !== undefined ? { customerLng: updateData.customerLng } : {}),
          ...(locationAccuracy !== undefined ? { locationAccuracy: updateData.locationAccuracy } : {}),
          ...(locationCapturedAt !== undefined
            ? { locationCapturedAt: updateData.locationCapturedAt ? updateData.locationCapturedAt.toISOString() : null }
            : {}),
        }

        updatedOrder = await prisma.order.update({
          where: { id: existing.id },
          data: updateData,
        })

        if (updateData.status === 'READY') {
          const tableLabel =
            existing.table?.tableNumber ||
            (updatedOrder.vehicleNumber ? `🚗 ${updatedOrder.vehicleNumber}` : null) ||
            prevMeta.tableNumber ||
            'Table'
          const itemsSummary =
            Array.isArray(existing.items) && existing.items.length > 0
              ? existing.items.map((i: any) => `${i.quantity}× ${i.itemName}`).join(', ')
              : null

          await notifyOrderPrepared({
            orderId: existing.id,
            orderNumber: existing.orderNumber,
            tableNumber: String(tableLabel),
            customerName: prevMeta.customerName || null,
            customerId: existing.customerId || null,
            organizationId: existing.organizationId || null,
            itemsSummary,
          }).catch((err) => console.warn('Order ready notification error:', err))
        } else if (updateData.status === 'SERVED') {
          await markOrderPreparedNotificationsRead(
            existing.orderNumber,
            existing.organizationId
          ).catch(() => {})
        }
      }
    } catch (dbErr) {
      console.warn('Prisma order update fallback:', (dbErr as any)?.message)
    }

    updateFallbackOrder(id, {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(notes !== undefined ? { specialNotes: notes } : {}),
      ...(isLocationLocked !== undefined ? { isLocationLocked: Boolean(isLocationLocked) } : {}),
      ...(vehicleName !== undefined
        ? { vehicleName: vehicleName ? String(vehicleName).trim().slice(0, 80) : null }
        : {}),
      ...(vehicleNumber !== undefined
        ? { vehicleNumber: vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : null }
        : {}),
      ...(landmarkNote !== undefined
        ? { landmarkNote: landmarkNote ? String(landmarkNote).trim() : null }
        : {}),
      ...(customerLat !== undefined
        ? { customerLat: customerLat !== null && !isNaN(Number(customerLat)) ? Number(customerLat) : null }
        : {}),
      ...(customerLng !== undefined
        ? { customerLng: customerLng !== null && !isNaN(Number(customerLng)) ? Number(customerLng) : null }
        : {}),
      ...(locationAccuracy !== undefined
        ? { locationAccuracy: locationAccuracy !== null && !isNaN(Number(locationAccuracy)) ? Number(locationAccuracy) : null }
        : {}),
      ...(locationCapturedAt !== undefined
        ? { locationCapturedAt: locationCapturedAt ? new Date(locationCapturedAt) : null }
        : {}),
    })

    invalidateLiveOrdersCache()
    invalidateKDSCache()

    return NextResponse.json(
      successResponse({
        id,
        status: status || updatedOrder?.status,
        isLocationLocked: isLocationLocked ?? updatedOrder?.isLocationLocked,
        vehicleName: vehicleName !== undefined ? (vehicleName ? String(vehicleName).trim() : null) : (updatedOrder?.metadata as any)?.vehicleName,
        vehicleNumber: vehicleNumber ?? updatedOrder?.vehicleNumber,
        landmarkNote: landmarkNote ?? updatedOrder?.landmarkNote,
        customerLat: customerLat ?? updatedOrder?.customerLat,
        customerLng: customerLng ?? updatedOrder?.customerLng,
        locationAccuracy: locationAccuracy ?? updatedOrder?.locationAccuracy,
        locationCapturedAt: locationCapturedAt ?? updatedOrder?.locationCapturedAt,
        updated: true,
      })
    )
  } catch (error: any) {
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to update order', 'ORDER_UPDATE_ERROR'),
      { status: 500 }
    )
  }
}

export const PUT = PATCH

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Remove from in-memory / session live queue
    removeFallbackOrder(id)
    updateFallbackOrder(id, { status: 'cancelled' })

    // 2. Try soft-deleting in Prisma DB if available
    try {
      const whereClause = isUuid(id) ? { OR: [{ id }, { orderNumber: id }] } : { orderNumber: id }
      const existing = await prisma.order.findFirst({
        where: whereClause,
        include: {
          table: { select: { tableNumber: true } },
          items: { select: { itemName: true, quantity: true } },
        },
      })

      if (existing) {
        await prisma.order.update({
          where: { id: existing.id },
          data: {
            deletedAt: new Date(),
            status: 'cancelled',
          },
        })

        if (existing.customerId) {
          await syncCustomerOrderStats(existing.customerId)
        }
      }
    } catch (dbErr) {
      console.warn('Prisma order delete notice:', dbErr)
    }

    invalidateLiveOrdersCache()
    invalidateKDSCache()

    return NextResponse.json(
      successResponse({
        id,
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


