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
  if (updates.status === 'served' || updates.status === 'cancelled') {
    realTimeLiveOrders = realTimeLiveOrders.filter((o) => o.id !== id && o.fullId !== id)
  }
  return realTimeLiveOrders.find((o) => o.id === id || o.fullId === id)
}

export function removeFallbackOrder(id: string) {
  realTimeLiveOrders = realTimeLiveOrders.filter(
    (o) => o.id !== id && o.fullId !== id
  )
}

export function getRealTimeLiveOrders() {
  return realTimeLiveOrders
}
