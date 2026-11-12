/**
 * KDS Utilities & Live Order Queue Manager
 * Provides station classification, live queue caching, and ticket helpers.
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
    cat.includes('dessert')
  ) {
    return 'Desserts'
  }

  return 'Main Kitchen'
}

let realTimeLiveOrders: any[] = []

export function registerActiveLiveOrder(order: any) {
  const existingIdx = realTimeLiveOrders.findIndex(
    (o) => o.id === order.id || o.fullId === order.fullId
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
}

export function updateFallbackOrder(id: string, updates: Partial<any>) {
  realTimeLiveOrders = realTimeLiveOrders.map((o) => {
    if (o.id === id || o.fullId === id) {
      return { ...o, ...updates, updatedAt: new Date().toISOString() }
    }
    return o
  })
  if (updates.status === 'served') {
    realTimeLiveOrders = realTimeLiveOrders.filter((o) => o.id !== id && o.fullId !== id)
  }
  return realTimeLiveOrders.find((o) => o.id === id || o.fullId === id)
}

export function getRealTimeLiveOrders() {
  return realTimeLiveOrders
}

