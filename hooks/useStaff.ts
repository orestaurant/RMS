/**
 * useStaff Hook
 * Fetches staff members for a branch
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatar: string
  status: 'active' | 'inactive' | 'on-leave'
  joinDate: string
  salary: number
  department: string
  tablesAssigned: number[]
  ordersToday: number
  performanceScore: number
}

export interface StaffResponse {
  success: boolean
  data: StaffMember[]
  meta: {
    total: number
    roles: string[]
  }
}

interface UseStaffReturn {
  data: StaffMember[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useStaff(branchId: string | null): UseStaffReturn {
  const [data, setData] = useState<StaffMember[] | null>(null)
  const [loading, setLoading] = useState(!branchId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff?branchId=${branchId}`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      
      const response = (await res.json()) as StaffResponse
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch staff'))
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
