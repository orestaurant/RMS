import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Reservation ID is required')
    }

    // Single indexed lookup to get tableId & status
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { id: true, tableId: true, status: true },
    })

    if (!reservation) {
      return NextResponse.json(errorResponse('Reservation not found', 'NOT_FOUND'), { status: 404 })
    }

    // If reservation had an active table assigned, release status lock in an atomic transaction
    try {
      if (reservation.tableId) {
        await prisma.$transaction([
          prisma.reservation.delete({
            where: { id },
          }),
          prisma.restaurantTable.updateMany({
            where: {
              id: reservation.tableId,
              status: 'reserved',
            },
            data: {
              status: 'available',
            },
          }),
        ])
      } else {
        await prisma.reservation.delete({
          where: { id },
        })
      }
    } catch (dbErr: any) {
      // Graceful fallback to soft delete if foreign key constraints prevent immediate hard delete
      if (reservation.tableId) {
        await prisma.$transaction([
          prisma.reservation.update({
            where: { id },
            data: {
              deletedAt: new Date(),
              status: 'cancelled',
            },
          }),
          prisma.restaurantTable.updateMany({
            where: {
              id: reservation.tableId,
              status: 'reserved',
            },
            data: {
              status: 'available',
            },
          }),
        ])
      } else {
        await prisma.reservation.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            status: 'cancelled',
          },
        })
      }
    }

    return NextResponse.json(
      successResponse(null, 'Reservation deleted successfully'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting reservation [id]:', error)
    if (error instanceof ValidationError) {
      return NextResponse.json(errorResponse(error.message, error.code), { status: 400 })
    }
    return NextResponse.json(errorResponse(error.message, 'RESERVATION_DELETE_ERROR'), { status: 500 })
  }
}
