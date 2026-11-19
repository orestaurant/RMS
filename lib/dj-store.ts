/**
 * Real-Time DJ Request Store
 * Powers Customer Song Requests, DJ Booth Queue, and Live Status Sync
 * Uses global singleton for ultra-fast <1ms in-memory query execution and persistence across HMR
 */

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

// Global singleton definition to prevent Next.js hot reload from wiping active state
declare global {
  // eslint-disable-next-line no-var
  var __rms_dj_requests_store__: DjRequestItem[] | undefined
}

const defaultInitialQueue: DjRequestItem[] = []

function getStore(): DjRequestItem[] {
  if (!globalThis.__rms_dj_requests_store__) {
    globalThis.__rms_dj_requests_store__ = []
  }
  // Remove any cached demo/mock requests from previous server sessions
  globalThis.__rms_dj_requests_store__ = globalThis.__rms_dj_requests_store__.filter(
    (item) => !item.id.startsWith('dj-req-demo')
  )
  return globalThis.__rms_dj_requests_store__
}

function setStore(items: DjRequestItem[]): void {
  globalThis.__rms_dj_requests_store__ = items
}

export function getDjRequests(filter?: {
  tableNumber?: string
  status?: string
  search?: string
  limit?: number
}): DjRequestItem[] {
  let list = [...getStore()]

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

  // Sort descending by createdAt
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (filter?.limit && filter.limit > 0) {
    list = list.slice(0, filter.limit)
  }

  return list
}

export function getDjStats(): DjStats {
  const store = getStore()
  const stats: DjStats = {
    total: store.length,
    pending: 0,
    queued: 0,
    playing: 0,
    played: 0,
    declined: 0,
  }

  for (const item of store) {
    if (item.status in stats) {
      stats[item.status as keyof Omit<DjStats, 'total'>]++
    }
  }

  return stats
}

export function addDjRequest(
  data: Omit<DjRequestItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: DjRequestStatus
  }
): DjRequestItem {
  const store = getStore()
  const newItem: DjRequestItem = {
    ...data,
    requestedBy: data.requestedBy || 'Customer',
    id: `dj-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    status: data.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.unshift(newItem)
  // Keep store capped at 200 items to keep payloads lean and fast
  if (store.length > 200) {
    setStore(store.slice(0, 200))
  }
  return newItem
}

export function updateDjRequestStatus(
  id: string,
  status: DjRequestStatus
): DjRequestItem | null {
  const store = getStore()
  const idx = store.findIndex((r) => r.id === id)
  if (idx === -1) return null

  store[idx] = {
    ...store[idx],
    status,
    updatedAt: new Date().toISOString(),
  }
  return store[idx]
}

export function deleteDjRequest(id: string): boolean {
  const store = getStore()
  const idx = store.findIndex((r) => r.id === id)
  if (idx === -1) return false

  store.splice(idx, 1)
  return true
}
