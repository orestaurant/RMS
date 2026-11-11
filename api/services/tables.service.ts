/**
 * Tables Service
 * Handles table-related queries
 */

import { PrismaClient } from '@prisma/client'
import { TenantContext } from '@/api/middleware/tenant'

const prisma = new PrismaClient()

export interface TableInfo {
  id: string
  tableNumber: string
  capacity: number
  section: string | null
  status: string
  occupiedSince: Date | null
  guestCount: number | null
  waiterName: string | null
  x: number | null
  y: number | null
}

/**
 * Get all tables for a branch
 */
export const getTablesByBranch = async (
  branchId: string,
  tenantContext: TenantContext
): Promise<TableInfo[]> => {
  try {
    const tables = await prisma.restaurantTable.findMany({
      where: {
        organizationId: tenantContext.organizationId,
        branchId: branchId,
        deletedAt: null,
      },
      include: {
        reservations: {
          where: {
            status: {
              in: ['confirmed', 'checked_in'],
            },
            deletedAt: null,
          },
        },
        orders: {
          where: {
            status: {
              in: ['pending', 'confirmed', 'preparing', 'ready'],
            },
            deletedAt: null,
          },
          include: {
            createdBy: true,
          },
        },
      },
      orderBy: {
        tableNumber: 'asc',
      },
    })

    return tables.map((table) => {
      const activeOrder = table.orders[0]

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        section: table.section,
        status: table.status,
        occupiedSince: activeOrder?.createdAt ?? null,
        guestCount: activeOrder ? 4 : null, // Default guest count
        waiterName: activeOrder?.createdBy?.firstName ?? null,
        x: table.xPosition ? Number(table.xPosition) : null,
        y: table.yPosition ? Number(table.yPosition) : null,
      }
    })
  } catch (error) {
    console.error('Error fetching tables:', error)
    throw error
  }
}

/**
 * Get table counts for dashboard
 */
export const getTableCounts = async (
  branchId: string,
  tenantContext: TenantContext
) => {
  try {
    const counts = await prisma.restaurantTable.groupBy({
      by: ['status'],
      where: {
        organizationId: tenantContext.organizationId,
        branchId: branchId,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    })

    const result = {
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0,
      total: 0,
    }

    counts.forEach((count) => {
      if (count.status === 'available') result.available = count._count.id
      if (count.status === 'occupied') result.occupied = count._count.id
      if (count.status === 'reserved') result.reserved = count._count.id
      if ((count.status as string) === 'cleaning' || count.status === 'maintenance') result.cleaning = count._count.id
    })

    result.total =
      result.available + result.occupied + result.reserved + result.cleaning

    return result
  } catch (error) {
    console.error('Error fetching table counts:', error)
    throw error
  }
}
