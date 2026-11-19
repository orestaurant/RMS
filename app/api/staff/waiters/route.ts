/**
 * GET /api/staff/waiters?branchId=<id>
 * Ultra-fast endpoint to get all active waiters for Table Assignment & POS attribution.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthContext } from '@/api/middleware/auth'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { UserRoleEnum } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const authContext = extractAuthContext(request)
    const branchId = request.nextUrl.searchParams.get('branchId') || authContext.branchId

    // Resilient organizationId resolution
    let organizationId = authContext.organizationId
    if (!organizationId && branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { organizationId: true },
      })
      if (branch?.organizationId) organizationId = branch.organizationId
    }
    if (!organizationId) {
      const defaultOrg = await prisma.organization.findFirst({ select: { id: true } })
      if (defaultOrg) organizationId = defaultOrg.id
    }

    // Valid UserRoleEnum members for waiters
    const waiterRoles: UserRoleEnum[] = [UserRoleEnum.WAITER, UserRoleEnum.waiter]

    const waiters = await prisma.user.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: 'active',
        OR: [
          { role: { in: waiterRoles } },
          {
            staffProfile: {
              designation: { in: ['WAITER', 'waiter', 'Waiter'] },
              status: 'active',
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        staffProfile: {
          select: {
            phoneNumber: true,
            designation: true,
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { name: 'asc' }],
      take: 100,
    })

    const formatted = waiters.map((w) => {
      const computedName =
        (w.name && w.name.trim()) ||
        `${w.firstName || ''} ${w.lastName || ''}`.trim() ||
        (w.email ? w.email.split('@')[0] : '') ||
        'Waiter'

      const computedPhone = w.phone || w.staffProfile?.phoneNumber || ''

      return {
        id: w.id,
        name: computedName,
        phone: computedPhone,
        role: w.role,
      }
    })

    return NextResponse.json(
      successResponse(formatted, 'Active waiters retrieved successfully'),
      {
        headers: {
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=20',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching waiters:', error)
    return NextResponse.json(errorResponse('Failed to fetch waiters', 'SERVER_ERROR'), { status: 500 })
  }
}
