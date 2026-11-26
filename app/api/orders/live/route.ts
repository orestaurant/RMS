/**
 * GET /api/orders/live?branchId=<id>&status=<status>
 * Get active live orders directly from PostgreSQL via Prisma or Real-Time In-Memory Queue
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import {
  getRealTimeLiveOrders,
  normalizeKdsStatus,
  getLiveOrdersCache,
  setLiveOrdersCache,
  invalidateLiveOrdersCache,
} from '@/lib/kds-utils'
import { getCachedBranchMeta, setCachedBranchMeta } from '@/lib/dashboard-cache'
import { getCustomerSession } from '@/lib/customer-auth'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import { startOfDay } from 'date-fns'
import { OrderStatusEnum } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const branchIdParam = request.nextUrl.searchParams.get('branchId')
    const statusFilter = (request.nextUrl.searchParams.get('status') || 'all').toLowerCase()

    // 0. Detect Customer Session for strictly isolated, user-specific Live Orders
    let customerId: string | null = null
    const customerSession = await getCustomerSession(request)
    if (customerSession?.customerId) {
      customerId = customerSession.customerId
    } else {
      const adminCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
      if (adminCookie) {
        const payload = await verifyJWT(adminCookie)
        if (payload?.userId) {
          const cust = await prisma.customer.findFirst({
            where: {
              OR: [
                { id: payload.userId },
                { email: { equals: payload.email, mode: 'insensitive' as const } },
              ],
            },
            select: { id: true },
          })
          if (cust) {
            customerId = cust.id
          }
        }
      }
    }

    const queryCustomerId = request.nextUrl.searchParams.get('customerId') || request.nextUrl.searchParams.get('userId')
    const queryRole = (request.nextUrl.searchParams.get('role') || '').toUpperCase()

    if (!customerId && queryCustomerId) {
      customerId = queryCustomerId
    }

    const isCustomer = Boolean(customerId || queryRole === 'CUSTOMER' || customerSession?.role === 'CUSTOMER')

    // If request is from a customer account but no customerId could be resolved,
    // immediately return zero live orders (never leak branch/staff orders)
    if (isCustomer && !customerId) {
      return NextResponse.json(
        successResponse({
          orders: [],
          counts: { all: 0, pending: 0, accepted: 0, cooking: 0, ready: 0, served: 0, carOrders: 0 },
          stats: { activeCount: 0, readyCount: 0, urgentCount: 0, overdueCount: 0, carOrdersCount: 0 },
        }, 'No active live orders for customer account')
      )
    }

    // UUID validator to protect Prisma queries against invalid uuid syntax
    const isUuid = (val: string | null): boolean =>
      !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

    // 1. Resolve branch & customer-isolated cache key
    const explicitBranchFilter = branchIdParam && isUuid(branchIdParam) && branchIdParam !== 'all' ? branchIdParam : null
    const cacheKey = isCustomer
      ? `cust_${customerId}_${statusFilter}`
      : `${explicitBranchFilter || 'all'}_${statusFilter}`
    const cachedData = getLiveOrdersCache(cacheKey, isCustomer ? 1500 : 2500)

    // 2. High-speed in-memory cache check (< 5ms response)
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Orders-Cache': 'HIT',
        },
      })
    }

    const now = Date.now()
    const todayStart = startOfDay(new Date())

    // Active in-progress order statuses matching OrderStatusEnum in Prisma
    const inProgressStatuses: OrderStatusEnum[] = [
      'pending',
      'PENDING',
      'accepted',
      'ACCEPTED',
      'confirmed',
      'preparing',
      'PREPARING',
      'ready',
      'READY',
    ]

    let formattedOrders: any[] = []

    try {
      // 3. Lean query: If Customer, strictly filter by customerId; If Staff, filter by branch/active statuses
      const whereClause: any = {
        deletedAt: null,
        status: {
          notIn: ['cancelled', 'CANCELLED', 'refunded'],
        },
      }

      if (isCustomer) {
        const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)

        // Lean query: Find active table(s) associated with this customer's dining session
        const activeCustomerOrders = await prisma.order.findMany({
          where: {
            customerId: customerId,
            deletedAt: null,
            createdAt: { gte: sessionCutoff },
            isBilled: false,
            status: {
              notIn: ['cancelled', 'CANCELLED', 'refunded'],
            },
          },
          select: {
            tableId: true,
            metadata: true,
            table: { select: { tableNumber: true } },
          },
          take: 10,
        })

        const activeTableIds = Array.from(
          new Set(
            activeCustomerOrders
              .map((o) => o.tableId)
              .filter((id): id is string => Boolean(id))
          )
        )

        const activeTableNumbers = Array.from(
          new Set(
            activeCustomerOrders
              .flatMap((o) => {
                const meta = o.metadata as any
                const tblNum = o.table?.tableNumber || meta?.tableNumber
                return tblNum ? [String(tblNum).trim(), String(tblNum).trim().replace(/^table\s+/i, '')] : []
              })
              .filter(Boolean)
          )
        )

        // Customer sees:
        // 1. All their own orders (customerId: customerId)
        // 2. Plus any orders placed for their active booked table by staff/waiter during dining session
        const orConditions: any[] = [{ customerId: customerId }]

        if (activeTableIds.length > 0 || activeTableNumbers.length > 0) {
          orConditions.push({
            AND: [
              { createdAt: { gte: sessionCutoff } },
              { isBilled: false },
              { status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] } },
              {
                OR: [
                  ...(activeTableIds.length > 0 ? [{ tableId: { in: activeTableIds } }] : []),
                  ...(activeTableNumbers.length > 0
                    ? [
                        { table: { tableNumber: { in: activeTableNumbers } } },
                        ...activeTableNumbers.map((tn) => ({
                          metadata: { path: ['tableNumber'], equals: tn },
                        })),
                      ]
                    : []),
                ],
              },
            ],
          })

          // Background auto-link: backfill customerId on any waiter-placed orders on this table
          if (activeTableIds.length > 0) {
            prisma.order.updateMany({
              where: {
                tableId: { in: activeTableIds },
                customerId: null,
                createdAt: { gte: sessionCutoff },
                deletedAt: null,
              },
              data: { customerId: customerId },
            }).catch(() => {})
          }
        }

        whereClause.OR = orConditions
        if (statusFilter !== 'all') {
          whereClause.status = statusFilter
        }
      } else {
        // Staff / Admin: branch filter and active today filter
        if (explicitBranchFilter) {
          whereClause.branchId = explicitBranchFilter
        }
        whereClause.AND = [
          {
            OR: [
              { createdAt: { gte: todayStart } },
              {
                status: {
                  in: inProgressStatuses as any,
                },
              },
            ],
          },
        ]
      }

      const rawOrders = await prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          customerId: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          totalAmount: true,
          total: true,
          isLocationLocked: true,
          vehicleNumber: true,
          landmarkNote: true,
          customerLat: true,
          customerLng: true,
          locationAccuracy: true,
          locationCapturedAt: true,
          metadata: true,
          table: {
            select: { id: true, tableNumber: true },
          },
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              basePrice: true,
              specialInstructions: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, firstName: true },
          },
          customer: {
            select: { id: true, name: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: isCustomer ? 50 : 120,
      })

      if (rawOrders && rawOrders.length > 0) {
        formattedOrders = rawOrders.map((order) => {
          const normalizedStatus = normalizeKdsStatus(order.status)

          const minutesAgo = Math.max(
            0,
            Math.floor((now - new Date(order.createdAt).getTime()) / 60000)
          )

          let priority: 'normal' | 'high' | 'urgent' = 'normal'
          if (minutesAgo > 25) {
            priority = 'urgent'
          } else if (minutesAgo > 15) {
            priority = 'high'
          }

          return {
            id: order.orderNumber || order.id.slice(0, 8),
            fullId: order.id,
            customerId: order.customerId || (isCustomer ? customerId : null),
            tableId: order.table?.id,
            tableNumber: order.table?.tableNumber || 'Takeaway',
            waiter: order.createdBy?.name || order.createdBy?.firstName || 'Staff',
            status: normalizedStatus,
            priority,
            ticketTime: minutesAgo,
            items: order.items.map((i) => ({
              id: i.id,
              name: i.itemName,
              quantity: i.quantity,
              price: Number(i.basePrice || 0),
              notes: i.specialInstructions || undefined,
            })),
            subtotal: Number(order.subtotal || order.totalAmount || 0),
            discount: Number(order.discountAmount || 0),
            tax: Number(order.taxAmount || 0),
            total: Number(order.totalAmount || order.total || 0),
            createdAt: order.createdAt,
            isLocationLocked: Boolean(order.isLocationLocked ?? (order.metadata as any)?.isLocationLocked),
            vehicleName: (order.metadata as any)?.vehicleName ?? null,
            vehicleNumber: order.vehicleNumber ?? (order.metadata as any)?.vehicleNumber ?? null,
            landmarkNote: order.landmarkNote ?? (order.metadata as any)?.landmarkNote ?? null,
            customerLat:
              order.customerLat !== null && order.customerLat !== undefined
                ? Number(order.customerLat)
                : (order.metadata as any)?.customerLat !== undefined
                ? Number((order.metadata as any).customerLat)
                : null,
            customerLng:
              order.customerLng !== null && order.customerLng !== undefined
                ? Number(order.customerLng)
                : (order.metadata as any)?.customerLng !== undefined
                ? Number((order.metadata as any).customerLng)
                : null,
            locationAccuracy:
              order.locationAccuracy !== null && order.locationAccuracy !== undefined
                ? Number(order.locationAccuracy)
                : (order.metadata as any)?.locationAccuracy !== undefined
                ? Number((order.metadata as any).locationAccuracy)
                : null,
            locationCapturedAt: order.locationCapturedAt ?? (order.metadata as any)?.locationCapturedAt ?? null,
          }
        })
      }
    } catch (dbErr) {
      console.error('Orders live DB lookup error:', dbErr)
    }

    // 4. Merge fallback live orders from in-memory session ONLY for Staff/Admin (NEVER for Customers)
    if (!isCustomer) {
      const memoryOrders = getRealTimeLiveOrders()
      for (const mo of memoryOrders) {
        if (!formattedOrders.some((fo) => fo.id === mo.id || fo.fullId === mo.fullId)) {
          const subtotal = (mo.items || []).reduce(
            (sum: number, it: any) => sum + (it.price || 150) * it.quantity,
            0
          )
          const tax = Math.round(subtotal * 0.05 * 100) / 100
          const total = subtotal + tax

          formattedOrders.push({
            id: mo.id,
            fullId: mo.fullId || mo.id,
            tableNumber: mo.tableNumber,
            waiter: mo.waiter || 'Staff',
            customerName: mo.customerName,
            customerPhone: mo.customerPhone,
            status: normalizeKdsStatus(mo.status || 'pending'),
            priority: mo.priority || 'normal',
            ticketTime: mo.ticketTime || 5,
            items: (mo.items || []).map((it: any) => ({
              id: it.id,
              name: it.name,
              quantity: it.quantity,
              price: it.price || 150,
              notes: it.notes,
            })),
            subtotal,
            discount: 0,
            tax,
            total,
            createdAt: mo.createdAt || new Date().toISOString(),
            isLocationLocked: Boolean(mo.isLocationLocked),
            vehicleName: mo.vehicleName || null,
            vehicleNumber: mo.vehicleNumber || null,
            landmarkNote: mo.landmarkNote || null,
            customerLat: mo.customerLat ?? null,
            customerLng: mo.customerLng ?? null,
            locationAccuracy: mo.locationAccuracy ?? null,
            locationCapturedAt: mo.locationCapturedAt ?? null,
          })
        }
      }
    }

    // 5. Compute status counts across all live orders
    const carOrdersCount = formattedOrders.filter(
      (o) => Boolean(o.vehicleNumber || o.landmarkNote || o.customerLat || o.isLocationLocked)
    ).length

    const counts = {
      all: formattedOrders.length,
      pending: formattedOrders.filter((o) => o.status === 'pending').length,
      accepted: formattedOrders.filter((o) => o.status === 'accepted').length,
      cooking: formattedOrders.filter((o) => o.status === 'cooking' || o.status === 'preparing').length,
      ready: formattedOrders.filter((o) => o.status === 'ready').length,
      served: formattedOrders.filter((o) => o.status === 'served').length,
      carOrders: carOrdersCount,
    }

    const urgentCount = formattedOrders.filter(
      (o) => o.priority === 'urgent' || (o.ticketTime || 0) > 20
    ).length
    const overdueCount = formattedOrders.filter((o) => (o.ticketTime || 0) > 20).length

    // Filter by tab/status if specified
    let filteredOrders = formattedOrders
    if (statusFilter === 'car_orders' || statusFilter === 'car') {
      filteredOrders = formattedOrders.filter(
        (o) => Boolean(o.vehicleNumber || o.landmarkNote || o.customerLat || o.isLocationLocked)
      )
    } else if (statusFilter === 'active' || statusFilter === 'in_progress') {
      filteredOrders = formattedOrders.filter((o) =>
        ['pending', 'accepted', 'cooking', 'ready', 'preparing', 'confirmed'].includes(o.status)
      )
    } else if (statusFilter !== 'all') {
      filteredOrders = formattedOrders.filter((o) => o.status === statusFilter)
    }

    const responsePayload = successResponse({
      orders: filteredOrders,
      activeCount: formattedOrders.length,
      counts,
      stats: {
        activeCount: formattedOrders.length,
        inProgressCount: counts.pending + counts.accepted + counts.cooking + counts.ready,
        readyCount: counts.ready,
        servedCount: counts.served,
        urgentCount,
        overdueCount,
        carOrdersCount,
      },
    })

    // Store in live orders fast cache
    setLiveOrdersCache(cacheKey, responsePayload)

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Orders-Cache': 'MISS',
      },
    })
  } catch (error: any) {
    console.error('Error fetching live orders:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to fetch live orders', 'ORDERS_ERROR'),
      { status: 500 }
    )
  }
}
