/**
 * GET /api/dashboard/stats
 * Real-time dashboard statistics - High-performance unified aggregator with SWR in-memory caching
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import type { DashboardStats, TopDish, InventoryAlert } from '@/types/dashboard'
import { successResponse, errorResponse, ApiResponse } from '@/api/utils/responses'
import {
  getCachedStatsWithStale,
  setCachedStats,
  getCachedBranchMeta,
  setCachedBranchMeta,
  setCachedTopDishes,
  setCachedInventoryAlerts,
} from '@/lib/dashboard-cache'

async function fetchFreshStats(branchIdParam: string | null): Promise<DashboardStats> {
  const cacheKey = branchIdParam || 'default'

  // Resolve branch (with in-memory cache)
  let branch = getCachedBranchMeta(branchIdParam)
  if (!branch) {
    branch = branchIdParam
      ? await prisma.branch.findUnique({
          where: { id: branchIdParam },
          select: {
            id: true,
            name: true,
            organizationId: true,
            restaurantId: true,
            restaurant: {
              select: {
                id: true,
                organizationId: true,
                name: true,
                operatingHours: true,
              },
            },
          },
        })
      : await prisma.branch.findFirst({
          select: {
            id: true,
            name: true,
            organizationId: true,
            restaurantId: true,
            restaurant: {
              select: {
                id: true,
                organizationId: true,
                name: true,
                operatingHours: true,
              },
            },
          },
        })

    if (branch) {
      setCachedBranchMeta(branch)
    }
  }

  const branchId = branch?.id
  const restaurant = branch?.restaurant

  // Date boundaries
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = startOfDay(subDays(now, 1))
  const yesterdayEnd = endOfDay(subDays(now, 1))

  const orderBranchFilter = branchId ? Prisma.sql`AND "branchId" = ${branchId}::uuid` : Prisma.empty
  const tableBranchFilter = branchId ? Prisma.sql`AND "branchId" = ${branchId}::uuid` : Prisma.empty

  // Execute all 6 database metrics in ONE concurrent batch
  const [
    orderMetricsResult,
    tableMetricsResult,
    guestMetricsResult,
    latestReport,
    orderItems,
    inventoryItems,
  ] = await Promise.all([
    // A. Revenue and order metrics (optimized with indexed enum filters)
    prisma.$queryRaw<any[]>`
      SELECT
        COUNT(CASE WHEN "createdAt" >= ${todayStart} THEN 1 END)::int AS today_orders,
        COALESCE(SUM(CASE 
          WHEN "createdAt" >= ${todayStart}
            AND ("status" IN ('completed', 'served', 'COMPLETED', 'SERVED') OR "paymentStatus" = 'completed')
          THEN COALESCE("totalAmount", 0) 
          ELSE 0 
        END), 0)::float AS today_revenue,
        COUNT(CASE WHEN "createdAt" >= ${yesterdayStart} AND "createdAt" <= ${yesterdayEnd} THEN 1 END)::int AS yest_orders,
        COALESCE(SUM(CASE 
          WHEN "createdAt" >= ${yesterdayStart} AND "createdAt" <= ${yesterdayEnd}
            AND ("status" IN ('completed', 'served', 'COMPLETED', 'SERVED') OR "paymentStatus" = 'completed')
          THEN COALESCE("totalAmount", 0) 
          ELSE 0 
        END), 0)::float AS yest_revenue
      FROM "Order"
      WHERE "deletedAt" IS NULL 
        AND "createdAt" >= ${yesterdayStart}
        ${orderBranchFilter}
    `.catch((err) => {
      console.warn('Raw query order metrics fallback:', err)
      return []
    }),

    // B. Table occupancy metrics
    prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int AS total_tables,
        COUNT(CASE WHEN "status"::text = 'occupied' THEN 1 END)::int AS occupied_tables
      FROM "RestaurantTable"
      WHERE "deletedAt" IS NULL
        ${tableBranchFilter}
    `.catch((err) => {
      console.warn('Raw query table metrics fallback:', err)
      return []
    }),

    // C. Guest metrics
    prisma.$queryRaw<any[]>`
      SELECT
        COUNT(CASE WHEN "createdAt" >= ${todayStart} THEN 1 END)::int AS today_guests,
        COUNT(CASE WHEN "createdAt" >= ${yesterdayStart} AND "createdAt" <= ${yesterdayEnd} THEN 1 END)::int AS yest_guests
      FROM "Customer"
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${yesterdayStart}
    `.catch((err) => {
      console.warn('Raw query guest metrics fallback:', err)
      return []
    }),

    // D. Performance score
    prisma.branchPerformanceReport.findFirst({
      where: branchId ? { branchId } : {},
      orderBy: { createdAt: 'desc' },
      select: { customerSatisfactionScore: true },
    }).catch(() => null),

    // E. Top dishes today (bundled for 0 extra round-trips)
    prisma.orderItem.findMany({
      where: {
        order: {
          ...(branchId ? { branchId } : {}),
          createdAt: { gte: todayStart },
          status: { notIn: ['cancelled', 'refunded'] },
        },
        deletedAt: null,
      },
      select: {
        menuItemId: true,
        itemName: true,
        quantity: true,
        itemTotal: true,
        menuItem: {
          select: {
            name: true,
            isVegetarian: true,
          },
        },
      },
      take: 60,
    }).catch(() => []),

    // F. Low stock inventory alerts (bundled for 0 extra round-trips)
    prisma.inventoryItem.findMany({
      where: {
        quantity: { lte: 10 },
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        criticalStock: true,
      },
      take: 5,
    }).catch(() => []),
  ])

  const orders = orderMetricsResult[0] || {}
  const tables = tableMetricsResult[0] || {}
  const guests = guestMetricsResult[0] || {}

  // Revenue calculations
  const todayRevenue = orders.today_revenue || 0
  const yesterdayRevenue = orders.yest_revenue || 0
  const todayRevenueChangePercent =
    yesterdayRevenue > 0
      ? Number((((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1))
      : todayRevenue > 0
      ? 100
      : 0

  // Order counts
  const totalOrders = orders.today_orders || 0
  const yesterdayOrders = orders.yest_orders || 0
  const totalOrdersChange = yesterdayOrders > 0 ? totalOrders - yesterdayOrders : totalOrders

  // Ticket average
  const avgTicket = totalOrders > 0 ? Math.round(todayRevenue / totalOrders) : 0
  const yesterdayAvgTicket = yesterdayOrders > 0 ? Math.round(yesterdayRevenue / yesterdayOrders) : 0
  const avgTicketChange = yesterdayAvgTicket > 0 ? avgTicket - yesterdayAvgTicket : 0

  // Tables & Occupancy
  const totalTables = tables.total_tables || 0
  const occupiedTables = tables.occupied_tables || 0
  const tableOccupancy = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0

  // Guests
  const newGuests = guests.today_guests || 0
  const yesterdayGuests = guests.yest_guests || 0
  const newGuestsChange = yesterdayGuests > 0 ? newGuests - yesterdayGuests : newGuests

  // Satisfaction
  const satisfaction = latestReport?.customerSatisfactionScore
    ? Number(latestReport.customerSatisfactionScore)
    : 4.8

  // Outlet Details & Status
  const restaurantName = restaurant?.name || 'RestoSphere'
  const branchName = branch?.name || 'Mumbai Central'
  const fullName = `${restaurantName} — ${branchName}`

  const opHoursObj = restaurant?.operatingHours as { open?: string; close?: string; closingTime?: string } | null
  const closingTime = opHoursObj?.close || opHoursObj?.closingTime || '11:00 PM'
  const operatingHours = `${opHoursObj?.open || '11:00 AM'} - ${closingTime}`

  const currentHour = now.getHours()
  const isOpen = currentHour >= 11 && currentHour < 23

  // Aggregate Top Dishes
  const dishMap = new Map<
    string,
    { id: string; name: string; orders: number; revenue: number; isVeg: boolean }
  >()
  orderItems.forEach((item) => {
    const existing = dishMap.get(item.menuItemId) || {
      id: item.menuItemId,
      name: item.itemName || item.menuItem?.name || 'Special Item',
      orders: 0,
      revenue: 0,
      isVeg: item.menuItem?.isVegetarian ?? true,
    }
    existing.orders += item.quantity || 1
    existing.revenue += Number(item.itemTotal || 0)
    dishMap.set(item.menuItemId, existing)
  })

  const topDishes: TopDish[] = Array.from(dishMap.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)
    .map((d) => ({ ...d, trend: '+0%' }))

  // Aggregate Inventory Alerts
  const inventoryAlerts: InventoryAlert[] = inventoryItems.map((item) => {
    const current = Number(item.quantity)
    const status: 'critical' | 'low' = current <= Number(item.criticalStock) ? 'critical' : 'low'
    return {
      id: item.id,
      item: item.name,
      current,
      unit: item.unit || 'units',
      status,
    }
  })

  const statsData: DashboardStats = {
    todayRevenue: Math.round(todayRevenue),
    todayRevenueChangePercent,
    totalOrders,
    totalOrdersChange,
    avgTicket,
    avgTicketChange,
    tableOccupancy,
    tableOccupancyChange: 0,
    occupiedTables,
    totalTables,
    newGuests,
    newGuestsChange,
    satisfaction,
    satisfactionChange: 0,
    outlet: {
      id: branchId || '',
      restaurantName,
      branchName,
      fullName,
      isOpen,
      operatingHours,
      closingTime,
    },
    topDishes,
    inventoryAlerts,
  }

  // Update caches
  setCachedStats(cacheKey, statsData)
  setCachedTopDishes(cacheKey, topDishes)
  setCachedInventoryAlerts(cacheKey, inventoryAlerts)

  return statsData
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  try {
    const url = new URL(request.url)
    const branchIdParam = url.searchParams.get('branchId')
    const cacheKey = branchIdParam || 'default'

    // 1. Ultra-fast In-Memory SWR Cache Check (< 1ms)
    const cachedEntry = getCachedStatsWithStale(cacheKey)
    if (cachedEntry) {
      // If stale, trigger background revalidation without blocking client
      if (cachedEntry.isStale) {
        fetchFreshStats(branchIdParam).catch((err) =>
          console.warn('Background dashboard stats refresh failed:', err)
        )
      }

      return NextResponse.json(
        successResponse(cachedEntry.data, 'Dashboard statistics retrieved from cache'),
        {
          headers: {
            'X-Cache': cachedEntry.isStale ? 'STALE' : 'HIT',
            'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
          },
        }
      )
    }

    // 2. Cache Miss: Fetch fresh stats in concurrent batch
    const statsData = await fetchFreshStats(branchIdParam)

    return NextResponse.json(
      successResponse(statsData, 'Dashboard statistics retrieved successfully'),
      {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to retrieve dashboard stats', 'DASHBOARD_STATS_ERROR'),
      { status: 500 }
    )
  }
}
