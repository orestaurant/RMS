/**
 * GET /api/dashboard/top-dishes?branchId=<id>
 * Get top dishes today
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { getTopDishes } from '@/api/services/dashboard.service'
import { ValidationError } from '@/api/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get('branchId')

    if (!branchId) {
      throw new ValidationError('branchId is required')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    const dishes = await getTopDishes(branchId, tenantContext)

    return NextResponse.json(successResponse(dishes))
  } catch (error: any) {
    console.error('Error fetching top dishes:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'DASHBOARD_ERROR'),
      { status: 500 }
    )
  }
}

