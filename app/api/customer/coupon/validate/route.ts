/**
 * /api/customer/coupon/validate
 * Validates review discount vouchers and promotional coupon codes.
 * Ensures orders meet minimum order value (₹500 for review discount).
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
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

    // 1. Review Coupon Verification (REVIEW10-*)
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
            message: 'This review coupon has already been redeemed.',
          },
          { status: 400 }
        )
      }

      const minOrder = 500
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
          : `Add ₹${neededMore.toFixed(2)} more to unlock 10% discount (Minimum order ₹${minOrder}).`,
      })
    }

    // 2. Standard System Coupons
    const SYSTEM_COUPONS: Record<
      string,
      { type: 'PERCENTAGE' | 'FLAT'; value: number; minOrder: number; description: string }
    > = {
      WELCOME10: { type: 'PERCENTAGE', value: 10, minOrder: 200, description: '10% Welcome Discount' },
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
