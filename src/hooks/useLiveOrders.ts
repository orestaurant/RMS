/**
 * useLiveOrders Hook
 * Fetches active live orders
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getLiveOrders } from '@/lib/api/orders'
import type { LiveOrdersResponse } from '@/types/orders'

interface UseLiveOrdersReturn {
  data: LiveOrdersResponse | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useLiveOrders(branchId: string | null): UseLiveOrdersReturn {
  const [data, setData] = useState<LiveOrdersResponse | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const orders = await getLiveOrders(branchId)
      setData(orders)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch live orders'))
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
