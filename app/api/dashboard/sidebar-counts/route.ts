/**
 * GET /api/dashboard/sidebar-counts?branchId=<id>
 * Get sidebar badge counts from PostgreSQL via Prisma - High Performance Parallelized & Cached
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import type { SidebarCounts } from '@/types/dashboard'
import { successResponse, errorResponse, ApiResponse } from '@/api/utils/responses'
import {
  getCachedSidebarCounts,
  setCachedSidebarCounts,
  getCachedBranchMeta,
  setCachedBranchMeta,
} from '@/lib/dashboard-cache'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SidebarCounts>>> {
  try {
    const url = new URL(request.url)
    const branchIdParam = url.searchParams.get('branchId')
    const cacheKey = branchIdParam || 'default'

    // 1. Ultra-fast in-memory cache hit (< 1ms)
    const cached = getCachedSidebarCounts(cacheKey)
    if (cached) {
      return NextResponse.json(
        successResponse(cached, 'Sidebar counts retrieved from cache'),
        {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
          },
        }
      )
    }

    // 2. Resolve branch (with in-memory branch meta cache)
    let branchId = branchIdParam
    if (!branchId) {
      const cachedBranch = getCachedBranchMeta(null)
      if (cachedBranch) {
        branchId = cachedBranch.id
      } else {
        const defaultBranch = await prisma.branch.findFirst({
          select: { id: true, organizationId: true },
        })
        if (defaultBranch) {
          branchId = defaultBranch.id
          setCachedBranchMeta(defaultBranch)
        }
      }
    }

    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // 3. Ultra-fast concurrent batch execution via Promise.all
    const [reservationsCount, liveOrdersCount, lowStockCount, posSession, kitchenTickets] =
      await Promise.all([
        // 1. Reservations count
        prisma.reservation.count({
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
        }).catch(() => 0),

        // 2. Live Orders count
        prisma.order.count({
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
        }).catch(() => 0),

        // 3. Inventory low stock count
        prisma.lowStockAlert.count({
          where: {
            alertStatus: 'active',
            ...(branchId ? { branchId } : {}),
          },
        }).catch(async () => {
          const items = await prisma.inventoryItem.findMany({
            select: { quantity: true, minStock: true },
            take: 200,
          }).catch(() => [])
          return items.filter((i) => Number(i.quantity) <= Number(i.minStock)).length
        }),

        // 4. POS open session
        prisma.cashRegisterSession.findFirst({
          where: {
            ...(branchId ? { cashRegister: { branchId } } : {}),
            status: 'open',
          },
          select: { id: true },
        }).catch(() => null),

        // 5. Kitchen active tickets
        prisma.kitchenTicket.count({
          where: {
            ...(branchId ? { branchId } : {}),
            status: {
              in: ['pending', 'preparing'],
            },
            deletedAt: null,
          },
        }).catch(() => 0),
      ])

    const counts: SidebarCounts = {
      reservations: reservationsCount,
      liveOrders: liveOrdersCount,
      inventoryAlerts: lowStockCount,
      posLive: !!posSession || liveOrdersCount > 0,
      kitchenLive: kitchenTickets > 0 || liveOrdersCount > 0,
    }

    // Save to in-memory cache
    setCachedSidebarCounts(cacheKey, counts)

    return NextResponse.json(
      successResponse(counts, 'Sidebar counts retrieved successfully'),
      {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching sidebar counts:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to retrieve sidebar badge counts', 'SIDEBAR_ERROR'),
      { status: 500 }
    )
  }
}
