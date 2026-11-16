/**
 * useTables Hook
 * Fetches tables for a branch with instant in-memory cache
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

const clientTablesCache: Record<string, Table[]> = {}

export function useTables(branchId: string | null): UseTablesReturn {
  const targetBranch = branchId || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
  const cached = clientTablesCache[targetBranch] || null

  const [data, setData] = useState<Table[] | null>(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      if (!clientTablesCache[targetBranch]) {
        setLoading(true)
      }
      setError(null)
      const tables = await getTables(targetBranch)
      clientTablesCache[targetBranch] = tables
      setData(tables)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tables'))
    } finally {
      setLoading(false)
    }
  }, [targetBranch])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
