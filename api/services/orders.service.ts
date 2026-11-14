/**
 * Orders Service
 * Handles order-related queries
 */

import prisma from '@/lib/prisma'
import { TenantContext } from '@/api/middleware/tenant'

export interface LiveOrder {
  id: string
  orderNumber: string
  tableNumber: string | null
  status: string
  items: Array<{
    name: string
    quantity: number
  }>
  totalAmount: number
  total?: number
  source?: string | null
  createdAt: Date
  waiterName: string | null
  customer?: {
    id?: string
    name: string
    email: string
  } | null
}

export interface LiveOrdersResponse {
  activeCount: number
  orders: LiveOrder[]
}

/**
 * Get active live orders for a branch
 * Active statuses: pending, confirmed, preparing, ready, completed
 */
export const getLiveOrders = async (
  branchId: string,
  tenantContext: TenantContext,
  statusFilter?: string
): Promise<LiveOrdersResponse> => {
  try {
    const activeStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'PENDING',
      'PREPARING',
    ]

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let whereClause: any = {
      ...(tenantContext?.organizationId ? { organizationId: tenantContext.organizationId } : {}),
      ...(branchId ? { branchId: branchId } : {}),
      deletedAt: null,
      status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] },
    }

    if (statusFilter && statusFilter !== 'all') {
      const s = statusFilter.toLowerCase()
      // If filtering by cooking, map to preparing
      const mapped = s === 'cooking' ? 'preparing' : s === 'accepted' ? 'confirmed' : s
      whereClause.status = { in: [mapped, mapped.toUpperCase()] }
    } else {
      whereClause.OR = [
        { createdAt: { gte: todayStart } },
        { status: { in: activeStatuses } },
      ]
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
        createdBy: true,
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    const formattedOrders: LiveOrder[] = orders.map((order) => {
      const custName = order.customer
        ? (order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Customer')
        : null

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.table?.tableNumber ?? null,
        status: order.status,
        items: order.items.map((item) => ({
          name: item.itemName,
          quantity: item.quantity,
        })),
        totalAmount: Number(order.total || order.totalAmount || 0),
        total: Number(order.total || order.totalAmount || 0),
        source: order.source ?? 'DINE_IN',
        createdAt: order.createdAt,
        waiterName: order.createdBy?.firstName ?? null,
        customer: order.customer
          ? {
              id: order.customer.id,
              name: custName || 'Customer',
              email: order.customer.email || '',
            }
          : null,
      }
    })

    return {
      activeCount: formattedOrders.length,
      orders: formattedOrders,
    }
  } catch (error) {
    console.error('Error fetching live orders:', error)
    throw error
  }
}

/**
 * Get order details
 */
export const getOrderById = async (
  orderId: string,
  tenantContext: TenantContext
) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        organizationId: tenantContext.organizationId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            menuItem: true,
            modifiers: true,
          },
        },
        table: true,
        customer: true,
        createdBy: true,
      },
    })

    return order
  } catch (error) {
    console.error('Error fetching order:', error)
    throw error
  }
}
