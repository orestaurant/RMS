/**
 * GET /api/pos/tables?branchId=<id>
 * Get all tables for POS Terminal with current status and occupancy
 * Returns: id, tableNumber, capacity, section, status, currentOrderId, guestCount
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

    if (!branchId) {
      throw new ValidationError('branchId is required')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Fetch all tables for the branch with their current orders
    const tables = await prisma.restaurantTable.findMany({
      where: {
        branchId: branchId,
        organizationId: tenantContext.organizationId,
        deletedAt: null,
      },
      orderBy: [
        { section: 'asc' },
        { tableNumber: 'asc' },
      ],
    })

    const formatted = tables.map((table) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      section: table.section,
      status: table.status,
    }))

    return NextResponse.json(successResponse({
      data: formatted,
      meta: {
        total: formatted.length,
      },
    }))
  } catch (error: any) {
    console.error('Error fetching POS tables:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'POS_TABLES_ERROR'),
      { status: 500 }
    )
  }
}
