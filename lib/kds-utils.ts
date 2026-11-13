/**
 * KDS Utilities & Live Order Queue Manager
 * Provides station classification, cuisine grouping, live queue caching, and ticket helpers.
 */

export function getKitchenStation(itemName: string, category?: string | null): string {
  const name = (itemName || '').toLowerCase()
  const cat = (category || '').toLowerCase()

  if (
    name.includes('tikka') ||
    name.includes('tandoor') ||
    name.includes('kebab') ||
    name.includes('platter') ||
    name.includes('grilled') ||
    cat.includes('appetizer') ||
    cat.includes('starter')
  ) {
    return 'Grill & Tandoor'
  }

  if (
    name.includes('lassi') ||
    name.includes('chai') ||
    name.includes('coffee') ||
    name.includes('juice') ||
    name.includes('soda') ||
    name.includes('drink') ||
    name.includes('mojito') ||
    name.includes('shake') ||
    cat.includes('beverage')
  ) {
    return 'Beverages / Bar'
  }

  if (
    name.includes('jamun') ||
    name.includes('rasmalai') ||
    name.includes('ice cream') ||
    name.includes('halwa') ||
    name.includes('kheer') ||
    name.includes('cake') ||
    name.includes('brownie') ||
    cat.includes('dessert')
  ) {
    return 'Desserts'
  }

  return 'Main Kitchen'
}

/**
 * Classifies an item into its cuisine category for batch cooking coordination
 */
export function getItemCuisine(itemName: string, category?: string | null): string {
  const name = (itemName || '').toLowerCase()
  const cat = (category || '').toLowerCase()

  if (
    name.includes('pizza') ||
    name.includes('pasta') ||
    name.includes('lasagna') ||
    name.includes('spaghetti') ||
    name.includes('risotto') ||
    name.includes('garlic bread') ||
    name.includes('penne') ||
    name.includes('margherita') ||
    cat.includes('pizza') ||
    cat.includes('pasta') ||
    cat.includes('italian')
  ) {
    return 'Italian'
  }

  if (
    name.includes('noodle') ||
    name.includes('manchurian') ||
    name.includes('fried rice') ||
    name.includes('dim sum') ||
    name.includes('spring roll') ||
    name.includes('chilli') ||
    name.includes('schezwan') ||
    name.includes('soup') ||
    name.includes('momos') ||
    cat.includes('chinese') ||
    cat.includes('asian')
  ) {
    return 'Chinese & Asian'
  }

  if (
    name.includes('tikka') ||
    name.includes('tandoor') ||
    name.includes('kebab') ||
    name.includes('paneer') ||
    name.includes('dal') ||
    name.includes('biryani') ||
    name.includes('roti') ||
    name.includes('naan') ||
    name.includes('curry') ||
    name.includes('masala') ||
    name.includes('butter chicken') ||
    cat.includes('north indian') ||
    cat.includes('indian') ||
    cat.includes('tandoor')
  ) {
    return 'North Indian & Tandoor'
  }

  if (
    name.includes('dosa') ||
    name.includes('idli') ||
    name.includes('vada') ||
    name.includes('sambar') ||
    name.includes('uttapam') ||
    cat.includes('south indian')
  ) {
    return 'South Indian'
  }

  if (
    name.includes('burger') ||
    name.includes('sandwich') ||
    name.includes('fries') ||
    name.includes('wrap') ||
    name.includes('club') ||
    name.includes('nachos') ||
    cat.includes('fast food') ||
    cat.includes('continental')
  ) {
    return 'Continental & Fast Food'
  }

  if (
    name.includes('lassi') ||
    name.includes('chai') ||
    name.includes('coffee') ||
    name.includes('juice') ||
    name.includes('soda') ||
    name.includes('drink') ||
    name.includes('mojito') ||
    name.includes('shake') ||
    cat.includes('beverage') ||
    cat.includes('drink')
  ) {
    return 'Beverages'
  }

  if (
    name.includes('jamun') ||
    name.includes('rasmalai') ||
    name.includes('ice cream') ||
    name.includes('halwa') ||
    name.includes('kheer') ||
    name.includes('cake') ||
    name.includes('brownie') ||
    cat.includes('dessert') ||
    cat.includes('sweet')
  ) {
    return 'Desserts'
  }

  if (category && category.trim()) {
    return category.trim()
  }

  return 'Main Kitchen'
}

/**
 * Normalizes any database or incoming order status into the 5 standard KDS Kanban statuses
 */
export function normalizeKdsStatus(
  status: string | null | undefined
): 'pending' | 'accepted' | 'cooking' | 'ready' | 'served' {
  const s = (status || '').toLowerCase().trim()
  if (s === 'confirmed' || s === 'accepted') return 'accepted'
  if (s === 'preparing' || s === 'cooking' || s === 'in_progress') return 'cooking'
  if (s === 'ready' || s === 'prepared') return 'ready'
  if (s === 'served' || s === 'completed' || s === 'delivered') return 'served'
  return 'pending'
}

// In-Memory Real-Time Live Orders
let realTimeLiveOrders: any[] = []

export function registerActiveLiveOrder(order: any) {
  const existingIdx = realTimeLiveOrders.findIndex(
    (o) =>
      o.id === order.id ||
      (order.fullId && o.fullId === order.fullId) ||
      (order.orderNumber && (o.orderNumber === order.orderNumber || o.id === order.orderNumber))
  )
  if (existingIdx >= 0) {
    realTimeLiveOrders[existingIdx] = {
      ...realTimeLiveOrders[existingIdx],
      ...order,
      updatedAt: new Date().toISOString(),
    }
  } else {
    realTimeLiveOrders.unshift({
      ...order,
      createdAt: order.createdAt || new Date().toISOString(),
    })
  }
  invalidateKDSCache()
}

export function updateFallbackOrder(idOrKey: string, updates: Partial<any>) {
  const match = (o: any) =>
    o.id === idOrKey ||
    o.fullId === idOrKey ||
    (o.orderNumber && o.orderNumber === idOrKey)

  realTimeLiveOrders = realTimeLiveOrders.map((o) => {
    if (match(o)) {
      return { ...o, ...updates, updatedAt: new Date().toISOString() }
    }
    return o
  })
  if (updates.status === 'served' || updates.status === 'cancelled') {
    realTimeLiveOrders = realTimeLiveOrders.filter((o) => !match(o))
  }
  invalidateKDSCache()
  return realTimeLiveOrders.find(match)
}

export function removeFallbackOrder(idOrKey: string) {
  realTimeLiveOrders = realTimeLiveOrders.filter(
    (o) =>
      o.id !== idOrKey &&
      o.fullId !== idOrKey &&
      (!o.orderNumber || o.orderNumber !== idOrKey)
  )
  invalidateKDSCache()
}

export function getRealTimeLiveOrders() {
  return realTimeLiveOrders
}

// In-Memory Fast Cache for KDS live tickets (High-frequency sub-10ms response)
interface KDSCachedPayload {
  tickets: any[]
  counts: any
  batchItems: any[]
  stations: string[]
  syncedAt: string
}

let kdsServerCache: {
  data: KDSCachedPayload | null
  timestamp: number
} = {
  data: null,
  timestamp: 0,
}

export function getKDSCache(ttlMs = 3000): KDSCachedPayload | null {
  if (kdsServerCache.data && Date.now() - kdsServerCache.timestamp < ttlMs) {
    return kdsServerCache.data
  }
  return null
}

export function setKDSCache(data: KDSCachedPayload) {
  kdsServerCache = {
    data,
    timestamp: Date.now(),
  }
}

export function invalidateKDSCache() {
  kdsServerCache = {
    data: null,
    timestamp: 0,
  }
}

// In-Memory Fast Cache for Live Orders View (High-speed sub-5ms response)
const liveOrdersServerCache = new Map<string, { data: any; timestamp: number }>()

export function getLiveOrdersCache(key: string, ttlMs = 3000): any | null {
  const cached = liveOrdersServerCache.get(key)
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data
  }
  return null
}

export function setLiveOrdersCache(key: string, data: any) {
  liveOrdersServerCache.set(key, {
    data,
    timestamp: Date.now(),
  })
}

export function invalidateLiveOrdersCache() {
  liveOrdersServerCache.clear()
}

export function updateKDSCacheTicket(ticketKey: string, updates: Partial<any>) {
  if (!kdsServerCache.data) return

  const tickets = kdsServerCache.data.tickets || []
  let updatedTickets = tickets.map((t: any) => {
    if (
      t.id === ticketKey ||
      t.fullId === ticketKey ||
      (t.orderNumber && t.orderNumber === ticketKey)
    ) {
      return { ...t, ...updates }
    }
    return t
  })

  // If marked served, exclude from active live queue
  if (updates.status === 'served') {
    updatedTickets = updatedTickets.filter(
      (t: any) =>
        t.id !== ticketKey &&
        t.fullId !== ticketKey &&
        (!t.orderNumber || t.orderNumber !== ticketKey)
    )
  }

  // Recount
  const counts = {
    all: updatedTickets.length,
    pending: updatedTickets.filter((t: any) => t.status === 'pending').length,
    accepted: updatedTickets.filter((t: any) => t.status === 'accepted').length,
    cooking: updatedTickets.filter((t: any) => t.status === 'cooking').length,
    ready: updatedTickets.filter((t: any) => t.status === 'ready').length,
    served: updatedTickets.filter((t: any) => t.status === 'served').length,
  }

  kdsServerCache.data.tickets = updatedTickets
  kdsServerCache.data.counts = counts
  kdsServerCache.timestamp = Date.now()
}
