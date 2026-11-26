import prisma from '@/lib/prisma'
import { OrderStatusEnum, Prisma } from '@prisma/client'

const CANCELLED_ORDER_STATUSES: OrderStatusEnum[] = ['cancelled', 'CANCELLED', 'refunded']

export function buildActiveCustomerOrderWhere(customerId: string): Prisma.OrderWhereInput {
  return {
    customerId,
    deletedAt: null,
    status: { notIn: CANCELLED_ORDER_STATUSES },
  }
}

/**
 * Determines whether a customer is eligible for first-order-only perks (e.g. FIRST15).
 * Checks both the cached totalOrders counter and real non-cancelled Order records
 * so stale counters never grant first-order discounts on subsequent orders.
 */
export async function isCustomerFirstOrder(
  customerId: string,
  cachedTotalOrders?: number | null
): Promise<boolean> {
  if (!customerId) return false
  if (typeof cachedTotalOrders === 'number' && cachedTotalOrders > 0) {
    return false
  }

  try {
    const [customer, existingOrder] = await Promise.all([
      cachedTotalOrders === undefined
        ? prisma.customer.findUnique({
            where: { id: customerId },
            select: { totalOrders: true },
          })
        : Promise.resolve(null),
      prisma.order.findFirst({
        where: buildActiveCustomerOrderWhere(customerId),
        select: { id: true },
      }),
    ])

    if (existingOrder) return false
    if (customer && Number(customer.totalOrders || 0) > 0) return false
    return true
  } catch (err) {
    console.warn(`[isCustomerFirstOrder] Failed for customerId ${customerId}:`, err)
    return Number(cachedTotalOrders || 0) === 0
  }
}

/**
 * Re-computes and synchronizes totalOrders and totalSpent for a Customer
 * strictly based on real non-deleted, non-cancelled orders.
 * totalSpent ONLY includes orders whose bill/payment has been paid & settled.
 */
export async function syncCustomerOrderStats(customerId: string): Promise<{ totalOrders: number; totalSpent: number }> {
  if (!customerId) return { totalOrders: 0, totalSpent: 0 }

  try {
    const baseWhere = buildActiveCustomerOrderWhere(customerId)

    const [totalOrders, paidStats] = await Promise.all([
      prisma.order.count({ where: baseWhere }),
      prisma.order.aggregate({
        where: {
          ...baseWhere,
          OR: [
            { paymentStatus: 'completed' },
            { bill: { status: 'PAID' } },
            { bill: { paymentStatus: 'completed' } },
          ],
        },
        _sum: { totalAmount: true },
      }),
    ])

    const totalSpent = Number(paidStats._sum?.totalAmount || 0)

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalOrders,
        totalSpent,
      },
    }).catch(() => {})

    return { totalOrders, totalSpent }
  } catch (err) {
    console.warn(`[syncCustomerOrderStats] Failed for customerId ${customerId}:`, err)
    return { totalOrders: 0, totalSpent: 0 }
  }
}
