/**
 * GET /api/tables?branchId=<id>
 * Get all tables for a branch
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

    // Fetch all tables for the branch
    const tables = await prisma.restaurantTable.findMany({
      where: {
        organizationId: tenantContext.organizationId,
        branchId: branchId,
        deletedAt: null,
      },
      select: {
        id: true,
        tableNumber: true,
        capacity: true,
        section: true,
        status: true,
      },
      orderBy: [
        { section: 'asc' },
        { tableNumber: 'asc' },
      ],
    })

    return NextResponse.json(successResponse(tables))
  } catch (error: any) {
    console.error('Error fetching tables:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'TABLES_ERROR'),
      { status: 500 }
    )
  }
}
