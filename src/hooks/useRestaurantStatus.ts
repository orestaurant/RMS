/**
 * useRestaurantStatus Hook
 * Fetches restaurant status (open/closed)
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getRestaurantStatus } from '@/lib/api/dashboard'
import type { RestaurantStatus } from '@/types/dashboard'

interface UseRestaurantStatusReturn {
  data: RestaurantStatus | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useRestaurantStatus(branchId: string | null): UseRestaurantStatusReturn {
  const [data, setData] = useState<RestaurantStatus | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const status = await getRestaurantStatus(branchId)
      setData(status)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch restaurant status'))
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
