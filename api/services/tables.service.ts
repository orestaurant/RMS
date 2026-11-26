/**
 * Tables Service
 * Handles table-related queries
 */

import { Prisma, PrismaClient } from '@prisma/client'
import prisma from '@/lib/prisma'
import { TenantContext } from '@/api/middleware/tenant'
import {
  ACTIVE_ORDER_DB_STATUSES,
  buildTableNumberVariants,
  findMatchingTable,
  formatUnavailableTableMessage,
  getEffectiveTableStatus,
} from '@/lib/utils'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ResolvedTableRecord {
  id: string
  tableNumber: string
  status: string
  metadata: Prisma.JsonValue
}

export class TableBookingConflictError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly tableStatus: string
  readonly tableNumber: string

  constructor(
    message: string,
    options: {
      statusCode?: number
      code?: string
      tableStatus: string
      tableNumber: string
    }
  ) {
    super(message)
    this.name = 'TableBookingConflictError'
    this.statusCode = options.statusCode ?? 409
    this.code = options.code ?? 'TABLE_OCCUPIED'
    this.tableStatus = options.tableStatus
    this.tableNumber = options.tableNumber
  }
}

/**
 * Resolves a RestaurantTable by ID or tableNumber (supporting variants like "6", "T6", "Table 6").
 */
export async function resolveDineInTable(
  db: DbClient,
  params: {
    branchId: string
    tableId?: string | null
    tableNumber?: string | null
  }
): Promise<ResolvedTableRecord | null> {
  const { branchId, tableId, tableNumber } = params

  if (tableId) {
    const byId = await db.restaurantTable.findFirst({
      where: { id: tableId, deletedAt: null },
      select: { id: true, tableNumber: true, status: true, metadata: true },
    })
    if (byId) return byId
  }

  const cleanTable = tableNumber ? String(tableNumber).trim() : ''
  if (!cleanTable) return null

  const variants = buildTableNumberVariants(cleanTable)
  if (variants.length === 0) return null

  const candidates = await db.restaurantTable.findMany({
    where: {
      branchId,
      deletedAt: null,
      OR: variants.map((variant) => ({
        tableNumber: { equals: variant, mode: 'insensitive' },
      })),
    },
    select: { id: true, tableNumber: true, status: true, metadata: true },
  })

  if (candidates.length === 0) return null
  return findMatchingTable(candidates, cleanTable, tableId) || candidates[0]
}

/**
 * Checks whether a table currently has any active unbilled order in the current dining session.
 */
export async function hasActiveTableOrder(db: DbClient, tableId: string): Promise<boolean> {
  const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)

  const existingActiveOrder = await db.order.findFirst({
    where: {
      tableId,
      deletedAt: null,
      createdAt: { gte: sessionCutoff },
      isBilled: false,
      status: { in: [...ACTIVE_ORDER_DB_STATUSES] as any[] },
      paymentStatus: { notIn: ['completed', 'refunded', 'cancelled'] },
      NOT: [
        { bill: { status: 'PAID' } },
        { bill: { paymentStatus: 'completed' } },
        { tableBill: { status: 'PAID' } },
        { tableBill: { paymentStatus: 'completed' } },
      ],
    },
    select: { id: true },
  })

  return Boolean(existingActiveOrder)
}

/**
 * Validates table availability and atomically transitions it from 'available' -> 'occupied'
 * inside the caller's Prisma transaction for customer dine-in orders.
 */
export async function validateAndClaimDineInTable(
  tx: Prisma.TransactionClient,
  params: {
    table: ResolvedTableRecord
    isStaffPosOrder: boolean
  }
): Promise<void> {
  const { table, isStaffPosOrder } = params
  const existingMeta =
    table.metadata && typeof table.metadata === 'object'
      ? ({ ...(table.metadata as Record<string, any>) } as Record<string, any>)
      : {}
  const effectiveStatus = getEffectiveTableStatus(table.status, existingMeta)
  const occupiedSinceTime =
    existingMeta.occupiedSince ||
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  if (isStaffPosOrder) {
    if (effectiveStatus !== 'occupied') {
      delete existingMeta.customStatus
      await tx.restaurantTable.update({
        where: { id: table.id },
        data: {
          status: 'occupied',
          metadata: {
            ...existingMeta,
            occupiedSince: occupiedSinceTime,
          },
        },
      })
    }
    return
  }

  if (effectiveStatus !== 'available') {
    throw new TableBookingConflictError(
      formatUnavailableTableMessage(table.tableNumber, effectiveStatus),
      {
        statusCode: 409,
        code: effectiveStatus === 'occupied' ? 'TABLE_OCCUPIED' : 'TABLE_UNAVAILABLE',
        tableStatus: effectiveStatus,
        tableNumber: table.tableNumber,
      }
    )
  }

  const activeOrderExists = await hasActiveTableOrder(tx, table.id)
  if (activeOrderExists) {
    await tx.restaurantTable
      .updateMany({
        where: { id: table.id, status: 'available', deletedAt: null },
        data: {
          status: 'occupied',
          metadata: {
            ...existingMeta,
            occupiedSince: occupiedSinceTime,
          },
        },
      })
      .catch(() => {})

    throw new TableBookingConflictError(
      formatUnavailableTableMessage(table.tableNumber, 'occupied'),
      {
        statusCode: 409,
        code: 'TABLE_OCCUPIED',
        tableStatus: 'occupied',
        tableNumber: table.tableNumber,
      }
    )
  }

  delete existingMeta.customStatus
  const claimed = await tx.restaurantTable.updateMany({
    where: {
      id: table.id,
      deletedAt: null,
      status: 'available',
    },
    data: {
      status: 'occupied',
      metadata: {
        ...existingMeta,
        occupiedSince: occupiedSinceTime,
      },
    },
  })

  if (claimed.count === 0) {
    const latest = await tx.restaurantTable.findUnique({
      where: { id: table.id },
      select: { status: true, metadata: true },
    })
    const latestStatus = getEffectiveTableStatus(latest?.status, latest?.metadata)
    throw new TableBookingConflictError(
      formatUnavailableTableMessage(table.tableNumber, latestStatus),
      {
        statusCode: 409,
        code: latestStatus === 'occupied' ? 'TABLE_OCCUPIED' : 'TABLE_UNAVAILABLE',
        tableStatus: latestStatus,
        tableNumber: table.tableNumber,
      }
    )
  }
}

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
      const isOccupied = table.status === 'occupied'
      const activeOrder = isOccupied ? table.orders[0] : null

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        section: table.section,
        status: table.status,
        occupiedSince: isOccupied ? (activeOrder?.createdAt ?? null) : null,
        guestCount: isOccupied ? (activeOrder ? 4 : null) : null,
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
