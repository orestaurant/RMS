/**
 * useBillingInvoices Hook
 * Fetches invoices/bills for a branch
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

export interface Invoice {
  id: string
  orderId: string
  customerId: string | null
  customer: string
  tableNumber: number
  items: number
  amount: number
  tax: number
  discount: number
  total: number
  date: string
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  paymentMethod: string
  createdAt: string
}

export interface BillingInvoicesResponse {
  success: boolean
  data: Invoice[]
  meta: {
    total: number
    statuses: Record<string, number>
  }
}

interface UseBillingInvoicesReturn {
  data: Invoice[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useBillingInvoices(branchId: string | null): UseBillingInvoicesReturn {
  const [data, setData] = useState<Invoice[] | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/billing/invoices?branchId=${branchId}`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      
      const response = (await res.json()) as BillingInvoicesResponse
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invoices'))
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
