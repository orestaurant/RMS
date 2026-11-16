/**
 * PATCH /api/bills/[billId]/tip
 * High-Speed Waiter Tipping Engine
 * Batched atomic transaction and sub-100ms response time
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params
    const body = await request.json().catch(() => ({}))
    const { tipAmount, waiterId: reqWaiterId } = body

    if (tipAmount === undefined || tipAmount === null || isNaN(Number(tipAmount))) {
      return NextResponse.json(
        { success: false, message: 'Valid tipAmount is required' },
        { status: 400 }
      )
    }

    const tipVal = Math.max(0, Number(tipAmount))

    // 1. Fetch Bill with Waiter and Orders in ONE lean query (< 1 round-trip)
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      select: {
        id: true,
        billNumber: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        taxAmount: true,
        discountAmount: true,
        tipAmount: true,
        grandTotal: true,
        restaurantId: true,
        branchId: true,
        organizationId: true,
        tableId: true,
        waiterId: true,
        waiter: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        orders: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
            servedById: true,
          },
        },
      },
    })

    if (!bill) {
      return NextResponse.json(
        { success: false, message: 'Bill not found' },
        { status: 404 }
      )
    }

    // 2. Bill Must Not Be Already Paid
    const statusUpper = String(bill.status || '').toUpperCase()
    const payStatusLower = String(bill.paymentStatus || '').toLowerCase()
    if (statusUpper === 'PAID' || payStatusLower === 'completed') {
      return NextResponse.json(
        { success: false, message: 'Cannot modify tip on an already paid bill.' },
        { status: 400 }
      )
    }

    // 3. Validation Rule: Tip unlocks once food is served
    const hasServedOrder = bill.orders.some((ord) => {
      const s = String(ord.status || '').toLowerCase()
      return s === 'served' || s === 'ready' || s === 'delivered' || s === 'completed'
    })

    if (!hasServedOrder && bill.orders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post-service tipping unlocks once at least one dish is served to your table.',
        },
        { status: 400 }
      )
    }

    // Determine waiter ID
    let finalWaiterId = reqWaiterId || bill.waiterId
    if (!finalWaiterId) {
      for (const ord of bill.orders) {
        if (ord.servedById) {
          finalWaiterId = ord.servedById
          break
        }
      }
    }

    // 4. Recalculate Grand Total (Tip is NOT taxed)
    const subtotal = Number(bill.subtotal || 0)
    const taxAmount = Number(bill.taxAmount || 0)
    const discountAmount = Number(bill.discountAmount || 0)
    const grandTotal = Math.round((subtotal + taxAmount - discountAmount + tipVal) * 100) / 100

    // 5. Update Bill & Tip Record in a SINGLE Atomic Database Transaction (< 1 round-trip)
    const txOps: any[] = [
      prisma.bill.update({
        where: { id: bill.id },
        data: {
          tipAmount: tipVal,
          grandTotal,
          totalAmount: grandTotal,
          ...(finalWaiterId ? { waiterId: finalWaiterId } : {}),
        },
        select: {
          id: true,
          billNumber: true,
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          tipAmount: true,
          grandTotal: true,
          waiter: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]

    if (finalWaiterId && bill.organizationId) {
      txOps.push(
        prisma.tip.upsert({
          where: { billId: bill.id },
          create: {
            billId: bill.id,
            waiterId: finalWaiterId,
            restaurantId: bill.restaurantId,
            branchId: bill.branchId,
            organizationId: bill.organizationId,
            amount: tipVal,
            status: 'PENDING',
          },
          update: {
            amount: tipVal,
            waiterId: finalWaiterId,
            status: 'PENDING',
          },
        })
      )
    }

    const [updatedBill, tipRecord] = await prisma.$transaction(txOps)

    return NextResponse.json({
      success: true,
      message: tipVal > 0 ? `Tip of ₹${tipVal} applied!` : 'Tip removed.',
      data: {
        bill: {
          id: updatedBill.id,
          billNumber: updatedBill.billNumber,
          subtotal: Number(updatedBill.subtotal),
          taxAmount: Number(updatedBill.taxAmount),
          discountAmount: Number(updatedBill.discountAmount),
          tipAmount: Number(updatedBill.tipAmount),
          grandTotal: Number(updatedBill.grandTotal),
          waiter: updatedBill.waiter
            ? {
                id: updatedBill.waiter.id,
                name: updatedBill.waiter.name || `${updatedBill.waiter.firstName || ''} ${updatedBill.waiter.lastName || ''}`.trim() || 'Waiter',
              }
            : null,
        },
        tip: tipRecord
          ? {
              id: tipRecord.id,
              amount: Number(tipRecord.amount),
              status: tipRecord.status,
              waiterId: tipRecord.waiterId,
            }
          : null,
      },
    })
  } catch (error: any) {
    console.error('Error in /api/bills/[billId]/tip:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update tip' },
      { status: 500 }
    )
  }
}

