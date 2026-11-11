/**
 * GET /api/pos/customers/search?query=<phoneOrName>
 * Search customers by phone number or name
 * Returns: array of matching customers with id, phone, firstName, lastName, email
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
    const query = request.nextUrl.searchParams.get('query')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(successResponse({
        data: [],
        meta: { total: 0 },
      }))
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Search customers by phone or name
    const customers = await prisma.customer.findMany({
      where: {
        organizationId: tenantContext.organizationId,
        deletedAt: null,
        OR: [
          { phone: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      take: 10,
    })

    return NextResponse.json(successResponse({
      data: customers,
      meta: { total: customers.length },
    }))
  } catch (error: any) {
    console.error('Error searching customers:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'CUSTOMER_SEARCH_ERROR'),
      { status: 500 }
    )
  }
}
