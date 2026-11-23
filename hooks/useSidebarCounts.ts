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
const clientSidebarCache: Record<string, SidebarCounts> = {}

function getInitialCounts(key: string): SidebarCounts | null {
  if (clientSidebarCache[key]) return clientSidebarCache[key]
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`rms_sidebar_${key}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        clientSidebarCache[key] = parsed
        return parsed
      }
    } catch {
      // Ignore
    }
  }
  return null
}

export function useSidebarCounts(branchId: string | null, customerId?: string | null): UseSidebarCountsReturn {
  const targetBranch = branchId || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'
  const cacheKey = `${targetBranch}_${customerId || 'admin'}`
  const initial = getInitialCounts(cacheKey)

  const [data, setData] = useState<SidebarCounts | null>(initial)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setError(null)
      const counts = await getSidebarCounts(targetBranch, customerId)
      clientSidebarCache[cacheKey] = counts
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`rms_sidebar_${cacheKey}`, JSON.stringify(counts))
        } catch {
          // Ignore
        }
      }
      setData(counts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sidebar counts'))
    } finally {
      setLoading(false)
    }
  }, [targetBranch, customerId, cacheKey])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
