import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { signCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    const email = String(body.email).trim().toLowerCase()
    const password = String(body.password)

    // 1. Database-based role check: Block if this email belongs to an ADMIN, OWNER, MANAGER, or STAFF role in User table
    const staffUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, role: true, deletedAt: true },
    })

    if (staffUser && !staffUser.deletedAt) {
      const roleUpper = String(staffUser.role || '').toUpperCase()
      if (roleUpper !== 'CUSTOMER') {
        return NextResponse.json(
          {
            success: false,
            code: 'ADMIN_STAFF_ACCOUNT',
            message: 'Admin or staff accounts cannot log in through the Customer Portal. Please use the Staff & Admin Sign In.',
          },
          { status: 403 }
        )
      }
    }

    // 3. Query customer from PostgreSQL via Prisma
    const customer = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    // If customer account does not exist, reject with mandatory account creation guidance
    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found. Please create a customer account first.',
        },
        { status: 404 }
      )
    }

    // Verify role is strictly CUSTOMER
    const customerRoleUpper = String(customer.role || 'CUSTOMER').toUpperCase()
    if (customerRoleUpper !== 'CUSTOMER') {
      return NextResponse.json(
        {
          success: false,
          code: 'ADMIN_STAFF_ACCOUNT',
          message: 'Admin or staff accounts cannot log in through the Customer Portal. Please use the Staff & Admin Sign In.',
        },
        { status: 403 }
      )
    }

    // 4. Validate password
    const isPasswordValid = await bcrypt.compare(password, customer.password || '')
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid password. Please check your credentials.' },
        { status: 401 }
      )
    }

    // 5. Issue signed JWT token
    const token = await signCustomerToken({
      customerId: customer.id,
      email: customer.email,
      role: 'CUSTOMER',
      name: customer.name,
    })

    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged in successfully',
        redirect: '/customer-dashboard',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
          role: 'CUSTOMER',
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

    // 6. Set customer_session cookie
    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // 7. Clear any prior admin session cookie to prevent cross-account bleed
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
    console.error('Customer login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error occurred during login' },
      { status: 500 }
    )
  }
}

