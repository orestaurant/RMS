/**
 * useAuth Hook
 * Fetches and manages current user authentication
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getCurrentUser } from '@/lib/api/auth'
import type { AuthUserResponse } from '@/lib/api/auth'

interface UseAuthReturn {
  user: AuthUserResponse | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { user, loading, error, refetch }
}
