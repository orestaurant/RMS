/**
 * useDashboardSummary Hook
 * Fetches dashboard summary statistics
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getDashboardSummary } from '@/lib/api/dashboard'
import type { DashboardSummary } from '@/types/dashboard'

interface UseDashboardSummaryReturn {
  data: DashboardSummary | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDashboardSummary(branchId: string | null): UseDashboardSummaryReturn {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const summary = await getDashboardSummary(branchId)
      setData(summary)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard summary'))
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
