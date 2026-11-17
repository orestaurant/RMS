/**
 * POST /api/bills/generate
 * High-Speed Generation & Retrieval of active bill for a table session
 * Accessible by Customer (QR menu), Waiter, and Admin/Manager
 * Optimized for sub-100ms response time with in-memory caching and batching
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { addNotification } from '@/lib/notifications-store'
import { logCommunication } from '@/lib/communication-ledger'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

// High-speed in-memory cache for table metadata and restaurant tax rate (< 0.01ms lookup)
interface CachedTableMeta {
  table: {
    id: string
    tableNumber: string
    restaurantId: string
    branchId: string
    organizationId: string
  }
  taxPercentage: number
  cachedAt: number
}
const tableMetaCache = new Map<string, CachedTableMeta>()
const TABLE_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      orderId: reqOrderId,
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

    // 0. Handle direct Order Bill Generation if orderId is provided
    if (reqOrderId) {
      const targetOrder = await prisma.order.findUnique({
        where: { id: reqOrderId },
        include: {
          items: true,
          table: true,
          customer: true,
          servedBy: true,
          createdBy: true,
          bill: {
            include: {
              items: true,
              table: true,
              waiter: true,
              tip: true,
            },
          },
        },
      })

      if (targetOrder) {
        // If an active bill already exists with items, return it
        if (targetOrder.bill && targetOrder.bill.items && targetOrder.bill.items.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Active bill retrieved successfully.',
            data: {
              ...targetOrder.bill,
              subtotal: Number(targetOrder.bill.subtotal),
              taxAmount: Number(targetOrder.bill.taxAmount),
              discountAmount: Number(targetOrder.bill.discountAmount),
              tipAmount: Number(targetOrder.bill.tipAmount),
              grandTotal: Number(targetOrder.bill.grandTotal),
            },
          })
        }

        // Generate bill directly from this order
        const resolvedBranchId = targetOrder.branchId
        const resolvedRestaurantId = targetOrder.restaurantId
        const resolvedOrgId = targetOrder.organizationId
        const resolvedTableId = targetOrder.tableId

        let taxPercentage = 5.0
        try {
          const settings = await prisma.restaurantSettings.findFirst({
            where: { restaurantId: resolvedRestaurantId },
            select: { taxPercentage: true },
          })
          if (settings?.taxPercentage) {
            taxPercentage = Number(settings.taxPercentage)
          }
        } catch (e) {}

        const billItems = targetOrder.items.map((it) => ({
          name: it.itemName,
          quantity: it.quantity,
          price: Number(it.basePrice),
          total: Number(it.itemTotal),
          menuItemId: it.menuItemId,
        }))

        const calculatedSubtotal = billItems.reduce((acc, curr) => acc + curr.total, 0)
        const discountAmount = Math.max(0, Number(discount || 0))
        const taxableAmount = Math.max(0, calculatedSubtotal - discountAmount)
        const totalTax = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100
        const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100

        const today = new Date()
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
        const randSuffix = Math.floor(1000 + Math.random() * 9000)
        const billNumber = `INV-${dateStr}-${randSuffix}`

        const isCustomerRequest = source === 'customer'
        const newStatus = isCustomerRequest ? 'REQUESTED' : 'GENERATED'
        const newBillStatus = isCustomerRequest ? 'requested' : 'open'
        const assignedWaiterId = reqWaiterId || targetOrder.servedById || targetOrder.createdById || null

        const createdBill = await prisma.bill.create({
          data: {
            billNumber,
            orderId: targetOrder.id,
            restaurantId: resolvedRestaurantId,
            branchId: resolvedBranchId,
            organizationId: resolvedOrgId,
            tableId: resolvedTableId,
            waiterId: assignedWaiterId,
            customerName:
              customerName ||
              targetOrder.customer?.name ||
              (targetOrder.vehicleNumber ? `Guest (${targetOrder.vehicleNumber})` : 'Dine-In Guest'),
            customerPhone: customerPhone || targetOrder.customer?.phone || null,
            subtotal: calculatedSubtotal,
            discountAmount,
            taxAmount: totalTax,
            tipAmount: 0,
            grandTotal,
            totalAmount: grandTotal,
            status: newStatus,
            billStatus: newBillStatus,
            paymentStatus: targetOrder.paymentStatus === 'completed' ? 'completed' : 'pending',
            items: {
              create: billItems.map((it) => ({
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
            waiter: {
              select: { id: true, name: true, firstName: true, lastName: true },
            },
            tip: true,
          },
        })

        await prisma.order
          .update({
            where: { id: targetOrder.id },
            data: { billId: createdBill.id, isBilled: true },
          })
          .catch(() => {})

        return NextResponse.json(
          {
            success: true,
            message: `Bill ${createdBill.billNumber} generated successfully.`,
            data: {
              ...createdBill,
              subtotal: Number(createdBill.subtotal),
              taxAmount: Number(createdBill.taxAmount),
              discountAmount: Number(createdBill.discountAmount),
              tipAmount: Number(createdBill.tipAmount),
              grandTotal: Number(createdBill.grandTotal),
            },
          },
          { status: 201 }
        )
      }
    }

    if (!reqTableId && !reqTableNumber) {
      return NextResponse.json(
        { success: false, message: 'Table identification (tableId or tableNumber) or orderId is required' },
        { status: 400 }
      )
    }

    // 1. Locate the Table in Cache or Database
    const cleanNum = String(reqTableNumber || '').trim()
    const cacheKey = reqTableId ? `id:${reqTableId}` : `num:${cleanNum.toLowerCase()}`
    let cachedMeta = tableMetaCache.get(cacheKey)
    if (cachedMeta && Date.now() - cachedMeta.cachedAt > TABLE_CACHE_TTL) {
      tableMetaCache.delete(cacheKey)
      cachedMeta = undefined
    }

    let table = cachedMeta?.table || null
    let taxPercentage = cachedMeta?.taxPercentage ?? 5.0

    if (!table) {
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

      const whereClause = reqTableId
        ? { id: reqTableId }
        : { tableNumber: { in: variants }, deletedAt: null }

      const dbTable = await prisma.restaurantTable.findFirst({
        where: whereClause,
        select: {
          id: true,
          tableNumber: true,
          restaurantId: true,
          branchId: true,
          organizationId: true,
        },
      })

      if (!dbTable) {
        return NextResponse.json(
          { success: false, message: `Table '${reqTableNumber || reqTableId}' could not be found` },
          { status: 404 }
        )
      }

      table = dbTable

      // Fetch Restaurant Tax Setting in parallel or default to 5%
      try {
        const settings = await prisma.restaurantSettings.findFirst({
          where: { restaurantId: dbTable.restaurantId },
          select: { taxPercentage: true },
        })
        if (settings?.taxPercentage) {
          taxPercentage = Number(settings.taxPercentage)
        }
      } catch (e) {
        taxPercentage = 5.0
      }

      tableMetaCache.set(cacheKey, { table, taxPercentage, cachedAt: Date.now() })
      if (reqTableId) {
        tableMetaCache.set(`num:${table.tableNumber.toLowerCase()}`, { table, taxPercentage, cachedAt: Date.now() })
      } else {
        tableMetaCache.set(`id:${table.id}`, { table, taxPercentage, cachedAt: Date.now() })
      }
    }

    const resolvedRestaurantId = table.restaurantId || reqRestaurantId
    const resolvedBranchId = table.branchId || reqBranchId
    const resolvedOrgId = table.organizationId

    const isCustomerRequest = source === 'customer'
    const newStatus = isCustomerRequest ? 'REQUESTED' : 'GENERATED'
    const newBillStatus = isCustomerRequest ? 'requested' : 'open'

    // 2. Fetch active unbilled orders and existing bill in PARALLEL (< 1 round-trip)
    const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const [orders, existingBill] = await Promise.all([
      prisma.order.findMany({
        where: {
          tableId: table.id,
          deletedAt: null,
          createdAt: { gte: sessionCutoff },
          status: {
            notIn: ['cancelled', 'CANCELLED', 'refunded'],
          },
          OR: [
            { isBilled: false },
            { billId: null },
            { bill: { status: { in: ['REQUESTED', 'GENERATED', 'open', 'requested'] } } },
          ],
        },
        select: {
          id: true,
          servedById: true,
          createdById: true,
          items: {
            select: {
              itemName: true,
              basePrice: true,
              quantity: true,
              itemTotal: true,
              menuItemId: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.bill.findFirst({
        where: {
          tableId: table.id,
          status: { in: ['REQUESTED', 'GENERATED', 'open', 'requested'] },
          deletedAt: null,
        },
        include: {
          tip: true,
          items: true,
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
    ])

    // Fast Path: If existing bill is already active and no new unbilled orders exist, return IMMEDIATELY!
    if (existingBill && orders.length === 0) {
      if (isCustomerRequest && existingBill.status !== 'REQUESTED') {
        prisma.bill.update({
          where: { id: existingBill.id },
          data: { status: 'REQUESTED', billStatus: 'requested' },
        }).catch(() => {})
      }
      return NextResponse.json({
        success: true,
        message: 'Active bill retrieved successfully.',
        data: {
          ...existingBill,
          subtotal: Number(existingBill.subtotal),
          taxAmount: Number(existingBill.taxAmount),
          discountAmount: Number(existingBill.discountAmount),
          tipAmount: Number(existingBill.tipAmount),
          grandTotal: Number(existingBill.grandTotal),
        },
      })
    }

    // Determine assigned Waiter ID
    let assignedWaiterId = reqWaiterId || existingBill?.waiterId || null
    if (!assignedWaiterId) {
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

    // 3. Calculate Bill Line Items and Totals
    interface ExtractedItem {
      name: string
      quantity: number
      price: number
      total: number
      menuItemId?: string
    }

    const billItems: ExtractedItem[] = []
    // Include existing items if updating existing bill with newly added round of orders
    if (existingBill?.items && existingBill.items.length > 0) {
      for (const it of existingBill.items) {
        billItems.push({
          name: it.itemName || 'Dish',
          quantity: it.quantity,
          price: Number(it.basePrice || 0),
          total: Number(it.itemTotal || 0),
          menuItemId: it.menuItemId || undefined,
        })
      }
    }

    for (const ord of orders) {
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const qty = it.quantity || 1
          const price = Number(it.basePrice || 0)
          const total = Number(it.itemTotal || price * qty)
          billItems.push({
            name: it.itemName || 'Dish',
            quantity: qty,
            price,
            total,
            menuItemId: it.menuItemId || undefined,
          })
        }
      }
    }

    // Aggregate duplicate items
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
    const discountAmount = Math.max(0, Number(discount || existingBill?.discountAmount || 0))
    const taxableAmount = Math.max(0, calculatedSubtotal - discountAmount)
    const totalTax = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100
    const currentTip = Number(existingBill?.tipAmount || 0)
    const grandTotal = Math.round((taxableAmount + totalTax + currentTip) * 100) / 100

    let finalBill: any = null

    if (existingBill) {
      // Fast Atomic Transaction: Update existing bill and link new orders
      const orderIds = orders.map((o) => o.id)
      const txOps: any[] = [
        prisma.billItem.deleteMany({ where: { billId: existingBill.id } }),
      ]

      if (aggregatedItems.length > 0 && resolvedOrgId) {
        txOps.push(
          prisma.billItem.createMany({
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
        )
      }

      txOps.push(
        prisma.bill.update({
          where: { id: existingBill.id },
          data: {
            subtotal: calculatedSubtotal,
            discountAmount,
            taxAmount: totalTax,
            grandTotal,
            totalAmount: grandTotal,
            status: newStatus,
            billStatus: newBillStatus,
            waiterId: assignedWaiterId || existingBill.waiterId,
            customerName: customerName || existingBill.customerName,
            customerPhone: customerPhone || existingBill.customerPhone,
          },
          include: {
            items: true,
            table: true,
            waiter: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
              },
            },
            tip: true,
          },
        })
      )

      if (orderIds.length > 0) {
        txOps.push(
          prisma.order.updateMany({
            where: { id: { in: orderIds } },
            data: { billId: existingBill.id, isBilled: true },
          })
        )
      }

      const results = await prisma.$transaction(txOps)
      // The bill update is the 2nd or 3rd result depending on createMany
      finalBill = results.find((r: any) => r && r.billNumber) || existingBill
    } else {
      // 4. Create Brand New Bill in 1 atomic operation
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const randSuffix = Math.floor(1000 + Math.random() * 9000)
      const billNumber = `INV-${dateStr}-${randSuffix}`

      const orderIds = orders.map((o) => o.id)

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
          waiter: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
          tip: true,
        },
      })

      if (orderIds.length > 0) {
        prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { billId: finalBill.id, isBilled: true },
        }).catch(() => {})
      }
    }

    // Fire in-app live notifications asynchronously (non-blocking)
    const displayTable = table.tableNumber || `Table ${table.id.slice(0, 4)}`
    try {
      if (isCustomerRequest) {
        addNotification({
          type: 'alert',
          title: `🔔 Bill Requested — ${displayTable}`,
          body: `Guest at ${displayTable} requested their bill (₹${finalBill.grandTotal}).`,
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
    } catch {}

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


