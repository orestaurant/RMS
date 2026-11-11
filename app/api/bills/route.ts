/**
 * POST /api/bills
 * Create a bill from an order
 * 
 * Request body:
 * {
 *   orderId: string,
 *   discount?: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

const prisma = new PrismaClient()

async function generateBillNumber(
  branchId: string,
  organizationId: string
): Promise<string> {
  const today = new Date()
  const date = today.toISOString().split('T')[0].replace(/-/g, '')

  const count = await prisma.bill.count({
    where: {
      branchId,
      organizationId,
      createdAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    },
  })

  return `BILL-${date}-${String(count + 1).padStart(4, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, discount } = body

    if (!orderId) {
      throw new ValidationError('orderId is required')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    })

    if (!order) {
      throw new ValidationError('Order not found')
    }

    // Generate bill number
    const billNumber = await generateBillNumber(
      order.branchId,
      tenantContext.organizationId
    )

    // Create bill with items from order
    const bill = await prisma.bill.create({
      data: {
        organizationId: tenantContext.organizationId,
        branchId: order.branchId,
        restaurantId: order.restaurantId,
        billNumber,
        billType: order.orderType as any,
        orderId: order.id,
        customerId: order.customerId || null,
        tableId: order.tableId || null,
        subtotal: order.subtotal,
        discountAmount: discount ? new Prisma.Decimal(discount) : order.discountAmount,
        taxAmount: order.taxAmount,
        serviceCharge: order.serviceCharge,
        totalAmount:
          order.subtotal.minus(discount ? new Prisma.Decimal(discount) : order.discountAmount).plus(order.taxAmount).plus(order.serviceCharge),
        amountPaid: new Prisma.Decimal(0),
        balanceDue:
          order.subtotal.minus(discount ? new Prisma.Decimal(discount) : order.discountAmount).plus(order.taxAmount).plus(order.serviceCharge),
        paymentStatus: 'pending',
        billStatus: 'open',
        createdById: authContext.userId,
        // Create bill items from order items
        items: {
          create: order.items.map((item) => ({
            menuItemId: item.menuItemId,
            organizationId: tenantContext.organizationId,
            itemName: item.itemName,
            basePrice: item.basePrice,
            quantity: item.quantity,
            itemTotal: item.itemTotal,
            taxAmount: item.itemTotal.mul(new Prisma.Decimal('0.05')), // 5% GST
            lineTotal: item.itemTotal.mul(new Prisma.Decimal('1.05')),
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(
      successResponse({
        id: bill.id,
        billNumber: bill.billNumber,
        totalAmount: Number(bill.totalAmount),
        balanceDue: Number(bill.balanceDue),
        paymentStatus: bill.paymentStatus,
        itemCount: bill.items.length,
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating bill:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message || 'Failed to create bill', 'BILL_CREATE_ERROR'),
      { status: 500 }
    )
  }
}
