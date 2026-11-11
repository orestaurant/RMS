/**
 * GET /api/reservations?branchId=<id>&date=today&status=all
 * Get reservations for a branch
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const branchId = request.nextUrl.searchParams.get('branchId')
    const date = request.nextUrl.searchParams.get('date')
    const status = request.nextUrl.searchParams.get('status') || 'all'

    // Validate input
    if (!branchId) {
      throw new ValidationError('branchId is required')
    }

    // TODO: Extract real auth context from JWT token
    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Build query
    const where: any = {
      branch: {
        id: branchId,
        restaurantId: tenantContext.restaurantId,
        organization: { id: tenantContext.organizationId },
      },
    }

    // Filter by date if provided
    if (date === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      where.reservationTime = {
        gte: today,
        lt: tomorrow,
      }
    }

    // Filter by status
    if (status !== 'all') {
      where.status = status
    }

    // Fetch reservations with related data
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        table: true,
        customer: true,
        payments: true,
      },
      orderBy: { reservationTime: 'asc' },
      take: 100,
    })

    // Format response
    const formattedReservations = reservations.map((r) => ({
      id: r.id,
      customerName: r.guestName,
      customerPhone: r.guestPhone,
      customerEmail: r.guestEmail || '',
      tableId: r.tableId,
      tableNumber: r.table ? parseInt(r.table.tableNumber) : 0,
      date: r.reservationDate.toISOString().split('T')[0],
      time: r.reservationTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      reservationTime: new Date(
        r.reservationDate.toISOString().split('T')[0] + 'T' + 
        r.reservationTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      ).toISOString(),
      guestCount: r.numberOfGuests,
      status: r.status.toLowerCase(),
      specialRequests: r.notes || '',
      notes: r.notes || '',
      prepayment: Number(r.advancePaymentAmount) || 0,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json(successResponse(
      formattedReservations,
      'Success',
      {
        total: formattedReservations.length,
        statuses: {
          confirmed: formattedReservations.filter((r) => r.status === 'confirmed').length,
          pending: formattedReservations.filter((r) => r.status === 'pending').length,
          seated: formattedReservations.filter((r) => r.status === 'checked_in').length,
          cancelled: formattedReservations.filter((r) => r.status === 'cancelled').length,
        },
      }
    ))
  } catch (error: any) {
    console.error('Error fetching reservations:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'RESERVATIONS_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * POST /api/reservations
 * Create a new reservation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { guestName, guestPhone, guestEmail, branchId, tableId, reservationDate, reservationTime, numberOfGuests, specialRequests, notes } = body

    if (!guestName || !guestPhone || !branchId || !tableId || !reservationDate || !reservationTime || !numberOfGuests) {
      throw new ValidationError('Missing required fields: guestName, guestPhone, branchId, tableId, reservationDate, reservationTime, numberOfGuests')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        guestName,
        guestPhone,
        guestEmail: guestEmail || null,
        tableId,
        branchId,
        restaurantId: tenantContext.restaurantId,
        organizationId: tenantContext.organizationId,
        reservationDate: new Date(reservationDate),
        reservationTime: new Date(reservationTime),
        numberOfGuests,
        notes: specialRequests || notes || null,
        status: 'pending',
      },
      include: {
        table: true,
      },
    })

    return NextResponse.json(
      successResponse({
        id: reservation.id,
        guestName: reservation.guestName,
        guestPhone: reservation.guestPhone,
        tableId: reservation.tableId,
        tableNumber: reservation.table ? parseInt(reservation.table.tableNumber) : 0,
        reservationDate: reservation.reservationDate.toISOString(),
        reservationTime: reservation.reservationTime.toISOString(),
        numberOfGuests: reservation.numberOfGuests,
        status: reservation.status.toLowerCase(),
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating reservation:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'RESERVATIONS_ERROR'),
      { status: 500 }
    )
  }
}
