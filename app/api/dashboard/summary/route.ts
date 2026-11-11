/**
 * GET /api/dashboard/summary?branchId=<id>&date=today
 * Get dashboard summary statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMockAuthContext, extractAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { getDashboardSummary } from '@/api/services/dashboard.service'
import { ValidationError } from '@/api/utils/errors'

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const branchId = request.nextUrl.searchParams.get('branchId')
    const date = request.nextUrl.searchParams.get('date') || 'today'

    // Validate input
    if (!branchId) {
      throw new ValidationError('branchId is required')
    }

    if (date !== 'today') {
      // TODO: Support other date ranges like week, month
      throw new ValidationError("date must be 'today'")
    }

    // TODO: Extract real auth context from JWT token
    const authContext = getMockAuthContext()

    // Extract tenant context
    const tenantContext = extractTenantContext(authContext)

    // Fetch dashboard summary
    const summary = await getDashboardSummary(branchId, tenantContext)

    return NextResponse.json(successResponse(summary))
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error)

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
