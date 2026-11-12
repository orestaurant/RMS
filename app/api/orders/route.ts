/**
 * POST & GET /api/orders
 * Unified handler for Table QR Dine-In Ordering & POS Terminal Orders
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { registerActiveLiveOrder, getKitchenStation } from '@/lib/kds-utils'
import { Prisma } from '@prisma/client'

/**
 * GET /api/orders
 * Query orders by tableNumber, status, or branchId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableNumber = searchParams.get('table') || searchParams.get('tableNumber')
    const status = searchParams.get('status')
    const branchId = searchParams.get('branchId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = { deletedAt: null }

    if (tableNumber) {
      where.OR = [
        { table: { tableNumber: String(tableNumber).trim() } },
        { metadata: { path: ['tableNumber'], equals: String(tableNumber).trim() } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (branchId) {
      where.branchId = branchId
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    })

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tableNumber: o.table?.tableNumber || (o.metadata as any)?.tableNumber || 'Unknown',
      orderType: o.orderType,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount || o.total || 0),
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.itemName,
        price: Number(i.basePrice),
        quantity: i.quantity,
        total: Number(i.itemTotal),
      })),
    }))

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/orders
 * Place dine-in QR orders or POS orders with full validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const {
      tableNumber,
      tableId: providedTableId,
      items,
      totalAmount: clientTotalAmount,
      orderType = 'dine_in',
      status: requestedStatus = 'pending',
      notes = '',
      customerId = null,
    } = body

    let branchId = body.branchId

    // 1. Validate Items array (Cart cannot be empty)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cart cannot be empty. Please select at least one item.' },
        { status: 400 }
      )
    }

    // 2. Validate Table Number for Dine-In
    const isDineIn = orderType === 'dine_in'
    const resolvedTableNumber = tableNumber !== undefined && tableNumber !== null && String(tableNumber).trim() !== ''
      ? String(tableNumber).trim()
      : null

    if (isDineIn && !resolvedTableNumber && !providedTableId) {
      return NextResponse.json(
        { success: false, message: 'Table number is required for dine-in orders' },
        { status: 400 }
      )
    }

    // 3. Resolve Branch, Restaurant, and Organization context
    let branch: any = null
    if (branchId) {
      branch = await prisma.branch.findUnique({
        where: { id: branchId },
      })
    }

    if (!branch) {
      branch = await prisma.branch.findFirst({
        orderBy: { isPrimary: 'desc' },
      })
    }

    if (!branch) {
      // Fallback: lookup restaurant
      const restaurant = await prisma.restaurant.findFirst()
      if (!restaurant) {
        return NextResponse.json(
          { success: false, message: 'No restaurant or branch configured in database' },
          { status: 500 }
        )
      }
      // Create default branch
      branch = await prisma.branch.create({
        data: {
          restaurantId: restaurant.id,
          organizationId: restaurant.organizationId,
          name: 'Main Branch',
          address: 'Main Dining Hall',
          isPrimary: true,
        },
      })
    }

    const organizationId = branch.organizationId
    const restaurantId = branch.restaurantId
    branchId = branch.id

    // 4. Resolve or Associate Table
    let tableId = providedTableId || null
    let finalTableNumber = resolvedTableNumber || '1'

    if (isDineIn) {
      if (tableId) {
        const existingTable = await prisma.restaurantTable.findUnique({
          where: { id: tableId },
        })
        if (existingTable) {
          finalTableNumber = existingTable.tableNumber
        }
      } else if (resolvedTableNumber) {
        let table = await prisma.restaurantTable.findFirst({
          where: {
            restaurantId,
            branchId,
            tableNumber: resolvedTableNumber,
            deletedAt: null,
          },
        })

        if (!table) {
          // Check by tableNumber only in branch
          table = await prisma.restaurantTable.findFirst({
            where: {
              branchId,
              tableNumber: resolvedTableNumber,
              deletedAt: null,
            },
          })
        }

        // If table doesn't exist, create it dynamically
        if (!table) {
          try {
            table = await prisma.restaurantTable.create({
              data: {
                branchId,
                restaurantId,
                organizationId,
                tableNumber: resolvedTableNumber,
                capacity: 4,
                section: 'dining',
                status: 'occupied',
              },
            })
          } catch (tblErr) {
            console.warn('Could not create table record:', tblErr)
          }
        } else {
          // Update status to occupied
          await prisma.restaurantTable.update({
            where: { id: table.id },
            data: { status: 'occupied' },
          }).catch(() => {})
        }

        if (table) {
          tableId = table.id
        }
      }
    }

    // 5. Fetch Menu Items from database to verify availability and prices
    const itemIds = items.map((i: any) => i.menuItemId).filter(Boolean)
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        deletedAt: null,
      },
      include: {
        category: true,
      },
    })

    const menuItemMap = new Map(dbMenuItems.map((m) => [m.id, m]))

    // Check availability
    for (const reqItem of items) {
      const dbItem = menuItemMap.get(reqItem.menuItemId)
      if (dbItem && dbItem.isAvailable === false) {
        return NextResponse.json(
          {
            success: false,
            message: `"${dbItem.name}" is currently out of stock and cannot be ordered.`,
          },
          { status: 400 }
        )
      }
    }

    // 6. Build Order Items data & calculate totals
    let calculatedSubtotal = 0
    const orderItemsCreateData: any[] = []

    for (const it of items) {
      const dbItem = menuItemMap.get(it.menuItemId)
      const qty = Math.max(1, parseInt(it.quantity || '1') || 1)
      const name = it.name || dbItem?.name || 'Menu Item'
      const price = dbItem ? Number(dbItem.basePrice) : parseFloat(it.price || 0) || 0
      const itemTotal = price * qty

      calculatedSubtotal += itemTotal

      orderItemsCreateData.push({
        organizationId,
        menuItemId: it.menuItemId,
        variantId: it.variantId || null,
        itemName: name,
        basePrice: price,
        quantity: qty,
        itemTotal,
        specialInstructions: it.specialInstructions || null,
      })
    }

    // 5% GST tax calculation
    const taxRate = 0.05
    const taxAmount = Math.round(calculatedSubtotal * taxRate * 100) / 100
    const finalTotal = Math.round((calculatedSubtotal + taxAmount) * 100) / 100

    // 7. Generate Unique Order Number
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`

    // 8. Validate requested status against OrderStatusEnum
    const validStatuses = ['pending', 'confirmed', 'preparing', 'served', 'completed']
    const finalStatus = validStatuses.includes(requestedStatus) ? requestedStatus : 'pending'

    // 9. Persist Order in database
    const order = await prisma.order.create({
      data: {
        organizationId,
        branchId,
        restaurantId,
        orderNumber,
        orderType: isDineIn ? 'dine_in' : 'takeaway',
        status: finalStatus as any,
        paymentStatus: 'pending',
        tableId,
        customerId: customerId || null,
        subtotal: new Prisma.Decimal(calculatedSubtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(finalTotal),
        total: new Prisma.Decimal(finalTotal),
        notes: notes || null,
        source: 'QR_MENU',
        metadata: {
          tableNumber: finalTableNumber,
          customerName: body.customerName || 'Table Guest',
          placedVia: 'QR_SELF_ORDER',
          subtotal: calculatedSubtotal,
          taxAmount,
        },
        items: {
          create: orderItemsCreateData,
        },
      },
      include: {
        items: true,
        table: true,
      },
    })

    // 10. Register immediately into KDS live queue for kitchen display
    try {
      registerActiveLiveOrder({
        id: order.orderNumber,
        fullId: order.id,
        tableNumber: `Table ${finalTableNumber}`,
        source: 'qr_order',
        waiter: 'QR Self-Order',
        customerName: body.customerName || `Guest (${finalTableNumber})`,
        status: order.status === 'confirmed' ? 'accepted' : 'pending',
        priority: 'normal',
        createdAt: order.createdAt.toISOString(),
        specialNotes: notes || undefined,
        items: order.items.map((i: any) => {
          const dbItem = menuItemMap.get(i.menuItemId)
          return {
            id: i.id,
            name: i.itemName,
            quantity: i.quantity,
            station: getKitchenStation(
              i.itemName,
              (dbItem as any)?.category?.name || (dbItem as any)?.categoryId
            ),
            completed: false,
          }
        }),
      })
    } catch (kdsErr) {
      console.warn('Could not register in KDS live queue:', kdsErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Order placed successfully!',
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          tableNumber: finalTableNumber,
          status: order.status,
          subtotal: calculatedSubtotal,
          taxAmount,
          totalAmount: finalTotal,
          itemsCount: order.items.length,
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to place order. Please try again.',
      },
      { status: 500 }
    )
  }
}
