export const DEFAULT_NOTE_POINTS: string[] = [
  'Under Banyan Tree',
  'Near Highway ATM',
  'Near Tree / Shade',
  'Food Cart Front',
  'Main Road Side',
  'Opposite Gate',
  'Corner Parking',
  'Near Liquor Shop',
  'Near Petrol Pump',
]

const MAX_NOTE_POINTS = 30
const MAX_NOTE_POINT_LENGTH = 60

/**
 * Normalizes, trims, deduplicates (case-insensitive), and bounds a list of note points.
 */
export function sanitizeNotePoints(input: unknown): string[] {
  if (!Array.isArray(input)) return []

  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NOTE_POINT_LENGTH)
    if (!trimmed) continue

    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)

    if (result.length >= MAX_NOTE_POINTS) break
  }

  return result
}

interface CacheEntry {
  notePoints: string[]
  restaurantId: string | null
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const notePointsServerCache = new Map<string, CacheEntry>()

export function getCachedNotePoints(cacheKey: string): CacheEntry | null {
  const entry = notePointsServerCache.get(cacheKey)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    notePointsServerCache.delete(cacheKey)
    return null
  }
  return entry
}

export function setCachedNotePoints(
  cacheKey: string,
  notePoints: string[],
  restaurantId: string | null
): void {
  notePointsServerCache.set(cacheKey, {
    notePoints,
    restaurantId,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

export function invalidateNotePointsServerCache(restaurantId?: string | null): void {
  if (restaurantId) {
    notePointsServerCache.delete(restaurantId)
    notePointsServerCache.delete('default')
  } else {
    notePointsServerCache.clear()
  }
}
