'use client'

import { useEffect, useState, useCallback } from 'react'

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  unit: string
  minStock: number
  criticalStock: number
  unitPrice: number
  status: 'in-stock' | 'low-stock' | 'critical'
  totalItemValue?: number
  createdAt?: string
  updatedAt?: string
}

export interface InventoryStats {
  total: number
  totalValue: number
  lowStockCount: number
  criticalCount: number
  inStockCount: number
}

export interface InventoryApiResponse {
  success: boolean
  data: InventoryItem[]
  stats: InventoryStats
  error?: string
}

export interface UseInventoryReturn {
  items: InventoryItem[]
  stats: InventoryStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createItem: (item: {
    name: string
    sku: string
    category: string
    quantity: number
    unit: string
    minStock: number
    criticalStock: number
    unitPrice: number
  }) => Promise<{ success: boolean; error?: string; data?: InventoryItem }>
  updateItem: (
    id: string,
    data: Partial<InventoryItem>
  ) => Promise<{ success: boolean; error?: string; data?: InventoryItem }>
  deleteItem: (id: string) => Promise<{ success: boolean; error?: string }>
  adjustStock: (id: string, delta: number) => Promise<{ success: boolean; error?: string }>
}

const defaultStats: InventoryStats = {
  total: 0,
  totalValue: 0,
  lowStockCount: 0,
  criticalCount: 0,
  inStockCount: 0,
}

export function useInventoryItems(
  searchTerm: string = '',
  categoryFilter: string = 'all',
  statusFilter: string = 'all'
): UseInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/inventory?${params.toString()}`)
      const json: InventoryApiResponse = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to fetch inventory: ${res.statusText}`)
      }

      setItems(json.data || [])
      if (json.stats) {
        setStats(json.stats)
      }
    } catch (err: any) {
      console.error('useInventoryItems error:', err)
      setError(err.message || 'Error fetching inventory items')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, categoryFilter, statusFilter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const createItem = async (item: {
    name: string
    sku: string
    category: string
    quantity: number
    unit: string
    minStock: number
    criticalStock: number
    unitPrice: number
  }) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Failed to create item' }
      }

      await fetchItems()
      return { success: true, data: json.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' }
    }
  }

  const updateItem = async (id: string, data: Partial<InventoryItem>) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Failed to update item' }
      }

      await fetchItems()
      return { success: true, data: json.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' }
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Failed to delete item' }
      }

      await fetchItems()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' }
    }
  }

  const adjustStock = async (id: string, delta: number) => {
    try {
      const res = await fetch(`/api/inventory/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deltaQuantity: delta }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Failed to adjust stock' }
      }

      await fetchItems()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' }
    }
  }

  return {
    items,
    stats,
    loading,
    error,
    refetch: fetchItems,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
  }
}
