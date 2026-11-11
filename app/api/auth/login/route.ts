import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { signJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

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

    // Query user by email from PostgreSQL via Prisma
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
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

    // Sign JWT token
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name || `${user.firstName || 'Admin'} ${user.lastName || ''}`.trim() || 'Admin',
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard',
      user: {
        name: user.name || 'Admin',
        email: user.email,
        role: user.role,
      },
    })

    // Set secure httpOnly cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
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

