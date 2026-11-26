/**
 * Real-Time Notifications Store & Persistent Service
 * Tracks kitchen order preparation alerts, new incoming table orders, and cashier invoices
 * with in-memory caching, deduplication, and PostgreSQL (prisma.notification) persistence.
 */

import prisma from '@/lib/prisma'
import { getRealTimeLiveOrders } from '@/lib/kds-utils'

export interface AppNotification {
  id: string
  type: 'order_prepared' | 'new_order' | 'bill_generated' | 'payment_received' | 'alert'
  title: string
  body: string
  time: string
  read: boolean
  createdAt: string
  customerId?: string | null
  organizationId?: string | null
  metadata?: {
    orderId?: string
    orderNumber?: string
    tableNumber?: string
    billNumber?: string
    billId?: string
    amount?: number
    customerId?: string | null
    itemsSummary?: string | null
    materialName?: string
    sku?: string
    actionUrl?: string
  }
}

export interface NotifyOrderPreparedInput {
  orderId?: string | null
  orderNumber: string
  tableNumber?: string | null
  customerName?: string | null
  customerId?: string | null
  organizationId?: string | null
  itemsSummary?: string | null
}

const FEED_CACHE_TTL_MS = 3_000
const READY_DEDUP_TTL_MS = 60_000
const NEW_ORDER_ALLOWED_ROLES = new Set([
  'WAITER',
  'ADMIN',
  'SUPER_ADMIN',
  'SUPERADMIN',
  'MANAGER',
])

let notificationsStore: AppNotification[] = []
const staffFeedCache = new Map<string, { data: AppNotification[]; timestamp: number }>()
const recentReadyDedup = new Map<string, number>()
let cachedDefaultOrgId: string | null = null

export function formatTimeAgo(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractTitleOrderRef(title?: string | null): string | null {
  if (!title) return null
  const match = title.match(/#([A-Z0-9]+-[A-Z0-9-]+|[A-Z0-9]{4,})/i)
  return match?.[1] ? match[1].trim() : null
}

function notificationMatchesOrderKeys(
  notif: AppNotification,
  keysLower: Set<string>
): boolean {
  if (keysLower.size === 0) return false
  const ordId = notif.metadata?.orderId ? String(notif.metadata.orderId).trim().toLowerCase() : ''
  if (ordId && keysLower.has(ordId)) return true

  const ordNum = notif.metadata?.orderNumber
    ? String(notif.metadata.orderNumber).trim().toLowerCase()
    : ''
  if (ordNum && keysLower.has(ordNum)) return true

  const titleRef = extractTitleOrderRef(notif.title)?.toLowerCase()
  if (titleRef && keysLower.has(titleRef)) return true

  const titleLower = (notif.title || '').toLowerCase()
  for (const key of keysLower) {
    if (titleLower.includes(`#${key}`)) return true
  }
  return false
}

export function invalidateNotificationCache(organizationId?: string | null): void {
  if (!organizationId) {
    staffFeedCache.clear()
    return
  }
  for (const key of staffFeedCache.keys()) {
    if (key.startsWith(`${organizationId}:`) || key.startsWith('all:')) {
      staffFeedCache.delete(key)
    }
  }
}

async function resolveOrganizationId(explicitOrgId?: string | null): Promise<string | null> {
  if (explicitOrgId) return explicitOrgId
  if (cachedDefaultOrgId) return cachedDefaultOrgId
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } })
    if (org?.id) {
      cachedDefaultOrgId = org.id
      return org.id
    }
  } catch {
    // Graceful fallback when DB is unavailable
  }
  return null
}

function pruneReadyDedup(): void {
  if (recentReadyDedup.size <= 300) return
  const cutoff = Date.now() - READY_DEDUP_TTL_MS
  for (const [k, ts] of recentReadyDedup.entries()) {
    if (ts < cutoff) recentReadyDedup.delete(k)
  }
}

export function getNotificationsList(limit: number = 20): AppNotification[] {
  return notificationsStore.slice(0, limit)
}

export function addNotification(
  notif: Omit<AppNotification, 'id' | 'createdAt' | 'time' | 'read'> & {
    id?: string
    createdAt?: string
    time?: string
    read?: boolean
  }
): AppNotification {
  if (notif.type === 'order_prepared' && notif.metadata?.orderNumber) {
    const existing = notificationsStore.find(
      (n) =>
        n.type === 'order_prepared' &&
        n.metadata?.orderNumber === notif.metadata?.orderNumber
    )
    if (existing) {
      return existing
    }
  }

  const newNotif: AppNotification = {
    ...notif,
    id: notif.id || `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    read: notif.read ?? false,
    time: notif.time || 'Just now',
    createdAt: notif.createdAt || new Date().toISOString(),
  }
  notificationsStore.unshift(newNotif)
  if (notificationsStore.length > 50) {
    notificationsStore = notificationsStore.slice(0, 50)
  }
  invalidateNotificationCache(notif.organizationId)
  return newNotif
}

export function markOrderPreparedReadInStore(orderNumberOrId: string): void {
  const key = orderNumberOrId.trim().toLowerCase()
  if (!key) return
  notificationsStore = notificationsStore.map((n) => {
    if (n.type !== 'order_prepared') return n
    const ordNum = (n.metadata?.orderNumber || '').toLowerCase()
    const ordId = (n.metadata?.orderId || '').toLowerCase()
    if (ordNum === key || ordId === key) {
      return { ...n, read: true }
    }
    return n
  })
}

export function markAsRead(id?: string): void {
  if (!id || id === 'all') {
    notificationsStore = notificationsStore.map((n) => ({ ...n, read: true }))
  } else {
    notificationsStore = notificationsStore.map((n) => (n.id === id ? { ...n, read: true } : n))
  }
}

export function clearAllNotifications(): void {
  notificationsStore = []
}

/**
 * Emits an idempotent `order_prepared` notification for Waiters, Staff & the Customer.
 * Persists to PostgreSQL and updates the in-memory store for instant delivery.
 */
export async function notifyOrderPrepared(
  input: NotifyOrderPreparedInput
): Promise<AppNotification> {
  const cleanOrderNum = String(input.orderNumber || input.orderId || '').trim()
  const dedupKey = `${input.organizationId || 'all'}:${cleanOrderNum.toLowerCase()}`
  const now = Date.now()

  const lastSent = recentReadyDedup.get(dedupKey)
  if (lastSent && now - lastSent < READY_DEDUP_TTL_MS) {
    const existingInStore = getNotificationsList(30).find(
      (n) =>
        n.type === 'order_prepared' &&
        (n.metadata?.orderNumber || '').toLowerCase() === cleanOrderNum.toLowerCase()
    )
    if (existingInStore) {
      return existingInStore
    }
  }

  recentReadyDedup.set(dedupKey, now)
  pruneReadyDedup()

  const tableLabel = input.tableNumber ? String(input.tableNumber).trim() : 'Table'
  const title = `🔥 Order #${cleanOrderNum} Prepared & Ready!`
  const body = `${tableLabel} — ${
    input.itemsSummary || 'Food items are prepared and ready to serve'
  }. Waitstaff & customer alerted.`

  const metadata = {
    orderId: input.orderId || undefined,
    orderNumber: cleanOrderNum,
    tableNumber: tableLabel,
    customerId: input.customerId || null,
    itemsSummary: input.itemsSummary || null,
  }

  let dbId: string | undefined
  let createdAtIso: string | undefined
  let existingRead = false

  try {
    const orgId = await resolveOrganizationId(input.organizationId)
    if (orgId) {
      const existingDb = await prisma.notification.findFirst({
        where: {
          organizationId: orgId,
          notificationType: 'order_prepared',
          deletedAt: null,
          title,
          createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
        select: { id: true, createdAt: true, isRead: true },
      })

      if (existingDb) {
        dbId = existingDb.id
        createdAtIso = existingDb.createdAt.toISOString()
        existingRead = Boolean(existingDb.isRead)
      } else {
        const created = await prisma.notification.create({
          data: {
            organizationId: orgId,
            notificationType: 'order_prepared',
            title,
            message: body,
            data: metadata as any,
            isRead: false,
          },
          select: { id: true, createdAt: true },
        })
        dbId = created.id
        createdAtIso = created.createdAt.toISOString()
      }
    }
  } catch (err) {
    console.warn('Notification DB persistence fallback:', (err as any)?.message)
  }

  return addNotification({
    id: dbId,
    type: 'order_prepared',
    title,
    body,
    read: existingRead,
    customerId: input.customerId || null,
    organizationId: input.organizationId || null,
    metadata,
    createdAt: createdAtIso,
  })
}

/**
 * Creates and persists any staff/system notification (bill alerts, new orders, etc.)
 */
export async function createPersistentNotification(input: {
  type: AppNotification['type']
  title: string
  body: string
  customerId?: string | null
  organizationId?: string | null
  metadata?: AppNotification['metadata']
}): Promise<AppNotification> {
  let dbId: string | undefined
  let createdAtIso: string | undefined

  try {
    const orgId = await resolveOrganizationId(input.organizationId)
    if (orgId) {
      const created = await prisma.notification.create({
        data: {
          organizationId: orgId,
          notificationType: input.type,
          title: input.title,
          message: input.body,
          data: (input.metadata || {}) as any,
          isRead: false,
        },
        select: { id: true, createdAt: true },
      })
      dbId = created.id
      createdAtIso = created.createdAt.toISOString()
    }
  } catch (err) {
    console.warn('Custom notification DB persistence fallback:', (err as any)?.message)
  }

  return addNotification({
    id: dbId,
    type: input.type,
    title: input.title,
    body: input.body,
    customerId: input.customerId || null,
    organizationId: input.organizationId || null,
    metadata: input.metadata,
    createdAt: createdAtIso,
  })
}

/**
 * Marks matching order_prepared notifications as read when an order is served.
 */
export async function markOrderPreparedNotificationsRead(
  orderNumberOrId?: string | null,
  organizationId?: string | null
): Promise<void> {
  if (!orderNumberOrId) return
  const key = String(orderNumberOrId).trim()
  if (!key) return

  markOrderPreparedReadInStore(key)

  try {
    await prisma.notification.updateMany({
      where: {
        notificationType: 'order_prepared',
        isRead: false,
        deletedAt: null,
        ...(organizationId ? { organizationId } : {}),
        OR: [
          { title: { contains: `#${key}` } },
          { data: { path: ['orderNumber'], equals: key } },
          { data: { path: ['orderId'], equals: key } },
        ],
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  } catch {
    // Best-effort DB sync
  }

  invalidateNotificationCache(organizationId)
}

/**
 * Removes all notifications (new_order, order_prepared, etc.) associated with a deleted or cancelled order
 * across the in-memory store, deduplication cache, feed cache, and PostgreSQL.
 */
export async function removeOrderNotifications(params: {
  orderId?: string | null
  orderNumber?: string | null
  organizationId?: string | null
}): Promise<void> {
  const rawKeys = [params.orderId, params.orderNumber]
    .map((v) => (v ? String(v).trim() : ''))
    .filter(Boolean)
  if (rawKeys.length === 0) return

  const uniqueKeys = Array.from(new Set(rawKeys))
  const keysLower = new Set(uniqueKeys.map((k) => k.toLowerCase()))

  notificationsStore = notificationsStore.filter((n) => !notificationMatchesOrderKeys(n, keysLower))
  for (const dedupKey of recentReadyDedup.keys()) {
    const [, dedupOrd] = dedupKey.split(':')
    if (dedupOrd && keysLower.has(dedupOrd.toLowerCase())) {
      recentReadyDedup.delete(dedupKey)
    }
  }
  invalidateNotificationCache(params.organizationId)

  const orClauses: any[] = []
  for (const key of uniqueKeys) {
    orClauses.push({ data: { path: ['orderNumber'], equals: key } })
    orClauses.push({ data: { path: ['orderId'], equals: key } })
    orClauses.push({ title: { contains: `#${key}`, mode: 'insensitive' } })
  }

  try {
    await prisma.notification.updateMany({
      where: {
        deletedAt: null,
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        OR: orClauses,
      },
      data: {
        deletedAt: new Date(),
      },
    })
  } catch {
    // Best-effort DB sync
  }

  invalidateNotificationCache(params.organizationId)
}

/**
 * Marks one or all notifications as read across memory and PostgreSQL.
 */
export async function markNotificationsReadInDb(
  id?: string,
  organizationId?: string | null
): Promise<void> {
  markAsRead(id)

  try {
    if (!id || id === 'all') {
      await prisma.notification.updateMany({
        where: {
          isRead: false,
          deletedAt: null,
          ...(organizationId ? { organizationId } : {}),
        },
        data: { isRead: true, readAt: new Date() },
      })
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      await prisma.notification.updateMany({
        where: { id, deletedAt: null },
        data: { isRead: true, readAt: new Date() },
      })
    }
  } catch {
    // Graceful fallback
  }

  invalidateNotificationCache(organizationId)
}

export async function clearNotificationsInDb(organizationId?: string | null): Promise<void> {
  clearAllNotifications()
  try {
    await prisma.notification.updateMany({
      where: {
        deletedAt: null,
        ...(organizationId ? { organizationId } : {}),
      },
      data: { deletedAt: new Date() },
    })
  } catch {
    // Graceful fallback
  }
  invalidateNotificationCache(organizationId)
}

function mapDbNotification(notif: any): AppNotification {
  const dataObj = (notif.data && typeof notif.data === 'object' ? notif.data : {}) as Record<string, any>
  return {
    id: notif.id,
    type: (notif.notificationType || 'alert') as AppNotification['type'],
    title: notif.title || 'Notification',
    body: notif.message || '',
    time: formatTimeAgo(notif.createdAt),
    read: Boolean(notif.isRead),
    createdAt: notif.createdAt.toISOString(),
    customerId: dataObj.customerId ?? null,
    organizationId: notif.organizationId ?? null,
    metadata: {
      orderId: dataObj.orderId,
      orderNumber: dataObj.orderNumber,
      tableNumber: dataObj.tableNumber,
      billNumber: dataObj.billNumber,
      billId: dataObj.billId,
      amount: dataObj.amount,
      customerId: dataObj.customerId ?? null,
      itemsSummary: dataObj.itemsSummary ?? null,
      materialName: dataObj.materialName,
      sku: dataObj.sku,
      actionUrl: dataObj.actionUrl,
    },
  }
}

/**
 * Returns the staff/waiter notifications feed with short-TTL caching.
 * Automatically surfaces any active READY orders from DB/memory if not yet persisted as a notification.
 */
export async function getStaffNotificationsFeed(options: {
  organizationId?: string | null
  role?: string | null
  limit?: number
}): Promise<{ notifications: AppNotification[]; unreadCount: number; cacheHit: boolean }> {
  const limit = Math.min(Math.max(options.limit || 20, 1), 50)
  const roleUpper = (options.role || '').toUpperCase().trim()
  const canSeeNewOrder = !roleUpper || NEW_ORDER_ALLOWED_ROLES.has(roleUpper)
  const cacheKey = `${options.organizationId || 'all'}:${canSeeNewOrder ? 'with-new' : 'no-new'}`
  const cached = staffFeedCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < FEED_CACHE_TTL_MS) {
    const sliced = cached.data.slice(0, limit).map((n) => ({
      ...n,
      time: formatTimeAgo(n.createdAt),
    }))
    return {
      notifications: sliced,
      unreadCount: sliced.filter((n) => !n.read).length,
      cacheHit: true,
    }
  }

  let dbNotifs: AppNotification[] = []
  let activeReadyOrders: any[] = []

  try {
    const [records, readyOrders] = await Promise.all([
      prisma.notification.findMany({
        where: {
          deletedAt: null,
          ...(options.organizationId ? { organizationId: options.organizationId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.max(limit, 25),
      }),
      prisma.order.findMany({
        where: {
          deletedAt: null,
          status: { in: ['ready', 'READY'] as any },
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
          ...(options.organizationId ? { organizationId: options.organizationId } : {}),
        },
        select: {
          id: true,
          orderNumber: true,
          organizationId: true,
          customerId: true,
          vehicleNumber: true,
          preparedAt: true,
          updatedAt: true,
          createdAt: true,
          metadata: true,
          table: { select: { tableNumber: true } },
          items: { select: { itemName: true, quantity: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
    ])

    dbNotifs = records.map(mapDbNotification)
    activeReadyOrders = readyOrders
  } catch {
    // Fallback gracefully to in-memory store
  }

  const storeNotifs = getNotificationsList(Math.max(limit, 30)).filter(
    (n) =>
      !options.organizationId ||
      !n.organizationId ||
      n.organizationId === options.organizationId
  )

  // Self-healing orphan check: drop any notifications whose linked order was deleted or cancelled
  const deadOrderKeys = new Set<string>()
  try {
    const refIds = new Set<string>()
    const refNumbers = new Set<string>()
    for (const n of [...dbNotifs, ...storeNotifs]) {
      const ordId = n.metadata?.orderId ? String(n.metadata.orderId).trim() : ''
      const ordNum = n.metadata?.orderNumber ? String(n.metadata.orderNumber).trim() : ''
      const titleRef = extractTitleOrderRef(n.title)
      if (ordId && UUID_REGEX.test(ordId)) refIds.add(ordId)
      if (ordNum) refNumbers.add(ordNum)
      if (titleRef) refNumbers.add(titleRef)
    }

    if (refIds.size > 0 || refNumbers.size > 0) {
      const deadOrders = await prisma.order.findMany({
        where: {
          AND: [
            {
              OR: [
                ...(refIds.size > 0 ? [{ id: { in: Array.from(refIds) } }] : []),
                ...(refNumbers.size > 0 ? [{ orderNumber: { in: Array.from(refNumbers) } }] : []),
              ],
            },
            {
              OR: [
                { deletedAt: { not: null } },
                { status: { in: ['cancelled', 'CANCELLED'] as any[] } },
              ],
            },
          ],
        },
        select: { id: true, orderNumber: true },
      })

      for (const ord of deadOrders) {
        if (ord.id) deadOrderKeys.add(ord.id.toLowerCase())
        if (ord.orderNumber) deadOrderKeys.add(ord.orderNumber.toLowerCase())
      }

      if (deadOrderKeys.size > 0) {
        notificationsStore = notificationsStore.filter(
          (n) => !notificationMatchesOrderKeys(n, deadOrderKeys)
        )
        const staleDbIds = dbNotifs
          .filter((n) => UUID_REGEX.test(n.id) && notificationMatchesOrderKeys(n, deadOrderKeys))
          .map((n) => n.id)
        if (staleDbIds.length > 0) {
          prisma.notification
            .updateMany({
              where: { id: { in: staleDbIds }, deletedAt: null },
              data: { deletedAt: new Date() },
            })
            .catch(() => {})
        }
      }
    }
  } catch {
    // Non-blocking orphan check
  }

  const merged: AppNotification[] = []
  const seenIds = new Set<string>()
  const seenReadyOrders = new Set<string>()

  const pushUnique = (n: AppNotification) => {
    if (!canSeeNewOrder && n.type === 'new_order') return
    if (deadOrderKeys.size > 0 && notificationMatchesOrderKeys(n, deadOrderKeys)) return
    if (seenIds.has(n.id)) return
    if (n.type === 'order_prepared' && n.metadata?.orderNumber) {
      const ordKey = n.metadata.orderNumber.toLowerCase()
      if (seenReadyOrders.has(ordKey)) return
      seenReadyOrders.add(ordKey)
    }
    seenIds.add(n.id)
    merged.push({ ...n, time: formatTimeAgo(n.createdAt) })
  }

  for (const dbn of dbNotifs) pushUnique(dbn)
  for (const stn of storeNotifs) pushUnique(stn)

  const missingReadyOrders = activeReadyOrders.filter((ord) => {
    const ordNum = String(ord.orderNumber || ord.id).trim()
    return ordNum && !seenReadyOrders.has(ordNum.toLowerCase())
  })

  if (missingReadyOrders.length > 0) {
    const synthesizedResults = await Promise.allSettled(
      missingReadyOrders.map(async (ord) => {
        const ordNum = String(ord.orderNumber || ord.id).trim()
        const meta = (ord.metadata && typeof ord.metadata === 'object' ? ord.metadata : {}) as Record<string, any>
        const tableNum =
          ord.table?.tableNumber ||
          (ord.vehicleNumber ? `🚗 ${ord.vehicleNumber}` : null) ||
          meta.tableNumber ||
          'Table'
        const itemsSummary =
          Array.isArray(ord.items) && ord.items.length > 0
            ? ord.items.map((i: any) => `${i.quantity}× ${i.itemName}`).join(', ')
            : 'Food items are prepared and ready to serve'
        const ts = ord.preparedAt || ord.updatedAt || ord.createdAt || new Date()

        const synthesized = await notifyOrderPrepared({
          orderId: ord.id,
          orderNumber: ordNum,
          tableNumber: String(tableNum),
          customerName: meta.customerName || null,
          customerId: ord.customerId || null,
          organizationId: ord.organizationId || options.organizationId || null,
          itemsSummary,
        })

        return {
          ...synthesized,
          createdAt: synthesized.createdAt || new Date(ts).toISOString(),
        }
      })
    )

    for (const res of synthesizedResults) {
      if (res.status === 'fulfilled') {
        pushUnique(res.value)
      }
    }
  }

  const fallbackReady = getRealTimeLiveOrders().filter((lo: any) => lo.status === 'ready')
  for (const lo of fallbackReady) {
    const ordNum = String(lo.id || lo.fullId || '').trim()
    const fullIdLower = lo.fullId ? String(lo.fullId).trim().toLowerCase() : ''
    if (
      !ordNum ||
      seenReadyOrders.has(ordNum.toLowerCase()) ||
      deadOrderKeys.has(ordNum.toLowerCase()) ||
      (fullIdLower && deadOrderKeys.has(fullIdLower))
    ) {
      continue
    }
    const itemsSummary =
      Array.isArray(lo.items) && lo.items.length > 0
        ? lo.items.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')
        : 'Food items are prepared and ready to serve'

    pushUnique({
      id: `ready-fallback-${ordNum}`,
      type: 'order_prepared',
      title: `🔥 Order #${ordNum} Prepared & Ready!`,
      body: `${lo.tableNumber || 'Table'} — ${itemsSummary}. Waitstaff & customer alerted.`,
      time: formatTimeAgo(lo.createdAt || new Date()),
      read: false,
      createdAt: lo.createdAt || new Date().toISOString(),
      metadata: {
        orderId: lo.fullId || lo.id,
        orderNumber: ordNum,
        tableNumber: String(lo.tableNumber || 'Table'),
        itemsSummary,
      },
    })
  }

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  staffFeedCache.set(cacheKey, {
    data: merged,
    timestamp: Date.now(),
  })

  const sliced = merged.slice(0, limit)
  return {
    notifications: sliced,
    unreadCount: sliced.filter((n) => !n.read).length,
    cacheHit: false,
  }
}

/**
 * Returns notifications strictly isolated to a single customer (food-ready alerts only).
 */
export async function getCustomerNotificationsFeed(options: {
  customerId: string
  limit?: number
}): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const limit = Math.min(Math.max(options.limit || 20, 1), 50)

  const customerOrders = await prisma.order.findMany({
    where: {
      customerId: options.customerId,
      deletedAt: null,
      status: { notIn: ['cancelled', 'CANCELLED'] as any[] },
    },
    select: {
      id: true,
      orderNumber: true,
    },
  })

  if (customerOrders.length === 0) {
    return { notifications: [], unreadCount: 0 }
  }

  const orderNumbers = new Set(customerOrders.map((o) => o.orderNumber))

  let dbNotifs: AppNotification[] = []
  try {
    const records = await prisma.notification.findMany({
      where: {
        deletedAt: null,
        notificationType: 'order_prepared',
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })
    dbNotifs = records.map(mapDbNotification)
  } catch {
    // Ignore DB errors in fallback mode
  }

  const combined = [...dbNotifs, ...getNotificationsList(40)]
  const seen = new Set<string>()
  const customerNotifs: AppNotification[] = []

  for (const n of combined) {
    if (n.type !== 'order_prepared') continue
    if (seen.has(n.id)) continue
    const matchesCustomer =
      n.customerId === options.customerId ||
      n.metadata?.customerId === options.customerId ||
      Boolean(n.metadata?.orderNumber && orderNumbers.has(n.metadata.orderNumber))
    if (!matchesCustomer) continue

    seen.add(n.id)
    customerNotifs.push({ ...n, time: formatTimeAgo(n.createdAt) })
    if (customerNotifs.length >= limit) break
  }

  customerNotifs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return {
    notifications: customerNotifs,
    unreadCount: customerNotifs.filter((n) => !n.read).length,
  }
}
