/**
 * useRevenueChart Hook
 * Fetches revenue chart data
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getRevenueChart } from '@/lib/api/dashboard'
import type { RevenueChartData } from '@/types/dashboard'

interface UseRevenueChartReturn {
  data: RevenueChartData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useRevenueChart(
  branchId: string | null,
  range: 'today' | 'week' = 'today'
): UseRevenueChartReturn {
  const [data, setData] = useState<RevenueChartData | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const chartData = await getRevenueChart(branchId, range)
      setData(chartData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch revenue chart'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [branchId, range])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
