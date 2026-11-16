/**
 * useSidebarCounts Hook
 * Fetches sidebar badge counts with instant in-memory cache and SWR revalidation
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSidebarCounts } from '@/lib/api/dashboard'
import type { SidebarCounts } from '@/types/dashboard'

interface UseSidebarCountsReturn {
  data: SidebarCounts | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Client-side cache for instant sidebar badge rendering
let clientSidebarCache: SidebarCounts | null = null

export function useSidebarCounts(branchId: string | null): UseSidebarCountsReturn {
  const [data, setData] = useState<SidebarCounts | null>(clientSidebarCache)
  const [loading, setLoading] = useState(!clientSidebarCache)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      if (!clientSidebarCache) {
        setLoading(true)
      }
      setError(null)
      const targetBranch = branchId || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
      const counts = await getSidebarCounts(targetBranch)
      clientSidebarCache = counts
      setData(counts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sidebar counts'))
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
