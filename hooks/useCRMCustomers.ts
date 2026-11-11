/**
 * useCRMCustomers Hook
 * Fetches customers for CRM
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  totalSpent: number
  visits: number
  lastVisit: string | null
  tier: 'gold' | 'silver' | 'bronze'
  loyaltyPoints: number
  preferences: string[]
  notes: string
}

export interface CRMCustomersResponse {
  success: boolean
  data: Customer[]
  meta: {
    total: number
    tiers: Record<string, number>
  }
}

interface UseCRMCustomersReturn {
  data: Customer[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCRMCustomers(branchId: string | null): UseCRMCustomersReturn {
  const [data, setData] = useState<Customer[] | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/customers?branchId=${branchId}`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      
      const response = (await res.json()) as CRMCustomersResponse
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch customers'))
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
