'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_NOTE_POINTS } from '@/lib/note-points'

interface ClientCacheEntry {
  notePoints: string[]
  restaurantId: string | null
  fetchedAt: number
}

const CLIENT_TTL_MS = 60_000
const clientCache = new Map<string, ClientCacheEntry>()
const inFlightRequests = new Map<string, Promise<ClientCacheEntry>>()

async function fetchNotePointsCached(cacheKey: string, restaurantId?: string | null): Promise<ClientCacheEntry> {
  const existing = clientCache.get(cacheKey)
  if (existing && Date.now() - existing.fetchedAt < CLIENT_TTL_MS) {
    return existing
  }

  const pending = inFlightRequests.get(cacheKey)
  if (pending) {
    return pending
  }

  const url = restaurantId
    ? `/api/settings/note-points?restaurantId=${encodeURIComponent(restaurantId)}`
    : '/api/settings/note-points'

  const promise = fetch(url)
    .then((res) => res.json())
    .then((json) => {
      const list = Array.isArray(json?.data?.notePoints) && json.data.notePoints.length > 0
        ? json.data.notePoints
        : DEFAULT_NOTE_POINTS
      const entry: ClientCacheEntry = {
        notePoints: list,
        restaurantId: json?.data?.restaurantId || null,
        fetchedAt: Date.now(),
      }
      clientCache.set(cacheKey, entry)
      return entry
    })
    .catch(() => {
      const fallback: ClientCacheEntry = {
        notePoints: DEFAULT_NOTE_POINTS,
        restaurantId: null,
        fetchedAt: Date.now(),
      }
      return fallback
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey)
    })

  inFlightRequests.set(cacheKey, promise)
  return promise
}

export function updateNotePointsClientCache(notePoints: string[], restaurantId?: string | null): void {
  const now = Date.now()
  clientCache.set('default', { notePoints, restaurantId: restaurantId || null, fetchedAt: now })
  if (restaurantId) {
    clientCache.set(restaurantId, { notePoints, restaurantId, fetchedAt: now })
  }
}

export function invalidateNotePointsClientCache(): void {
  clientCache.clear()
}

export function useNotePoints(restaurantId?: string | null) {
  const cacheKey = restaurantId || 'default'
  const cached = clientCache.get(cacheKey)

  const [notePoints, setNotePoints] = useState<string[]>(cached?.notePoints || DEFAULT_NOTE_POINTS)
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<string | null>(cached?.restaurantId || null)
  const [loading, setLoading] = useState<boolean>(!cached)

  const refresh = useCallback(async (force = false) => {
    if (force) {
      clientCache.delete(cacheKey)
    }
    setLoading(true)
    const entry = await fetchNotePointsCached(cacheKey, restaurantId)
    setNotePoints(entry.notePoints)
    setResolvedRestaurantId(entry.restaurantId)
    setLoading(false)
    return entry
  }, [cacheKey, restaurantId])

  useEffect(() => {
    let active = true
    fetchNotePointsCached(cacheKey, restaurantId).then((entry) => {
      if (!active) return
      setNotePoints(entry.notePoints)
      setResolvedRestaurantId(entry.restaurantId)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [cacheKey, restaurantId])

  return {
    notePoints,
    restaurantId: resolvedRestaurantId,
    loading,
    refresh,
  }
}
