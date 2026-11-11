/**
 * POST /api/payments/razorpay/create-order
 * Create a Razorpay order for payment
 * 
 * Request body:
 * {
 *   billId: string,
 *   amount: number (in rupees)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'
import {
  createRazorpayOrder,
  rupeesToPaise,
  getRazorpayKeyId,
} from '@/lib/razorpay'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { billId, amount } = body

    // Validate
    if (!billId) throw new ValidationError('billId is required')
    if (!amount || amount <= 0) throw new ValidationError('amount must be positive')

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Fetch the bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    })

    if (!bill) {
      throw new ValidationError('Bill not found')
    }

    // Validate amount doesn't exceed balance
    if (amount > Number(bill.balanceDue)) {
      throw new ValidationError(
        `Payment amount cannot exceed balance due (₹${Number(bill.balanceDue)})`
      )
    }

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount: rupeesToPaise(amount),
      currency: 'INR',
      receipt: bill.billNumber,
      notes: {
        bill_id: billId,
        order_id: bill.orderId || '',
        branch_id: bill.branchId,
        organization_id: tenantContext.organizationId,
      },
    })

    // Store the Razorpay order ID in database for tracking
    await prisma.payment.create({
      data: {
        organizationId: tenantContext.organizationId,
        billId: bill.id,
        orderId: bill.orderId || null,
        customerId: bill.customerId || null,
        amount: bill.totalAmount, // Will be updated after successful payment
        paymentMethod: 'online_payment',
        paymentStatus: 'pending',
        referenceNumber: razorpayOrder.id,
        transactionId: null,
        notes: `Razorpay order created. Amount: ₹${amount}`,
      },
    })

    return NextResponse.json(
      successResponse({
        razorpayOrderId: razorpayOrder.id,
        razorpayKey: getRazorpayKeyId(),
        amount: amount,
        currency: 'INR',
        billId: billId,
        billNumber: bill.billNumber,
        prefill: {
          name: (authContext as any).userName || '',
          email: '',
          contact: '',
        },
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(
        error.message || 'Failed to create Razorpay order',
        'RAZORPAY_ORDER_ERROR'
      ),
      { status: 500 }
    )
  }
}
