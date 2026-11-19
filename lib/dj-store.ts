/**
 * Real-Time DJ Request Store
 * Powers Customer Song Requests, DJ Booth Queue, and Live Status Sync
 * Uses Prisma PostgreSQL (Neon) for durable multi-instance serverless persistence,
 * with hybrid in-memory caching for sub-millisecond responses.
 */

import prisma from '@/lib/prisma'

export type DjRequestStatus = 'pending' | 'queued' | 'playing' | 'played' | 'declined'

export interface DjRequestItem {
  id: string
  songTitle: string
  artist?: string
  language?: string
  tableNumber: string
  guestName: string
  requestedBy: 'Customer' | 'Waiter'
  notes?: string
  status: DjRequestStatus
  playedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface DjStats {
  total: number
  pending: number
  queued: number
  playing: number
  played: number
  declined: number
}

// In-memory cache singleton to prevent excessive DB queries while keeping cold-starts fast
declare global {
  // eslint-disable-next-line no-var
  var __rms_dj_cache__: {
    items: DjRequestItem[]
    lastFetched: number
  } | undefined
}

function getMemoryCache(): DjRequestItem[] {
  if (!globalThis.__rms_dj_cache__) {
    globalThis.__rms_dj_cache__ = { items: [], lastFetched: 0 }
  }
  return globalThis.__rms_dj_cache__.items
}

function setMemoryCache(items: DjRequestItem[]): void {
  globalThis.__rms_dj_cache__ = {
    items,
    lastFetched: Date.now(),
  }
}

// Helper to convert Prisma record to DjRequestItem
function mapPrismaToItem(record: any): DjRequestItem {
  return {
    id: record.id,
    songTitle: record.songTitle,
    artist: record.artist || undefined,
    language: record.language || undefined,
    tableNumber: record.tableNumber,
    guestName: record.guestName,
    requestedBy: (record.requestedBy as 'Customer' | 'Waiter') || 'Customer',
    notes: record.notes || undefined,
    status: (record.status as DjRequestStatus) || 'pending',
    playedAt: record.playedAt ? new Date(record.playedAt).toISOString() : null,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  }
}

export async function getDjRequests(filter?: {
  tableNumber?: string
  status?: string
  search?: string
  limit?: number
}): Promise<DjRequestItem[]> {
  const limit = filter?.limit && filter.limit > 0 ? filter.limit : 50

  try {
    // 1. Build Prisma query filters
    const where: any = {}

    if (filter?.tableNumber) {
      const cleanTbl = filter.tableNumber.trim()
      where.tableNumber = {
        contains: cleanTbl,
        mode: 'insensitive',
      }
    }

    if (filter?.status && filter.status.toLowerCase() !== 'all') {
      const allowed = filter.status.toLowerCase().split(',').map((s) => s.trim())
      where.status = {
        in: allowed,
      }
    }

    if (filter?.search) {
      const q = filter.search.trim()
      where.OR = [
        { songTitle: { contains: q, mode: 'insensitive' } },
        { artist: { contains: q, mode: 'insensitive' } },
        { tableNumber: { contains: q, mode: 'insensitive' } },
        { guestName: { contains: q, mode: 'insensitive' } },
      ]
    }

    const records = await prisma.djSongRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const items = records.map(mapPrismaToItem)

    // Update in-memory cache if fetching all or top list
    if (!filter?.status && !filter?.tableNumber && !filter?.search) {
      setMemoryCache(items)
    }

    return items
  } catch (error) {
    console.warn('Database fetch failed for DJ requests, using in-memory cache fallback:', error)
    // Fallback to in-memory cache if DB is momentarily unreachable
    let list = [...getMemoryCache()]

    if (filter?.tableNumber) {
      const cleanTbl = filter.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
      list = list.filter((r) => r.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTbl)
    }

    if (filter?.status && filter.status.toLowerCase() !== 'all') {
      const allowed = filter.status.toLowerCase().split(',').map((s) => s.trim())
      list = list.filter((r) => allowed.includes(r.status.toLowerCase()))
    }

    if (filter?.search) {
      const query = filter.search.toLowerCase().trim()
      list = list.filter(
        (r) =>
          r.songTitle.toLowerCase().includes(query) ||
          (r.artist && r.artist.toLowerCase().includes(query)) ||
          r.tableNumber.toLowerCase().includes(query) ||
          r.guestName.toLowerCase().includes(query)
      )
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return list.slice(0, limit)
  }
}

export async function getDjStats(): Promise<DjStats> {
  const stats: DjStats = {
    total: 0,
    pending: 0,
    queued: 0,
    playing: 0,
    played: 0,
    declined: 0,
  }

  try {
    const grouped = await prisma.djSongRequest.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    })

    for (const group of grouped) {
      const st = group.status as keyof Omit<DjStats, 'total'>
      const count = group._count._all
      if (st in stats) {
        stats[st] = count
      }
      stats.total += count
    }

    return stats
  } catch (error) {
    console.warn('Database groupBy failed for DJ stats, using memory cache fallback:', error)
    const cache = getMemoryCache()
    stats.total = cache.length
    for (const item of cache) {
      if (item.status in stats) {
        stats[item.status as keyof Omit<DjStats, 'total'>]++
      }
    }
    return stats
  }
}

export async function addDjRequest(
  data: Omit<DjRequestItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: DjRequestStatus
  }
): Promise<DjRequestItem> {
  const requestedBy = data.requestedBy || 'Customer'
  const status = data.status || 'pending'

  try {
    const created = await prisma.djSongRequest.create({
      data: {
        songTitle: data.songTitle,
        artist: data.artist || null,
        language: data.language || null,
        tableNumber: data.tableNumber,
        guestName: data.guestName,
        requestedBy,
        notes: data.notes || null,
        status,
      },
    })

    const newItem = mapPrismaToItem(created)

    // Update in-memory cache
    const cache = getMemoryCache()
    cache.unshift(newItem)
    if (cache.length > 200) {
      setMemoryCache(cache.slice(0, 200))
    }

    return newItem
  } catch (error) {
    console.warn('Database insert failed for DJ request, using memory cache fallback:', error)
    const fallbackItem: DjRequestItem = {
      ...data,
      requestedBy,
      id: `dj-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const cache = getMemoryCache()
    cache.unshift(fallbackItem)
    setMemoryCache(cache)
    return fallbackItem
  }
}

export async function updateDjRequestStatus(
  id: string,
  status: DjRequestStatus
): Promise<DjRequestItem | null> {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  }

  // When marked as played, stamp the playedAt timestamp
  if (status === 'played') {
    updateData.playedAt = new Date()
  }

  try {
    const updated = await prisma.djSongRequest.update({
      where: { id },
      data: updateData,
    })

    const item = mapPrismaToItem(updated)

    // Sync in-memory cache
    const cache = getMemoryCache()
    const idx = cache.findIndex((r) => r.id === id)
    if (idx !== -1) {
      cache[idx] = item
    }

    return item
  } catch (error) {
    console.warn(`Database update failed for DJ request ${id}, using memory cache fallback:`, error)
    const cache = getMemoryCache()
    const idx = cache.findIndex((r) => r.id === id)
    if (idx === -1) return null

    cache[idx] = {
      ...cache[idx],
      status,
      playedAt: status === 'played' ? new Date().toISOString() : cache[idx].playedAt,
      updatedAt: new Date().toISOString(),
    }
    return cache[idx]
  }
}

export async function deleteDjRequest(id: string): Promise<boolean> {
  try {
    await prisma.djSongRequest.delete({
      where: { id },
    })

    const cache = getMemoryCache()
    const idx = cache.findIndex((r) => r.id === id)
    if (idx !== -1) {
      cache.splice(idx, 1)
    }

    return true
  } catch (error) {
    console.warn(`Database delete failed for DJ request ${id}, using memory cache fallback:`, error)
    const cache = getMemoryCache()
    const idx = cache.findIndex((r) => r.id === id)
    if (idx === -1) return false
    cache.splice(idx, 1)
    return true
  }
}
