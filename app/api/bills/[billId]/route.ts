/**
 * GET, PATCH & DELETE /api/bills/[billId]
 * Retrieve full itemized bill, update discounts/notes, and soft-delete/cancel invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { removeFallbackOrder, updateFallbackOrder, invalidateLiveOrdersCache, invalidateKDSCache } from '@/lib/kds-utils'
import { removeMemoryBill } from '@/app/api/bills/route'

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params

    if (!billId) {
      return NextResponse.json({ success: false, message: 'Bill identifier is required' }, { status: 400 })
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId)
    let billDeleted = false
    let orderDeleted = false

    // 1. Instantly purge from memory structures & live KDS caches
    try {
      removeMemoryBill(billId)
      removeFallbackOrder(billId)
      updateFallbackOrder(billId, { status: 'cancelled' })
      invalidateLiveOrdersCache()
      invalidateKDSCache()
    } catch (cacheErr) {
      console.warn('Cache purge note:', cacheErr)
    }

    // 2. Look up and soft-delete in Prisma Bill
    try {
      const billConditions: any[] = [{ billNumber: billId }]
      if (isUuid) {
        billConditions.push({ id: billId })
      }

      const existingBill = await prisma.bill.findFirst({
        where: {
          OR: billConditions,
          deletedAt: null,
        },
      })

      if (existingBill) {
        await prisma.bill.update({
          where: { id: existingBill.id },
          data: {
            deletedAt: new Date(),
            billStatus: 'cancelled',
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'Deleted from Billing Ledger',
          },
        })
        billDeleted = true

        // Soft-delete linked order if present
        if (existingBill.orderId) {
          try {
            await prisma.order.update({
              where: { id: existingBill.orderId },
              data: {
                deletedAt: new Date(),
                status: 'cancelled',
                isBilled: false,
              },
            })
            orderDeleted = true
          } catch (ordErr) {
            console.warn('Prisma order link update note:', ordErr)
          }
        }

        // Release table if no other active bills/orders remain
        if (existingBill.tableId) {
          try {
            const activeOrders = await prisma.order.count({
              where: {
                tableId: existingBill.tableId,
                deletedAt: null,
                status: { notIn: ['cancelled', 'CANCELLED', 'served', 'SERVED'] },
              },
            })
            if (activeOrders === 0) {
              await prisma.restaurantTable.update({
                where: { id: existingBill.tableId },
                data: { status: 'available' },
              })
            }
          } catch (tblErr) {
            console.warn('Table status update note:', tblErr)
          }
        }
      }
    } catch (billDbErr) {
      console.warn('Prisma bill delete note:', billDbErr)
    }

    // 3. If no bill was found, check if billId is a live Order ID
    if (!billDeleted) {
      try {
        const orderConditions: any[] = [{ orderNumber: billId }]
        if (isUuid) {
          orderConditions.push({ id: billId })
        }

        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: orderConditions,
            deletedAt: null,
          },
          include: { bill: true },
        })

        if (existingOrder) {
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              deletedAt: new Date(),
              status: 'cancelled',
            },
          })
          orderDeleted = true

          const associatedBillId = existingOrder.billId || existingOrder.bill?.id
          if (associatedBillId) {
            await prisma.bill.update({
              where: { id: associatedBillId },
              data: {
                deletedAt: new Date(),
                billStatus: 'cancelled',
                status: 'CANCELLED',
                cancelledAt: new Date(),
              },
            })
            billDeleted = true
          }

          // Release table if no active orders remain
          if (existingOrder.tableId) {
            try {
              const activeOrders = await prisma.order.count({
                where: {
                  tableId: existingOrder.tableId,
                  deletedAt: null,
                  status: { notIn: ['cancelled', 'CANCELLED', 'served', 'SERVED'] },
                },
              })
              if (activeOrders === 0) {
                await prisma.restaurantTable.update({
                  where: { id: existingOrder.tableId },
                  data: { status: 'available' },
                })
              }
            } catch (tblErr) {
              console.warn('Table status update note:', tblErr)
            }
          }
        }
      } catch (ordDbErr) {
        console.warn('Prisma order lookup note:', ordDbErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Deleted successfully',
      data: {
        id: billId,
        billDeleted,
        orderDeleted,
      },
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/bills/[billId]:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete bill' },
      { status: 500 }
    )
  }
}

