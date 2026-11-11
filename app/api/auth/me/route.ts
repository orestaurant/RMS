import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import { verifyCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'

export async function GET(request: NextRequest) {
  try {
    const adminSessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const customerSessionCookie = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value

    if (!adminSessionCookie && !customerSessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated', user: null },
        { status: 401 }
      )
    }

    // 1. Try Admin Session
    if (adminSessionCookie) {
      const payload = await verifyJWT(adminSessionCookie)
      if (payload && payload.userId) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: {
            staffProfile: true,
            organization: {
              include: {
                restaurants: {
                  include: {
                    branches: true,
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
          const restaurantName = firstRestaurant?.name || 'Spice Garden'
          const branchName = firstBranch?.name || 'Mumbai Central'
          const orgId = user.organizationId || user.organization?.id || ''

          const userData = {
            id: user.id,
            email: user.email,
            name: user.name || `${user.firstName || 'Admin'} ${user.lastName || ''}`.trim() || 'Admin',
            role: user.role,
            organizationId: orgId,
            restaurantId,
            branchId,
            restaurantName,
            branchName,
          }

          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: userData.name,
              role: user.role,
            },
            data: userData,
          })
        }
      }
    }

    // 2. Try Customer Session
    if (customerSessionCookie) {
      const payload = await verifyCustomerToken(customerSessionCookie)
      if (payload && payload.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: payload.customerId },
          include: {
            organization: {
              include: {
                restaurants: {
                  include: {
                    branches: true,
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
              include: { branches: true },
            }) ?? undefined
            firstBranch = firstRestaurant?.branches?.[0]
          }

          const restaurantId = firstRestaurant?.id || '089c77df-cd5e-4233-b6f1-b35f17631e5b'
          const branchId = firstBranch?.id || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
          const restaurantName = firstRestaurant?.name || 'Spice Garden'
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

          return NextResponse.json({
            success: true,
            user: {
              id: customer.id,
              email: customer.email,
              name: customerData.name,
              role: 'CUSTOMER',
            },
            data: customerData,
          })
        }
      }
    }

    return NextResponse.json(
      { success: false, message: 'Invalid or expired session', user: null },
      { status: 401 }
    )
  } catch (error: any) {
    console.error('Error fetching current session:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve session', error: error.message },
      { status: 500 }
    )
  }
}
