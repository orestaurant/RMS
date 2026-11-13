/**
 * GET /api/dashboard/stats
 * Real-time dashboard statistics - Ultra-fast aggregated and cached
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import type { DashboardStats } from '@/types/dashboard'
import { successResponse, errorResponse, ApiResponse } from '@/api/utils/responses'
import {
  getCachedStats,
  setCachedStats,
  getCachedBranchMeta,
  setCachedBranchMeta,
} from '@/lib/dashboard-cache'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  try {
    const url = new URL(request.url)
    const branchIdParam = url.searchParams.get('branchId')
    const cacheKey = branchIdParam || 'default'

    // 1. Fast Cache Hit (< 2ms)
    const cached = getCachedStats(cacheKey)
    if (cached) {
      return NextResponse.json(
        successResponse(cached, 'Dashboard statistics retrieved from cache'),
        {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
          },
        }
      )
    }

    // 2. Resolve branch (with in-memory fallback cache)
    let branch = getCachedBranchMeta(branchIdParam)
    if (!branch) {
      branch = branchIdParam
        ? await prisma.branch.findUnique({
            where: { id: branchIdParam },
            include: { restaurant: true },
          })
        : await prisma.branch.findFirst({
            include: { restaurant: true },
          })

      if (branch && !branchIdParam) {
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

    // 3. Ultra-fast parallel execution: Order, Table, Guest & Report metrics concurrently
    const orderBranchFilter = branchId ? Prisma.sql`AND "branchId" = ${branchId}::uuid` : Prisma.empty
    const tableBranchFilter = branchId ? Prisma.sql`AND "branchId" = ${branchId}::uuid` : Prisma.empty

    const [orderMetricsResult, tableMetricsResult, guestMetricsResult, latestReport] = await Promise.all([
      // A. All revenue and order metrics in ONE single database query
      prisma.$queryRaw<any[]>`
        SELECT
          COUNT(CASE WHEN "createdAt" >= ${todayStart} THEN 1 END)::int AS today_orders,
          COALESCE(SUM(CASE 
            WHEN "createdAt" >= ${todayStart}
              AND ("status"::text ILIKE 'completed' OR "status"::text ILIKE 'served' OR "paymentStatus"::text = 'completed')
            THEN COALESCE("total", "totalAmount", 0) 
            ELSE 0 
          END), 0)::float AS today_revenue,
          COUNT(CASE WHEN "createdAt" >= ${yesterdayStart} AND "createdAt" <= ${yesterdayEnd} THEN 1 END)::int AS yest_orders,
          COALESCE(SUM(CASE 
            WHEN "createdAt" >= ${yesterdayStart} AND "createdAt" <= ${yesterdayEnd}
              AND ("status"::text ILIKE 'completed' OR "status"::text ILIKE 'served' OR "paymentStatus"::text = 'completed')
            THEN COALESCE("total", "totalAmount", 0) 
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

      // B. All table occupancy metrics in ONE single database query
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

      // C. All new guests metrics in ONE single database query
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
      : 0

    // Outlet Details & Status
    const restaurantName = restaurant?.name || 'RestoSphere'
    const branchName = branch?.name || 'Mumbai Central'
    const fullName = `${restaurantName} — ${branchName}`

    const opHoursObj = restaurant?.operatingHours as { open?: string; close?: string; closingTime?: string } | null
    const closingTime = opHoursObj?.close || opHoursObj?.closingTime || '11:00 PM'
    const operatingHours = `${opHoursObj?.open || '11:00 AM'} - ${closingTime}`

    const currentHour = now.getHours()
    const isOpen = currentHour >= 11 && currentHour < 23

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
    }

    // Save to server-side cache
    setCachedStats(cacheKey, statsData)

    return NextResponse.json(
      successResponse(statsData, 'Dashboard statistics retrieved successfully'),
      {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
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
