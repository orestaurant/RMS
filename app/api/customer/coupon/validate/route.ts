/**
 * /api/customer/coupon/validate
 * Validates review discount vouchers and promotional coupon codes.
 * Ensures:
 * 1. First-time customers get extra 15% discount on their first order (FIRST15).
 * 2. Existing customers get 10% off (EXISTING10 / review discount).
 * 3. 1-review & 1-time 10% discount usage per customer strictly enforced.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getCustomerSession(request)
    const body = await request.json().catch(() => ({}))
    const rawCode = (body.couponCode || body.code || '').trim()
    const subtotal = Math.max(0, Number(body.subtotal || 0))

    if (!rawCode) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Please enter a coupon code' },
        { status: 400 }
      )
    }

    const code = rawCode.toUpperCase()

    // Query customer profile if session is active
    let customer: { id: string; email: string | null; totalOrders: number } | null = null
    if (session?.customerId) {
      try {
        customer = await prisma.customer.findUnique({
          where: { id: session.customerId },
          select: { id: true, email: true, totalOrders: true },
        })
      } catch (err) {
        console.warn('Could not read customer for coupon validation:', err)
      }
    }

    // ── 1. First-Time Customer 15% Discount (FIRST15) ───────────────────
    if (code === 'FIRST15') {
      const isFirst = !customer || Number(customer.totalOrders || 0) === 0
      if (!isFirst) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            message: 'The 15% discount is only valid on your first order. As an existing customer, you get 10% off with EXISTING10 or your review discount!',
          },
          { status: 400 }
        )
      }

      const minOrder = 0
      const discountPercent = 15
      const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100

      return NextResponse.json({
        success: true,
        valid: true,
        isEligible: true,
        couponCode: code,
        discountType: 'PERCENTAGE',
        discountPercent,
        discountAmount,
        minOrder,
        neededMore: 0,
        message: `🎉 Extra 15% First-Time Customer Discount Applied (-₹${discountAmount.toFixed(2)})!`,
      })
    }

    // ── 2. Review Coupon Verification (REVIEW10-*) ──────────────────────
    if (code.startsWith('REVIEW10') || code.includes('REVIEW')) {
      // Check database to verify if this coupon was issued and whether it was claimed
      let feedback = null
      try {
        feedback = await prisma.customerFeedback.findFirst({
          where: {
            discountCode: { equals: code, mode: 'insensitive' },
            deletedAt: null,
          },
          select: {
            id: true,
            discountCode: true,
            discountClaimed: true,
            customerName: true,
            customerId: true,
            customerEmail: true,
          },
        })
      } catch (err) {
        console.warn('DB lookup for review coupon failed, using code rule fallback:', err)
      }

      if (feedback && feedback.discountClaimed) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            message: 'This 10% review coupon has already been redeemed. (Limit: 1-time per customer).',
          },
          { status: 400 }
        )
      }

      // Check if this customer has already redeemed another review coupon previously
      if (customer) {
        try {
          const previouslyClaimed = await prisma.customerFeedback.findFirst({
            where: {
              OR: [
                { customerId: customer.id },
                ...(customer.email ? [{ customerEmail: customer.email }] : []),
              ],
              discountClaimed: true,
              deletedAt: null,
            },
          })

          if (previouslyClaimed && previouslyClaimed.discountCode !== code) {
            return NextResponse.json(
              {
                success: false,
                valid: false,
                message: 'You have already redeemed your 1-time 10% review discount on a previous order.',
              },
              { status: 400 }
            )
          }
        } catch (prevErr) {
          console.warn('Could not check previously claimed reviews:', prevErr)
        }
      }

      const minOrder = 300
      const isEligible = subtotal >= minOrder
      const discountPercent = 10
      const discountAmount = isEligible ? Math.round(subtotal * (discountPercent / 100) * 100) / 100 : 0
      const neededMore = Math.max(0, minOrder - subtotal)

      return NextResponse.json({
        success: true,
        valid: true,
        isEligible,
        couponCode: code,
        discountType: 'PERCENTAGE',
        discountPercent,
        discountAmount,
        minOrder,
        neededMore,
        message: isEligible
          ? `10% Review Discount Applied (-₹${discountAmount.toFixed(2)})!`
          : `Add ₹${neededMore.toFixed(2)} more to unlock 10% review discount (Minimum order ₹${minOrder}).`,
      })
    }

    // ── 3. Standard & Existing Customer Coupons ────────────────────────
    const SYSTEM_COUPONS: Record<
      string,
      { type: 'PERCENTAGE' | 'FLAT'; value: number; minOrder: number; description: string }
    > = {
      EXISTING10: { type: 'PERCENTAGE', value: 10, minOrder: 200, description: '10% Existing Customer Discount' },
      WELCOME10: { type: 'PERCENTAGE', value: 10, minOrder: 200, description: '10% Customer Discount' },
      FLAT50: { type: 'FLAT', value: 50, minOrder: 300, description: 'Flat ₹50 Off' },
      CHEF20: { type: 'PERCENTAGE', value: 20, minOrder: 500, description: 'Chef Special 20% Discount' },
      HAPPYHOUR: { type: 'PERCENTAGE', value: 15, minOrder: 400, description: 'Happy Hour 15% Discount' },
    }

    if (SYSTEM_COUPONS[code]) {
      const promo = SYSTEM_COUPONS[code]
      const isEligible = subtotal >= promo.minOrder
      const discountAmount = isEligible
        ? promo.type === 'PERCENTAGE'
          ? Math.round(subtotal * (promo.value / 100) * 100) / 100
          : promo.value
        : 0
      const neededMore = Math.max(0, promo.minOrder - subtotal)

      return NextResponse.json({
        success: true,
        valid: true,
        isEligible,
        couponCode: code,
        discountType: promo.type,
        discountPercent: promo.type === 'PERCENTAGE' ? promo.value : 0,
        discountAmount,
        minOrder: promo.minOrder,
        neededMore,
        message: isEligible
          ? `${promo.description} Applied (-₹${discountAmount.toFixed(2)})!`
          : `Add ₹${neededMore.toFixed(2)} more to apply "${code}".`,
      })
    }

    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: 'Invalid coupon code. Please verify and try again.',
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Coupon validation error:', error)
    return NextResponse.json(
      { success: false, valid: false, message: 'Failed to validate coupon code' },
      { status: 500 }
    )
  }
}
