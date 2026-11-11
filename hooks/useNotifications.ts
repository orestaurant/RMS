/**
 * useNotifications Hook
 * Fetches user notifications
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getNotifications } from '@/lib/api/dashboard'
import type { Notification } from '@/types/notifications'

interface UseNotificationsReturn {
  data: Notification[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useNotifications(limit: number = 10): UseNotificationsReturn {
  const [data, setData] = useState<Notification[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const notifications = await getNotifications(limit)
      setData(notifications)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
