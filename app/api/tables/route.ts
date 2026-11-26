/**
 * /api/tables
 * Get all tables, create new table, or update table status
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMockAuthContext, extractAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'
import { invalidatePOSTablesCache } from '@/lib/pos-cache'
import { invalidateDashboardStatsCache } from '@/lib/dashboard-cache'
import { ACTIVE_ORDER_DB_STATUSES, getEffectiveTableStatus } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const requestedBranchId = request.nextUrl.searchParams.get('branchId')
    const isPublicAvailability = request.nextUrl.searchParams.get('public') === '1'
    const authContext = extractAuthContext(request)
    const tenantContext = extractTenantContext(authContext)

    let branchId = requestedBranchId || (authContext.userId ? tenantContext.branchId : '')
    let organizationId = tenantContext.organizationId

    if (requestedBranchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: requestedBranchId },
        select: { id: true, organizationId: true },
      })
      if (branch) {
        branchId = branch.id
        organizationId = branch.organizationId
      }
    } else if (!branchId) {
      const primaryBranch = await prisma.branch.findFirst({
        orderBy: { isPrimary: 'desc' },
        select: { id: true, organizationId: true },
      })
      if (primaryBranch) {
        branchId = primaryBranch.id
        organizationId = primaryBranch.organizationId
      } else {
        branchId = tenantContext.branchId
      }
    }

    const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const tables = await prisma.restaurantTable.findMany({
      where: {
        organizationId,
        branchId,
        deletedAt: null,
      },
      include: {
        orders: {
          where: {
            deletedAt: null,
            isBilled: false,
            status: { in: [...ACTIVE_ORDER_DB_STATUSES] as any[] },
            paymentStatus: { notIn: ['completed', 'refunded', 'cancelled'] },
            createdAt: { gte: sessionCutoff },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        reservations: isPublicAvailability
          ? false
          : {
              where: {
                status: { in: ['confirmed', 'pending', 'checked_in'] },
              },
              orderBy: { reservationTime: 'asc' },
              take: 1,
              select: {
                id: true,
                guestName: true,
                numberOfGuests: true,
                reservationTime: true,
              },
            },
      },
      orderBy: [
        { section: 'asc' },
        { tableNumber: 'asc' },
      ],
    })

    const formatted = tables.map((t) => {
      const activeOrder = t.orders[0]
      const activeRes = Array.isArray((t as any).reservations) ? (t as any).reservations[0] : undefined
      const meta = (t.metadata as Record<string, any>) || {}

      // Determine display status (customStatus e.g. cleaning or out_of_service, active unbilled order, else DB enum)
      const baseStatus = getEffectiveTableStatus(t.status, meta)
      const displayStatus =
        baseStatus === 'available' && activeOrder ? 'occupied' : baseStatus
      const isOccupied = displayStatus === 'occupied'

      if (isPublicAvailability) {
        return {
          id: t.id,
          number: parseInt(t.tableNumber) || t.tableNumber,
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          section: (t.section || 'indoor').toLowerCase(),
          rawSection: t.section || 'Indoor',
          status: displayStatus,
        }
      }

      return {
        id: t.id,
        number: parseInt(t.tableNumber) || t.tableNumber,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        section: (t.section || 'indoor').toLowerCase(),
        rawSection: t.section || 'Indoor',
        status: displayStatus,
        waiter: meta.waiter || undefined,
        waiterId: meta.waiterId || undefined,
        occupiedSince: isOccupied
          ? (activeOrder?.createdAt
              ? new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
              : meta.occupiedSince || undefined)
          : undefined,
        guestCount: isOccupied ? (meta.guestCount || undefined) : undefined,
        order: (isOccupied && activeOrder) ? { id: activeOrder.orderNumber, status: activeOrder.status } : undefined,
        activeReservation: activeRes
          ? {
              guestName: activeRes.guestName,
              guestCount: activeRes.numberOfGuests,
              time: new Date(activeRes.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            }
          : undefined,
        x: t.xPosition ? Number(t.xPosition) : 0,
        y: t.yPosition ? Number(t.yPosition) : 0,
      }
    })

    // Sort numerically by tableNumber so T10 doesn't jump before T6
    formatted.sort((a, b) => {
      const numA = parseInt(String(a.tableNumber)) || 0
      const numB = parseInt(String(b.tableNumber)) || 0
      if (numA !== numB) return numA - numB
      return String(a.tableNumber).localeCompare(String(b.tableNumber))
    })

    const responsePayload = successResponse(formatted)

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      errorResponse(error.message, 'TABLES_ERROR'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)
    const body = await request.json()

    const { tableNumber, capacity, section, branchId } = body

    if (!tableNumber) {
      throw new ValidationError('Table number is required')
    }

    const activeBranchId = branchId || tenantContext.branchId || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
    const cleanTableNumber = String(tableNumber).trim()

    const existing = await prisma.restaurantTable.findFirst({
      where: {
        branchId: activeBranchId,
        tableNumber: cleanTableNumber,
      },
    })

    if (existing) {
      if (existing.deletedAt) {
        const restored = await prisma.restaurantTable.update({
          where: { id: existing.id },
          data: {
            capacity: Number(capacity) || 4,
            section: section || 'Indoor',
            status: 'available',
            deletedAt: null,
            metadata: {},
          },
        })
        return NextResponse.json(successResponse(restored, 'Table created successfully'), { status: 201 })
      }

      return NextResponse.json(
        errorResponse(`Table ${cleanTableNumber} already exists in this branch`, 'TABLE_EXISTS'),
        { status: 409 }
      )
    }

    const newTable = await prisma.restaurantTable.create({
      data: {
        tableNumber: cleanTableNumber,
        capacity: Number(capacity) || 4,
        section: section || 'Indoor',
        branchId: activeBranchId,
        restaurantId: tenantContext.restaurantId,
        organizationId: tenantContext.organizationId,
        status: 'available',
      },
    })

    invalidatePOSTablesCache()
    return NextResponse.json(successResponse(newTable, 'Table created successfully'), { status: 201 })
  } catch (error: any) {
    console.error('Error creating table:', error)
    if (error instanceof ValidationError) {
      return NextResponse.json(errorResponse(error.message, error.code), { status: 400 })
    }
    return NextResponse.json(errorResponse(error.message, 'TABLE_CREATE_ERROR'), { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, waiter, guestCount } = body

    if (!id) {
      throw new ValidationError('Table id is required')
    }

    let dbStatus: 'available' | 'occupied' | 'reserved' | 'maintenance' = 'available'
    let customStatus: string | undefined = undefined

    if (status === 'cleaning' || status === 'out_of_service') {
      dbStatus = 'maintenance'
      customStatus = status
    } else if (['available', 'occupied', 'reserved', 'maintenance'].includes(status)) {
      dbStatus = status as any
    }

    const currentTable = await prisma.restaurantTable.findUnique({
      where: { id },
      select: { metadata: true },
    })

    if (!currentTable) {
      return NextResponse.json(errorResponse('Table not found', 'NOT_FOUND'), { status: 404 })
    }

    const existingMeta = (currentTable?.metadata as Record<string, any>) || {}
    const updatedMeta: Record<string, any> = {
      ...existingMeta,
      ...(customStatus !== undefined ? { customStatus } : {}),
      ...(waiter !== undefined ? { waiter } : {}),
      ...(guestCount !== undefined ? { guestCount } : {}),
    }

    if (status === 'occupied') {
      delete updatedMeta.customStatus
      if (!updatedMeta.occupiedSince) {
        updatedMeta.occupiedSince = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      }
    } else if (status === 'available') {
      delete updatedMeta.customStatus
      delete updatedMeta.occupiedSince
      delete updatedMeta.guestCount
      delete updatedMeta.waiter
      delete updatedMeta.waiterId

      // Close any active orders associated with this table
      await prisma.order.updateMany({
        where: {
          tableId: id,
          status: {
            in: [
              'pending',
              'PENDING',
              'accepted',
              'ACCEPTED',
              'confirmed',
              'preparing',
              'PREPARING',
              'ready',
              'READY',
              'served',
              'SERVED',
            ],
          },
        },
        data: {
          status: 'completed',
        },
      }).catch((err) => console.error('Error completing orders when freeing table:', err))
    } else if (status === 'reserved') {
      delete updatedMeta.customStatus
    }

    const updated = await prisma.restaurantTable.update({
      where: { id },
      data: {
        status: dbStatus,
        metadata: updatedMeta,
      },
    })

    invalidatePOSTablesCache()
    invalidateDashboardStatsCache(updated.branchId)
    return NextResponse.json(successResponse(updated, 'Table updated successfully'), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Error updating table:', error)
    if (error instanceof ValidationError) {
      return NextResponse.json(errorResponse(error.message, error.code), { status: 400 })
    }
    return NextResponse.json(errorResponse(error.message, 'TABLE_UPDATE_ERROR'), { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')
    if (!id) {
      const body = await request.json().catch(() => ({}))
      id = body?.id
    }

    if (!id) {
      throw new ValidationError('Table ID is required for deletion')
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { id },
    })

    if (!table) {
      return NextResponse.json(errorResponse('Table not found', 'NOT_FOUND'), { status: 404 })
    }

    // Try hard delete first if no blocking foreign keys
    try {
      await prisma.restaurantTable.delete({
        where: { id },
      })
      invalidatePOSTablesCache()
      return NextResponse.json(successResponse(null, `Table ${table.tableNumber} deleted successfully`))
    } catch (dbErr: any) {
      console.warn('Permanent table delete prevented by foreign keys, performing soft delete:', dbErr.message)
      await prisma.restaurantTable.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      })
      invalidatePOSTablesCache()
      return NextResponse.json(successResponse(null, `Table ${table.tableNumber} deleted successfully`))
    }
  } catch (error: any) {
    console.error('Error deleting table:', error)
    if (error instanceof ValidationError) {
      return NextResponse.json(errorResponse(error.message, error.code), { status: 400 })
    }
    return NextResponse.json(errorResponse(error.message, 'TABLE_DELETE_ERROR'), { status: 500 })
  }
}
