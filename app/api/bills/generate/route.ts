/**
 * POST /api/bills/generate
 * Generate or recalculate an active bill for a table session
 * Accessible by Customer (QR menu), Waiter, and Admin/Manager
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { addNotification } from '@/lib/notifications-store'
import { logCommunication } from '@/lib/communication-ledger'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      tableId: reqTableId,
      tableNumber: reqTableNumber,
      branchId: reqBranchId,
      restaurantId: reqRestaurantId,
      source = 'waiter', // 'customer' | 'waiter' | 'admin'
      customerName,
      customerPhone,
      discount = 0,
      waiterId: reqWaiterId,
    } = body

    if (!reqTableId && !reqTableNumber) {
      return NextResponse.json(
        { success: false, message: 'Table identification (tableId or tableNumber) is required' },
        { status: 400 }
      )
    }

    // Attempt to identify calling user if session cookie is present
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
    let sessionUser: { userId: string; role: string; name: string } | null = null
    if (sessionToken) {
      const payload = await verifyJWT(sessionToken)
      if (payload?.userId) {
        sessionUser = { userId: payload.userId, role: payload.role, name: payload.name }
      }
    }

    // 1. Locate the Table in database
    let table: any = null
    if (reqTableId) {
      table = await prisma.restaurantTable.findUnique({
        where: { id: reqTableId },
        include: { restaurant: true, branch: true },
      })
    }

    if (!table && reqTableNumber) {
      const cleanNum = String(reqTableNumber).trim()
      const bareNum = cleanNum.replace(/[^0-9]/g, '')
      const variants = Array.from(
        new Set([
          cleanNum,
          bareNum,
          `Table ${cleanNum}`,
          `Table ${bareNum}`,
          `T${bareNum}`,
          `T${cleanNum}`,
          cleanNum.toLowerCase(),
        ])
      ).filter(Boolean)

      table = await prisma.restaurantTable.findFirst({
        where: {
          tableNumber: { in: variants },
          deletedAt: null,
        },
        include: { restaurant: true, branch: true },
      })
    }

    if (!table) {
      return NextResponse.json(
        { success: false, message: `Table '${reqTableNumber || reqTableId}' could not be found` },
        { status: 404 }
      )
    }

    const resolvedRestaurantId = table.restaurantId || reqRestaurantId
    const resolvedBranchId = table.branchId || reqBranchId
    const resolvedOrgId = table.organizationId

    // 2. Fetch Restaurant Tax Setting (default to 5.0% GST if not configured)
    let taxPercentage = 5.0
    try {
      const settings = await prisma.restaurantSettings.findFirst({
        where: { restaurantId: resolvedRestaurantId },
      })
      if (settings?.taxPercentage) {
        taxPercentage = Number(settings.taxPercentage)
      }
    } catch (e) {
      console.warn('Could not fetch restaurant settings tax rate, defaulting to 5%:', e)
    }

    // 3. Fetch active unbilled orders for this table session (last 12 hours, excluding cancelled)
    const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const orders = await prisma.order.findMany({
      where: {
        tableId: table.id,
        isBilled: false,
        deletedAt: null,
        createdAt: { gte: sessionCutoff },
        status: {
          notIn: ['cancelled', 'CANCELLED', 'refunded'],
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        servedBy: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Determine assigned Waiter ID
    let assignedWaiterId = reqWaiterId || null
    if (!assignedWaiterId) {
      // Check if logged-in user is a waiter
      if (sessionUser && String(sessionUser.role).toUpperCase() === 'WAITER') {
        assignedWaiterId = sessionUser.userId
      } else {
        // Search orders for servedById or createdById who is a waiter
        for (const ord of orders) {
          if (ord.servedById) {
            assignedWaiterId = ord.servedById
            break
          }
          if (ord.createdById) {
            assignedWaiterId = ord.createdById
            break
          }
        }
      }
    }

    // If still no waiter assigned, attempt to find an active waiter staff in this restaurant
    if (!assignedWaiterId) {
      try {
        const staffWaiter = await prisma.user.findFirst({
          where: {
            role: { in: ['waiter', 'WAITER'] },
            status: 'active',
          },
        })
        if (staffWaiter) {
          assignedWaiterId = staffWaiter.id
        }
      } catch (e) {
        console.warn('Could not query default waiter staff:', e)
      }
    }

    // 4. Calculate Bill Line Items and Totals
    interface ExtractedItem {
      name: string
      quantity: number
      price: number
      total: number
      menuItemId?: string
    }

    const billItems: ExtractedItem[] = []
    for (const ord of orders) {
      if (Array.isArray(ord.items)) {
        for (const it of ord.items as any[]) {
          const qty = it.quantity || 1
          const price = Number(it.basePrice || it.price || 0)
          const total = Number(it.itemTotal || price * qty)
          billItems.push({
            name: it.itemName || it.name || it.menuItem?.name || 'Dish',
            quantity: qty,
            price,
            total,
            menuItemId: it.menuItemId || undefined,
          })
        }
      }
    }

    // Aggregate duplicate items if multiple rounds of the same item were ordered
    const aggregatedItems: ExtractedItem[] = []
    const itemMap = new Map<string, ExtractedItem>()
    for (const item of billItems) {
      const key = `${item.name}-${item.price}`
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!
        existing.quantity += item.quantity
        existing.total += item.total
      } else {
        const clone = { ...item }
        itemMap.set(key, clone)
        aggregatedItems.push(clone)
      }
    }

    const calculatedSubtotal = aggregatedItems.reduce((acc, curr) => acc + curr.total, 0)
    const discountAmount = Math.max(0, Number(discount || 0))
    const taxableAmount = Math.max(0, calculatedSubtotal - discountAmount)
    const totalTax = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100

    const isCustomerRequest = source === 'customer'
    const newStatus = isCustomerRequest ? 'REQUESTED' : 'GENERATED'
    const newBillStatus = isCustomerRequest ? 'requested' : 'open'

    // 5. Check if an existing unfinalized Bill already exists for this table
    const existingBill = await prisma.bill.findFirst({
      where: {
        tableId: table.id,
        status: { in: ['REQUESTED', 'GENERATED', 'open', 'requested'] },
        deletedAt: null,
      },
      include: {
        tip: true,
        items: true,
      },
    })

    let finalBill: any = null

    if (existingBill) {
      // Recalculate and update existing bill with new orders / items
      const currentTip = Number(existingBill.tipAmount || 0)
      const currentDiscount = discountAmount > 0 ? discountAmount : Number(existingBill.discountAmount || 0)
      const curTaxable = Math.max(0, calculatedSubtotal - currentDiscount)
      const curTax = Math.round(curTaxable * (taxPercentage / 100) * 100) / 100
      const newGrandTotal = Math.round((curTaxable + curTax + currentTip) * 100) / 100

      // Re-create items snapshot
      await prisma.billItem.deleteMany({ where: { billId: existingBill.id } })
      if (aggregatedItems.length > 0 && resolvedOrgId) {
        await prisma.billItem.createMany({
          data: aggregatedItems.map((it) => ({
            billId: existingBill.id,
            organizationId: resolvedOrgId,
            itemName: it.name,
            basePrice: it.price,
            quantity: it.quantity,
            itemTotal: it.total,
            discountAmount: 0,
            taxAmount: Math.round(it.total * (taxPercentage / 100) * 100) / 100,
            lineTotal: it.total,
            menuItemId: it.menuItemId || null,
          })),
        })
      }

      finalBill = await prisma.bill.update({
        where: { id: existingBill.id },
        data: {
          subtotal: calculatedSubtotal,
          discountAmount: currentDiscount,
          taxAmount: curTax,
          grandTotal: newGrandTotal,
          totalAmount: newGrandTotal,
          status: newStatus,
          billStatus: newBillStatus,
          waiterId: assignedWaiterId || existingBill.waiterId,
          customerName: customerName || existingBill.customerName,
          customerPhone: customerPhone || existingBill.customerPhone,
        },
        include: {
          items: true,
          table: true,
          waiter: true,
          tip: true,
        },
      })

      // Link orders
      const orderIds = orders.map((o) => o.id)
      if (orderIds.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { billId: existingBill.id },
        })
      }
    } else {
      // 6. Create a brand new Bill
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const randSuffix = Math.floor(1000 + Math.random() * 9000)
      const billNumber = `INV-${dateStr}-${randSuffix}`
      const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100

      finalBill = await prisma.bill.create({
        data: {
          billNumber,
          restaurantId: resolvedRestaurantId,
          branchId: resolvedBranchId,
          organizationId: resolvedOrgId,
          tableId: table.id,
          waiterId: assignedWaiterId,
          customerName: customerName || 'Dine-In Guest',
          customerPhone: customerPhone || null,
          subtotal: calculatedSubtotal,
          discountAmount,
          taxAmount: totalTax,
          tipAmount: 0,
          grandTotal,
          totalAmount: grandTotal,
          status: newStatus,
          billStatus: newBillStatus,
          paymentStatus: 'pending',
          items: {
            create: aggregatedItems.map((it) => ({
              organizationId: resolvedOrgId,
              itemName: it.name,
              basePrice: it.price,
              quantity: it.quantity,
              itemTotal: it.total,
              discountAmount: 0,
              taxAmount: Math.round(it.total * (taxPercentage / 100) * 100) / 100,
              lineTotal: it.total,
              menuItemId: it.menuItemId || null,
            })),
          },
        },
        include: {
          items: true,
          table: true,
          waiter: true,
          tip: true,
        },
      })

      // Link orders to bill
      const orderIds = orders.map((o) => o.id)
      if (orderIds.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { billId: finalBill.id },
        })
      }
    }

    // 7. Fire in-app live notifications for Waiter & Cashier dashboards
    const displayTable = table.tableNumber || `Table ${table.id.slice(0, 4)}`
    if (isCustomerRequest) {
      addNotification({
        type: 'alert',
        title: `🔔 Bill Requested — ${displayTable}`,
        body: `Guest at ${displayTable} requested their physical/digital bill (₹${finalBill.grandTotal}).`,
        metadata: {
          billNumber: finalBill.billNumber,
          tableNumber: displayTable,
          amount: Number(finalBill.grandTotal),
        },
      })
    } else {
      addNotification({
        type: 'bill_generated',
        title: `🧾 Invoice #${finalBill.billNumber} Generated`,
        body: `${displayTable} — ₹${finalBill.grandTotal}. Ready for customer settlement.`,
        metadata: {
          billNumber: finalBill.billNumber,
          tableNumber: displayTable,
          amount: Number(finalBill.grandTotal),
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: isCustomerRequest
          ? `Bill request sent for ${displayTable}. Waiter alerted!`
          : `Bill ${finalBill.billNumber} generated successfully.`,
        data: {
          ...finalBill,
          subtotal: Number(finalBill.subtotal),
          taxAmount: Number(finalBill.taxAmount),
          discountAmount: Number(finalBill.discountAmount),
          tipAmount: Number(finalBill.tipAmount),
          grandTotal: Number(finalBill.grandTotal),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in /api/bills/generate:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to generate bill' },
      { status: 500 }
    )
  }
}

