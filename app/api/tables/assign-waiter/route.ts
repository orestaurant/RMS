/**
 * POST /api/tables/assign-waiter
 * High-performance endpoint for Admin / Manager to assign a waiter to any table.
 * Automatically synchronizes active table bills and KDS orders to the assigned waiter.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthContext } from '@/api/middleware/auth'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { invalidatePOSTablesCache } from '@/lib/pos-cache'
import { checkPermission } from '@/lib/rolesAndPermission'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const authContext = extractAuthContext(request)
    const body = await request.json().catch(() => ({}))
    const { tableId, waiterId, waiterName: reqWaiterName, branchId: reqBranchId } = body

    if (!tableId) {
      return NextResponse.json(errorResponse('Table ID is required', 'MISSING_PARAM'), { status: 400 })
    }

    // Role check: Only Admin, Manager, or staff with manager bypass can reassign tables
    const userRole = authContext.role || 'WAITER'
    const isAllowed = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RESTAURANT_OWNER'].includes(userRole.toUpperCase()) ||
      checkPermission(userRole, 'canBypassManager', { branchId: reqBranchId || authContext.branchId })

    if (!isAllowed) {
      return NextResponse.json(
        errorResponse('Access denied. Only Admins or Managers can reassign tables.', 'FORBIDDEN'),
        { status: 403 }
      )
    }

    // Find table
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        tableNumber: true,
        branchId: true,
        metadata: true,
        status: true,
      },
    })

    if (!table) {
      return NextResponse.json(errorResponse('Table not found', 'NOT_FOUND'), { status: 404 })
    }

    let resolvedWaiterName = reqWaiterName || ''
    let resolvedWaiterId: string | null = waiterId || null

    // If waiterId provided, verify and fetch full name
    if (waiterId) {
      const waiterUser = await prisma.user.findUnique({
        where: { id: waiterId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          phone: true,
          role: true,
        },
      })

      if (waiterUser) {
        resolvedWaiterName =
          waiterUser.name ||
          `${waiterUser.firstName || ''} ${waiterUser.lastName || ''}`.trim() ||
          reqWaiterName ||
          'Waiter'
        resolvedWaiterId = waiterUser.id
      }
    } else {
      // Unassigning waiter
      resolvedWaiterName = ''
      resolvedWaiterId = null
    }

    // Update table metadata
    const prevMeta = (table.metadata as Record<string, any>) || {}
    const updatedMeta = {
      ...prevMeta,
      waiter: resolvedWaiterName || undefined,
      waiterId: resolvedWaiterId || undefined,
      waiterAssignedAt: resolvedWaiterId ? new Date().toISOString() : undefined,
      waiterAssignedBy: authContext.userId,
    }

    // Fast atomic transactions: update Table + active Bill + active Orders
    await prisma.$transaction(async (tx) => {
      // 1. Update Table
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: {
          metadata: updatedMeta,
        },
      })

      if (resolvedWaiterId) {
        // 2. Update open bills for this table
        await tx.bill.updateMany({
          where: {
            tableId: tableId,
            billStatus: { in: ['open', 'OPEN', 'PENDING'] },
            paymentStatus: { in: ['pending', 'PENDING', 'partially_paid', 'PARTIALLY_PAID'] },
          },
          data: {
            waiterId: resolvedWaiterId,
          },
        })

        // 3. Update active orders for this table
        await tx.order.updateMany({
          where: {
            tableId: tableId,
            status: { in: ['pending', 'accepted', 'preparing', 'ready', 'served'] },
          },
          data: {
            servedById: resolvedWaiterId,
          },
        })
      }
    })

    // Invalidate POS cache so UI updates immediately
    invalidatePOSTablesCache()

    return NextResponse.json(
      successResponse(
        {
          tableId: table.id,
          tableNumber: table.tableNumber,
          waiterId: resolvedWaiterId,
          waiterName: resolvedWaiterName || null,
          assignedAt: new Date().toISOString(),
          responseTimeMs: Date.now() - startTime,
        },
        resolvedWaiterId
          ? `Waiter ${resolvedWaiterName} successfully assigned to Table ${table.tableNumber}`
          : `Table ${table.tableNumber} waiter unassigned`
      )
    )
  } catch (error: any) {
    console.error('Error in assign-waiter API:', error)
    return NextResponse.json(errorResponse(error?.message || 'Failed to assign waiter', 'SERVER_ERROR'), {
      status: 500,
    })
  }
}
