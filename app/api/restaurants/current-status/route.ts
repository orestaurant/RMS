/**
 * GET /api/restaurants/current-status?branchId=<id>
 * Get current restaurant status (open/closed)
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
    // Extract query parameters
    const branchId = request.nextUrl.searchParams.get('branchId')

    // Validate input
    if (!branchId) {
      throw new ValidationError('branchId is required')
    }

    // TODO: Extract real auth context from JWT token
    const authContext = getMockAuthContext()

    // Extract tenant context
    const tenantContext = extractTenantContext(authContext)

    // TODO: Fetch restaurant settings and operating hours
    // For now, calculate based on current time and restaurant settings

    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId: tenantContext.organizationId,
        deletedAt: null,
      },
      include: {
        restaurant: true,
      },
    })

    if (!branch) {
      throw new ValidationError('Branch not found')
    }

    const settings = await prisma.restaurantSettings.findFirst({
      where: {
        restaurantId: branch.restaurantId,
        organizationId: tenantContext.organizationId,
      },
    })

    // TODO: Parse operating hours from settings.operatingHours JSONB
    // For now, assume restaurant is open during business hours

    const now = new Date()
    const currentHour = now.getHours()

    // Assume operating hours: 6am - 11pm
    const isOpen = currentHour >= 6 && currentHour < 23
    const closingTime = '11 PM'
    const timezone = settings?.timezone || 'Asia/Kolkata'

    return NextResponse.json(
      successResponse({
        isOpen,
        statusLabel: isOpen ? 'Restaurant Open' : 'Restaurant Closed',
        closingTime: isOpen ? closingTime : null,
        timezone,
      })
    )
  } catch (error: any) {
    console.error('Error fetching restaurant status:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'STATUS_ERROR'),
      { status: 500 }
    )
  }
}
