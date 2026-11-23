import type { DashboardStats, SidebarCounts, TopDish, InventoryAlert } from '@/types/dashboard'

interface CachedItem<T> {
  data: T
  timestamp: number
}

// In-memory cache for dashboard stats keyed by branchId (30s fresh TTL, 120s stale window)
const statsCache = new Map<string, CachedItem<DashboardStats>>()
const STATS_TTL = 30000 // 30 seconds
const STATS_STALE_TTL = 120000 // 2 minutes stale window

// In-memory cache for sidebar counts (20s TTL)
const sidebarCountsCache = new Map<string, CachedItem<SidebarCounts>>()
const SIDEBAR_TTL = 20000 // 20 seconds

// In-memory cache for top dishes (45s TTL)
const topDishesCache = new Map<string, CachedItem<TopDish[]>>()
const TOP_DISHES_TTL = 45000 // 45 seconds

// In-memory cache for inventory alerts (60s TTL)
const inventoryAlertsCache = new Map<string, CachedItem<InventoryAlert[]>>()
const INVENTORY_ALERTS_TTL = 60000 // 60 seconds

// In-memory user auth/session cache for /api/auth/me (60s TTL)
const authMeCache = new Map<string, CachedItem<any>>()
const AUTH_ME_TTL = 60000 // 60 seconds

// In-memory branch metadata cache (30 minutes)
const branchMetaCache = new Map<string, CachedItem<any>>()
const BRANCH_TTL = 30 * 60 * 1000

// ─── Dashboard Stats Cache ─────────────────────────────────────
export function getCachedStats(branchId: string = 'default'): DashboardStats | null {
  const item = statsCache.get(branchId)
  if (!item) return null
  if (Date.now() - item.timestamp > STATS_TTL) {
    // If within stale window, we can still serve it for SWR if needed, but let's allow caller to check
    if (Date.now() - item.timestamp > STATS_STALE_TTL) {
      statsCache.delete(branchId)
      return null
    }
  }
  return item.data
}

export function getCachedStatsWithStale(branchId: string = 'default'): { data: DashboardStats; isStale: boolean } | null {
  const item = statsCache.get(branchId)
  if (!item) return null
  const age = Date.now() - item.timestamp
  if (age > STATS_STALE_TTL) {
    statsCache.delete(branchId)
    return null
  }
  return {
    data: item.data,
    isStale: age > STATS_TTL,
  }
}

export function setCachedStats(branchId: string = 'default', data: DashboardStats) {
  const entry = {
    data,
    timestamp: Date.now(),
  }
  statsCache.set(branchId, entry)
  if (branchId !== 'default' && data.outlet?.id === branchId) {
    statsCache.set('default', entry)
  }
}

export function invalidateDashboardStatsCache(branchId?: string | null) {
  if (branchId) {
    statsCache.delete(branchId)
    statsCache.delete('default')
  } else {
    statsCache.clear()
  }
}

// ─── Sidebar Counts Cache ──────────────────────────────────────
export function getCachedSidebarCounts(branchId: string = 'default'): SidebarCounts | null {
  const item = sidebarCountsCache.get(branchId)
  if (!item) return null
  if (Date.now() - item.timestamp > SIDEBAR_TTL) {
    sidebarCountsCache.delete(branchId)
    return null
  }
  return item.data
}

export function setCachedSidebarCounts(branchId: string = 'default', data: SidebarCounts) {
  sidebarCountsCache.set(branchId, {
    data,
    timestamp: Date.now(),
  })
}

export function invalidateSidebarCountsCache(branchId?: string | null) {
  if (branchId) {
    sidebarCountsCache.delete(branchId)
    sidebarCountsCache.delete('default')
  } else {
    sidebarCountsCache.clear()
  }
}

// ─── Top Dishes Cache ──────────────────────────────────────────
export function getCachedTopDishes(branchId: string = 'default'): TopDish[] | null {
  const item = topDishesCache.get(branchId)
  if (!item) return null
  if (Date.now() - item.timestamp > TOP_DISHES_TTL) {
    topDishesCache.delete(branchId)
    return null
  }
  return item.data
}

export function setCachedTopDishes(branchId: string = 'default', data: TopDish[]) {
  topDishesCache.set(branchId, {
    data,
    timestamp: Date.now(),
  })
}

// ─── Inventory Alerts Cache ────────────────────────────────────
export function getCachedInventoryAlerts(branchId: string = 'default'): InventoryAlert[] | null {
  const item = inventoryAlertsCache.get(branchId)
  if (!item) return null
  if (Date.now() - item.timestamp > INVENTORY_ALERTS_TTL) {
    inventoryAlertsCache.delete(branchId)
    return null
  }
  return item.data
}

export function setCachedInventoryAlerts(branchId: string = 'default', data: InventoryAlert[]) {
  inventoryAlertsCache.set(branchId, {
    data,
    timestamp: Date.now(),
  })
}

// ─── Auth Me Session Cache ─────────────────────────────────────
export function getCachedAuthMe(userId: string): any | null {
  const item = authMeCache.get(userId)
  if (!item) return null
  if (Date.now() - item.timestamp > AUTH_ME_TTL) {
    authMeCache.delete(userId)
    return null
  }
  return item.data
}

export function setCachedAuthMe(userId: string, data: any) {
  authMeCache.set(userId, {
    data,
    timestamp: Date.now(),
  })
}

export function invalidateAuthMeCache(userId?: string) {
  if (userId) {
    authMeCache.delete(userId)
  } else {
    authMeCache.clear()
  }
}

// ─── Branch Metadata Cache ─────────────────────────────────────
export function getCachedBranchMeta(branchId?: string | null): any | null {
  const key = branchId || 'default'
  const item = branchMetaCache.get(key)
  if (!item) return null
  if (Date.now() - item.timestamp > BRANCH_TTL) {
    branchMetaCache.delete(key)
    return null
  }
  return item.data
}

export function setCachedBranchMeta(branch: any) {
  if (branch) {
    const entry = {
      data: branch,
      timestamp: Date.now(),
    }
    if (branch.id) {
      branchMetaCache.set(branch.id, entry)
    }
    branchMetaCache.set('default', entry)
  }
}
