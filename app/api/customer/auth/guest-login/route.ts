/**
 * POST /api/customer/auth/guest-login
 * Lightweight Guest Login flow allowing customers or waiters to place table orders
 * without mandatory full password registration.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { name = 'Guest', phone, tableNumber } = body

    const cleanName = String(name || 'Guest').trim()
    const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '') : ''
    const generatedEmail = cleanPhone
      ? `guest_${cleanPhone}@guest.restosphere.local`
      : `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@guest.restosphere.local`

    // Try finding existing guest customer record or create a lightweight one
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          { email: generatedEmail },
        ],
      },
    })

    if (!customer) {
      // Find branch/org to associate with
      const defaultOrg = await prisma.organization.findFirst({ select: { id: true } })
      const orgId = defaultOrg?.id || '00000000-0000-0000-0000-000000000000'

      customer = await prisma.customer.create({
        data: {
          organizationId: orgId,
          firstName: cleanName,
          email: generatedEmail,
          phone: cleanPhone || null,
          role: 'CUSTOMER',
          status: 'active',
          metadata: {
            isGuest: true,
            tableNumber: tableNumber ? String(tableNumber) : undefined,
          },
        },
      })
    }

    // Sign lightweight customer session token
    const token = await signCustomerToken({
      customerId: customer.id,
      email: customer.email,
      role: 'CUSTOMER',
      name: customer.firstName || cleanName,
    })

    const response = NextResponse.json({
      success: true,
      message: 'Guest session created successfully.',
      customer: {
        id: customer.id,
        name: customer.firstName || cleanName,
        phone: customer.phone,
        email: customer.email,
        isGuest: true,
      },
    })

    // Set customer cookie
    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours for guest session
    })

    return response
  } catch (error: any) {
    console.error('Guest login error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create guest session' },
      { status: 500 }
    )
  }
}
