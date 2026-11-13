import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_SESSION_COOKIE = 'admin_session'
const CUSTOMER_SESSION_COOKIE = 'customer_session'
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'rms_super_secret_jwt_key_2026_restaurant_mgmt_auth'
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING)

async function getAdminPayload(request: NextRequest): Promise<any> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (err) {
    return null
  }
}

async function isCustomerAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  if (!token) return false

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return !!payload?.customerId && payload?.role === 'CUSTOMER'
  } catch (err) {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const adminPayload = await getAdminPayload(request)
  const adminAuth = !!adminPayload?.userId
  const isWaiter = String(adminPayload?.role || '').toUpperCase() === 'WAITER'
  const customerAuth = await isCustomerAuthenticated(request)
  const isAuthenticated = adminAuth || customerAuth

  // Default redirect path based on user role
  const defaultAuthRedirect = isWaiter ? '/tables' : '/dashboard'

  // 1. Customer Auth Pages (/customer/auth, /customer/login, /customer/register)
  const isCustomerAuthRoute =
    pathname === '/customer/auth' ||
    pathname === '/customer/login' ||
    pathname === '/customer/register'

  if (isCustomerAuthRoute) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(defaultAuthRedirect, request.url))
    }
    return NextResponse.next()
  }

  // 2. Admin Login Page (/login)
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(defaultAuthRedirect, request.url))
    }
    return NextResponse.next()
  }

  // 2b. Waiter Role Route Security:
  // Waiter can only access Tables, Reservations, Live Orders, Kitchen Display, and Menu Management.
  // Other administrative and operational routes redirect directly to /tables.
  if (isWaiter) {
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL('/tables', request.url))
    }

    const isRestrictedForWaiter =
      pathname === '/settings' ||
      pathname.startsWith('/settings/') ||
      pathname === '/dashboard/settings' ||
      pathname.startsWith('/dashboard/settings/') ||
      pathname === '/staff' ||
      pathname.startsWith('/staff/') ||
      pathname === '/pos' ||
      pathname.startsWith('/pos/') ||
      pathname === '/inventory' ||
      pathname.startsWith('/inventory/') ||
      pathname === '/analytics' ||
      pathname.startsWith('/analytics/') ||
      pathname === '/crm' ||
      pathname.startsWith('/crm/')

    if (isRestrictedForWaiter) {
      return NextResponse.redirect(new URL('/tables', request.url))
    }
  }

  // 3. Customer Dashboard Redirect
  if (pathname === '/customer/dashboard') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/customer/login', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 4. Restricted Routes for Customers (Analytics & Settings are Admin-Only)
  const isAnalyticsRoute = pathname === '/analytics' || pathname.startsWith('/analytics/')
  const isSettingsRoute =
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname === '/dashboard/settings' ||
    pathname.startsWith('/dashboard/settings/')

  if (isAnalyticsRoute || isSettingsRoute) {
    // If not logged in at all, go to login
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // If logged in as customer (and not admin), block access and redirect to dashboard
    if (customerAuth && !adminAuth) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 5. Customer Orders Routes (/customer/orders)
  const isCustomerOrdersRoute = pathname === '/customer/orders' || pathname.startsWith('/customer/orders/')
  if (isCustomerOrdersRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/customer/login', request.url))
    }
    return NextResponse.next()
  }

  // 6. Protected Operational Dashboard Routes
  const isProtectedDashboardRoute =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/pos' ||
    pathname.startsWith('/pos/') ||
    pathname === '/tables' ||
    pathname.startsWith('/tables/') ||
    pathname === '/reservations' ||
    pathname.startsWith('/reservations/') ||
    pathname === '/orders' ||
    pathname.startsWith('/orders/') ||
    pathname === '/kitchen' ||
    pathname.startsWith('/kitchen/') ||
    pathname === '/inventory' ||
    pathname.startsWith('/inventory/') ||
    pathname === '/crm' ||
    pathname.startsWith('/crm/') ||
    pathname === '/staff' ||
    pathname.startsWith('/staff/')

  if (isProtectedDashboardRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/pos/:path*',
    '/pos',
    '/tables/:path*',
    '/tables',
    '/reservations/:path*',
    '/reservations',
    '/orders/:path*',
    '/orders',
    '/kitchen/:path*',
    '/kitchen',
    '/inventory/:path*',
    '/inventory',
    '/analytics/:path*',
    '/analytics',
    '/settings/:path*',
    '/settings',
    '/crm/:path*',
    '/crm',
    '/staff/:path*',
    '/staff',
    '/login',
    '/customer/:path*',
  ],
}
