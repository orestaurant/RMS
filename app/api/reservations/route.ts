/**
 * /api/reservations
 * Get all reservations, create new reservation, or update reservation status
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const branchIdParam = request.nextUrl.searchParams.get('branchId')
    const dateParam = request.nextUrl.searchParams.get('date')
    const statusParam = request.nextUrl.searchParams.get('status') || 'all'

    const where: any = {
      deletedAt: null,
    }

    if (branchIdParam && branchIdParam !== 'all') {
      where.branchId = branchIdParam
    }

    if (statusParam !== 'all') {
      where.status = statusParam === 'seated' ? 'checked_in' : statusParam
    }

    if (dateParam === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      where.reservationDate = {
        gte: today,
        lt: tomorrow,
      }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        table: true,
        customer: true,
        payments: true,
      },
      orderBy: [
        { reservationDate: 'asc' },
        { reservationTime: 'asc' },
      ],
      take: 100,
    })

    const formatted = reservations.map((r) => {
      const dateStr =
        r.reservationDate instanceof Date
          ? r.reservationDate.toISOString().split('T')[0]
          : String(r.reservationDate).split('T')[0]

      let timeStr = '19:00'
      if (r.reservationTime instanceof Date) {
        timeStr = r.reservationTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      } else if (r.reservationTime) {
        const timeVal = String(r.reservationTime)
        timeStr = timeVal.length >= 16 ? timeVal.slice(11, 16) : timeVal
      }

      // Map 'checked_in' to 'seated' for client UI convenience
      const normalizedStatus =
        r.status.toLowerCase() === 'checked_in' ? 'seated' : r.status.toLowerCase()

      return {
        id: r.id,
        guestName: r.guestName,
        guestPhone: r.guestPhone,
        guestEmail: r.guestEmail || '',
        tableId: r.tableId || '',
        tableNumber: r.table ? parseInt(r.table.tableNumber) || r.table.tableNumber : null,
        tableName: r.table ? `Table ${r.table.tableNumber}` : 'Unassigned',
        tableSection: r.table?.section || null,
        date: dateStr,
        time: timeStr,
        guestCount: r.numberOfGuests,
        status: normalizedStatus,
        notes: r.notes || '',
        prepayment: Number(r.advancePaymentAmount) || 0,
        createdAt: r.createdAt.toISOString(),
      }
    })

    return NextResponse.json(
      successResponse(formatted, 'Success', {
        total: formatted.length,
        statuses: {
          confirmed: formatted.filter((r) => r.status === 'confirmed').length,
          pending: formatted.filter((r) => r.status === 'pending').length,
          seated: formatted.filter((r) => r.status === 'seated').length,
          cancelled: formatted.filter((r) => r.status === 'cancelled').length,
        },
      })
    )
  } catch (error: any) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(errorResponse(error.message, 'RESERVATIONS_ERROR'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      guestName,
      guestPhone,
      guestEmail,
      branchId,
      tableId,
      reservationDate,
      reservationTime,
      numberOfGuests,
      notes,
      prepayment,
      status,
    } = body

    if (!guestName || !guestPhone || !reservationDate || !reservationTime || !numberOfGuests) {
      throw new ValidationError(
        'Missing required fields: guestName, guestPhone, reservationDate, reservationTime, numberOfGuests'
      )
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)
    let activeBranchId = branchId || tenantContext.branchId
    let activeRestaurantId = tenantContext.restaurantId
    let activeOrgId = tenantContext.organizationId

    // Fallback to active DB branch/restaurant/org if context missing
    if (!activeBranchId || !activeRestaurantId || !activeOrgId) {
      const dbBranch = await prisma.branch.findFirst({
        select: { id: true, restaurantId: true, organizationId: true },
      })
      if (dbBranch) {
        activeBranchId = activeBranchId || dbBranch.id
        activeRestaurantId = activeRestaurantId || dbBranch.restaurantId
        activeOrgId = activeOrgId || dbBranch.organizationId
      }
    }

    const resDate = new Date(reservationDate)
    const [hours, minutes] = String(reservationTime).split(':').map(Number)
    const resTime = new Date('1970-01-01T00:00:00.000Z')
    resTime.setUTCHours(hours || 19, minutes || 0, 0, 0)

    let dbStatus: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' = 'confirmed'
    if (status === 'pending') dbStatus = 'pending'
    else if (status === 'seated' || status === 'checked_in') dbStatus = 'checked_in'
    else if (status === 'cancelled') dbStatus = 'cancelled'

    const reservation = await prisma.reservation.create({
      data: {
        guestName,
        guestPhone,
        guestEmail: guestEmail || null,
        tableId: tableId || null,
        branchId: activeBranchId!,
        restaurantId: activeRestaurantId!,
        organizationId: activeOrgId!,
        reservationDate: resDate,
        reservationTime: resTime,
        numberOfGuests: Number(numberOfGuests) || 2,
        notes: notes || null,
        advancePaymentAmount: prepayment ? Number(prepayment) : 0,
        status: dbStatus,
      },
      include: {
        table: true,
      },
    })

    // If table assigned and status confirmed, update table status to reserved
    if (tableId && dbStatus === 'confirmed') {
      await prisma.restaurantTable
        .update({
          where: { id: tableId },
          data: { status: 'reserved' },
        })
        .catch(() => {})
    }

    return NextResponse.json(
      successResponse(reservation, 'Reservation created successfully'),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating reservation:', error)
    if (error instanceof ValidationError) {
      return NextResponse.json(errorResponse(error.message, error.code), { status: 400 })
    }
    return NextResponse.json(errorResponse(error.message, 'RESERVATIONS_ERROR'), { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, tableId, notes } = body

    if (!id) {
      throw new ValidationError('Reservation ID is required')
    }

    const updateData: any = {}
    if (status) {
      const s = status.toLowerCase()
      if (s === 'seated' || s === 'checked_in') {
        updateData.status = 'checked_in'
      } else if (['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(s)) {
        updateData.status = s
      }
    }
    if (tableId !== undefined) {
      updateData.tableId = tableId || null
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: { table: true },
    })

    // Sync table status if reservation status changed:
    // If seated/checked_in and table exists, mark table as occupied
    if (updateData.status === 'checked_in' && reservation.tableId) {
      await prisma.restaurantTable
        .update({
          where: { id: reservation.tableId },
          data: {
            status: 'occupied',
            metadata: {
              waiter: 'Staff',
              guestCount: reservation.numberOfGuests,
              occupiedSince: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
            },
          },
        })
        .catch(() => {})
    } else if (updateData.status === 'cancelled' && reservation.tableId) {
      await prisma.restaurantTable
        .update({
          where: { id: reservation.tableId },
          data: { status: 'available' },
        })
        .catch(() => {})
    }

    return NextResponse.json(successResponse(reservation, 'Reservation updated successfully'))
  } catch (error: any) {
    console.error('Error updating reservation:', error)
    if (error instanceof ValidationError) {
      return NextResponse.json(errorResponse(error.message, error.code), { status: 400 })
    }
    return NextResponse.json(errorResponse(error.message, 'RESERVATION_UPDATE_ERROR'), { status: 500 })
  }
}
