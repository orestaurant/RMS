import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { OrderStatusEnum, PaymentStatusEnum, Prisma } from '@prisma/client'
import { getCustomerSession } from '@/lib/customer-auth'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import {
  registerActiveLiveOrder,
  getKitchenStation,
  invalidateKDSCache,
  invalidateLiveOrdersCache,
} from '@/lib/kds-utils'
import { invalidateDashboardStatsCache } from '@/lib/dashboard-cache'
import { invalidatePOSTablesCache } from '@/lib/pos-cache'
import { syncCustomerOrderStats } from '@/lib/customer-stats'
import { removeOrderNotifications } from '@/lib/notifications-store'
import { getEffectiveTableStatus, formatUnavailableTableMessage } from '@/lib/utils'
import {
  resolveDineInTable,
  validateAndClaimDineInTable,
  TableBookingConflictError,
} from '@/api/services/tables.service'

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
    const pageParam = url.searchParams.get('page')
    const limitParam = url.searchParams.get('limit')
    const scopeParam = (url.searchParams.get('scope') || 'all').toLowerCase().trim()
    const includeSummary = url.searchParams.get('includeSummary') === 'true'

    const isPaginated = Boolean(pageParam || limitParam)
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
    const limit = limitParam
      ? Math.min(50, Math.max(1, parseInt(limitParam, 10) || 5))
      : 100
    const skip = isPaginated ? (page - 1) * limit : 0

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

    const COMPLETED_STATUSES: OrderStatusEnum[] = ['served', 'completed', 'SERVED', 'COMPLETED']
    const CANCELLED_OR_SETTLED_STATUSES: OrderStatusEnum[] = [
      'cancelled',
      'CANCELLED',
      'refunded',
      'completed',
      'COMPLETED',
    ]
    const SETTLED_PAYMENT_STATUSES: PaymentStatusEnum[] = ['completed', 'refunded', 'cancelled']

    const baseWhere: Prisma.OrderWhereInput = {
      OR: orConditions,
      deletedAt: null,
    }

    // Active tracker includes all non-cancelled orders (including 'served') until bill payment completes
    const activeTrackerWhere: Prisma.OrderWhereInput = {
      ...baseWhere,
      status: { notIn: CANCELLED_OR_SETTLED_STATUSES },
      paymentStatus: { notIn: SETTLED_PAYMENT_STATUSES },
      NOT: [
        { bill: { status: 'PAID' } },
        { bill: { paymentStatus: 'completed' } },
        { tableBill: { status: 'PAID' } },
        { tableBill: { paymentStatus: 'completed' } },
      ],
    }

    const listWhere: Prisma.OrderWhereInput =
      scopeParam === 'active'
        ? activeTrackerWhere
        : scopeParam === 'completed'
          ? { ...baseWhere, status: { in: COMPLETED_STATUSES } }
          : baseWhere

    const validNonCancelledWhere: Prisma.OrderWhereInput = {
      ...baseWhere,
      status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] },
    }

    const [orders, totalCount, summaryData] = await Promise.all([
      prisma.order.findMany({
        where: listWhere,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          discountAmount: true,
          discountPercentage: true,
          discountReason: true,
          taxAmount: true,
          serviceCharge: true,
          total: true,
          totalAmount: true,
          source: true,
          orderType: true,
          paymentStatus: true,
          isBilled: true,
          billId: true,
          tableId: true,
          customerId: true,
          vehicleNumber: true,
          notes: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              basePrice: true,
              itemTotal: true,
              menuItem: {
                select: { name: true },
              },
            },
          },
          table: {
            select: { tableNumber: true },
          },
          restaurant: {
            select: {
              name: true,
              address: true,
              phone: true,
              gstNumber: true,
              fssaiNumber: true,
            },
          },
          branch: {
            select: { name: true, address: true, phone: true },
          },
          customer: {
            select: { id: true, email: true, name: true, phone: true },
          },
          payments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              paymentStatus: true,
              transactionId: true,
              referenceNumber: true,
              createdAt: true,
            },
          },
          bill: {
            select: {
              id: true,
              billNumber: true,
              status: true,
              billStatus: true,
              paymentStatus: true,
              paymentMethod: true,
              subtotal: true,
              discountAmount: true,
              discountPercentage: true,
              discountReason: true,
              taxAmount: true,
              serviceCharge: true,
              tipAmount: true,
              grandTotal: true,
              amountPaid: true,
              paidAt: true,
              settledAt: true,
              createdAt: true,
              customerName: true,
              customerPhone: true,
              metadata: true,
              waiter: {
                select: { name: true, firstName: true, lastName: true },
              },
              items: {
                select: {
                  id: true,
                  itemName: true,
                  quantity: true,
                  basePrice: true,
                  itemTotal: true,
                },
              },
              payments: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  amount: true,
                  paymentMethod: true,
                  paymentStatus: true,
                  transactionId: true,
                  referenceNumber: true,
                  createdAt: true,
                },
              },
            },
          },
          tableBill: {
            select: {
              id: true,
              billNumber: true,
              status: true,
              billStatus: true,
              paymentStatus: true,
              paymentMethod: true,
              subtotal: true,
              discountAmount: true,
              discountPercentage: true,
              discountReason: true,
              taxAmount: true,
              serviceCharge: true,
              tipAmount: true,
              grandTotal: true,
              amountPaid: true,
              paidAt: true,
              settledAt: true,
              createdAt: true,
              customerName: true,
              customerPhone: true,
              metadata: true,
              waiter: {
                select: { name: true, firstName: true, lastName: true },
              },
              items: {
                select: {
                  id: true,
                  itemName: true,
                  quantity: true,
                  basePrice: true,
                  itemTotal: true,
                },
              },
              payments: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  amount: true,
                  paymentMethod: true,
                  paymentStatus: true,
                  transactionId: true,
                  referenceNumber: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      isPaginated ? prisma.order.count({ where: listWhere }) : Promise.resolve(-1),
      includeSummary
        ? Promise.all([
            prisma.order.count({ where: validNonCancelledWhere }),
            prisma.order.count({ where: activeTrackerWhere }),
            prisma.order.count({
              where: {
                ...baseWhere,
                status: { in: COMPLETED_STATUSES },
              },
            }),
            prisma.order.aggregate({
              where: {
                ...validNonCancelledWhere,
                OR: [
                  { paymentStatus: 'completed' },
                  { bill: { status: 'PAID' } },
                  { bill: { paymentStatus: 'completed' } },
                  { tableBill: { status: 'PAID' } },
                  { tableBill: { paymentStatus: 'completed' } },
                ],
              },
              _sum: { totalAmount: true },
            }),
          ])
        : Promise.resolve(null),
    ])

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

      const linkedBill = order.bill || order.tableBill
      const orderMeta = (order.metadata as Record<string, any>) || {}
      const billMeta = (linkedBill?.metadata as Record<string, any>) || {}

      const orderItemsFormatted = order.items.map((item) => ({
        id: item.id,
        name: item.itemName || item.menuItem?.name || 'Menu Item',
        quantity: item.quantity,
        price: Number(item.basePrice || 0),
        total: Number(item.itemTotal || 0),
      }))

      const billItemsFormatted =
        linkedBill?.items && linkedBill.items.length > 0
          ? linkedBill.items.map((item) => ({
              id: item.id,
              name: item.itemName || 'Menu Item',
              quantity: item.quantity,
              price: Number(item.basePrice || 0),
              total: Number(item.itemTotal || 0),
            }))
          : orderItemsFormatted

      const latestPayment =
        (order.payments && order.payments[0]) ||
        (linkedBill?.payments && linkedBill.payments[0]) ||
        null

      const orderPaySt = String(order.paymentStatus || '').toLowerCase()
      const billSt = String(linkedBill?.status || '').toLowerCase()
      const billSt2 = String(linkedBill?.billStatus || '').toLowerCase()
      const billPaySt = String(linkedBill?.paymentStatus || '').toLowerCase()
      const latestPaySt = String(latestPayment?.paymentStatus || '').toLowerCase()

      const isPaid =
        ['completed', 'paid', 'settled'].includes(orderPaySt) ||
        ['paid', 'settled'].includes(billSt) ||
        ['paid', 'settled'].includes(billSt2) ||
        ['completed', 'paid', 'settled'].includes(billPaySt) ||
        ['completed', 'paid', 'settled'].includes(latestPaySt)

      const orderItemsSubtotal = orderItemsFormatted.reduce(
        (sum, it) => sum + Number(it.total || it.price * it.quantity || 0),
        0
      )
      const orderSubtotal = Number(order.subtotal || orderItemsSubtotal || 0)
      const orderDiscount = Number(order.discountAmount || 0)
      const orderTax = Number(order.taxAmount || 0)
      const orderServiceCharge = Number(order.serviceCharge || 0)

      const billSubtotal = linkedBill ? Number(linkedBill.subtotal || 0) : orderSubtotal
      const billDiscount = linkedBill ? Number(linkedBill.discountAmount || 0) : orderDiscount
      const billTax = linkedBill ? Number(linkedBill.taxAmount || 0) : orderTax
      const billServiceCharge = linkedBill ? Number(linkedBill.serviceCharge || 0) : orderServiceCharge
      const billTip = linkedBill ? Number(linkedBill.tipAmount || 0) : 0
      const coverCharges = Number(billMeta.coverCharges || 0)
      const nonPaymentPenalty = Number(billMeta.nonPaymentPenalty || 0)
      const billGrandTotal = linkedBill
        ? Number(
            linkedBill.grandTotal ||
              billSubtotal - billDiscount + billTax + billServiceCharge + billTip + coverCharges + nonPaymentPenalty
          )
        : totalVal

      const isCombinedBill = Boolean(
        linkedBill &&
          Math.abs(billSubtotal - orderSubtotal) > 1 &&
          billItemsFormatted.length > orderItemsFormatted.length
      )

      const waiterName = linkedBill?.waiter
        ? linkedBill.waiter.name ||
          `${linkedBill.waiter.firstName || ''} ${linkedBill.waiter.lastName || ''}`.trim() ||
          null
        : null

      const paymentMethod =
        linkedBill?.paymentMethod ||
        latestPayment?.paymentMethod ||
        orderMeta.paymentMethod ||
        (isPaid ? 'ONLINE' : null)

      const paidAt =
        linkedBill?.paidAt ||
        linkedBill?.settledAt ||
        latestPayment?.createdAt ||
        (isPaid ? order.updatedAt : null)

      const resolvedTableNumber = order.table?.tableNumber || orderMeta.tableNumber || null

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: finalStatus,
        total: totalVal,
        totalAmount: totalVal,
        subtotal: orderSubtotal,
        discountAmount: orderDiscount,
        discountPercentage: Number(order.discountPercentage || 0),
        discountReason: order.discountReason || null,
        taxAmount: orderTax,
        serviceCharge: orderServiceCharge,
        source: order.source || 'ONLINE',
        orderType: order.orderType,
        paymentStatus: isPaid ? 'completed' : order.paymentStatus,
        isPaid,
        isBilled: Boolean(order.isBilled || linkedBill),
        billId: linkedBill?.id || order.billId || null,
        billNumber: linkedBill?.billNumber || null,
        billStatus: linkedBill?.status || null,
        billPaymentStatus: linkedBill?.paymentStatus || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customerId: order.customerId || customerId,
        customerEmail: order.customer?.email || cleanEmail || null,
        tableId: order.tableId || null,
        tableNumber: resolvedTableNumber,
        branchName: order.branch?.name || 'Main Branch',
        items: orderItemsFormatted,
        receipt: {
          receiptNumber: linkedBill?.billNumber || `RCPT-${order.orderNumber}`,
          billId: linkedBill?.id || order.billId || null,
          orderNumber: order.orderNumber,
          isPaid,
          isCombinedBill,
          paymentStatus: isPaid ? 'completed' : order.paymentStatus,
          paymentMethod,
          transactionId: latestPayment?.transactionId || null,
          referenceNumber: latestPayment?.referenceNumber || null,
          paidAt,
          issuedAt: linkedBill?.createdAt || order.createdAt,
          restaurantName: order.restaurant?.name || 'RestoSphere',
          restaurantAddress: order.branch?.address || order.restaurant?.address || '',
          restaurantPhone: order.branch?.phone || order.restaurant?.phone || '',
          branchName: order.branch?.name || 'Main Branch',
          gstNumber: order.restaurant?.gstNumber || null,
          fssaiNumber: order.restaurant?.fssaiNumber || null,
          customerName:
            linkedBill?.customerName ||
            order.customer?.name ||
            customerRecord?.name ||
            orderMeta.customerName ||
            'Guest',
          customerPhone:
            linkedBill?.customerPhone ||
            order.customer?.phone ||
            orderMeta.customerPhone ||
            '',
          tableNumber: resolvedTableNumber,
          vehicleNumber: order.vehicleNumber || orderMeta.vehicleNumber || null,
          orderType: order.orderType,
          source: order.source || 'ONLINE',
          waiterName,
          subtotal: isCombinedBill ? orderSubtotal : billSubtotal,
          discountAmount: isCombinedBill ? orderDiscount : billDiscount,
          discountPercentage: Number(
            (!isCombinedBill && linkedBill?.discountPercentage) || order.discountPercentage || 0
          ),
          discountReason: (!isCombinedBill && linkedBill?.discountReason) || order.discountReason || null,
          taxAmount: isCombinedBill ? orderTax : billTax,
          serviceCharge: isCombinedBill ? orderServiceCharge : billServiceCharge,
          coverCharges: isCombinedBill ? 0 : coverCharges,
          nonPaymentPenalty: isCombinedBill ? 0 : nonPaymentPenalty,
          tipAmount: isCombinedBill ? 0 : billTip,
          grandTotal: isCombinedBill ? totalVal : billGrandTotal,
          billGrandTotal,
          items: isCombinedBill ? orderItemsFormatted : billItemsFormatted,
        },
      }
    })

    const effectiveTotal = totalCount >= 0 ? totalCount : formattedOrders.length
    const totalPages = Math.max(1, Math.ceil(effectiveTotal / limit))

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: effectiveTotal,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      ...(summaryData
        ? {
            summary: {
              totalOrders: summaryData[0],
              activeOrdersCount: summaryData[1],
              completedOrdersCount: summaryData[2],
              totalSpent: Number(summaryData[3]._sum?.totalAmount || 0),
            },
          }
        : {}),
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
    const requestedTableNum = body.tableNumber ? String(body.tableNumber).trim() : null
    const requestedTableId = body.tableId ? String(body.tableId).trim() : null

    // 1. Resolve restaurant and branch
    let branch = await prisma.branch.findFirst({
      orderBy: { isPrimary: 'desc' },
      include: { restaurant: true },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'No active branch available' },
        { status: 400 }
      )
    }

    // 1b. Resolve target dine-in table and ensure it is strictly available
    let resolvedTable =
      requestedTableNum || requestedTableId
        ? await resolveDineInTable(prisma, {
            branchId: branch.id,
            tableId: requestedTableId,
            tableNumber: requestedTableNum,
          })
        : await prisma.restaurantTable.findFirst({
            where: {
              branchId: branch.id,
              deletedAt: null,
              status: 'available',
            },
            orderBy: { tableNumber: 'asc' },
            select: { id: true, tableNumber: true, status: true, metadata: true },
          })

    if (!resolvedTable) {
      const hasTables =
        (await prisma.restaurantTable.count({
          where: { branchId: branch.id, deletedAt: null },
        })) > 0

      if (hasTables) {
        const message =
          requestedTableNum || requestedTableId
            ? `Table "${requestedTableNum || requestedTableId}" was not found. Please select an available table.`
            : 'All dining tables are currently occupied. Please wait for an available table.'
        return NextResponse.json(
          {
            success: false,
            code: requestedTableNum || requestedTableId ? 'TABLE_NOT_FOUND' : 'TABLE_OCCUPIED',
            message,
          },
          { status: requestedTableNum || requestedTableId ? 404 : 409 }
        )
      }
    } else {
      const effectiveStatus = getEffectiveTableStatus(resolvedTable.status, resolvedTable.metadata)
      if (effectiveStatus !== 'available') {
        return NextResponse.json(
          {
            success: false,
            code: effectiveStatus === 'occupied' ? 'TABLE_OCCUPIED' : 'TABLE_UNAVAILABLE',
            tableStatus: effectiveStatus,
            tableNumber: resolvedTable.tableNumber,
            message: formatUnavailableTableMessage(resolvedTable.tableNumber, effectiveStatus),
          },
          { status: 409 }
        )
      }
    }

    const requestedTable = resolvedTable?.tableNumber || requestedTableNum || 'Table 1'

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

    // 3. Atomically claim table & create the dynamic Order
    const order = await prisma.$transaction(async (tx) => {
      if (resolvedTable) {
        await validateAndClaimDineInTable(tx, {
          table: resolvedTable,
          isStaffPosOrder: false,
        })
      }

      return tx.order.create({
        data: {
          orderNumber,
          branchId: branch.id,
          restaurantId: branch.restaurantId,
          organizationId: branch.organizationId,
          customerId: session.customerId,
          tableId: resolvedTable?.id || null,
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
    })

    // 4. Update customer order count (totalSpent is only updated once bill is paid/settled)
    await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        totalOrders: { increment: 1 },
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
    invalidatePOSTablesCache()
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
    if (error instanceof TableBookingConflictError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          tableStatus: error.tableStatus,
          tableNumber: error.tableNumber,
          message: error.message,
        },
        { status: error.statusCode }
      )
    }
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
      select: {
        id: true,
        orderNumber: true,
        organizationId: true,
        status: true,
        branchId: true,
        customerId: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Soft delete & purge order notifications in parallel
    await Promise.all([
      prisma.order.update({
        where: { id: order.id },
        data: {
          deletedAt: new Date(),
          status: 'cancelled',
        },
      }),
      removeOrderNotifications({
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId: order.organizationId,
      }),
      order.customerId ? syncCustomerOrderStats(order.customerId) : Promise.resolve(),
    ])

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
