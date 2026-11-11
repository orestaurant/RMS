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

