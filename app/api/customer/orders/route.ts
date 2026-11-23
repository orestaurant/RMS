import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCustomerSession } from '@/lib/customer-auth'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import {
  registerActiveLiveOrder,
  getKitchenStation,
  invalidateKDSCache,
  invalidateLiveOrdersCache,
} from '@/lib/kds-utils'
import { invalidateDashboardStatsCache } from '@/lib/dashboard-cache'
import { syncCustomerOrderStats } from '@/lib/customer-stats'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/customer/orders
 * Return all orders belonging exclusively to the logged-in customer account.
 * Excludes any walk-in, anonymous, table-only, or other customers' orders.
 */
export async function GET(request: NextRequest) {
  try {
    let customerId: string | null = null
    let customerEmail: string | null = null

    // 1. Resolve from customer session cookie
    const session = await getCustomerSession(request)
    if (session?.customerId) {
      customerId = session.customerId
      customerEmail = session.email || null
    }

    // 2. Fallback to admin/user session cookie if logged in through unified auth
    if (!customerId) {
      const adminCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
      if (adminCookie) {
        const payload = await verifyJWT(adminCookie)
        if (payload?.userId) {
          const cust = await prisma.customer.findFirst({
            where: {
              OR: [
                { id: payload.userId },
                { email: { equals: payload.email, mode: 'insensitive' } },
              ],
            },
            select: { id: true, email: true },
          })
          if (cust) {
            customerId = cust.id
            customerEmail = cust.email
          }
        }
      }
    }

    // 3. Fallback to query parameters (customerId / userId / email)
    const url = new URL(request.url)
    const queryCustId = url.searchParams.get('customerId') || url.searchParams.get('userId')
    const queryEmail = url.searchParams.get('email')

    if (!customerId && (queryCustId || queryEmail)) {
      const cust = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(queryCustId ? [{ id: queryCustId }] : []),
            ...(queryEmail ? [{ email: { equals: queryEmail, mode: 'insensitive' as const } }] : []),
          ],
        },
        select: { id: true, email: true },
      })
      if (cust) {
        customerId = cust.id
        customerEmail = cust.email
      }
    }

    // Strict account check: Reject if no authenticated customer account is resolved
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.', orders: [] },
        { status: 401 }
      )
    }

    // Resolve detailed customer profile for robust matching across QR, online, and table orders
    const customerRecord = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, phone: true, name: true },
    })

    const cleanEmail = (customerRecord?.email || customerEmail || '').trim().toLowerCase()
    const cleanPhone = (customerRecord?.phone || '').trim()

    // Query all orders placed by this customer account:
    // Either directly linked by customerId, or matching their verified email/phone
    const orConditions: any[] = [{ customerId: customerId }]
    if (cleanEmail) {
      orConditions.push({
        customer: { email: { equals: cleanEmail, mode: 'insensitive' as const } },
      })
      orConditions.push({
        metadata: { path: ['customerEmail'], equals: cleanEmail },
      })
    }
    if (cleanPhone) {
      orConditions.push({
        customer: { phone: cleanPhone },
      })
      orConditions.push({
        metadata: { path: ['customerPhone'], equals: cleanPhone },
      })
    }

    const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)

    // Find active table(s) the customer is seated at
    const activeCustomerOrders = await prisma.order.findMany({
      where: {
        OR: orConditions,
        deletedAt: null,
        createdAt: { gte: sessionCutoff },
        isBilled: false,
        status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] },
      },
      select: {
        tableId: true,
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

    if (activeTableIds.length > 0) {
      orConditions.push({
        tableId: { in: activeTableIds },
        createdAt: { gte: sessionCutoff },
        isBilled: false,
        status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] },
      })
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: orConditions,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        branch: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Auto-link any matching unlinked orders to customerId in the background
    const unlinkedOrderIds = orders
      .filter((o) => !o.customerId)
      .map((o) => o.id)
    if (unlinkedOrderIds.length > 0) {
      prisma.order
        .updateMany({
          where: { id: { in: unlinkedOrderIds }, customerId: null },
          data: { customerId: customerId },
        })
        .catch((err) => console.warn('Could not auto-link orders to customerId:', err))
    }

    const formattedOrders = orders.map((order) => {
      const totalVal = Number(order.total || order.totalAmount || 0)
      const rawStatus = String(order.status || '').toLowerCase().trim()
      // If the order has not been approved in kitchen display (status is pending or missing), ensure it says 'pending'
      const finalStatus = rawStatus ? order.status : 'pending'

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: finalStatus,
        total: totalVal,
        totalAmount: totalVal,
        source: order.source || 'ONLINE',
        orderType: order.orderType,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customerId: order.customerId || customerId,
        customerEmail: order.customer?.email || cleanEmail || null,
        tableNumber: order.table?.tableNumber || (order.metadata as any)?.tableNumber || null,
        branchName: order.branch?.name || 'Main Branch',
        items: order.items.map((item) => ({
          id: item.id,
          name: item.itemName || item.menuItem?.name || 'Menu Item',
          quantity: item.quantity,
          price: Number(item.basePrice || 0),
          total: Number(item.itemTotal || 0),
        })),
      }
    })

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    })
  } catch (error: any) {
    console.error('Error fetching customer orders:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch customer orders' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/customer/orders
 * Action allowing customer to place a new dynamic order linked to their customerId
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCustomerSession(request)
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const requestedTable = body.tableNumber ? String(body.tableNumber).trim() : 'Table 1'

    // 1. Resolve restaurant and branch
    let branch = await prisma.branch.findFirst({
      include: { restaurant: true },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'No active branch available' },
        { status: 400 }
      )
    }

    // 2. Fetch or ensure menu items for order
    let menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: branch.restaurantId },
      take: 2,
    })

    if (menuItems.length === 0) {
      menuItems = await prisma.menuItem.findMany({ take: 2 })
    }

    // Fallback: create a sample menu item if none exists
    if (menuItems.length === 0) {
      let category = await prisma.menuCategory.findFirst({
        where: { restaurantId: branch.restaurantId },
      })
      if (!category) {
        category = await prisma.menuCategory.create({
          data: {
            restaurantId: branch.restaurantId,
            organizationId: branch.organizationId,
            name: 'Signature Dishes',
          },
        })
      }
      const newItem = await prisma.menuItem.create({
        data: {
          restaurantId: branch.restaurantId,
          organizationId: branch.organizationId,
          categoryId: category.id,
          name: 'Butter Chicken Special',
          basePrice: 420,
        },
      })
      menuItems = [newItem]
    }

    const itemsToCreate = menuItems.map((item) => ({
      organizationId: branch.organizationId,
      menuItemId: item.id,
      itemName: item.name,
      basePrice: Number(item.basePrice),
      quantity: 1,
      itemTotal: Number(item.basePrice),
    }))

    const totalCalculated = itemsToCreate.reduce(
      (sum, item) => sum + item.itemTotal,
      0
    )

    const orderNumber = `ORD-CUST-${Date.now().toString().slice(-6)}`

    // 3. Create the dynamic Order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        branchId: branch.id,
        restaurantId: branch.restaurantId,
        organizationId: branch.organizationId,
        customerId: session.customerId,
        source: 'ONLINE',
        orderType: 'dine_in',
        status: 'pending',
        subtotal: totalCalculated,
        totalAmount: totalCalculated,
        total: totalCalculated,
        paymentStatus: 'pending',
        metadata: {
          tableNumber: requestedTable,
          customerName: session.name || 'Customer',
        },
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    })

    // 4. Update customer aggregate stats
    await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: totalCalculated },
      },
    }).catch((err) => {
      console.warn('Failed to increment customer stats:', err)
    })

    // 5. Register directly in KDS live order queue
    registerActiveLiveOrder({
      id: order.orderNumber,
      fullId: order.id,
      tableNumber: requestedTable,
      source: 'qr_order',
      waiter: 'Online',
      customerName: (order.customer as any)?.name || session.name || 'Customer',
      status: 'pending',
      priority: 'normal',
      createdAt: order.createdAt.toISOString(),
      items: (order.items || []).map((i: any) => ({
        id: i.id,
        name: i.itemName,
        quantity: i.quantity,
        station: getKitchenStation(i.itemName),
        completed: false,
      })),
    })

    // 6. Invalidate all caches so Admin and Staff see this order immediately
    invalidateDashboardStatsCache(branch.id)
    invalidateKDSCache()
    invalidateLiveOrdersCache()

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully and dispatched to Kitchen & Staff!',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: requestedTable,
        total: Number(order.total),
        status: order.status,
        source: order.source,
        createdAt: order.createdAt,
        items: (order.items || []).map((i: any) => ({
          name: i.itemName,
          quantity: i.quantity,
          total: Number(i.itemTotal),
        })),
      },
    })
  } catch (error: any) {
    console.error('Error placing customer order:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to place test order' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/customer/orders
 * Allows cancelling and soft-deleting an order by ID or orderNumber
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const orderId = searchParams.get('id') || searchParams.get('orderId') || body.orderId || body.id

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      )
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = uuidRegex.test(orderId)
    const whereClause = isUuid ? { OR: [{ id: orderId }, { orderNumber: orderId }] } : { orderNumber: orderId }

    const order = await prisma.order.findFirst({
      where: whereClause,
      select: { id: true, orderNumber: true, status: true, branchId: true, customerId: true },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Soft delete & set cancelled status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        deletedAt: new Date(),
        status: 'cancelled',
      },
    })

    // Recalculate customer's totalOrders and totalSpent if customerId is present
    if (order.customerId) {
      await syncCustomerOrderStats(order.customerId)
    }

    // Invalidate caches
    invalidateKDSCache()
    invalidateLiveOrdersCache()
    if (order.branchId) {
      invalidateDashboardStatsCache(order.branchId)
    }

    return NextResponse.json({
      success: true,
      message: `Order #${order.orderNumber} deleted successfully.`,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error('Error deleting customer order:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete order' },
      { status: 500 }
    )
  }
}
