/**
 * GET & POST /api/notifications
 * Live notifications endpoint for TopNavbar bell (Waiter, Chef, Admin, Customer)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCustomerSession } from '@/lib/customer-auth'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import {
  notifyOrderPrepared,
  createPersistentNotification,
  markNotificationsReadInDb,
  clearNotificationsInDb,
  getStaffNotificationsFeed,
  getCustomerNotificationsFeed,
} from '@/lib/notifications-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'WAITER',
  'CHEF',
  'CASHIER',
  'STAFF',
  'DJ',
  'VENDOR',
  'INVENTORY_MANAGER',
])

async function resolveRequesterContext(request: NextRequest): Promise<{
  isCustomer: boolean
  customerId: string | null
  organizationId: string | null
  staffRole: string | null
}> {
  const queryRole = (request.nextUrl.searchParams.get('role') || '').toUpperCase().trim()
  const queryCustomerId =
    request.nextUrl.searchParams.get('customerId') ||
    request.nextUrl.searchParams.get('userId') ||
    null

  // 1. Explicit Customer portal request takes customer isolation path
  if (queryRole === 'CUSTOMER') {
    const customerSession = await getCustomerSession(request)
    return {
      isCustomer: true,
      customerId: customerSession?.customerId || queryCustomerId,
      organizationId: null,
      staffRole: null,
    }
  }

  // 2. Always verify staff/admin JWT BEFORE checking customer cookies so a leftover
  // customer cookie in the same browser never hides Waiter/Staff alerts.
  const staffCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (staffCookie) {
    const payload = await verifyJWT(staffCookie)
    const roleUpper = String(payload?.role || '').toUpperCase().trim()
    if (payload?.userId && STAFF_ROLES.has(roleUpper)) {
      return {
        isCustomer: false,
        customerId: null,
        organizationId: request.nextUrl.searchParams.get('organizationId') || null,
        staffRole: roleUpper,
      }
    }
    if (payload?.userId && roleUpper === 'CUSTOMER') {
      return {
        isCustomer: true,
        customerId: payload.userId,
        organizationId: null,
        staffRole: null,
      }
    }
  }

  // 3. Fallback to customer session cookie if no verified staff session is present
  const customerSession = await getCustomerSession(request)
  if (customerSession?.customerId || queryCustomerId) {
    return {
      isCustomer: true,
      customerId: customerSession?.customerId || queryCustomerId,
      organizationId: null,
      staffRole: null,
    }
  }

  return {
    isCustomer: false,
    customerId: null,
    organizationId: null,
    staffRole: STAFF_ROLES.has(queryRole) ? queryRole : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20,
      50
    )

    const ctx = await resolveRequesterContext(request)

    if (ctx.isCustomer) {
      if (!ctx.customerId) {
        return NextResponse.json(
          {
            success: true,
            data: { notifications: [], unreadCount: 0 },
          },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        )
      }

      const feed = await getCustomerNotificationsFeed({
        customerId: ctx.customerId,
        limit,
      })

      return NextResponse.json(
        {
          success: true,
          data: feed,
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    const feed = await getStaffNotificationsFeed({
      organizationId: ctx.organizationId,
      role: ctx.staffRole,
      limit,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications: feed.notifications,
          unreadCount: feed.unreadCount,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Notifications-Cache': feed.cacheHit ? 'HIT' : 'MISS',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, orderId, orderNumber, tableNumber, customerName, customerId, itemsSummary, id } = body

    const ctx = await resolveRequesterContext(request)

    if (action === 'order_prepared') {
      const newNotif = await notifyOrderPrepared({
        orderId,
        orderNumber: String(orderNumber || orderId || 'Order'),
        tableNumber,
        customerName,
        customerId: customerId || null,
        organizationId: body.organizationId || ctx.organizationId || null,
        itemsSummary,
      })

      return NextResponse.json({
        success: true,
        message: 'Order prepared notification added',
        data: newNotif,
      })
    }

    if (action === 'mark_read') {
      await markNotificationsReadInDb(id, ctx.organizationId)
      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    if (action === 'clear') {
      await clearNotificationsInDb(ctx.organizationId)
      return NextResponse.json({ success: true, message: 'Notifications cleared' })
    }

    if (body.title && body.body) {
      const customNotif = await createPersistentNotification({
        type: body.type || 'alert',
        title: String(body.title),
        body: String(body.body),
        customerId: body.customerId || body.metadata?.customerId || null,
        organizationId: body.organizationId || ctx.organizationId || null,
        metadata: body.metadata,
      })
      return NextResponse.json({ success: true, data: customNotif })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error adding notification:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to post notification' },
      { status: 500 }
    )
  }
}
