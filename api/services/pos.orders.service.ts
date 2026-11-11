/**
 * POS Orders Service
 * Handles creation of orders from POS Terminal with real calculations
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreatePOSOrderItem {
  menuItemId: string
  variantId?: string
  quantity: number
  modifiers?: Array<{
    modifierId: string
    modifierName: string
    price: number
  }>
  specialInstructions?: string
}

export interface CreatePOSOrderRequest {
  branchId: string
  organizationId: string
  restaurantId: string
  userId: string
  orderType: 'dine_in' | 'takeaway' | 'delivery'
  tableId?: string
  customerId?: string
  items: CreatePOSOrderItem[]
  discount?: number
  notes?: string
}

export interface OrderCalculations {
  subtotal: number
  discount: number
  taxableAmount: number
  taxAmount: number
  serviceCharge: number
  totalAmount: number
}

/**
 * Generate unique order number
 */
export async function generateOrderNumber(
  branchId: string,
  organizationId: string
): Promise<string> {
  const today = new Date()
  const date = today.toISOString().split('T')[0].replace(/-/g, '')

  // Get count of orders created today
  const count = await prisma.order.count({
    where: {
      branchId,
      organizationId,
      createdAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    },
  })

  return `ORD-${date}-${String(count + 1).padStart(4, '0')}`
}

/**
 * Calculate order totals server-side
 */
export async function calculateOrderTotals(
  items: CreatePOSOrderItem[],
  discount: number = 0
): Promise<OrderCalculations> {
  let subtotal = 0

  // Fetch all menu items with current prices
  const menuItemIds = items.map((i) => i.menuItemId)
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      deletedAt: null,
    },
    include: {
      variants: true,
    },
  })

  // Calculate item totals
  for (const item of items) {
    const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)
    if (!menuItem) continue

    let itemPrice = Number(menuItem.basePrice)

    // Add variant price if applicable
    if (item.variantId) {
      const variant = menuItem.variants.find((v) => v.id === item.variantId)
      if (variant) {
        itemPrice += Number(variant.priceModifier || 0)
      }
    }

    // Add modifier prices
    if (item.modifiers) {
      for (const mod of item.modifiers) {
        itemPrice += mod.price || 0
      }
    }

    subtotal += itemPrice * item.quantity
  }

  // Apply discount (already as rupee amount from frontend)
  const discountAmount = Math.min(discount, subtotal)
  const taxableAmount = subtotal - discountAmount

  // Calculate tax (5% GST as per schema)
  const taxAmount = Math.round((taxableAmount * 5) / 100 * 100) / 100

  // No service charge for now (can be added per branch config later)
  const serviceCharge = 0

  const totalAmount = taxableAmount + taxAmount + serviceCharge

  return {
    subtotal,
    discount: discountAmount,
    taxableAmount,
    taxAmount,
    serviceCharge,
    totalAmount,
  }
}

/**
 * Create order from POS with all validations and calculations
 */
export async function createPOSOrder(
  request: CreatePOSOrderRequest
) {
  // Validate items
  if (!request.items || request.items.length === 0) {
    throw new Error('Order must contain at least one item')
  }

  // Calculate totals server-side
  const calculations = await calculateOrderTotals(
    request.items,
    request.discount || 0
  )

  // Generate order number
  const orderNumber = await generateOrderNumber(request.branchId, request.organizationId)

  // If dine-in, validate table exists
  let tableId = request.tableId || null
  if (request.orderType === 'dine_in' && tableId) {
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
    })
    if (!table) {
      throw new Error('Table not found')
    }
  }

  // Fetch all menu items with current prices for order item data
  const menuItemIds = request.items.map((i) => i.menuItemId)
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      deletedAt: null,
    },
  })

  // Build order items data with proper pricing
  const orderItemsData = request.items.map((item) => {
    const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)
    if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`)

    let itemPrice = Number(menuItem.basePrice)

    // Add variant price if applicable
    if (item.variantId) {
      // TODO: Fetch variant and add its modifier price
    }

    // Add modifier prices
    if (item.modifiers) {
      for (const mod of item.modifiers) {
        itemPrice += mod.price || 0
      }
    }

    return {
      menuItemId: item.menuItemId,
      variantId: item.variantId || null,
      itemName: menuItem.name,
      basePrice: Number(menuItem.basePrice),
      quantity: item.quantity,
      itemTotal: new Prisma.Decimal(itemPrice * item.quantity),
      specialInstructions: item.specialInstructions || null,
      organizationId: request.organizationId,
    }
  })

  // Create the order
  const order = await prisma.order.create({
    data: {
      organizationId: request.organizationId,
      branchId: request.branchId,
      restaurantId: request.restaurantId,
      orderNumber,
      orderType: request.orderType as any,
      status: 'confirmed',
      paymentStatus: 'pending',
      tableId,
      customerId: request.customerId || null,
      createdById: request.userId,
      subtotal: new Prisma.Decimal(calculations.subtotal),
      discountAmount: new Prisma.Decimal(calculations.discount),
      taxAmount: new Prisma.Decimal(calculations.taxAmount),
      serviceCharge: new Prisma.Decimal(calculations.serviceCharge),
      totalAmount: new Prisma.Decimal(calculations.totalAmount),
      notes: request.notes || null,
      // Create order items
      items: {
        create: orderItemsData,
      },
    },
    include: {
      items: true,
    },
  })

  // Update table status to occupied if dine-in
  if (request.orderType === 'dine_in' && tableId) {
    await prisma.restaurantTable.update({
      where: { id: tableId },
      data: {
        status: 'occupied',
      },
    })
  }

  return order
}
