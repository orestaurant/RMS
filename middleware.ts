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
  const roleUpper = String(adminPayload?.role || '').toUpperCase()
  const isAdminStaff = !!adminPayload?.userId && roleUpper !== 'CUSTOMER'
  const isWaiter = isAdminStaff && roleUpper === 'WAITER'
  const isChef = isAdminStaff && roleUpper === 'CHEF'
  const customerAuth = await isCustomerAuthenticated(request)

  // Default redirect path based on user role
  const defaultAuthRedirect = isWaiter ? '/tables' : isChef ? '/kitchen' : '/dashboard'

  // 1. Customer Auth Pages (/customer/auth, /customer/login, /customer/register)
  const isCustomerAuthRoute =
    pathname === '/customer/auth' ||
    pathname === '/customer/login' ||
    pathname === '/customer/register'

  if (isCustomerAuthRoute) {
    // Account creation must always be accessible so new guest accounts can be created
    if (pathname === '/customer/register') {
      return NextResponse.next()
    }
    // Only redirect if customer session is already active on signin routes
    if (customerAuth) {
      return NextResponse.redirect(new URL('/orders', request.url))
    }
    // Admin sessions must NEVER hijack or redirect away from the customer portal
    return NextResponse.next()
  }

  // 2. Admin Login Page (/login)
  if (pathname === '/login') {
    if (isAdminStaff) {
      return NextResponse.redirect(new URL(defaultAuthRedirect, request.url))
    }
    // Strict isolation: Never redirect a customer visiting /login to /orders.
    // The Staff & Admin Sign In form must always be presented.
    return NextResponse.next()
  }

  // 2b. Waiter & Chef Role Route Security:
  // Waiter & Chef can only access Tables, Reservations, Live Orders, Kitchen Display, and Menu Management.
  if (isWaiter || isChef) {
    const fallbackRoute = isChef ? '/kitchen' : '/tables'
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL(fallbackRoute, request.url))
    }

    const isRestricted =
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

    if (isRestricted) {
      return NextResponse.redirect(new URL(fallbackRoute, request.url))
    }
  }

  // 3. Customer Dashboard Route (/customer/dashboard)
  // Strict Isolation: If no customer session is active, redirect to customer account registration.
  // Authenticated customers land cleanly on Live Orders (/orders).
  if (pathname === '/customer/dashboard' || pathname.startsWith('/customer/dashboard/')) {
    if (!customerAuth) {
      return NextResponse.redirect(new URL('/customer/register', request.url))
    }
    return NextResponse.redirect(new URL('/orders', request.url))
  }

  // 4. Strict Isolation: Block Customer sessions from accessing Admin Portal (/admin or /dashboard) and Staff-Only Routes
  const isAdminOrDashboardRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/tables' ||
    pathname.startsWith('/tables/') ||
    pathname === '/staff' ||
    pathname.startsWith('/staff/') ||
    pathname === '/inventory' ||
    pathname.startsWith('/inventory/') ||
    pathname === '/reservations' ||
    pathname.startsWith('/reservations/') ||
    pathname === '/analytics' ||
    pathname.startsWith('/analytics/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname === '/pos' ||
    pathname.startsWith('/pos/') ||
    pathname === '/kitchen' ||
    pathname.startsWith('/kitchen/') ||
    pathname === '/crm' ||
    pathname.startsWith('/crm/') ||
    pathname === '/billing' ||
    pathname.startsWith('/billing/')

  if (isAdminOrDashboardRoute) {
    // Strict Isolation: Customer and unauthenticated sessions cannot access Admin/Staff routes
    if (!isAdminStaff) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // 5. Customer Orders Routes (/customer/orders)
  const isCustomerOrdersRoute = pathname === '/customer/orders' || pathname.startsWith('/customer/orders/')
  if (isCustomerOrdersRoute) {
    if (isAdminStaff && !customerAuth) {
      return NextResponse.redirect(new URL(defaultAuthRedirect, request.url))
    }
    if (!customerAuth) {
      return NextResponse.redirect(new URL('/customer/login', request.url))
    }
    return NextResponse.next()
  }

  // 6. Shared Live Orders (/orders) & Menu Management (/admin-menu)
  const isSharedOperationalRoute =
    pathname === '/orders' ||
    pathname.startsWith('/orders/') ||
    pathname === '/admin-menu' ||
    pathname.startsWith('/admin-menu/')

  if (isSharedOperationalRoute) {
    if (!isAdminStaff && !customerAuth) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin',
    '/admin-menu/:path*',
    '/admin-menu',
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
    '/billing/:path*',
    '/billing',
    '/login',
    '/customer/:path*',
  ],
}
