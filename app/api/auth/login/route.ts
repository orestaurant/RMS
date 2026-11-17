import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { signJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import { CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { invalidateAdminAuthCache } from '@/lib/admin-auth'
import { invalidateAuthMeCache } from '@/lib/dashboard-cache'

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

    // 1. Immediate Customer check: Block any customer account from logging into Staff & Admin portal
    const customerAccount = await prisma.customer.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: { id: true, email: true, role: true },
    })

    if (customerAccount) {
      return NextResponse.json(
        { success: false, message: 'Customer accounts do not have access to the Staff & Admin portal. Please use the Customer & Guest Portal.' },
        { status: 403 }
      )
    }

    // Query user by email from PostgreSQL via Prisma (with retry for Neon cold-starts)
    let user = null
    try {
      user = await prisma.user.findUnique({
        where: { email },
      })
    } catch (dbErr: any) {
      console.warn('First DB attempt failed, retrying once...', dbErr?.message || dbErr)
      await new Promise((r) => setTimeout(r, 400))
      user = await prisma.user.findUnique({
        where: { email },
      })
    }

    if (user && !user.deletedAt) {
      const roleUpper = String(user.role || '').toUpperCase()
      if (roleUpper === 'CUSTOMER') {
        return NextResponse.json(
          { success: false, message: 'Customer accounts do not have access to the Staff & Admin portal. Please use the Customer & Guest Portal.' },
          { status: 403 }
        )
      }
    }

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.status === 'inactive') {
      return NextResponse.json(
        { success: false, message: 'Your account is deactivated. Please contact an administrator.' },
        { status: 403 }
      )
    }

    // Compare with password or passwordHash
    const passwordToCompare = user.password || user.passwordHash || ''
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch((err) => {
      console.error('Failed to update last login:', err)
    })

    // Invalidate existing cached admin sessions to ensure fresh auth state
    invalidateAdminAuthCache()
    invalidateAuthMeCache(user.id)

    // Sign JWT token
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name || `${user.firstName || 'Admin'} ${user.lastName || ''}`.trim() || 'Admin',
      role: user.role,
    })

    const roleUpper = String(user.role || '').toUpperCase()
    const isWaiter = roleUpper === 'WAITER'
    const isChef = roleUpper === 'CHEF'
    const redirectUrl = isWaiter ? '/tables' : isChef ? '/kitchen' : '/dashboard'

    const response = NextResponse.json(
      {
        success: true,
        redirect: redirectUrl,
        user: {
          id: user.id,
          name: user.name || 'Admin',
          email: user.email,
          role: user.role,
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

    // Set secure httpOnly admin session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Wipe any existing customer cookie to prevent session bleed
    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
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
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error occurred during login' },
      { status: 500 }
    )
  }
}

