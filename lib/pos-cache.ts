/**
 * POS In-Memory Server Cache
 * Provides sub-millisecond response times for POS Terminal Menu & Tables
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
}

const posMenuCache = new Map<string, CacheEntry>()
const posTablesCache = new Map<string, CacheEntry>()
const tablesViewCache = new Map<string, CacheEntry>()

// 30 seconds default TTL for menu (fast checkout, low DB load)
const DEFAULT_MENU_TTL = 30_000
// 25 seconds default TTL for tables (status changes e.g. occupied/available)
const DEFAULT_TABLES_TTL = 25_000
// 4 seconds default TTL for live floor tables view (invalidated immediately on mutations)
const DEFAULT_TABLES_VIEW_TTL = 4_000

export function getPOSMenuCache<T = any>(key: string = 'default', ttlMs: number = DEFAULT_MENU_TTL): T | null {
  const entry = posMenuCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    posMenuCache.delete(key)
    return null
  }
  return entry.data
}

export function setPOSMenuCache<T = any>(key: string = 'default', data: T): void {
  posMenuCache.set(key, {
    data,
    timestamp: Date.now(),
  })
}

export function invalidatePOSMenuCache(): void {
  posMenuCache.clear()
}

let customerMenuItemsCache: { data: any[]; timestamp: number } | null = null

export function getCustomerMenuItemsCache(ttlMs: number = 30_000): any[] | null {
  if (!customerMenuItemsCache) return null
  if (Date.now() - customerMenuItemsCache.timestamp > ttlMs) {
    customerMenuItemsCache = null
    return null
  }
  return customerMenuItemsCache.data
}

export function setCustomerMenuItemsCache(data: any[]): void {
  customerMenuItemsCache = {
    data,
    timestamp: Date.now(),
  }
}

export function invalidateMenuItemsCache(): void {
  customerMenuItemsCache = null
  invalidatePOSMenuCache()
}

export function getPOSTablesCache<T = any>(key: string = 'default', ttlMs: number = DEFAULT_TABLES_TTL): T | null {
  const entry = posTablesCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    posTablesCache.delete(key)
    return null
  }
  return entry.data
}

export function setPOSTablesCache<T = any>(key: string = 'default', data: T): void {
  posTablesCache.set(key, {
    data,
    timestamp: Date.now(),
  })
}

export function invalidatePOSTablesCache(): void {
  posTablesCache.clear()
  tablesViewCache.clear()
}

export function getTablesViewCache<T = any>(
  key: string = 'default',
  ttlMs: number = DEFAULT_TABLES_VIEW_TTL
): T | null {
  const entry = tablesViewCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    tablesViewCache.delete(key)
    return null
  }
  return entry.data
}

export function setTablesViewCache<T = any>(key: string = 'default', data: T): void {
  tablesViewCache.set(key, {
    data,
    timestamp: Date.now(),
  })
}

export function invalidateTablesViewCache(): void {
  tablesViewCache.clear()
}

