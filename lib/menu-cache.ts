/**
 * High-Speed In-Memory Cache Manager for Menu & Categories
 * Eliminates redundant PostgreSQL queries and delivers sub-5ms API response times.
 */

import { invalidatePOSMenuCache } from './pos-cache'

export interface CachedMenuItem {
  id: string
  name: string
  description: string
  categoryId: string
  restaurantId: string
  category: string
  price: number
  costPrice?: number
  image?: string
  isVeg: boolean
  isVegan: boolean
  isSpicy: boolean
  spiceLevel: number
  isAvailable: boolean
  prepTime: number
  rating: number
  tags: string[]
  variants: Array<{
    id: string
    name: string
    price: number
  }>
}

export interface CachedCategory {
  id: string
  name: string
  description: string
  displayOrder: number
  isActive: boolean
  status: string
  itemCount: number
}

// 60-second default TTL (mutations instantly invalidate or update the cache)
const MENU_CACHE_TTL = 60_000

let menuItemsCache: {
  data: CachedMenuItem[]
  timestamp: number
} | null = null

const categoriesCacheMap = new Map<string, { data: CachedCategory[]; timestamp: number }>()
const itemIdToCategoryMap = new Map<string, string>()

/**
 * Get all cached menu items if still fresh
 */
export function getCachedMenuItems(ttlMs: number = MENU_CACHE_TTL): CachedMenuItem[] | null {
  if (menuItemsCache && Date.now() - menuItemsCache.timestamp < ttlMs) {
    return menuItemsCache.data
  }
  return null
}

/**
 * Cache full list of menu items and index itemId -> categoryName
 */
export function setCachedMenuItems(items: CachedMenuItem[]): void {
  menuItemsCache = {
    data: items,
    timestamp: Date.now(),
  }

  // Build high-speed lookup index for KDS and live orders
  for (const item of items) {
    if (item.id && item.category) {
      itemIdToCategoryMap.set(item.id, item.category)
    }
  }
}

/**
 * Fast lookup of category name by menuItemId (0.001ms in-memory lookup)
 */
export function getCategoryNameByItemId(itemId: string): string | undefined {
  return itemIdToCategoryMap.get(itemId)
}

/**
 * Get cached categories by restaurantId (or 'all')
 */
export function getCachedCategories(
  restaurantId: string = 'all',
  ttlMs: number = MENU_CACHE_TTL
): CachedCategory[] | null {
  const entry = categoriesCacheMap.get(restaurantId)
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data
  }
  return null
}

/**
 * Set cached categories
 */
export function setCachedCategories(restaurantId: string = 'all', data: CachedCategory[]): void {
  categoriesCacheMap.set(restaurantId, {
    data,
    timestamp: Date.now(),
  })
}

/**
 * Instantly update item availability in memory cache (zero-latency toggle)
 */
export function updateCachedItemAvailability(itemId: string, isAvailable: boolean): void {
  if (menuItemsCache?.data) {
    menuItemsCache.data = menuItemsCache.data.map((item) =>
      item.id === itemId ? { ...item, isAvailable } : item
    )
    menuItemsCache.timestamp = Date.now()
  }
  invalidatePOSMenuCache()
}

/**
 * Invalidate all menu-related caches on create/update/delete mutations
 */
export function invalidateAllMenuCaches(): void {
  menuItemsCache = null
  categoriesCacheMap.clear()
  invalidatePOSMenuCache()
}

