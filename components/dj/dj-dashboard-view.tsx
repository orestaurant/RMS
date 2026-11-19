'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Music,
  Headphones,
  Disc3,
  Radio,
  Clock,
  Flame,
  CheckCircle2,
  XCircle,
  ListMusic,
  Play,
  RotateCw,
  Search,
  Filter,
  Sparkles,
  Volume2,
  Users,
  MessageSquare,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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

const statusConfig: Record<
  DjRequestStatus,
  { label: string; badgeClass: string; icon: any }
> = {
  pending: {
    label: 'Pending Approval',
    badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    icon: Clock,
  },
  queued: {
    label: 'In DJ Queue',
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    icon: ListMusic,
  },
  playing: {
    label: 'Playing Now 🔥',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse',
    icon: Flame,
  },
  played: {
    label: 'Completed / Played',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    icon: CheckCircle2,
  },
  declined: {
    label: 'Declined',
    badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: XCircle,
  },
}

function formatTimeAgo(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
    if (diff < 30) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    const mins = Math.floor(diff / 60)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    return `${hours}h ago`
  } catch {
    return 'Recently'
  }
}

export function DjDashboardView() {
  const [requests, setRequests] = useState<DjRequestItem[]>([])
  const [stats, setStats] = useState<DjStats>({
    total: 0,
    pending: 0,
    queued: 0,
    playing: 0,
    played: 0,
    declined: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'playing' | 'completed'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  // Keep a ref to requests for safe optimistic rollbacks
  const requestsRef = useRef<DjRequestItem[]>([])
  requestsRef.current = requests

  // Optimized lightweight fetch (<5KB)
  const fetchRequests = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true)
      const res = await fetch('/api/dj-requests', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data)
        if (json.stats) {
          setStats(json.stats)
        }
      }
    } catch (err) {
      console.warn('Background DJ sync skipped:', err)
    } finally {
      setLoading(false)
      if (!isSilent) setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Fast visibility-aware polling (every 4 seconds, pauses when tab is in background)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchRequests(true)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [fetchRequests])

  // One-click quick status update with OPTIMISTIC UI update
  const handleUpdateStatus = async (id: string, newStatus: DjRequestStatus) => {
    const previousRequests = [...requestsRef.current]
    setActionLoadingId(id)

    // 1. Optimistic local update (instant response!)
    setRequests((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    )

    // Recompute quick stats optimistically
    setStats((prev) => {
      const target = previousRequests.find((r) => r.id === id)
      if (!target || target.status === newStatus) return prev
      return {
        ...prev,
        [target.status]: Math.max(0, prev[target.status] - 1),
        [newStatus]: prev[newStatus] + 1,
      }
    })

    try {
      const res = await fetch('/api/dj-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update song status')
      }

      const songItem = previousRequests.find((r) => r.id === id)
      const statusLabel = statusConfig[newStatus]?.label || newStatus
      setActionFeedback(`Updated "${songItem?.songTitle || 'Song'}" to ${statusLabel}`)
      setTimeout(() => setActionFeedback(null), 3000)
    } catch (err: any) {
      // Rollback on failure
      setRequests(previousRequests)
      setActionFeedback(`Error: ${err?.message || 'Could not update status'}`)
      setTimeout(() => setActionFeedback(null), 4000)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filter requests based on active tab & search
  const filteredRequests = requests.filter((item) => {
    // Tab filter
    if (activeTab === 'pending' && item.status !== 'pending') return false
    if (activeTab === 'playing' && item.status !== 'playing' && item.status !== 'queued') return false
    if (activeTab === 'completed' && item.status !== 'played' && item.status !== 'declined') return false

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = item.songTitle.toLowerCase().includes(q)
      const artistMatch = item.artist ? item.artist.toLowerCase().includes(q) : false
      const tableMatch = item.tableNumber.toLowerCase().includes(q)
      const guestMatch = item.guestName.toLowerCase().includes(q)
      const notesMatch = item.notes ? item.notes.toLowerCase().includes(q) : false
      return titleMatch || artistMatch || tableMatch || guestMatch || notesMatch
    }

    return true
  })

  const currentlyPlaying = requests.filter((r) => r.status === 'playing')

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* 1. DJ BOOTH HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-purple-950 to-pink-950 p-6 md:p-8 text-white shadow-xl border border-pink-500/20">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 size-60 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold uppercase tracking-wider">
              <Disc3 className="size-3.5 animate-spin text-pink-400" />
              Live DJ Console & Crowd Sync
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              DJ Request Booth
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
              </span>
            </h1>
            <p className="text-sm text-zinc-300 max-w-xl">
              Live guest song queue synced directly with dine-in tables. Control now-playing tracks, accept incoming requests, and keep the party alive.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRequests(false)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-2 cursor-pointer h-9 rounded-xl backdrop-blur-md"
            >
              <RotateCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
            </Button>
          </div>
        </div>

        {/* Live Audio Visualizer / Now Playing Bar */}
        {currentlyPlaying.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                <Flame className="size-5 animate-pulse text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">
                    Now Playing
                  </span>
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-1 bg-emerald-400 animate-[bounce_1s_infinite_100ms] h-full rounded-full" />
                    <span className="w-1 bg-emerald-400 animate-[bounce_1s_infinite_300ms] h-3/4 rounded-full" />
                    <span className="w-1 bg-emerald-400 animate-[bounce_1s_infinite_200ms] h-1/2 rounded-full" />
                  </div>
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {currentlyPlaying[0].songTitle}{' '}
                  {currentlyPlaying[0].artist && (
                    <span className="text-zinc-300 font-normal">
                      · {currentlyPlaying[0].artist}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-semibold px-2.5 py-1">
                {currentlyPlaying[0].tableNumber} ({currentlyPlaying[0].guestName})
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleUpdateStatus(currentlyPlaying[0].id, 'played')}
                className="h-8 rounded-xl text-xs font-bold gap-1 bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Mark Played</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* FEEDBACK TOAST */}
      {actionFeedback && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/30 text-foreground text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1"
        >
          <Sparkles className="size-4 text-pink-500 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 2. STATS KPI ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card
          onClick={() => setActiveTab('pending')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm',
            activeTab === 'pending'
              ? 'border-amber-500/50 bg-amber-500/10 shadow-sm shadow-amber-500/10'
              : 'border-border/60 bg-card/60 hover:bg-muted/40'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Pending</p>
              <p className="text-2xl font-black text-amber-500 mt-1">{stats.pending}</p>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setActiveTab('playing')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm',
            activeTab === 'playing'
              ? 'border-indigo-500/50 bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
              : 'border-border/60 bg-card/60 hover:bg-muted/40'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">In Queue</p>
              <p className="text-2xl font-black text-indigo-400 mt-1">{stats.queued}</p>
            </div>
            <div className="size-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <ListMusic className="size-4" />
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setActiveTab('playing')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm',
            activeTab === 'playing'
              ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
              : 'border-border/60 bg-card/60 hover:bg-muted/40'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Playing Now</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{stats.playing}</p>
            </div>
            <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Flame className="size-4 animate-pulse" />
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setActiveTab('completed')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm',
            activeTab === 'completed'
              ? 'border-primary/50 bg-primary/10 shadow-sm shadow-primary/10'
              : 'border-border/60 bg-card/60 hover:bg-muted/40'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Completed</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.played}</p>
            </div>
            <div className="size-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setActiveTab('all')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm col-span-2 sm:col-span-1',
            activeTab === 'all'
              ? 'border-pink-500/50 bg-pink-500/10 shadow-sm shadow-pink-500/10'
              : 'border-border/60 bg-card/60 hover:bg-muted/40'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-black text-pink-400 mt-1">{stats.total}</p>
            </div>
            <div className="size-9 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
              <Disc3 className="size-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. CONTROLS BAR: FILTER TABS & SEARCH */}
      <Card className="p-4 rounded-2xl border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Clock className="size-3.5" />
              <span>Pending</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                {stats.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('playing')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'playing'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Flame className="size-3.5" />
              <span>Queue / Playing</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                {stats.queued + stats.playing}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'completed'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckCircle2 className="size-3.5" />
              <span>Completed</span>
              <span className="px-1.5 py-0.2 rounded-md bg-background/20 text-[10px]">
                {stats.played}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'all'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Disc3 className="size-3.5" />
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                {stats.total}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search song title, artist, table, or guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs h-9.5 rounded-xl bg-background border-border/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. LIVE SONG REQUEST QUEUE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Radio className="size-4 text-pink-500 animate-pulse" />
            <span>Live Song Request Stream ({filteredRequests.length})</span>
          </h2>
          <span className="text-xs text-muted-foreground">Auto-syncs every 4s</span>
        </div>

        {loading ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border/80 bg-card/40 space-y-3">
            <RotateCw className="size-8 mx-auto text-pink-500 animate-spin" />
            <p className="text-sm font-bold text-foreground">Connecting to live DJ booth...</p>
            <p className="text-xs text-muted-foreground">Syncing real-time requests from dine-in tables</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border/80 bg-card/40 space-y-3">
            <div className="size-14 rounded-2xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
              <Music className="size-7 opacity-60" />
            </div>
            <h3 className="text-base font-bold text-foreground">No song requests in this view</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No requests matching "${searchQuery}". Try clearing the search.`
                : activeTab === 'pending'
                ? 'No pending requests right now! All incoming guest songs have been queued or played.'
                : 'Song requests will appear here live as guests order tracks from their tables.'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="rounded-xl text-xs"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredRequests.map((item) => {
              const cfg = statusConfig[item.status] || statusConfig.pending
              const Icon = cfg.icon
              const isUpdating = actionLoadingId === item.id

              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-4 rounded-3xl border transition-all flex flex-col justify-between gap-4 backdrop-blur-sm',
                    item.status === 'playing'
                      ? 'border-emerald-500/50 bg-emerald-500/5 shadow-md shadow-emerald-500/10'
                      : item.status === 'queued'
                      ? 'border-indigo-500/40 bg-indigo-500/5'
                      : item.status === 'pending'
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border/60 bg-card/60'
                  )}
                >
                  {/* Card Header & Song Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            'size-10 rounded-2xl flex items-center justify-center shrink-0 font-bold',
                            item.status === 'playing'
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 animate-pulse'
                              : item.status === 'queued'
                              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          <Music className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm md:text-base font-extrabold text-foreground truncate leading-snug">
                            {item.songTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            {item.artist && (
                              <span className="font-medium text-foreground/80 truncate">
                                by {item.artist}
                              </span>
                            )}
                            {item.language && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-border text-muted-foreground"
                              >
                                {item.language}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[11px] font-bold shrink-0 gap-1 px-2.5 py-1 rounded-full',
                          cfg.badgeClass
                        )}
                      >
                        <Icon className="size-3" />
                        <span>{cfg.label}</span>
                      </Badge>
                    </div>

                    {/* Dedication Note / Message */}
                    {item.notes && (
                      <div className="p-2.5 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-400 flex items-start gap-2">
                        <MessageSquare className="size-3.5 shrink-0 mt-0.5 text-pink-500" />
                        <span className="italic leading-relaxed font-medium">
                          &ldquo;{item.notes}&rdquo;
                        </span>
                      </div>
                    )}

                    {/* Metadata Pill Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <Badge variant="secondary" className="font-bold text-[10px] rounded-lg">
                        {item.tableNumber}
                      </Badge>

                      <span className="flex items-center gap-1">
                        <Users className="size-3 text-muted-foreground" />
                        <span>{item.guestName}</span>
                      </span>

                      <span>•</span>

                      <span className="text-muted-foreground">
                        By {item.requestedBy || 'Customer'}
                      </span>

                      <span>•</span>

                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Status Controls */}
                  <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2">
                    {/* Accept / Queue Button */}
                    {item.status !== 'queued' && item.status !== 'playing' && item.status !== 'played' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(item.id, 'queued')}
                        className="h-8 rounded-xl text-xs font-bold gap-1.5 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 cursor-pointer"
                      >
                        <ListMusic className="size-3.5" />
                        <span>Accept / Queued</span>
                      </Button>
                    )}

                    {/* Playing Now Button */}
                    {item.status !== 'playing' && item.status !== 'played' && (
                      <Button
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(item.id, 'playing')}
                        className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/25 hover:opacity-95 cursor-pointer"
                      >
                        <Flame className="size-3.5" />
                        <span>Playing Now 🔥</span>
                      </Button>
                    )}

                    {/* Completed / Played Button */}
                    {item.status !== 'played' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(item.id, 'played')}
                        className="h-8 rounded-xl text-xs font-bold gap-1.5 cursor-pointer hover:bg-muted"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span>Completed</span>
                      </Button>
                    )}

                    {/* Reject Button */}
                    {item.status !== 'declined' && item.status !== 'played' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(item.id, 'declined')}
                        className="h-8 rounded-xl text-xs font-semibold gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto cursor-pointer"
                      >
                        <XCircle className="size-3.5" />
                        <span>Reject</span>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
