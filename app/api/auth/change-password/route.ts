/**
 * POST /api/auth/change-password
 * Secure, optimized password update for authenticated users
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import { verifyCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { getMockAuthContext } from '@/api/middleware/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      )
    }

    const currentPassword = String(body.currentPassword || '').trim()
    const newPassword = String(body.newPassword || '').trim()
    const confirmPassword = String(body.confirmPassword || '').trim()

    // Validation
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is required' },
        { status: 400 }
      )
    }

    if (!newPassword) {
      return NextResponse.json(
        { success: false, message: 'New password is required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { success: false, message: 'New password cannot exceed 128 characters' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'New password and confirmation do not match' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, message: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Resolve Authenticated User Identity
    const adminSessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const customerSessionCookie = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    let userId: string | null = null
    let isCustomer = false

    // 1. Check Admin JWT Cookie or Bearer Token
    if (adminSessionCookie || bearerToken) {
      const payload = await verifyJWT(adminSessionCookie || bearerToken!)
      if (payload?.userId) {
        userId = payload.userId
      }
    }

    // 2. Check Customer JWT Cookie
    if (!userId && customerSessionCookie) {
      const customerPayload = await verifyCustomerToken(customerSessionCookie)
      if (customerPayload?.customerId) {
        userId = customerPayload.customerId
        isCustomer = true
      }
    }

    // 3. Fallback: check body email or mock context if in development
    if (!userId) {
      if (body.email) {
        const foundUser = await prisma.user.findUnique({
          where: { email: String(body.email).trim().toLowerCase() },
          select: { id: true },
        })
        if (foundUser) {
          userId = foundUser.id
        }
      } else {
        const mockAuth = getMockAuthContext()
        if (mockAuth?.userId) {
          userId = mockAuth.userId
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in to change password.' },
        { status: 401 }
      )
    }

    // Process Customer Password Update
    if (isCustomer) {
      const customer = await prisma.customer.findFirst({
        where: { id: userId, deletedAt: null },
        select: { id: true, password: true },
      })

      if (!customer) {
        return NextResponse.json(
          { success: false, message: 'Customer account not found' },
          { status: 404 }
        )
      }

      const existingHash = customer.password || ''
      const isMatch = await bcrypt.compare(currentPassword, existingHash).catch(() => false)
      if (!isMatch && existingHash !== currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      })
    }

    // Process Admin / Staff Password Update
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        password: true,
        passwordHash: true,
        status: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User account not found' },
        { status: 404 }
      )
    }

    if (user.status === 'inactive') {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 403 }
      )
    }

    const currentHash = user.password || user.passwordHash || ''
    const isCurrentValid = await bcrypt.compare(currentPassword, currentHash).catch(() => false)

    if (!isCurrentValid && currentHash !== currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Generate bcrypt hash with 10 salt rounds
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Efficient database update in PostgreSQL
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error: any) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to change password. Please try again later.' },
      { status: 500 }
    )
  }
}

