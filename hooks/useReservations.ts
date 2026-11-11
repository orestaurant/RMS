/**
 * useReservations Hook
 * Fetches reservations for a branch
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

export interface Reservation {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string
  tableId: string
  tableNumber: number
  date: string
  time: string
  reservationTime: string
  guestCount: number
  status: 'confirmed' | 'pending' | 'cancelled' | 'no_show' | 'seated'
  specialRequests: string
  notes: string
  prepayment: number
  createdAt: string
}

export interface ReservationsResponse {
  success: boolean
  data: Reservation[]
  meta: {
    total: number
    statuses: Record<string, number>
  }
}

interface UseReservationsReturn {
  data: Reservation[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useReservations(branchId: string | null, date: string = 'today'): UseReservationsReturn {
  const [data, setData] = useState<Reservation[] | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reservations?branchId=${branchId}&date=${date}`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      
      const response = (await res.json()) as ReservationsResponse
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reservations'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [branchId, date])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
