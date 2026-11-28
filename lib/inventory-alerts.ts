import prisma from '@/lib/prisma'
import { addNotification } from '@/lib/notifications-store'

export interface RawMaterialAlertPayload {
  id: string
  name: string
  sku: string
  quantity: number
  weight: number
  weightUnit: string
  location: string
  minThreshold: number
  vendorId?: string | null
  vendorName?: string | null
}

export interface TriggerAlertResult {
  triggered: boolean
  deduplicated?: boolean
  inventoryManagerAlertId?: string
  vendorAlertId?: string
  reason?: string
}

// Short-TTL in-memory cache for primary inventory manager user ID
let cachedInvManager: { id: string | null; expiresAt: number } | null = null

async function getPrimaryInventoryManagerId(): Promise<string | null> {
  if (cachedInvManager && Date.now() < cachedInvManager.expiresAt) {
    return cachedInvManager.id
  }
  const invManager = await prisma.user.findFirst({
    where: {
      role: { in: ['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
      status: 'active',
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  const id = invManager?.id || null
  cachedInvManager = { id, expiresAt: Date.now() + 60_000 }
  return id
}

/**
 * Checks if raw material quantity is at or below minThreshold and triggers
 * atomic in-app dashboard notifications for both Inventory Manager and the assigned Vendor.
 *
 * Uses per-recipient active-cycle deduplication (`status != 'RESTOCK_COMPLETED'`)
 * so completed restocks never block future low-stock alerts, while preventing
 * duplicate alerts while an open request is already active.
 */
export async function checkAndTriggerLowStockAlert(
  rawMaterial: RawMaterialAlertPayload
): Promise<TriggerAlertResult> {
  const currentQty = Number(rawMaterial.quantity)
  const minThreshold = Number(rawMaterial.minThreshold)

  // 1. Condition check: trigger when quantity is at or below minThreshold (matches UI low-stock / critical)
  if (!Number.isFinite(currentQty) || !Number.isFinite(minThreshold) || currentQty > minThreshold) {
    return {
      triggered: false,
      reason: `Quantity (${currentQty}) is above minimum threshold (${minThreshold})`,
    }
  }

  try {
    const targetVendorId = rawMaterial.vendorId || null

    // 2. Parallel lookup: active non-completed alerts + vendor name (if not provided) + manager ID
    const [activeAlerts, resolvedVendor, invManagerId] = await Promise.all([
      prisma.dashboardNotification.findMany({
        where: {
          rawMaterialId: rawMaterial.id,
          type: 'LOW_STOCK_ALERT',
          status: { not: 'RESTOCK_COMPLETED' },
        },
        select: {
          id: true,
          recipientRole: true,
          recipientId: true,
        },
      }),
      targetVendorId && !rawMaterial.vendorName
        ? prisma.user.findUnique({
            where: { id: targetVendorId },
            select: { name: true },
          })
        : Promise.resolve(null),
      getPrimaryInventoryManagerId(),
    ])

    const hasActiveManagerAlert = activeAlerts.some(
      (a) => a.recipientRole === 'INVENTORY_MANAGER'
    )
    const hasActiveVendorAlert = targetVendorId
      ? activeAlerts.some(
          (a) => a.recipientRole === 'VENDOR' && a.recipientId === targetVendorId
        )
      : true

    if (hasActiveManagerAlert && hasActiveVendorAlert) {
      return {
        triggered: false,
        deduplicated: true,
        reason: `Active low-stock alert already pending for material ${rawMaterial.sku}`,
      }
    }

    const vendorName = rawMaterial.vendorName || resolvedVendor?.name || 'Unassigned'

    const metadata = {
      materialId: rawMaterial.id,
      materialName: rawMaterial.name,
      sku: rawMaterial.sku,
      currentQuantity: currentQty,
      minThreshold: minThreshold,
      weight: `${rawMaterial.weight} ${rawMaterial.weightUnit}`,
      weightUnit: rawMaterial.weightUnit,
      location: rawMaterial.location,
      vendorId: targetVendorId,
      vendorName,
    }

    // 3. Create only missing active alerts in one atomic round-trip
    const creates: Array<{ role: 'INVENTORY_MANAGER' | 'VENDOR'; op: any }> = []

    if (!hasActiveManagerAlert) {
      creates.push({
        role: 'INVENTORY_MANAGER',
        op: prisma.dashboardNotification.create({
          data: {
            recipientId: invManagerId,
            recipientRole: 'INVENTORY_MANAGER',
            type: 'LOW_STOCK_ALERT',
            title: `⚠️ Low Stock Alert: ${rawMaterial.name}`,
            message: `${rawMaterial.name} at ${rawMaterial.location} is at/below threshold (${currentQty} left vs ${minThreshold} minimum). Assigned Vendor: ${vendorName}.`,
            rawMaterialId: rawMaterial.id,
            metadata,
            status: 'PENDING',
            isRead: false,
          },
          select: { id: true },
        }),
      })
    }

    if (targetVendorId && !hasActiveVendorAlert) {
      creates.push({
        role: 'VENDOR',
        op: prisma.dashboardNotification.create({
          data: {
            recipientId: targetVendorId,
            recipientRole: 'VENDOR',
            type: 'LOW_STOCK_ALERT',
            title: `🚨 Urgent Restock Request: ${rawMaterial.name}`,
            message: `${rawMaterial.name} (${rawMaterial.weight} ${rawMaterial.weightUnit}) is running low at ${rawMaterial.location}. Current quantity is ${currentQty} (minimum: ${minThreshold}). Restocking requested.`,
            rawMaterialId: rawMaterial.id,
            metadata,
            status: 'PENDING',
            isRead: false,
          },
          select: { id: true },
        }),
      })
    }

    const created =
      creates.length === 1
        ? [await creates[0].op]
        : await prisma.$transaction(creates.map((c) => c.op))

    const managerIdx = creates.findIndex((c) => c.role === 'INVENTORY_MANAGER')
    const vendorIdx = creates.findIndex((c) => c.role === 'VENDOR')

    // Mirror to shared in-memory notifications store for instant bell feedback
    try {
      addNotification({
        type: 'alert',
        title: `⚠️ Low Inventory: ${rawMaterial.name}`,
        body: `${rawMaterial.name} is down to ${currentQty} at ${rawMaterial.location}. Restock notification dispatched to ${vendorName}.`,
        metadata: {
          materialName: rawMaterial.name,
          sku: rawMaterial.sku,
        } as any,
      })
    } catch {
      // In-memory mirror failure should not impact DB persistence
    }

    return {
      triggered: true,
      inventoryManagerAlertId: managerIdx >= 0 ? created[managerIdx]?.id : undefined,
      vendorAlertId: vendorIdx >= 0 ? created[vendorIdx]?.id : undefined,
    }
  } catch (error: any) {
    console.error('Error in checkAndTriggerLowStockAlert:', error)
    return {
      triggered: false,
      reason: error?.message || 'Database transaction failed',
    }
  }
}
