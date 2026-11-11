/**
 * useMenuItems Hook
 * Fetches menu items for a branch
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

export interface MenuItem {
  id: string
  name: string
  description: string
  category: string
  price: number
  image: string
  isVeg: boolean
  isAvailable: boolean
  prepTime: number
  gst: number
  rating: number
  tags: string[]
  variants: Array<{ id: string; name: string; price: number }>
  addons: Array<{ id: string; name: string; price: number }>
}

export interface MenuItemsResponse {
  success: boolean
  data: MenuItem[]
  meta: {
    total: number
  }
}

interface UseMenuItemsReturn {
  data: MenuItem[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useMenuItems(branchId: string | null, category: string = 'all'): UseMenuItemsReturn {
  const [data, setData] = useState<MenuItem[] | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/menu/items?branchId=${branchId}&category=${category}`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      
      const response = (await res.json()) as MenuItemsResponse
      setData((response.data as any)?.data || response.data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch menu items'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [branchId, category])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
