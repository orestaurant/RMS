import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth'
import { CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { invalidateAdminAuthCache } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    // Invalidate any in-memory admin auth caches
    invalidateAdminAuthCache()

    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )

    // Clear admin session cookie
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

    // Clear customer session cookie
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
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to log out' },
      { status: 500 }
    )
  }
}
