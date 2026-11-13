import prisma from '@/lib/prisma'

export interface UserStatsResult {
  total: number
  active: number
  inactive: number
  roles: {
    SUPER_ADMIN: number
    ADMIN: number
    WAITER: number
    COUNTER_MANAGER: number
    CHEF: number
    INVENTORY_MANAGER: number
    VENDOR: number
    CUSTOMER: number
  }
}

interface CachedStats {
  data: UserStatsResult
  expiresAt: number
}

// In-memory cache for aggregate user statistics (60s TTL)
// Avoids repetitive expensive full-table scans on every page navigation / search
let cachedUserStats: CachedStats | null = null

export function invalidateUserStatsCache(): void {
  cachedUserStats = null
}

export function getCachedUserStats(): UserStatsResult | null {
  if (cachedUserStats && Date.now() < cachedUserStats.expiresAt) {
    return cachedUserStats.data
  }
  return null
}

export async function getOrComputeUserStats(force = false): Promise<UserStatsResult> {
  if (!force && cachedUserStats && Date.now() < cachedUserStats.expiresAt) {
    return cachedUserStats.data
  }

  // High performance DB engine aggregation:
  // Performs GROUP BY and COUNT directly inside PostgreSQL rather than serializing all rows to Node.js
  const [roleGroups, totalActive, totalUsers] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.user.count({
      where: { deletedAt: null, status: 'active' },
    }),
    prisma.user.count({
      where: { deletedAt: null },
    }),
  ])

  const roleCounts: UserStatsResult['roles'] = {
    SUPER_ADMIN: 0,
    ADMIN: 0,
    WAITER: 0,
    COUNTER_MANAGER: 0,
    CHEF: 0,
    INVENTORY_MANAGER: 0,
    VENDOR: 0,
    CUSTOMER: 0,
  }

  for (const group of roleGroups) {
    const rawRole = String(group.role).toUpperCase()
    if (rawRole === 'SUPER_ADMIN' || rawRole === 'SUPERADMIN') {
      roleCounts.SUPER_ADMIN += group._count._all
    } else if (rawRole in roleCounts) {
      roleCounts[rawRole as keyof UserStatsResult['roles']] += group._count._all
    }
  }

  const result: UserStatsResult = {
    total: totalUsers,
    active: totalActive,
    inactive: Math.max(0, totalUsers - totalActive),
    roles: roleCounts,
  }

  cachedUserStats = {
    data: result,
    expiresAt: Date.now() + 60_000, // 60s TTL
  }

  return result
}

