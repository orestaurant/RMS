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
}

export interface TriggerAlertResult {
  triggered: boolean
  deduplicated?: boolean
  inventoryManagerAlertId?: string
  vendorAlertId?: string
  reason?: string
}

/**
 * Checks if raw material quantity is below minThreshold and triggers
 * atomic in-app dashboard notifications for both Inventory Manager and the assigned Vendor.
 *
 * Includes deduplication guard: avoids spamming duplicate unread notifications
 * if an unread LOW_STOCK_ALERT already exists for that item and vendor.
 */
export async function checkAndTriggerLowStockAlert(
  rawMaterial: RawMaterialAlertPayload
): Promise<TriggerAlertResult> {
  const currentQty = Number(rawMaterial.quantity)
  const minThreshold = Number(rawMaterial.minThreshold)

  // 1. Condition check: only trigger when quantity is strictly below threshold
  if (currentQty >= minThreshold) {
    return {
      triggered: false,
      reason: `Quantity (${currentQty}) is at or above minimum threshold (${minThreshold})`,
    }
  }

  try {
    // 2. Deduplication Guard:
    // Check if an unread LOW_STOCK_ALERT already exists for this raw material
    const existingUnread = await prisma.dashboardNotification.findFirst({
      where: {
        rawMaterialId: rawMaterial.id,
        type: 'LOW_STOCK_ALERT',
        isRead: false,
      },
    })

    if (existingUnread) {
      return {
        triggered: false,
        deduplicated: true,
        reason: `Unread low-stock alert already pending for material ${rawMaterial.sku}`,
      }
    }

    // 3. Resolve Vendor details if assigned
    let vendorName = 'Unassigned'
    if (rawMaterial.vendorId) {
      const vendorUser = await prisma.user.findUnique({
        where: { id: rawMaterial.vendorId },
        select: { id: true, name: true, email: true },
      })
      if (vendorUser?.name) {
        vendorName = vendorUser.name
      }
    }

    // 4. Resolve Inventory Manager user ID (if one exists)
    const invManager = await prisma.user.findFirst({
      where: {
        role: { in: ['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
        status: 'active',
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    })

    const metadata = {
      materialId: rawMaterial.id,
      materialName: rawMaterial.name,
      sku: rawMaterial.sku,
      currentQuantity: currentQty,
      minThreshold: minThreshold,
      weight: `${rawMaterial.weight} ${rawMaterial.weightUnit}`,
      weightUnit: rawMaterial.weightUnit,
      location: rawMaterial.location,
      vendorId: rawMaterial.vendorId || null,
      vendorName,
    }

    // 5. Atomically create notifications using Prisma transaction
    const notificationsToCreate: any[] = [
      // Inventory Manager Alert
      prisma.dashboardNotification.create({
        data: {
          recipientId: invManager?.id || null,
          recipientRole: 'INVENTORY_MANAGER',
          type: 'LOW_STOCK_ALERT',
          title: `⚠️ Low Stock Alert: ${rawMaterial.name}`,
          message: `${rawMaterial.name} at ${rawMaterial.location} is below threshold (${currentQty} left vs ${minThreshold} minimum). Assigned Vendor: ${vendorName}.`,
          rawMaterialId: rawMaterial.id,
          metadata,
          status: 'PENDING',
          isRead: false,
        },
      }),
    ]

    // Vendor Dashboard Alert (targeted specifically to assigned vendorId)
    if (rawMaterial.vendorId) {
      notificationsToCreate.push(
        prisma.dashboardNotification.create({
          data: {
            recipientId: rawMaterial.vendorId,
            recipientRole: 'VENDOR',
            type: 'LOW_STOCK_ALERT',
            title: `🚨 Urgent Restock Request: ${rawMaterial.name}`,
            message: `${rawMaterial.name} (${rawMaterial.weight} ${rawMaterial.weightUnit}) is running low at ${rawMaterial.location}. Current quantity is ${currentQty} (minimum: ${minThreshold}). Restocking requested.`,
            rawMaterialId: rawMaterial.id,
            metadata,
            status: 'PENDING',
            isRead: false,
          },
        })
      )
    }

    const created = await prisma.$transaction(notificationsToCreate)

    // Also mirror to shared in-memory notifications store for instant real-time bell feedback
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
      inventoryManagerAlertId: created[0]?.id,
      vendorAlertId: created[1]?.id,
    }
  } catch (error: any) {
    console.error('Error in checkAndTriggerLowStockAlert:', error)
    return {
      triggered: false,
      reason: error?.message || 'Database transaction failed',
    }
  }
}
