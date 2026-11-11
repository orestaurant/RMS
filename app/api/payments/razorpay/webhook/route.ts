/**
 * POST /api/payments/razorpay/webhook
 * Razorpay webhook for payment events
 * Verify and process payment status updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function verifyWebhookSignature(body: string, signature: string): boolean {
  const keySecret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!keySecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature')
    const body = await request.text()

    if (!signature) {
      console.error('Missing Razorpay signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid Razorpay webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)

    // Handle different webhook events
    switch (event.event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(event.payload.payment.entity)
        break

      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity)
        break

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity)
        break

      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity)
        break

      default:
        console.log(`Unhandled webhook event: ${event.event}`)
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error: any) {
    console.error('Error processing Razorpay webhook:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function handlePaymentAuthorized(payment: any) {
  console.log(`Payment authorized: ${payment.id}`)

  // Update payment record if exists
  await prisma.payment.updateMany({
    where: {
      transactionId: payment.id,
    },
    data: {
      paymentStatus: 'completed',
    },
  })
}

async function handlePaymentCaptured(payment: any) {
  console.log(`Payment captured: ${payment.id}`)

  const razorpayOrderId = payment.order_id
  const paymentAmount = payment.amount / 100 // Convert from paise to rupees

  // Find payment by reference number (Razorpay order ID)
  const existingPayment = await prisma.payment.findFirst({
    where: {
      referenceNumber: razorpayOrderId,
    },
    include: {
      bill: true,
    },
  })

  if (existingPayment && existingPayment.bill) {
    const bill = existingPayment.bill

    // Update payment
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        transactionId: payment.id,
        paymentStatus: 'completed',
        amount: new Prisma.Decimal(paymentAmount),
      },
    })

    // Update bill
    const newAmountPaid = bill.amountPaid.plus(new Prisma.Decimal(paymentAmount))
    const newBalanceDue = bill.balanceDue.minus(new Prisma.Decimal(paymentAmount))
    const isFullyPaid = newBalanceDue.lte(new Prisma.Decimal(0))

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: isFullyPaid ? new Prisma.Decimal(0) : newBalanceDue,
        paymentStatus: isFullyPaid ? 'completed' : 'pending',
        billStatus: isFullyPaid ? 'paid' : 'open',
      },
    })

    // Update order if fully paid
    if (isFullyPaid && bill.orderId) {
      await prisma.order.update({
        where: { id: bill.orderId },
        data: { paymentStatus: 'completed' },
      })
    }
  }
}

async function handlePaymentFailed(payment: any) {
  console.log(`Payment failed: ${payment.id}`)

  // Update payment record
  await prisma.payment.updateMany({
    where: {
      transactionId: payment.id,
    },
    data: {
      paymentStatus: 'failed',
    },
  })
}

async function handleOrderPaid(order: any) {
  console.log(`Order paid: ${order.id}`)

  // Find and update related bills
  const bills = await prisma.bill.findMany({
    where: {
      metadata: {
        path: ['razorpay_order_id'],
        equals: order.id,
      },
    },
  })

  for (const bill of bills) {
    if (bill.orderId) {
      await prisma.order.update({
        where: { id: bill.orderId },
        data: { paymentStatus: 'completed' },
      })
    }
  }
}
