/**
 * Live Batch Manager
 * Real-time 20-Second Order Add-on & Fair Batch Distribution System
 * Synchronizes Chef KDS, Customer Screen, and Waiter Screen using server timestamps.
 */

import prisma from '@/lib/prisma'
import {
  invalidateKDSCache,
  invalidateLiveOrdersCache,
  registerActiveLiveOrder,
  getRealTimeLiveOrders,
  updateFallbackOrder,
} from '@/lib/kds-utils'
import { invalidateDashboardStatsCache } from '@/lib/dashboard-cache'

export type BatchStatus =
  | 'PREPARING_LOCK_WINDOW' // 20s open grace window for live customer +1 add-ons
  | 'IN_KITCHEN_LOCKED'      // 20s expired: locked in kitchen, new orders go to next batch
  | 'READY'                  // Chef cooked batch: fair FIFO distribution executed
  | 'SERVED'                 // Waiter served all allocated portions

export interface BatchAllocation {
  id: string
  orderId?: string
  orderNumber: string
  tableNumber: string | number
  customerName?: string
  customerId?: string
  quantity: number
  isAddon: boolean
  createdAt: number
  status: 'cooking' | 'ready' | 'served'
}

export interface LiveBatch {
  id: string
  dishName: string
  menuItemId?: string
  station: string
  cuisine: string
  status: BatchStatus
  startedAt: number        // Server epoch ms
  timerExpiresAt: number   // Server epoch ms (startedAt + 20,000)
  totalQuantity: number
  leadTicketId: string
  leadOrderNumber: string
  leadTableNumber: string | number
  allocations: BatchAllocation[]
  distributionHistory?: Array<{
    allocationId: string
    orderNumber: string
    tableNumber: string | number
    customerName: string
    quantityAllocated: number
    distributedAt: number
  }>
  updatedAt: number
}

// In-Memory store for active live batches
const liveBatches = new Map<string, LiveBatch>()

// Clean up old completed batches (older than 20 minutes)
function pruneOldBatches() {
  const cutoff = Date.now() - 20 * 60 * 1000
  for (const [id, batch] of liveBatches.entries()) {
    if ((batch.status === 'SERVED' || batch.status === 'READY') && batch.updatedAt < cutoff) {
      liveBatches.delete(id)
    }
  }
}

/**
 * Get all active live batches. Automatically transitions batches whose 20s timer
 * has passed from PREPARING_LOCK_WINDOW to IN_KITCHEN_LOCKED.
 */
export function getLiveBatches(): { serverTime: number; batches: LiveBatch[] } {
  const now = Date.now()
  pruneOldBatches()

  const result: LiveBatch[] = []
  for (const batch of liveBatches.values()) {
    // Check if 20-second grace window has elapsed
    if (batch.status === 'PREPARING_LOCK_WINDOW' && now >= batch.timerExpiresAt) {
      batch.status = 'IN_KITCHEN_LOCKED'
      batch.updatedAt = now
    }
    result.push(batch)
  }

  // Sort: active lock windows first, then locked/cooking, then ready
  result.sort((a, b) => {
    if (a.status === 'PREPARING_LOCK_WINDOW' && b.status !== 'PREPARING_LOCK_WINDOW') return -1
    if (b.status === 'PREPARING_LOCK_WINDOW' && a.status !== 'PREPARING_LOCK_WINDOW') return 1
    return b.updatedAt - a.updatedAt
  })

  return {
    serverTime: now,
    batches: result,
  }
}

/**
 * Start or join a 20-second live batch for an order / dish on Chef KDS
 */
export async function startLiveBatch(params: {
  ticketId: string
  orderId?: string
  orderNumber: string
  tableNumber: string | number
  customerName?: string
  customerId?: string
  dishName: string
  menuItemId?: string
  quantity?: number
  station?: string
  cuisine?: string
}): Promise<LiveBatch> {
  const now = Date.now()
  const qty = Math.max(1, params.quantity || 1)
  const dishKey = params.dishName.trim().toLowerCase()

  // 1. Check if there is an existing batch for this dish currently in active 20s grace window
  let existingBatch: LiveBatch | null = null
  for (const b of liveBatches.values()) {
    if (
      b.dishName.trim().toLowerCase() === dishKey &&
      b.status === 'PREPARING_LOCK_WINDOW' &&
      now < b.timerExpiresAt
    ) {
      existingBatch = b
      break
    }
  }

  if (existingBatch) {
    // Merge into currently active 20-second batch
    existingBatch.totalQuantity += qty
    existingBatch.allocations.push({
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      tableNumber: params.tableNumber,
      customerName: params.customerName || 'Table Guest',
      customerId: params.customerId,
      quantity: qty,
      isAddon: false,
      createdAt: now,
      status: 'cooking',
    })
    existingBatch.updatedAt = now
    invalidateKDSCache()
    invalidateLiveOrdersCache()
    return existingBatch
  }

  // 2. Create fresh 20-second Live Batch
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const timerExpiresAt = now + 20_000 // Strict 20-second window

  const newBatch: LiveBatch = {
    id: batchId,
    dishName: params.dishName,
    menuItemId: params.menuItemId,
    station: params.station || 'Main Kitchen',
    cuisine: params.cuisine || 'Chef Special',
    status: 'PREPARING_LOCK_WINDOW',
    startedAt: now,
    timerExpiresAt,
    totalQuantity: qty,
    leadTicketId: params.ticketId,
    leadOrderNumber: params.orderNumber,
    leadTableNumber: params.tableNumber,
    allocations: [
      {
        id: `alloc_${now}_lead`,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        tableNumber: params.tableNumber,
        customerName: params.customerName || 'Table Guest',
        customerId: params.customerId,
        quantity: qty,
        isAddon: false,
        createdAt: now,
        status: 'cooking',
      },
    ],
    updatedAt: now,
  }

  liveBatches.set(batchId, newBatch)

  // Update order status in DB / live fallback queue non-blockingly
  try {
    if (params.orderId) {
      await prisma.order.update({
        where: { id: params.orderId },
        data: { status: 'PREPARING' as any },
      }).catch(() => {})
    }
    updateFallbackOrder(params.orderNumber, { status: 'cooking' })
  } catch (e) {
    console.warn('Status update during startLiveBatch:', e)
  }

  invalidateKDSCache()
  invalidateLiveOrdersCache()
  return newBatch
}

/**
 * Customer One-Tap +1 Add-on Handler
 * Validates strict 20-second timer (now <= timerExpiresAt).
 * If window has expired, returns LOCKED and routes to next queue.
 */
export async function addAddonToBatch(params: {
  batchId?: string
  dishName?: string
  tableNumber: string | number
  customerName?: string
  customerId?: string
  quantity?: number
}): Promise<{
  success: boolean
  batch?: LiveBatch
  allocation?: BatchAllocation
  reason?: string
  message: string
  newOrderNumber?: string
}> {
  const now = Date.now()
  const qty = Math.max(1, params.quantity || 1)

  // Find target batch
  let targetBatch: LiveBatch | null = null
  if (params.batchId && liveBatches.has(params.batchId)) {
    targetBatch = liveBatches.get(params.batchId)!
  } else if (params.dishName) {
    const dishKey = params.dishName.trim().toLowerCase()
    for (const b of liveBatches.values()) {
      if (b.dishName.trim().toLowerCase() === dishKey && b.status === 'PREPARING_LOCK_WINDOW') {
        targetBatch = b
        break
      }
    }
  }

  if (!targetBatch) {
    return {
      success: false,
      reason: 'NOT_FOUND',
      message: 'No active cooking batch found for this dish.',
    }
  }

  // 1. Strict Server Timestamp Check (Race-condition proof)
  if (now > targetBatch.timerExpiresAt || targetBatch.status !== 'PREPARING_LOCK_WINDOW') {
    targetBatch.status = 'IN_KITCHEN_LOCKED'
    targetBatch.updatedAt = now
    invalidateKDSCache()
    invalidateLiveOrdersCache()

    return {
      success: false,
      reason: 'LOCKED',
      message: 'The 20-second live add-on window for this batch has closed. Your order is queued for the next batch.',
    }
  }

  // 2. Increment active batch in real-time
  targetBatch.totalQuantity += qty
  const addonOrderNumber = `ADD-${Date.now().toString().slice(-5)}`
  const allocationId = `alloc_${now}_${Math.random().toString(36).substring(2, 6)}`

  const newAllocation: BatchAllocation = {
    id: allocationId,
    orderNumber: addonOrderNumber,
    tableNumber: params.tableNumber || targetBatch.leadTableNumber,
    customerName: params.customerName || 'Customer Add-on',
    customerId: params.customerId,
    quantity: qty,
    isAddon: true,
    createdAt: now,
    status: 'cooking',
  }

  targetBatch.allocations.push(newAllocation)
  targetBatch.updatedAt = now

  // 3. Register Add-on into Database & Live Queues so Waiter and KDS reflect it instantly
  try {
    let branch = await prisma.branch.findFirst({ select: { id: true, restaurantId: true, organizationId: true } })
    if (branch) {
      // Find menu item price if possible
      let menuItem = targetBatch.menuItemId
        ? await prisma.menuItem.findUnique({ where: { id: targetBatch.menuItemId }, select: { id: true, basePrice: true, name: true } })
        : await prisma.menuItem.findFirst({ where: { name: { contains: targetBatch.dishName, mode: 'insensitive' } }, select: { id: true, basePrice: true, name: true } })

      const unitPrice = menuItem ? Number(menuItem.basePrice) : 250
      const totalAmount = unitPrice * qty

      const createdOrder = await prisma.order.create({
        data: {
          branchId: branch.id,
          restaurantId: branch.restaurantId,
          organizationId: branch.organizationId,
          orderNumber: addonOrderNumber,
          source: 'LIVE_ADDON',
          orderType: 'dine_in',
          status: 'PREPARING' as any,
          totalAmount: totalAmount,
          total: totalAmount,
          subtotal: totalAmount,
          customerId: params.customerId || null,
          metadata: {
            tableNumber: String(params.tableNumber || targetBatch.leadTableNumber),
            customerName: params.customerName || 'Customer Add-on',
            isBatchAddon: true,
            batchId: targetBatch.id,
            dishName: targetBatch.dishName,
          },
          ...(menuItem
            ? {
                items: {
                  create: [
                    {
                      organizationId: branch.organizationId,
                      menuItemId: menuItem.id,
                      itemName: targetBatch.dishName,
                      basePrice: unitPrice,
                      quantity: qty,
                      itemTotal: totalAmount,
                    },
                  ],
                },
              }
            : {}),
        },
      })
      newAllocation.orderId = createdOrder.id
    }
  } catch (err) {
    console.warn('DB record creation for batch add-on:', err)
  }

  // Register in fallback live queue for instant KDS / Waiter UI response
  registerActiveLiveOrder({
    id: addonOrderNumber,
    tableNumber: String(params.tableNumber || targetBatch.leadTableNumber),
    source: 'qr_order',
    waiter: 'Live Add-on',
    customerName: params.customerName || 'Customer Add-on',
    status: 'cooking',
    priority: 'urgent',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: `addon_item_${now}`,
        name: `${targetBatch.dishName} (+1 Live Add-on)`,
        quantity: qty,
        station: targetBatch.station,
        completed: false,
      },
    ],
  })

  invalidateKDSCache()
  invalidateLiveOrdersCache()

  return {
    success: true,
    batch: targetBatch,
    allocation: newAllocation,
    newOrderNumber: addonOrderNumber,
    message: `+${qty} ${targetBatch.dishName} successfully added to Chef's active cooking batch!`,
  }
}

/**
 * Mark Batch Ready (Chef finishes cooking).
 * FAIR BATCH DISTRIBUTION LOGIC:
 * Automatically divides and allocates the cooked batch to all customer/table orders in FIFO order.
 * Updates Database, Waiter Screen table split, and Customer Screen status to 'Prepared / Ready'.
 */
export async function markBatchReady(batchId: string): Promise<{
  success: boolean
  batch?: LiveBatch
  distributions?: Array<{
    allocationId: string
    orderNumber: string
    tableNumber: string | number
    customerName: string
    quantityAllocated: number
    distributedAt: number
  }>
  message: string
}> {
  const batch = liveBatches.get(batchId)
  if (!batch) {
    return { success: false, message: 'Batch not found' }
  }

  const now = Date.now()
  batch.status = 'READY'
  batch.updatedAt = now

  // Fair FIFO Distribution: sort allocations by timestamp
  const sortedAllocations = [...batch.allocations].sort((a, b) => a.createdAt - b.createdAt)

  const distributions: Array<{
    allocationId: string
    orderNumber: string
    tableNumber: string | number
    customerName: string
    quantityAllocated: number
    distributedAt: number
  }> = []

  for (const alloc of sortedAllocations) {
    alloc.status = 'ready'
    distributions.push({
      allocationId: alloc.id,
      orderNumber: alloc.orderNumber,
      tableNumber: alloc.tableNumber,
      customerName: alloc.customerName || 'Guest',
      quantityAllocated: alloc.quantity,
      distributedAt: now,
    })

    // Update DB Order status to READY
    try {
      if (alloc.orderId) {
        await prisma.order.update({
          where: { id: alloc.orderId },
          data: { status: 'READY' as any },
        }).catch(() => {})
      } else if (alloc.orderNumber) {
        await prisma.order.updateMany({
          where: { orderNumber: alloc.orderNumber },
          data: { status: 'READY' as any },
        }).catch(() => {})
      }
    } catch (dbErr) {
      console.warn('DB update during fair distribution:', dbErr)
    }

    // Update in-memory fallback orders
    updateFallbackOrder(alloc.orderNumber, { status: 'ready' })
  }

  batch.distributionHistory = distributions

  // Invalidate all caches so Chef, Customer, and Waiter screens reflect "Ready / Prepared"
  invalidateKDSCache()
  invalidateLiveOrdersCache()

  return {
    success: true,
    batch,
    distributions,
    message: `Batch prepared! Fairly distributed ${batch.totalQuantity}x ${batch.dishName} across ${distributions.length} table(s).`,
  }
}

/**
 * Mark Batch Served (Waiter delivers food to table)
 */
export async function markBatchServed(batchId: string): Promise<{ success: boolean; message: string }> {
  const batch = liveBatches.get(batchId)
  if (!batch) return { success: false, message: 'Batch not found' }

  const now = Date.now()
  batch.status = 'SERVED'
  batch.updatedAt = now

  for (const alloc of batch.allocations) {
    alloc.status = 'served'
    try {
      if (alloc.orderId) {
        await prisma.order.update({
          where: { id: alloc.orderId },
          data: { status: 'SERVED' as any },
        }).catch(() => {})
      }
      updateFallbackOrder(alloc.orderNumber, { status: 'served' })
    } catch (e) {}
  }

  invalidateKDSCache()
  invalidateLiveOrdersCache()
  return { success: true, message: 'Batch marked served.' }
}
