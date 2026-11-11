/**
 * GET /api/crm/customers?branchId=<id>&tier=all&search=""
 * Get customers for a branch
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get('branchId')
    const search = request.nextUrl.searchParams.get('search') || ''

    if (!branchId) {
      throw new ValidationError('branchId is required')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    const where: any = {
      restaurantId: tenantContext.restaurantId,
      organizationId: tenantContext.organizationId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        loyaltyPoints: true,
        addresses: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const formatted = customers.map((customer: any) => ({
      id: customer.id,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Guest',
      phone: customer.phone,
      email: customer.email || '',
      totalSpent: Number(customer.totalSpent || 0),
      visits: customer.totalOrders || 0,
      lastVisit: customer.updatedAt?.toISOString() || null,
      tier: 'silver',
      loyaltyPoints: customer.loyaltyPoints?.pointsBalance || 0,
      preferences: [],
      notes: '',
    }))

    return NextResponse.json(successResponse({
      data: formatted,
      meta: {
        total: formatted.length,
        tiers: {
          gold: formatted.filter((c) => c.tier === 'gold').length,
          silver: formatted.filter((c) => c.tier === 'silver').length,
          bronze: formatted.filter((c) => c.tier === 'bronze').length,
        },
      },
    }))
  } catch (error: any) {
    console.error('Error fetching customers:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'CRM_ERROR'),
      { status: 500 }
    )
  }
}
