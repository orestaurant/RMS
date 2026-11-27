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
  const isDJ = isAdminStaff && roleUpper === 'DJ'
  const customerAuth = await isCustomerAuthenticated(request)

  // Default redirect path based on user role
  const defaultAuthRedirect = isDJ ? '/dj' : isWaiter ? '/tables' : isChef ? '/kitchen' : '/dashboard'

  // 1. Customer Auth Pages (/customer/auth, /customer/login, /customer/register)
  // Must ALWAYS be presented as the independent Customer & Guest Portal sign-in / registration
  const isCustomerAuthRoute =
    pathname === '/customer/auth' ||
    pathname === '/customer/login' ||
    pathname === '/customer/register'

  if (isCustomerAuthRoute) {
    // Only redirect if customer is ALREADY authenticated with a customer session
    if (customerAuth) {
      return NextResponse.redirect(new URL('/customer-dashboard', request.url))
    }
    // Never hijack with staff session — present the independent customer sign-in portal
    return NextResponse.next()
  }

  // 2. Customer Protected Area (/customer-dashboard, /customer/dashboard, /customer/orders)
  const isCustomerProtectedArea =
    pathname === '/customer-dashboard' ||
    pathname.startsWith('/customer-dashboard/') ||
    pathname === '/customer/dashboard' ||
    pathname.startsWith('/customer/dashboard/') ||
    pathname === '/customer/orders' ||
    pathname.startsWith('/customer/orders/')

  if (isCustomerProtectedArea) {
    // If staff is logged in without customer credentials, keep them in their staff console
    if (isAdminStaff && !customerAuth) {
      return NextResponse.redirect(new URL(defaultAuthRedirect, request.url))
    }
    // If unauthenticated, redirect to Customer Sign In portal
    if (!customerAuth) {
      return NextResponse.redirect(new URL('/customer/login', request.url))
    }
    // Legacy /customer/dashboard redirect
    if (pathname === '/customer/dashboard' || pathname.startsWith('/customer/dashboard/')) {
      return NextResponse.redirect(new URL('/customer-dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 3. Staff & Admin Sign In Page (/login)
  if (pathname === '/login') {
    // If staff is already logged in, redirect to staff dashboard
    if (isAdminStaff) {
      return NextResponse.redirect(new URL(defaultAuthRedirect, request.url))
    }
    // Present the independent Staff & Admin Sign In portal
    return NextResponse.next()
  }

  // 4. Waiter, Chef & DJ Role Route Security
  if (isDJ) {
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL('/dj', request.url))
    }
    const isRestrictedForDJ =
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
      pathname === '/inventory-manager' ||
      pathname.startsWith('/inventory-manager/') ||
      pathname === '/vendor' ||
      pathname.startsWith('/vendor/') ||
      pathname === '/analytics' ||
      pathname.startsWith('/analytics/') ||
      pathname === '/billing' ||
      pathname.startsWith('/billing/') ||
      pathname === '/crm' ||
      pathname.startsWith('/crm/') ||
      pathname === '/kitchen' ||
      pathname.startsWith('/kitchen/') ||
      pathname === '/tables' ||
      pathname.startsWith('/tables/') ||
      pathname === '/reservations' ||
      pathname.startsWith('/reservations/')

    if (isRestrictedForDJ) {
      return NextResponse.redirect(new URL('/dj', request.url))
    }
  }

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
      (isWaiter && (pathname === '/inventory' || pathname.startsWith('/inventory/'))) ||
      pathname === '/analytics' ||
      pathname.startsWith('/analytics/') ||
      pathname === '/crm' ||
      pathname.startsWith('/crm/') ||
      pathname === '/dj' ||
      pathname.startsWith('/dj/') ||
      pathname === '/dashboard/dj' ||
      pathname.startsWith('/dashboard/dj/')

    if (isRestricted) {
      return NextResponse.redirect(new URL(fallbackRoute, request.url))
    }
  }

  // 4b. Dedicated DJ Dashboard Route Access (/dj, /dashboard/dj)
  const isDjRoute =
    pathname === '/dj' ||
    pathname.startsWith('/dj/') ||
    pathname === '/dashboard/dj' ||
    pathname.startsWith('/dashboard/dj/')

  if (isDjRoute) {
    if (customerAuth && !isAdminStaff) {
      return NextResponse.redirect(new URL('/customer-dashboard', request.url))
    }
    if (!isAdminStaff) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const canAccessDj =
      isDJ ||
      ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'RESTAURANT_OWNER', 'BRANCH_MANAGER'].includes(roleUpper)
    if (!canAccessDj) {
      return NextResponse.redirect(new URL(defaultAuthRedirect, request.url))
    }
    if (pathname === '/dashboard/dj' || pathname.startsWith('/dashboard/dj/')) {
      return NextResponse.redirect(new URL('/dj', request.url))
    }
    return NextResponse.next()
  }

  // 5. Strict Isolation: Block Customer sessions and unauthenticated users from accessing Admin & Staff Dashboard and Staff-Only Routes
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
    pathname === '/inventory-manager' ||
    pathname.startsWith('/inventory-manager/') ||
    pathname === '/vendor' ||
    pathname.startsWith('/vendor/') ||
    pathname === '/billing' ||
    pathname.startsWith('/billing/')

  if (isAdminOrDashboardRoute) {
    // If a logged-in customer attempts to access Admin/Staff dashboard or staff routes from home page or elsewhere,
    // strictly forbid them from opening Admin/Staff dashboard and redirect to Customer Dashboard
    if (customerAuth && !isAdminStaff) {
      return NextResponse.redirect(new URL('/customer-dashboard', request.url))
    }
    if (!isAdminStaff) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // 6. Shared Operational Live Orders (/orders) & Menu Management (/admin-menu)
  const isSharedOperationalRoute =
    pathname === '/orders' ||
    pathname.startsWith('/orders/') ||
    pathname === '/admin-menu' ||
    pathname.startsWith('/admin-menu/')

  if (isSharedOperationalRoute) {
    if (pathname === '/admin-menu' || pathname.startsWith('/admin-menu/')) {
      if (!isAdminStaff) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.next()
    }
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
    '/customer-dashboard/:path*',
    '/customer-dashboard',
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
    '/inventory-manager/:path*',
    '/inventory-manager',
    '/vendor/:path*',
    '/vendor',
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
    '/dj/:path*',
    '/dj',
    '/dashboard/dj/:path*',
    '/dashboard/dj',
    '/login',
    '/customer/:path*',
    '/customer',
  ],
}
