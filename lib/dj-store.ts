/**
 * Real-Time DJ Request Store
 * Powers Customer Song Requests, DJ Booth Queue, and Live Status Sync
 */

export type DjRequestStatus = 'pending' | 'queued' | 'playing' | 'played' | 'declined'

export interface DjRequestItem {
  id: string
  songTitle: string
  artist?: string
  tableNumber: string
  guestName: string
  notes?: string
  status: DjRequestStatus
  createdAt: string
  updatedAt: string
}

// Initial DJ Queue with realistic demo requests if empty
let djRequestsStore: DjRequestItem[] = [
  {
    id: 'dj-req-demo-1',
    songTitle: 'Kesariya (Brahmastra)',
    artist: 'Arijit Singh',
    tableNumber: 'Table 4',
    guestName: 'Rahul',
    notes: 'Anniversary celebration!',
    status: 'playing',
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'dj-req-demo-2',
    songTitle: 'Starboy',
    artist: 'The Weeknd',
    tableNumber: 'Table 2',
    guestName: 'Simran',
    notes: 'Birthday dedication',
    status: 'queued',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
]

export function getDjRequests(filter?: { tableNumber?: string; status?: string }): DjRequestItem[] {
  let list = [...djRequestsStore]
  if (filter?.tableNumber) {
    const cleanTbl = filter.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
    list = list.filter((r) => r.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTbl)
  }
  if (filter?.status) {
    list = list.filter((r) => r.status.toLowerCase() === filter.status!.toLowerCase())
  }
  // Sort descending by createdAt
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addDjRequest(
  data: Omit<DjRequestItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: DjRequestStatus
  }
): DjRequestItem {
  const newItem: DjRequestItem = {
    ...data,
    id: `dj-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    status: data.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  djRequestsStore.unshift(newItem)
  // Keep store capped at 100 items
  if (djRequestsStore.length > 100) {
    djRequestsStore = djRequestsStore.slice(0, 100)
  }
  return newItem
}

export function updateDjRequestStatus(
  id: string,
  status: DjRequestStatus
): DjRequestItem | null {
  const idx = djRequestsStore.findIndex((r) => r.id === id)
  if (idx === -1) return null

  djRequestsStore[idx] = {
    ...djRequestsStore[idx],
    status,
    updatedAt: new Date().toISOString(),
  }
  return djRequestsStore[idx]
}
