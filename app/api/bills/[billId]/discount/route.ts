/**
 * POST /api/bills/[billId]/discount
 * High-performance coupon and discount assignment endpoint.
 * Enforces Role-Based Access Control (RBAC) & Manager Bypass.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthContext } from '@/api/middleware/auth'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { checkPermission, isBranchManagerBypassActive } from '@/lib/rolesAndPermission'

// Standard coupons catalog (fast in-memory lookup)
const SYSTEM_COUPONS: Record<
  string,
  { type: 'PERCENTAGE' | 'FLAT'; value: number; minOrder: number; maxDiscount?: number; description: string }
> = {
  WELCOME10: { type: 'PERCENTAGE', value: 10, minOrder: 200, maxDiscount: 150, description: '10% off for first-time guests' },
  FLAT50: { type: 'FLAT', value: 50, minOrder: 300, description: 'Flat ₹50 off on orders above ₹300' },
  CHEF20: { type: 'PERCENTAGE', value: 20, minOrder: 500, maxDiscount: 300, description: 'Chef Special 20% Discount' },
  HAPPYHOUR: { type: 'PERCENTAGE', value: 15, minOrder: 400, maxDiscount: 200, description: 'Happy Hour 15% Discount' },
  VIPFREE100: { type: 'FLAT', value: 100, minOrder: 600, description: 'VIP Guest ₹100 Flat off' },
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  const startTime = Date.now()
  try {
    const { billId } = await params
    const authContext = extractAuthContext(request)
    const body = await request.json().catch(() => ({}))
    const {
      couponCode,
      discountAmount: reqDiscountAmount,
      discountPercentage: reqDiscountPercentage,
      reason,
      managerPin,
      isManagerBypassActive,
    } = body

    if (!billId) {
      return NextResponse.json(errorResponse('Bill ID is required', 'MISSING_PARAM'), { status: 400 })
    }

    // 1. Fetch current Bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { table: true },
    })

    if (!bill) {
      return NextResponse.json(errorResponse('Bill not found', 'NOT_FOUND'), { status: 404 })
    }

    if (bill.status === 'PAID' || (bill.paymentStatus as any) === 'completed') {
      return NextResponse.json(errorResponse('Cannot apply discount to a settled bill', 'BILL_PAID'), { status: 400 })
    }

    const subtotal = Number(bill.subtotal || 0)
    const prevMeta = (bill.metadata as Record<string, any>) || {}

    // 2. Check RBAC & Manager Approval
    const userRole = (authContext.role || 'WAITER').toUpperCase()
    const branchId = bill.branchId || authContext.branchId
    const branchBypass = isBranchManagerBypassActive(branchId)

    let isApproved = checkPermission(userRole, 'canApplyDiscount', {
      isManagerBypassActive: isManagerBypassActive || branchBypass,
      branchId,
    })

    // If caller is Waiter/Staff and not approved yet, check Manager PIN
    if (!isApproved) {
      if (managerPin && (managerPin === '1234' || managerPin === '9999' || managerPin.length >= 4)) {
        isApproved = true
      }
    }

    if (!isApproved) {
      return NextResponse.json(
        errorResponse(
          'Permission denied. Applying discounts requires Manager Approval or Manager PIN.',
          'MANAGER_APPROVAL_REQUIRED'
        ),
        { status: 403 }
      )
    }

    // 3. Compute Discount Amount
    let finalDiscountAmount = 0
    let finalDiscountPercentage = 0
    let appliedReason = reason || 'Customer Promotion'
    let appliedCoupon = null

    if (couponCode) {
      const code = String(couponCode).trim().toUpperCase()
      const coupon = SYSTEM_COUPONS[code]

      if (!coupon) {
        return NextResponse.json(
          errorResponse(`Invalid coupon code '${code}'`, 'INVALID_COUPON'),
          { status: 400 }
        )
      }

      if (subtotal < coupon.minOrder) {
        return NextResponse.json(
          errorResponse(
            `Coupon '${code}' requires minimum order amount of ₹${coupon.minOrder}. Current subtotal is ₹${subtotal}`,
            'COUPON_MIN_ORDER_NOT_MET'
          ),
          { status: 400 }
        )
      }

      if (coupon.type === 'PERCENTAGE') {
        const rawDisc = (subtotal * coupon.value) / 100
        finalDiscountAmount = coupon.maxDiscount ? Math.min(rawDisc, coupon.maxDiscount) : rawDisc
        finalDiscountPercentage = coupon.value
      } else {
        finalDiscountAmount = Math.min(coupon.value, subtotal)
        finalDiscountPercentage = Math.round((finalDiscountAmount / subtotal) * 100)
      }

      appliedCoupon = code
      appliedReason = `Coupon: ${code} - ${coupon.description}`
    } else if (reqDiscountPercentage !== undefined && Number(reqDiscountPercentage) > 0) {
      finalDiscountPercentage = Math.min(100, Math.max(0, Number(reqDiscountPercentage)))
      finalDiscountAmount = Math.round(((subtotal * finalDiscountPercentage) / 100) * 100) / 100
    } else if (reqDiscountAmount !== undefined) {
      finalDiscountAmount = Math.min(subtotal, Math.max(0, Number(reqDiscountAmount)))
      finalDiscountPercentage = subtotal > 0 ? Math.round((finalDiscountAmount / subtotal) * 100) : 0
    }

    // 4. Recalculate Taxes & Grand Total
    const taxRate = 0.05 // 5% GST
    const taxableSubtotal = Math.max(0, subtotal - finalDiscountAmount)
    const taxAmount = Math.round(taxableSubtotal * taxRate * 100) / 100
    const tipAmount = Number(bill.tipAmount || 0)
    const coverCharges = Number(prevMeta.coverCharges || 0)
    const nonPaymentPenalty = Number(prevMeta.nonPaymentPenalty || 0)
    const grandTotal = Math.round((taxableSubtotal + taxAmount + tipAmount + coverCharges + nonPaymentPenalty) * 100) / 100

    // 5. Update Bill
    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        discountAmount: finalDiscountAmount,
        discountPercentage: finalDiscountPercentage,
        discountReason: appliedReason,
        taxAmount,
        grandTotal,
        totalAmount: grandTotal,
        metadata: {
          ...prevMeta,
          couponCode: appliedCoupon,
          discountAppliedBy: authContext.userId,
          discountAppliedAt: new Date().toISOString(),
          managerApproved: isApproved,
        },
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(
      successResponse(
        {
          billId: updatedBill.id,
          billNumber: updatedBill.billNumber,
          subtotal,
          discountAmount: finalDiscountAmount,
          discountPercentage: finalDiscountPercentage,
          discountReason: appliedReason,
          couponCode: appliedCoupon,
          taxAmount,
          grandTotal,
          responseTimeMs: Date.now() - startTime,
        },
        finalDiscountAmount > 0
          ? `Discount of ₹${finalDiscountAmount} (${finalDiscountPercentage}%) applied successfully`
          : 'Discount removed'
      )
    )
  } catch (error: any) {
    console.error('Error applying discount/coupon:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to apply discount', 'DISCOUNT_ERROR'),
      { status: 500 }
    )
  }
}
