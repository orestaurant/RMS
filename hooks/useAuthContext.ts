/**
 * Hook to fetch and cache current user auth context
 * Instant 0ms initial render with SWR background revalidation
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

// Client-side in-memory singleton cache
let memoryAuthCache: AuthContext | null = null

function getInitialAuth(): AuthContext | null {
  if (memoryAuthCache) return memoryAuthCache
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('rms_auth_context') || localStorage.getItem('rms_auth_context')
      if (stored) {
        const parsed = JSON.parse(stored)
        memoryAuthCache = parsed
        return parsed
      }
    } catch {
      // Ignore storage errors
    }
  }
  return null
}

export function seedAuthCache(auth: Partial<AuthContext> & { id: string; email: string; role: string }) {
  const fullAuth: AuthContext = {
    id: auth.id,
    name: auth.name || 'Admin',
    email: auth.email,
    role: auth.role,
    organizationId: auth.organizationId || '',
    restaurantId: auth.restaurantId || '089c77df-cd5e-4233-b6f1-b35f17631e5b',
    branchId: auth.branchId || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e',
    restaurantName: auth.restaurantName || 'RestoSphere',
    branchName: auth.branchName || 'Mumbai Central',
  }
  memoryAuthCache = fullAuth
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('rms_auth_context', JSON.stringify(fullAuth))
      localStorage.setItem('rms_auth_context', JSON.stringify(fullAuth))
    } catch {
      // Ignore
    }
  }
}

export function clearAuthCache() {
  memoryAuthCache = null
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('rms_auth_context')
      localStorage.removeItem('rms_auth_context')
    } catch {
      // Ignore
    }
  }
}

export function useAuthContext(): UseAuthContextReturn {
  const initial = getInitialAuth()
  const [auth, setAuth] = useState<AuthContext | null>(initial)
  // If we already have cached auth, do not show loading screen (0ms paint!)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState<string | null>(null)

  const fetchAuthContext = useCallback(async () => {
    try {
      // Only set loading true if we have no prior cache
      if (!memoryAuthCache) {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch auth context')
      }

      if (data.data) {
        memoryAuthCache = data.data
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('rms_auth_context', JSON.stringify(data.data))
            localStorage.setItem('rms_auth_context', JSON.stringify(data.data))
          } catch {
            // Ignore
          }
        }
        setAuth(data.data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch auth context')
      if (!memoryAuthCache) {
        setAuth(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuthContext()
  }, [fetchAuthContext])

  return { auth, loading, error, refetch: fetchAuthContext }
}
