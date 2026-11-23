import prisma from '@/lib/prisma'

/**
 * Re-computes and synchronizes totalOrders and totalSpent for a Customer
 * strictly based on real non-deleted, non-cancelled orders.
 */
export async function syncCustomerOrderStats(customerId: string): Promise<{ totalOrders: number; totalSpent: number }> {
  if (!customerId) return { totalOrders: 0, totalSpent: 0 }

  try {
    const stats = await prisma.order.aggregate({
      where: {
        customerId,
        deletedAt: null,
        status: { notIn: ['cancelled', 'CANCELLED', 'refunded'] },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    })

    const totalOrders = stats._count.id || 0
    const totalSpent = Number(stats._sum.totalAmount || 0)

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
