import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Re-computes and synchronizes totalOrders and totalSpent for a Customer
 * strictly based on real non-deleted, non-cancelled orders.
 * totalSpent ONLY includes orders whose bill/payment has been paid & settled.
 */
export async function syncCustomerOrderStats(customerId: string): Promise<{ totalOrders: number; totalSpent: number }> {
  if (!customerId) return { totalOrders: 0, totalSpent: 0 }

  try {
    const baseWhere: Prisma.OrderWhereInput = {
      customerId,
      deletedAt: null,
      status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] },
    }

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
