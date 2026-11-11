/**
 * POST /api/pos/customers
 * Create a quick customer from POS
 * Required: phone
 * Optional: firstName, lastName, email
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, firstName, lastName, email } = body

    if (!phone) {
      throw new ValidationError('phone is required')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Check if customer already exists with this phone
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        organizationId: tenantContext.organizationId,
        phone: phone,
        deletedAt: null,
      },
    })

    if (existingCustomer) {
      return NextResponse.json(successResponse({
        id: existingCustomer.id,
        phone: existingCustomer.phone,
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        email: existingCustomer.email,
      }))
    }

    // Create new customer
    const newCustomer = await prisma.customer.create({
      data: {
        organizationId: tenantContext.organizationId,
        phone: phone,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
      },
    })

    return NextResponse.json(
      successResponse({
        id: newCustomer.id,
        phone: newCustomer.phone,
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating customer:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message, 'CUSTOMER_CREATE_ERROR'),
      { status: 500 }
    )
  }
}
