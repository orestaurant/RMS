import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { SESSION_COOKIE_NAME, verifyJWT, normalizeRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = token ? await verifyJWT(token).catch(() => null) : null
    if (normalizeRole(session?.role) === 'CHEF') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Vendor directory is not available for Chef role' },
        { status: 403 }
      )
    }

    const vendors = await prisma.user.findMany({
      where: {
        role: 'VENDOR',
        status: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: vendors.map((v) => ({
        id: v.id,
        name: v.name || `${v.firstName || ''} ${v.lastName || ''}`.trim() || v.email,
        email: v.email,
        phone: v.phone || '',
      })),
    })
  } catch (error: any) {
    console.error('Failed to fetch vendors:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}
