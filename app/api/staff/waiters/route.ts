/**
 * GET /api/staff/waiters?branchId=<id>
 * Ultra-fast endpoint to get all active waiters for Table Assignment & POS attribution.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthContext } from '@/api/middleware/auth'
import { successResponse, errorResponse } from '@/api/utils/responses'

export async function GET(request: NextRequest) {
  try {
    const authContext = extractAuthContext(request)
    const branchId = request.nextUrl.searchParams.get('branchId') || authContext.branchId

    const waiters = await prisma.user.findMany({
      where: {
        organizationId: authContext.organizationId,
        status: 'active',
        role: { in: ['WAITER', 'STAFF', 'waiter', 'staff'] },
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
      },
      orderBy: { firstName: 'asc' },
      take: 50,
    })

    const formatted = waiters.map((w) => ({
      id: w.id,
      name: w.name || `${w.firstName || ''} ${w.lastName || ''}`.trim() || 'Waiter',
      phone: w.phone || '',
      role: w.role,
    }))

    return NextResponse.json(
      successResponse(formatted, 'Active waiters retrieved successfully'),
      {
        headers: {
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching waiters:', error)
    return NextResponse.json(errorResponse('Failed to fetch waiters', 'SERVER_ERROR'), { status: 500 })
  }
}
