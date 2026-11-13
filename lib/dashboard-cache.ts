import type { DashboardStats } from '@/types/dashboard'

interface CachedStats {
  data: DashboardStats
  timestamp: number
}

// In-memory cache for dashboard stats keyed by branchId
const statsCache = new Map<string, CachedStats>()
const STATS_TTL = 8000 // 8 seconds

// In-memory branch metadata cache (10 minutes)
let cachedDefaultBranch: any = null
let cachedDefaultBranchTime = 0
const BRANCH_TTL = 10 * 60 * 1000

export function getCachedStats(branchId: string = 'default'): DashboardStats | null {
  const item = statsCache.get(branchId)
  if (!item) return null
  if (Date.now() - item.timestamp > STATS_TTL) {
    statsCache.delete(branchId)
    return null
  }
  return item.data
}

export function setCachedStats(branchId: string = 'default', data: DashboardStats) {
  statsCache.set(branchId, {
    data,
    timestamp: Date.now(),
  })
}

export function invalidateDashboardStatsCache(branchId?: string | null) {
  if (branchId) {
    statsCache.delete(branchId)
    statsCache.delete('default')
  } else {
    statsCache.clear()
  }
}

export function getCachedBranchMeta(branchId?: string | null): any | null {
  if (!branchId && cachedDefaultBranch && Date.now() - cachedDefaultBranchTime < BRANCH_TTL) {
    return cachedDefaultBranch
  }
  return null
}

export function setCachedBranchMeta(branch: any) {
  if (branch) {
    cachedDefaultBranch = branch
    cachedDefaultBranchTime = Date.now()
  }
}

