/**
 * GET & PATCH /api/bills/[billId]
 * Retrieve full itemized bill & update discounts/notes prior to settlement
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        items: true,
        table: true,
        waiter: {
          select: { id: true, name: true, firstName: true, lastName: true, phone: true },
        },
        tip: true,
        orders: {
          include: {
            items: true,
          },
        },
      },
    })

    if (!bill) {
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 })
    }

    const subtotal = Number(bill.subtotal || 0)
    const taxAmount = Number(bill.taxAmount || 0)
    const discountAmount = Number(bill.discountAmount || 0)
    const tipAmount = Number(bill.tipAmount || 0)
    const grandTotal = Number(bill.grandTotal || subtotal + taxAmount - discountAmount + tipAmount)

    return NextResponse.json({
      success: true,
      data: {
        id: bill.id,
        billNumber: bill.billNumber,
        status: bill.status || 'GENERATED',
        billStatus: bill.billStatus,
        paymentStatus: bill.paymentStatus,
        paymentMethod: bill.paymentMethod || 'CASH',
        tableId: bill.tableId,
        tableNumber: bill.table?.tableNumber || 'Table',
        customerName: bill.customerName || 'Guest',
        customerPhone: bill.customerPhone || '',
        subtotal,
        taxAmount,
        discountAmount,
        tipAmount,
        grandTotal,
        paidAt: bill.paidAt ? bill.paidAt.toISOString() : null,
        createdAt: bill.createdAt.toISOString(),
        waiter: bill.waiter
          ? {
              id: bill.waiter.id,
              name: bill.waiter.name || `${bill.waiter.firstName || ''} ${bill.waiter.lastName || ''}`.trim() || 'Waiter',
              phone: bill.waiter.phone || '',
            }
          : null,
        tip: bill.tip
          ? {
              id: bill.tip.id,
              amount: Number(bill.tip.amount),
              status: bill.tip.status,
            }
          : null,
        items: bill.items.map((it) => ({
          id: it.id,
          name: it.itemName,
          quantity: it.quantity,
          price: Number(it.basePrice),
          total: Number(it.itemTotal),
        })),
      },
    })
  } catch (error: any) {
    console.error('Error fetching single bill:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch bill' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params
    const body = await request.json().catch(() => ({}))
    const { discountAmount, customerName, customerPhone } = body

    const existing = await prisma.bill.findUnique({
      where: { id: billId },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 })
    }

    if (existing.status === 'PAID') {
      return NextResponse.json({ success: false, message: 'Cannot edit a paid bill' }, { status: 400 })
    }

    const subtotal = Number(existing.subtotal || 0)
    const currentDiscount =
      discountAmount !== undefined ? Math.max(0, Number(discountAmount)) : Number(existing.discountAmount || 0)
    const taxPercentage = 0.05
    const taxable = Math.max(0, subtotal - currentDiscount)
    const taxAmount = Math.round(taxable * taxPercentage * 100) / 100
    const tipAmount = Number(existing.tipAmount || 0)
    const grandTotal = Math.round((taxable + taxAmount + tipAmount) * 100) / 100

    const updated = await prisma.bill.update({
      where: { id: billId },
      data: {
        discountAmount: currentDiscount,
        taxAmount,
        grandTotal,
        totalAmount: grandTotal,
        ...(customerName !== undefined ? { customerName } : {}),
        ...(customerPhone !== undefined ? { customerPhone } : {}),
      },
      include: {
        items: true,
        table: true,
        waiter: true,
        tip: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Bill updated successfully',
      data: {
        ...updated,
        subtotal: Number(updated.subtotal),
        taxAmount: Number(updated.taxAmount),
        discountAmount: Number(updated.discountAmount),
        tipAmount: Number(updated.tipAmount),
        grandTotal: Number(updated.grandTotal),
      },
    })
  } catch (error: any) {
    console.error('Error updating bill:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update bill' },
      { status: 500 }
    )
  }
}

