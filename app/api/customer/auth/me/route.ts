import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCustomerSession } from '@/lib/customer-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getCustomerSession(request)
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        phone: true,
        totalOrders: true,
        totalSpent: true,
        createdAt: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer account not found' },
        { status: 404 }
      )
    }

    // Check review submission and discount claim status
    let feedback = null
    try {
      feedback = await prisma.customerFeedback.findFirst({
        where: {
          OR: [
            { customerId: customer.id },
            ...(customer.email ? [{ customerEmail: customer.email }] : []),
          ],
          deletedAt: null,
        },
        select: {
          id: true,
          discountCode: true,
          discountClaimed: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    } catch (e) {
      console.warn('Could not read customer feedback in /me:', e)
    }

    const isFirstOrder = Number(customer.totalOrders || 0) === 0

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name || 'Customer',
        email: customer.email,
        mobile: customer.mobile || customer.phone || '',
        totalOrders: customer.totalOrders,
        totalSpent: Number(customer.totalSpent || 0),
        createdAt: customer.createdAt,
        isFirstOrder,
        hasSubmittedReview: Boolean(feedback),
        reviewDiscountCode: feedback?.discountCode || null,
        reviewDiscountClaimed: feedback?.discountClaimed ?? false,
        reviewRating: feedback?.rating || null,
      },
    })
  } catch (error: any) {
    console.error('Error fetching customer profile:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

