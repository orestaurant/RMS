import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { updateFallbackOrder, removeFallbackOrder, invalidateLiveOrdersCache, invalidateKDSCache } from '@/lib/kds-utils'

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
    const body = await request.json().catch(() => ({}))
    const {
      status,
      priority,
      notes,
      isLocationLocked,
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
      const existing = await prisma.order.findFirst({
        where: {
          OR: [{ id }, { orderNumber: id }],
        },
      })

      if (existing) {
        // Enforce lock protection: if isLocationLocked is true, reject overwrites unless unlockOverride: true
        const isAttemptingLocationUpdate =
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
        updateData.metadata = {
          ...prevMeta,
          ...(isLocationLocked !== undefined ? { isLocationLocked: updateData.isLocationLocked } : {}),
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
      }
    } catch (dbErr) {
      console.warn('Prisma order update fallback:', (dbErr as any)?.message)
    }

    updateFallbackOrder(id, {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(notes !== undefined ? { specialNotes: notes } : {}),
      ...(isLocationLocked !== undefined ? { isLocationLocked: Boolean(isLocationLocked) } : {}),
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
      const existing = await prisma.order.findFirst({
        where: {
          OR: [{ id }, { orderNumber: id }],
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


