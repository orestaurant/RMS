/**
 * useTables Hook
 * Fetches tables for a branch
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getTables } from '@/lib/api/orders'

export interface Table {
  id: string
  tableNumber: string
  capacity: number
  section: string
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance'
}

interface UseTablesReturn {
  data: Table[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useTables(branchId: string | null): UseTablesReturn {
  const [data, setData] = useState<Table[] | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const tables = await getTables(branchId)
      setData(tables)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tables'))
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
