import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { signCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { name, email, password, mobile } = body

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Name is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 4 characters long' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const cleanMobile = mobile && typeof mobile === 'string' ? mobile.trim() : null

    // 2. Check if email is already registered
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: cleanEmail },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // 3. Hash password with bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Resolve default organization if available
    const defaultOrg = await prisma.organization.findFirst({
      select: { id: true },
    })

    // 5. Create Customer record in PostgreSQL
    const customer = await prisma.customer.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        mobile: cleanMobile,
        phone: cleanMobile,
        status: 'active',
        customerSource: 'ONLINE',
        ...(defaultOrg ? { organizationId: defaultOrg.id } : {}),
      },
    })

    // 6. Issue signed JWT token
    const token = await signCustomerToken({
      customerId: customer.id,
      email: customer.email,
      role: 'CUSTOMER',
      name: customer.name,
    })

    // 7. Response with customer_session cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Registration successful',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )

    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Clear any prior admin session cookie to prevent cross-account bleed
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })

    return response
  } catch (error: any) {
    console.error('Customer registration error:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to register customer' },
      { status: 500 }
    )
  }
}

