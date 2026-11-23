import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import { verifyCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { getCachedAuthMe, setCachedAuthMe } from '@/lib/dashboard-cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET(request: NextRequest) {
  try {
    const adminSessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const customerSessionCookie = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value

    if (!adminSessionCookie && !customerSessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated', user: null },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // 1. Try Admin Session
    if (adminSessionCookie) {
      const payload = await verifyJWT(adminSessionCookie)
      if (payload && payload.userId) {
        // Ultra-fast in-memory cache hit (< 1ms)
        const cached = getCachedAuthMe(payload.userId)
        if (cached) {
          return NextResponse.json(cached, {
            headers: {
              ...NO_CACHE_HEADERS,
              'X-Auth-Cache': 'HIT',
            },
          })
        }

        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
            role: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                restaurants: {
                  take: 1,
                  select: {
                    id: true,
                    name: true,
                    branches: {
                      take: 1,
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })

        if (user) {
          const firstRestaurant = user.organization?.restaurants?.[0]
          const firstBranch = firstRestaurant?.branches?.[0]

          const restaurantId = firstRestaurant?.id || '089c77df-cd5e-4233-b6f1-b35f17631e5b'
          const branchId = firstBranch?.id || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
          const restaurantName = firstRestaurant?.name || 'RestoSphere'
          const branchName = firstBranch?.name || 'Mumbai Central'
          const orgId = user.organizationId || user.organization?.id || ''

          const isSuper = String(user.role).toUpperCase() === 'SUPER_ADMIN' || String(user.role).toUpperCase() === 'SUPERADMIN'
          const rawName = user.name || `${user.firstName || 'Admin'} ${user.lastName || ''}`.trim()
          const sanitizedName = isSuper && (!rawName || rawName.toLowerCase() === 'rajesh')
            ? 'Super Admin'
            : (rawName || 'Admin')

          const userData = {
            id: user.id,
            email: user.email,
            name: sanitizedName,
            role: user.role,
            organizationId: orgId,
            restaurantId,
            branchId,
            restaurantName,
            branchName,
          }

          const responsePayload = {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: userData.name,
              role: user.role,
            },
            data: userData,
          }

          setCachedAuthMe(payload.userId, responsePayload)

          return NextResponse.json(responsePayload, {
            headers: {
              ...NO_CACHE_HEADERS,
              'X-Auth-Cache': 'MISS',
            },
          })
        }
      }
    }

    // 2. Try Customer Session
    if (customerSessionCookie) {
      const payload = await verifyCustomerToken(customerSessionCookie)
      if (payload && payload.customerId) {
        const cached = getCachedAuthMe(payload.customerId)
        if (cached) {
          return NextResponse.json(cached, {
            headers: {
              ...NO_CACHE_HEADERS,
              'X-Auth-Cache': 'HIT',
            },
          })
        }

        const customer = await prisma.customer.findUnique({
          where: { id: payload.customerId },
          select: {
            id: true,
            email: true,
            name: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                restaurants: {
                  take: 1,
                  select: {
                    id: true,
                    name: true,
                    branches: {
                      take: 1,
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })

        if (customer) {
          let firstRestaurant = customer.organization?.restaurants?.[0]
          let firstBranch = firstRestaurant?.branches?.[0]

          if (!firstRestaurant) {
            firstRestaurant = await prisma.restaurant.findFirst({
              take: 1,
              select: {
                id: true,
                name: true,
                branches: {
                  take: 1,
                  select: { id: true, name: true },
                },
              },
            }) ?? undefined
            firstBranch = firstRestaurant?.branches?.[0]
          }

          const restaurantId = firstRestaurant?.id || '089c77df-cd5e-4233-b6f1-b35f17631e5b'
          const branchId = firstBranch?.id || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
          const restaurantName = firstRestaurant?.name || 'RestoSphere'
          const branchName = firstBranch?.name || 'Mumbai Central'
          const orgId = customer.organizationId || customer.organization?.id || ''

          const customerData = {
            id: customer.id,
            email: customer.email,
            name: customer.name || 'Customer',
            role: 'CUSTOMER',
            organizationId: orgId,
            restaurantId,
            branchId,
            restaurantName,
            branchName,
          }

          const responsePayload = {
            success: true,
            user: {
              id: customer.id,
              email: customer.email,
              name: customerData.name,
              role: 'CUSTOMER',
            },
            data: customerData,
          }

          setCachedAuthMe(payload.customerId, responsePayload)

          return NextResponse.json(responsePayload, {
            headers: {
              ...NO_CACHE_HEADERS,
              'X-Auth-Cache': 'MISS',
            },
          })
        }
      }
    }

    return NextResponse.json(
      { success: false, message: 'Invalid or expired session', user: null },
      { status: 401, headers: NO_CACHE_HEADERS }
    )
  } catch (error: any) {
    console.error('Error fetching current session:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve session', error: error.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
