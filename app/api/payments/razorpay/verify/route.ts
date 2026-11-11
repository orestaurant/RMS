/**
 * POST /api/payments/razorpay/verify
 * Verify Razorpay payment and update bill status
 * 
 * Request body:
 * {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string,
 *   billId: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'
import {
  verifyRazorpaySignature,
  fetchRazorpayPayment,
  paiseToRupees,
} from '@/lib/razorpay'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      billId,
    } = body

    // Validate
    if (!razorpay_order_id) throw new ValidationError('razorpay_order_id is required')
    if (!razorpay_payment_id) throw new ValidationError('razorpay_payment_id is required')
    if (!razorpay_signature) throw new ValidationError('razorpay_signature is required')
    if (!billId) throw new ValidationError('billId is required')

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Verify Razorpay signature
    const isSignatureValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    if (!isSignatureValid) {
      throw new ValidationError('Invalid Razorpay signature - payment verification failed')
    }

    // Fetch payment details from Razorpay
    const razorpayPayment = await fetchRazorpayPayment(razorpay_payment_id)

    if (razorpayPayment.status !== 'captured') {
      throw new ValidationError(
        `Payment status is ${razorpayPayment.status}, expected 'captured'`
      )
    }

    // Fetch the bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    })

    if (!bill) {
      throw new ValidationError('Bill not found')
    }

    // Calculate payment amount
    const paymentAmount = paiseToRupees(razorpayPayment.amount)

    // Validate amount matches
    if (paymentAmount > Number(bill.balanceDue)) {
      throw new ValidationError(
        'Payment amount exceeds balance due'
      )
    }

    // Update or create payment record
    const existingPayment = await prisma.payment.findFirst({
      where: {
        referenceNumber: razorpay_order_id,
        billId: billId,
      },
    })

    let payment
    if (existingPayment) {
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount: new Prisma.Decimal(paymentAmount),
          transactionId: razorpay_payment_id,
          paymentStatus: 'completed',
        },
      })
    } else {
      payment = await prisma.payment.create({
        data: {
          organizationId: tenantContext.organizationId,
          billId: bill.id,
          orderId: bill.orderId || null,
          customerId: bill.customerId || null,
          amount: new Prisma.Decimal(paymentAmount),
          paymentMethod: 'online_payment',
          paymentStatus: 'completed',
          referenceNumber: razorpay_order_id,
          transactionId: razorpay_payment_id,
          receivedById: authContext.userId,
        },
      })
    }

    // Update bill with payment
    const newAmountPaid = bill.amountPaid.plus(new Prisma.Decimal(paymentAmount))
    const newBalanceDue = bill.balanceDue.minus(new Prisma.Decimal(paymentAmount))
    const isFullyPaid = newBalanceDue.lte(new Prisma.Decimal(0))

    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: isFullyPaid ? new Prisma.Decimal(0) : newBalanceDue,
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
        transactionId: razorpay_payment_id,
        billStatus: updatedBill.billStatus,
        amountPaid: Number(updatedBill.amountPaid),
        balanceDue: Number(updatedBill.balanceDue),
        isFullyPaid,
      }),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(
        error.message || 'Failed to verify Razorpay payment',
        'RAZORPAY_VERIFY_ERROR'
      ),
      { status: 500 }
    )
  }
}
