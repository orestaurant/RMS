/**
 * POST /api/payments
 * Record a payment for a bill
 * 
 * Request body:
 * {
 *   billId: string,
 *   amount: number,
 *   paymentMethod: 'cash' | 'card' | 'upi' | 'online_payment' | 'wallet',
 *   referenceNumber?: string,
 *   transactionId?: string,
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      billId,
      amount,
      paymentMethod,
      referenceNumber,
      transactionId,
      notes,
    } = body

    // Validate required fields
    if (!billId) throw new ValidationError('billId is required')
    if (!amount || amount <= 0) throw new ValidationError('amount must be positive')
    if (!paymentMethod) throw new ValidationError('paymentMethod is required')

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Fetch the bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    })

    if (!bill) {
      throw new ValidationError('Bill not found')
    }

    // Validate payment amount doesn't exceed balance
    if (new Prisma.Decimal(amount).gt(bill.balanceDue)) {
      throw new ValidationError(
        `Payment amount cannot exceed balance due (₹${Number(bill.balanceDue)})`
      )
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        organizationId: tenantContext.organizationId,
        billId,
        orderId: bill.orderId || null,
        customerId: bill.customerId || null,
        amount: new Prisma.Decimal(amount),
        paymentMethod: paymentMethod as any,
        paymentStatus: 'completed',
        referenceNumber: referenceNumber || null,
        transactionId: transactionId || null,
        receivedById: authContext.userId,
        notes: notes || null,
      },
    })

    // Update bill with payment
    const newAmountPaid = bill.amountPaid.plus(new Prisma.Decimal(amount))
    const newBalanceDue = bill.balanceDue.minus(new Prisma.Decimal(amount))
    const isFullyPaid = newBalanceDue.lte(new Prisma.Decimal(0))

    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        paymentStatus: isFullyPaid ? 'completed' : 'pending',
        billStatus: isFullyPaid ? 'paid' : 'open',
        settledAt: isFullyPaid ? new Date() : null,
        settledById: isFullyPaid ? authContext.userId : null,
      },
    })

    // Update order payment status if bill is fully paid
    if (isFullyPaid && bill.orderId) {
      await prisma.order.update({
        where: { id: bill.orderId },
        data: {
          paymentStatus: 'completed',
        },
      })
    }

    return NextResponse.json(
      successResponse({
        paymentId: payment.id,
        amount: Number(payment.amount),
        billStatus: updatedBill.billStatus,
        amountPaid: Number(updatedBill.amountPaid),
        balanceDue: Number(updatedBill.balanceDue),
        isFullyPaid,
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error recording payment:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(
        error.message || 'Failed to record payment',
        'PAYMENT_ERROR'
      ),
      { status: 500 }
    )
  }
}
