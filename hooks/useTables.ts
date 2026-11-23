/**
 * useTables Hook
 * Fetches tables for a branch with instant 0ms cached paint and SWR revalidation
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

function getInitialTables(branchKey: string): Table[] | null {
  if (clientTablesCache[branchKey]) return clientTablesCache[branchKey]
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`rms_tables_${branchKey}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        clientTablesCache[branchKey] = parsed
        return parsed
      }
    } catch {
      // Ignore
    }
  }
  return null
}

export function useTables(branchId: string | null): UseTablesReturn {
  const targetBranch = branchId || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
  const initial = getInitialTables(targetBranch)

  const [data, setData] = useState<Table[] | null>(initial)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      if (!clientTablesCache[targetBranch] && !sessionStorage.getItem(`rms_tables_${targetBranch}`)) {
        setLoading(true)
      }
      setError(null)
      const tables = await getTables(targetBranch)
      clientTablesCache[targetBranch] = tables
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`rms_tables_${targetBranch}`, JSON.stringify(tables))
        } catch {
          // Ignore
        }
      }
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
