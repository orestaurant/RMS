/**
 * POST /api/bills/[billId]/pay
 * Complete bill payment, settle tips, complete table orders, and free table
 * Atomic transaction with non-blocking WhatsApp & Notification dispatches
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { addNotification } from '@/lib/notifications-store'
import { logCommunication } from '@/lib/communication-ledger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params
    const body = await request.json().catch(() => ({}))
    const {
      paymentMethod = 'CASH', // 'CASH' | 'UPI' | 'CARD' | 'WALLET' | 'WHATSAPP_LINK'
      customerPhone,
      customerName,
      discountAmount,
    } = body

    const existing = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        table: true,
        waiter: true,
        orders: true,
        tip: true,
        items: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Bill record not found' },
        { status: 404 }
      )
    }

    if (existing.status === 'PAID' && existing.paymentStatus === 'completed') {
      return NextResponse.json(
        { success: false, message: `Bill #${existing.billNumber} has already been marked as PAID.` },
        { status: 400 }
      )
    }

    const subtotal = Number(existing.subtotal || 0)
    const taxAmount = Number(existing.taxAmount || 0)
    const tipAmount = Number(existing.tipAmount || 0)
    const currentDiscount =
      discountAmount !== undefined ? Math.max(0, Number(discountAmount)) : Number(existing.discountAmount || 0)
    const grandTotal = Math.round((subtotal + taxAmount - currentDiscount + tipAmount) * 100) / 100

    const now = new Date()
    const methodStr = String(paymentMethod).toUpperCase()

    // Map to PaymentMethodEnum if applicable
    let mappedMethodEnum: any = 'cash'
    if (methodStr === 'UPI' || methodStr === 'WHATSAPP_LINK') mappedMethodEnum = 'upi'
    else if (methodStr === 'CARD') mappedMethodEnum = 'card'
    else if (methodStr === 'WALLET') mappedMethodEnum = 'wallet'

    // Execute atomic transaction
    const [updatedBill] = await prisma.$transaction([
      // 1. Mark Bill as PAID
      prisma.bill.update({
        where: { id: existing.id },
        data: {
          status: 'PAID',
          billStatus: 'settled',
          paymentStatus: 'completed',
          paymentMethod: methodStr,
          discountAmount: currentDiscount,
          grandTotal,
          totalAmount: grandTotal,
          amountPaid: grandTotal,
          balanceDue: 0,
          paidAt: now,
          settledAt: now,
          customerPhone: customerPhone || existing.customerPhone,
          customerName: customerName || existing.customerName,
        },
        include: {
          table: true,
          waiter: true,
          tip: true,
          items: true,
        },
      }),

      // 2. Mark linked and table orders as completed/billed
      prisma.order.updateMany({
        where: {
          OR: [
            { billId: existing.id },
            ...(existing.tableId ? [{ tableId: existing.tableId }] : []),
          ],
          deletedAt: null,
          status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] },
        },
        data: {
          isBilled: true,
          paymentStatus: 'completed',
          status: 'completed',
        },
      }),

      // 3. Settle Tip record if waiter exists and tip > 0
      ...(tipAmount > 0 && existing.waiterId
        ? [
            prisma.tip.upsert({
              where: { billId: existing.id },
              create: {
                billId: existing.id,
                waiterId: existing.waiterId,
                restaurantId: existing.restaurantId,
                branchId: existing.branchId,
                organizationId: existing.organizationId,
                amount: tipAmount,
                status: 'SETTLED',
              },
              update: {
                amount: tipAmount,
                status: 'SETTLED',
              },
            }),
          ]
        : []),

      // 4. Reset table status to 'available'
      ...(existing.tableId
        ? [
            prisma.restaurantTable.update({
              where: { id: existing.tableId },
              data: {
                status: 'available',
              },
            }),
          ]
        : []),
    ])

    // Record formal Payment entry if bill has organizationId
    try {
      if (existing.organizationId) {
        await prisma.payment.create({
          data: {
            billId: existing.id,
            organizationId: existing.organizationId,
            amount: grandTotal,
            paymentMethod: mappedMethodEnum,
            paymentStatus: 'completed',
            referenceNumber: `PAY-${Date.now().toString().slice(-6)}`,
          },
        })
      }
    } catch (payErr) {
      console.warn('Payment record create warning:', payErr)
    }

    // Post-payment Side Effects (Non-blocking try/catch)
    const tableNumber = existing.table?.tableNumber || 'Table'
    const waiterName =
      existing.waiter?.name ||
      `${existing.waiter?.firstName || ''} ${existing.waiter?.lastName || ''}`.trim() ||
      'Staff'
    const waiterPhone = existing.waiter?.phone

    try {
      // 1. Digital Bill / Payment confirmation to Customer
      const finalCustomerPhone = customerPhone || existing.customerPhone
      if (finalCustomerPhone) {
        logCommunication({
          recipientName: customerName || existing.customerName || 'Valued Guest',
          recipientPhone: finalCustomerPhone,
          channel: 'whatsapp',
          event: 'payment_receipt',
          tableNumber,
          orderNumber: existing.billNumber,
          message: `Dear Guest, thank you for dining at Spice Garden! Payment of ₹${grandTotal.toFixed(2)} received via ${methodStr}. Invoice #${existing.billNumber} settled. Hope to serve you again!`,
          status: 'delivered',
          cost: 0.15,
        })
      }

      // 2. Instant Tip Alert to Waiter's phone if tip was given
      if (tipAmount > 0) {
        if (waiterPhone) {
          logCommunication({
            recipientName: waiterName,
            recipientPhone: waiterPhone,
            channel: 'whatsapp',
            event: 'payment_receipt',
            tableNumber,
            message: `🎉 Great job! You received a ₹${tipAmount.toFixed(2)} tip from ${tableNumber}! Total bill: ₹${grandTotal.toFixed(2)}.`,
            status: 'delivered',
            cost: 0.15,
          })
        }

        // Live dashboard in-app notification
        addNotification({
          type: 'payment_received',
          title: `💰 Tip Settled: ₹${tipAmount} for ${waiterName}`,
          body: `${waiterName} received a ₹${tipAmount} tip from ${tableNumber} on Bill #${existing.billNumber}.`,
          metadata: {
            tableNumber,
            billNumber: existing.billNumber,
            amount: tipAmount,
          },
        })
      }

      // General paid notification for Cashier
      addNotification({
        type: 'payment_received',
        title: `✅ Bill #${existing.billNumber} Paid`,
        body: `${tableNumber} — ₹${grandTotal} paid via ${methodStr}. Table is now Available.`,
        metadata: {
          tableNumber,
          billNumber: existing.billNumber,
          amount: grandTotal,
        },
      })
    } catch (sideEffectErr) {
      console.warn('Post-payment notification dispatch warning:', sideEffectErr)
    }

    return NextResponse.json({
      success: true,
      message: `Bill #${existing.billNumber} paid successfully via ${methodStr}. ${tableNumber} is now Available.`,
      data: {
        bill: {
          ...updatedBill,
          subtotal: Number(updatedBill.subtotal),
          taxAmount: Number(updatedBill.taxAmount),
          discountAmount: Number(updatedBill.discountAmount),
          tipAmount: Number(updatedBill.tipAmount),
          grandTotal: Number(updatedBill.grandTotal),
        },
      },
    })
  } catch (error: any) {
    console.error('Error in /api/bills/[billId]/pay:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Payment processing failed' },
      { status: 500 }
    )
  }
}

