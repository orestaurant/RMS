/**
 * Hook to fetch and cache current user auth context
 * Includes organization, restaurant, and branch IDs
 */

import { useEffect, useState, useCallback } from 'react'

export interface AuthContext {
  id: string
  name: string
  email: string
  role: string
  organizationId: string
  restaurantId: string
  branchId: string
  restaurantName: string
  branchName: string
}

export interface UseAuthContextReturn {
  auth: AuthContext | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAuthContext(): UseAuthContextReturn {
  const [auth, setAuth] = useState<AuthContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuthContext = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch auth context')
      }

      setAuth(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch auth context')
      setAuth(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuthContext()
  }, [fetchAuthContext])

  return { auth, loading, error, refetch: fetchAuthContext }
}
