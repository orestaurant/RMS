import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCustomerSession } from '@/lib/customer-auth'
import { registerActiveLiveOrder, getKitchenStation } from '@/lib/kds-utils'

/**
 * GET /api/customer/orders
 * Return all orders belonging exclusively to the logged-in customer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCustomerSession(request)
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: session.customerId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        branch: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const formattedOrders = orders.map((order) => {
      const totalVal = Number(order.total || order.totalAmount || 0)
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: totalVal,
        totalAmount: totalVal,
        source: order.source || 'ONLINE',
        orderType: order.orderType,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        tableNumber: order.table?.tableNumber || null,
        branchName: order.branch?.name || 'Main Branch',
        items: order.items.map((item) => ({
          id: item.id,
          name: item.itemName || item.menuItem?.name || 'Menu Item',
          quantity: item.quantity,
          price: Number(item.basePrice || 0),
          total: Number(item.itemTotal || 0),
        })),
      }
    })

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    })
  } catch (error: any) {
    console.error('Error fetching customer orders:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch customer orders' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/customer/orders
 * Action allowing customer to place a new dynamic order linked to their customerId
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCustomerSession(request)
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // 1. Resolve restaurant and branch
    let branch = await prisma.branch.findFirst({
      include: { restaurant: true },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'No active branch available' },
        { status: 400 }
      )
    }

    // 2. Fetch or ensure menu items for test order
    let menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: branch.restaurantId },
      take: 2,
    })

    if (menuItems.length === 0) {
      menuItems = await prisma.menuItem.findMany({ take: 2 })
    }

    // Fallback: create a sample menu item if none exists
    if (menuItems.length === 0) {
      let category = await prisma.menuCategory.findFirst({
        where: { restaurantId: branch.restaurantId },
      })
      if (!category) {
        category = await prisma.menuCategory.create({
          data: {
            restaurantId: branch.restaurantId,
            organizationId: branch.organizationId,
            name: 'Signature Dishes',
          },
        })
      }
      const newItem = await prisma.menuItem.create({
        data: {
          restaurantId: branch.restaurantId,
          organizationId: branch.organizationId,
          categoryId: category.id,
          name: 'Butter Chicken Special',
          basePrice: 420,
        },
      })
      menuItems = [newItem]
    }

    const itemsToCreate = menuItems.map((item) => ({
      organizationId: branch.organizationId,
      menuItemId: item.id,
      itemName: item.name,
      basePrice: Number(item.basePrice),
      quantity: 1,
      itemTotal: Number(item.basePrice),
    }))

    const totalCalculated = itemsToCreate.reduce(
      (sum, item) => sum + item.itemTotal,
      0
    )

    const orderNumber = `ORD-CUST-${Date.now().toString().slice(-6)}`

    // 3. Create the dynamic Order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        branchId: branch.id,
        restaurantId: branch.restaurantId,
        organizationId: branch.organizationId,
        customerId: session.customerId,
        source: 'ONLINE',
        orderType: 'dine_in',
        status: 'pending',
        subtotal: totalCalculated,
        totalAmount: totalCalculated,
        total: totalCalculated,
        paymentStatus: 'pending',
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    })

    // 4. Update customer aggregate stats
    await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: totalCalculated },
      },
    }).catch((err) => {
      console.warn('Failed to increment customer stats:', err)
    })

    // 5. Register directly in KDS live order queue
    registerActiveLiveOrder({
      id: order.orderNumber,
      fullId: order.id,
      tableNumber: 'Table 1',
      source: 'qr_order',
      waiter: 'Online',
      customerName: (order.customer as any)?.name || 'Customer',
      status: 'pending',
      priority: 'normal',
      createdAt: order.createdAt.toISOString(),
      items: (order.items || []).map((i: any) => ({
        id: i.id,
        name: i.itemName,
        quantity: i.quantity,
        station: getKitchenStation(i.itemName),
        completed: false,
      })),
    })

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        status: order.status,
        source: order.source,
        createdAt: order.createdAt,
        items: (order.items || []).map((i: any) => ({
          name: i.itemName,
          quantity: i.quantity,
          total: Number(i.itemTotal),
        })),
      },
    })
  } catch (error: any) {
    console.error('Error placing customer order:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to place test order' },
      { status: 500 }
    )
  }
}
