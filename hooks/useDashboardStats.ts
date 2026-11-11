'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DashboardStats } from '@/types/dashboard'
import type { ApiResponse } from '@/types/api'

interface UseDashboardStatsReturn {
  data: DashboardStats | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDashboardStats(branchId?: string | null): UseDashboardStatsReturn {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = branchId
        ? `/api/dashboard/stats?branchId=${encodeURIComponent(branchId)}`
        : '/api/dashboard/stats'

      const res = await fetch(url)
      const json: ApiResponse<DashboardStats> = await res.json()

      if (!res.ok || !json.success) {
        const errorMsg = !json.success ? json.message : 'Failed to fetch dashboard stats'
        throw new Error(errorMsg)
      }

      setData(json.data)
    } catch (err: any) {
      console.error('Error in useDashboardStats:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { data, loading, error, refetch: fetchStats }
}
