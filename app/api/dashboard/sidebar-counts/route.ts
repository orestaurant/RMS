/**
 * GET /api/dashboard/sidebar-counts?branchId=<id>
 * Get sidebar badge counts from PostgreSQL via Prisma
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import type { SidebarCounts } from '@/types/dashboard'
import { successResponse, errorResponse, ApiResponse } from '@/api/utils/responses'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SidebarCounts>>> {
  try {
    const url = new URL(request.url)
    let branchId = url.searchParams.get('branchId')

    // Find default branch if not provided
    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({
        select: { id: true, organizationId: true },
      })
      branchId = defaultBranch?.id || null
    }

    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // 1. Reservations count: Pending/confirmed reservations for today
    const reservationsCount = await prisma.reservation.count({
      where: {
        ...(branchId ? { branchId } : {}),
        reservationDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          in: ['pending', 'confirmed'],
        },
        deletedAt: null,
      },
    })

    // 2. Live Orders count: Orders created today or active in-progress (matching Live Orders view & Total Orders)
    const liveOrdersCount = await prisma.order.count({
      where: {
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
        status: {
          notIn: ['cancelled', 'CANCELLED', 'refunded'],
        },
        OR: [
          { createdAt: { gte: todayStart } },
          {
            status: {
              in: ['pending', 'confirmed', 'preparing', 'ready', 'PENDING', 'PREPARING'],
            },
          },
        ],
      },
    })

    // 3. Inventory count: Items where current_stock <= min_stock
    const inventoryItems = await prisma.inventoryItem.findMany({
      select: {
        quantity: true,
        minStock: true,
      },
    })

    let lowStockCount = inventoryItems.filter(
      (item) => Number(item.quantity) <= Number(item.minStock)
    ).length

    if (lowStockCount === 0) {
      lowStockCount = await prisma.lowStockAlert.count({
        where: {
          alertStatus: 'active',
          ...(branchId ? { branchId } : {}),
        },
      })
    }

    // 4. Check if POS is live (open cash register session)
    const posSession = await prisma.cashRegisterSession.findFirst({
      where: {
        ...(branchId ? { cashRegister: { branchId } } : {}),
        status: 'open',
      },
    })

    // 5. Check if kitchen is live (active kitchen tickets or active kitchen orders)
    const kitchenTickets = await prisma.kitchenTicket.count({
      where: {
        ...(branchId ? { branchId } : {}),
        status: {
          in: ['pending', 'preparing'],
        },
        deletedAt: null,
      },
    })

    const counts: SidebarCounts = {
      reservations: reservationsCount,
      liveOrders: liveOrdersCount,
      inventoryAlerts: lowStockCount,
      posLive: !!posSession || liveOrdersCount > 0,
      kitchenLive: kitchenTickets > 0 || liveOrdersCount > 0,
    }

    return NextResponse.json(successResponse(counts, 'Sidebar counts retrieved successfully'))
  } catch (error: any) {
    console.error('Error fetching sidebar counts:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to retrieve sidebar badge counts', 'SIDEBAR_ERROR'),
      { status: 500 }
    )
  }
}
