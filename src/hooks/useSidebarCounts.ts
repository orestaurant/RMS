/**
 * useSidebarCounts Hook
 * Fetches sidebar badge counts
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

export function useSidebarCounts(branchId: string | null): UseSidebarCountsReturn {
  const [data, setData] = useState<SidebarCounts | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const counts = await getSidebarCounts(branchId)
      setData(counts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sidebar counts'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
