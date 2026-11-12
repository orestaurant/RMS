'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ChefHat,
  Users,
  Search,
  RefreshCw,
  Volume2,
  VolumeX,
  Layers,
  Kanban,
  ArrowRight,
  Check,
  UtensilsCrossed,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type KanbanStatus = 'pending' | 'accepted' | 'cooking' | 'ready' | 'served'
export type PriorityLevel = 'normal' | 'high' | 'urgent'

export interface KitchenTicketItem {
  id: string
  name: string
  quantity: number
  notes?: string
  station?: string
  completed?: boolean
}

export interface KitchenTicket {
  id: string
  fullId?: string
  tableNumber: number | string
  source?: 'dine_in' | 'takeaway' | 'qr_order' | 'delivery'
  waiter?: string
  customerName?: string
  status: KanbanStatus
  priority: PriorityLevel
  createdAt: string
  specialNotes?: string
  items: KitchenTicketItem[]
}

export interface BatchItem {
  name: string
  totalQuantity: number
  station: string
  orders: Array<{
    id: string
    tableNumber: string | number
    quantity: number
  }>
}

const columns: {
  id: 'pending' | 'accepted' | 'cooking' | 'ready'
  label: string
  icon: React.ElementType
  color: string
  bg: string
  badgeBg: string
}[] = [
  {
    id: 'pending',
    label: 'Incoming',
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'border-warning/30 bg-warning/5',
    badgeBg: 'bg-warning/15 text-warning border-warning/30',
  },
  {
    id: 'accepted',
    label: 'Accepted',
    icon: ChefHat,
    color: 'text-primary',
    bg: 'border-primary/30 bg-primary/5',
    badgeBg: 'bg-primary/15 text-primary border-primary/30',
  },
  {
    id: 'cooking',
    label: 'Cooking',
    icon: Flame,
    color: 'text-chart-4',
    bg: 'border-chart-4/30 bg-chart-4/5',
    badgeBg: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  },
  {
    id: 'ready',
    label: 'Ready',
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'border-success/30 bg-success/5',
    badgeBg: 'bg-success/15 text-success border-success/30',
  },
]

const nextTransitions: Record<'pending' | 'accepted' | 'cooking' | 'ready', KanbanStatus> = {
  pending: 'accepted',
  accepted: 'cooking',
  cooking: 'ready',
  ready: 'served',
}

const nextTransitionLabels: Record<'pending' | 'accepted' | 'cooking' | 'ready', string> = {
  pending: 'Accept',
  accepted: 'Start Cooking',
  cooking: 'Mark Ready',
  ready: 'Mark Served',
}

// Kitchen sound synthesizer (Web Audio API)
function playKitchenChime() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880, now + 0.15)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now + 0.15)
    osc1.stop(now + 0.6)
    osc2.stop(now + 0.6)
  } catch (e) {
    // Audio context may be restricted by autoplay policy
  }
}

// Live ticking Order Timer
function OrderTimer({ startTime, priority }: { startTime: string; priority: PriorityLevel }) {
  const [now, setNow] = useState<number>(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Safely parse start date
  const parsedDate = new Date(startTime).getTime()
  const isValidDate = !isNaN(parsedDate)

  // Calculate elapsed seconds, capping safely against dates older than 2 hours to avoid huge numbers
  let diffSec = isValidDate ? Math.floor((now - parsedDate) / 1000) : 0
  if (diffSec < 0) diffSec = 0
  if (diffSec > 7200) diffSec = 7200 // clamp at 2 hours max

  const mins = Math.floor(diffSec / 60)
  const secs = diffSec % 60

  const isOverdue = mins >= 20
  const isWarning = mins >= 12 && mins < 20

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-0.5 rounded-md border transition-colors',
        isOverdue
          ? 'border-destructive/40 bg-destructive/10 text-destructive animate-pulse'
          : isWarning || priority === 'urgent'
          ? 'border-warning/40 bg-warning/10 text-warning'
          : 'border-border/60 bg-muted/40 text-muted-foreground'
      )}
    >
      <Clock className="size-3.5 shrink-0" />
      <span>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')} min
      </span>
      {isOverdue && <AlertTriangle className="size-3 text-destructive shrink-0" />}
    </div>
  )
}

function KitchenOrderCard({
  ticket,
  onAdvance,
  onToggleItem,
  onReprioritize,
}: {
  ticket: KitchenTicket
  onAdvance: (id: string, nextStatus: KanbanStatus) => void
  onToggleItem: (ticketId: string, itemId: string) => void
  onReprioritize: (ticketId: string, priority: PriorityLevel) => void
}) {
  const currentStatus = ticket.status as 'pending' | 'accepted' | 'cooking' | 'ready'
  const nextStatus = nextTransitions[currentStatus] || null

  const priorityStyles: Record<PriorityLevel, { ring: string; badge: string; dot: string; label: string }> = {
    normal: {
      ring: 'ring-border/60',
      badge: 'border-border bg-muted/40 text-muted-foreground',
      dot: 'bg-muted-foreground/50',
      label: 'Normal',
    },
    high: {
      ring: 'ring-warning/50 border-warning/30',
      badge: 'border-warning/40 bg-warning/10 text-warning',
      dot: 'bg-warning',
      label: 'High',
    },
    urgent: {
      ring: 'ring-destructive/60 border-destructive/40 bg-destructive/[0.02]',
      badge: 'border-destructive/40 bg-destructive/15 text-destructive',
      dot: 'bg-destructive animate-ping',
      label: 'Urgent',
    },
  }

  const pConfig = priorityStyles[ticket.priority] || priorityStyles.normal
  const allItemsCompleted = ticket.items.length > 0 && ticket.items.every((i) => i.completed)

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border bg-card p-4 gap-3 ring-1 ring-inset shadow-sm transition-all',
        pConfig.ring
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {ticket.priority === 'urgent' && (
              <span className="flex size-2 shrink-0 rounded-full bg-destructive animate-ping" />
            )}
            <span className="text-base font-bold font-mono tracking-tight">{ticket.id}</span>
            {ticket.source && (
              <Badge variant="outline" className="text-[10px] uppercase font-semibold h-4 px-1.5 py-0">
                {ticket.source === 'qr_order' ? 'QR Order' : ticket.source === 'dine_in' ? 'Dine In' : ticket.source}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span className="font-semibold text-foreground">
              {typeof ticket.tableNumber === 'number' || !isNaN(Number(ticket.tableNumber))
                ? `Table ${ticket.tableNumber}`
                : ticket.tableNumber}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="truncate">{ticket.customerName || ticket.waiter || 'Staff'}</span>
          </div>
        </div>

        {/* Timer & Priority Dropdown */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <OrderTimer startTime={ticket.createdAt} priority={ticket.priority} />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className={cn(
                    'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer',
                    pConfig.badge
                  )}
                  title="Change priority (Supervisor / Chef)"
                >
                  <span className={cn('size-1.5 rounded-full', pConfig.dot)} />
                  {pConfig.label}
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel className="text-xs">Set Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onReprioritize(ticket.id, 'normal')} className="text-xs">
                Normal Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReprioritize(ticket.id, 'high')} className="text-xs text-warning">
                High Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReprioritize(ticket.id, 'urgent')} className="text-xs text-destructive font-semibold">
                Urgent Priority
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Items list with individual check-off per PRD */}
      <div className="flex flex-col gap-2 my-1">
        {ticket.items.map((item) => (
          <div
            key={item.id}
            onClick={() => onToggleItem(ticket.id, item.id)}
            className={cn(
              'group flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer border',
              item.completed
                ? 'bg-muted/30 border-border/40 opacity-55'
                : 'bg-muted/60 border-border/70 hover:border-primary/40 hover:bg-muted'
            )}
          >
            {/* Quantity pill */}
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                item.completed
                  ? 'bg-success/20 text-success'
                  : 'bg-background text-foreground shadow-xs'
              )}
            >
              {item.completed ? <Check className="size-3.5" /> : item.quantity}
            </span>

            {/* Dish info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p
                  className={cn(
                    'text-xs font-semibold leading-tight',
                    item.completed && 'line-through text-muted-foreground'
                  )}
                >
                  {item.name}
                </p>
                {item.station && (
                  <span className="text-[9px] font-mono text-muted-foreground/80 px-1 py-0.2 rounded bg-background/50 border border-border/40 shrink-0">
                    {item.station}
                  </span>
                )}
              </div>

              {item.notes && (
                <p className="text-[11px] mt-1 text-warning flex items-center gap-1 font-medium">
                  <span>⚠</span>
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Special order notes */}
      {ticket.specialNotes && (
        <div className="rounded-xl bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning flex items-start gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          <span className="leading-snug">{ticket.specialNotes}</span>
        </div>
      )}

      {/* Action Advance Button */}
      <div className="mt-1 flex items-center gap-2">
        {nextStatus ? (
          <Button
            size="sm"
            className={cn(
              'flex-1 h-10 text-sm font-bold tracking-wide transition-all shadow-sm active:scale-[0.98]',
              currentStatus === 'pending' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
              currentStatus === 'accepted' && 'bg-chart-4 hover:bg-chart-4/90 text-white',
              currentStatus === 'cooking' && 'bg-success hover:bg-success/90 text-success-foreground'
            )}
            onClick={() => onAdvance(ticket.id, nextStatus)}
          >
            {nextTransitionLabels[currentStatus]}
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-10 text-sm font-bold border-success/50 text-success hover:bg-success/15 active:scale-[0.98]"
            onClick={() => onAdvance(ticket.id, 'served')}
          >
            <CheckCircle2 className="size-4 mr-1.5" />
            Mark Served
          </Button>
        )}
      </div>
    </div>
  )
}

export function KitchenDisplay() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [stations, setStations] = useState<string[]>(['All', 'Grill & Tandoor', 'Main Kitchen', 'Beverages / Bar', 'Desserts'])
  const [activeStation, setActiveStation] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'kanban' | 'batch'>('kanban')
  const [search, setSearch] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const prevIncomingCountRef = useRef<number>(0)

  // Fetch live tickets from backend API
  const fetchTickets = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      const res = await fetch(`/api/kds/tickets?station=${encodeURIComponent(activeStation)}`)
      const json = await res.json()

      if (json.success && json.data) {
        const incomingTickets: KitchenTicket[] = json.data.tickets || []
        setTickets(incomingTickets)

        if (json.data.batchItems) {
          setBatchItems(json.data.batchItems)
        }
        if (json.data.stations && json.data.stations.length > 0) {
          setStations(json.data.stations)
        }

        // Sound alert if new incoming orders arrived
        const pendingCount = incomingTickets.filter((t) => t.status === 'pending').length
        if (!isInitial && pendingCount > prevIncomingCountRef.current && soundEnabled) {
          playKitchenChime()
        }
        prevIncomingCountRef.current = pendingCount
        setLastSync(new Date())
      }
    } catch (err) {
      console.error('Failed to sync KDS tickets:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [activeStation, soundEnabled])

  // Initial load and periodic polling every 5 seconds for real-time dynamic sync
  useEffect(() => {
    fetchTickets(true)
    const interval = setInterval(() => {
      fetchTickets(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchTickets])

  // Optimistic status advance with backend persistence
  const handleAdvance = async (id: string, nextStatus: KanbanStatus) => {
    // Optimistic UI update
    setTickets((prev) => {
      if (nextStatus === 'served') {
        return prev.filter((t) => t.id !== id)
      }
      return prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    })

    try {
      await fetch(`/api/kds/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      // Refresh silently
      fetchTickets(false)
    } catch (err) {
      console.error('Failed to update ticket status on server:', err)
    }
  }

  // Toggle individual item completion
  const handleToggleItem = async (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t
        return {
          ...t,
          items: t.items.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i)),
        }
      })
    )

    try {
      await fetch(`/api/kds/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleItemId: itemId }),
      })
    } catch (err) {
      console.error('Failed to toggle item completion:', err)
    }
  }

  // Reprioritize ticket (Supervisor / Chef role per PRD)
  const handleReprioritize = async (ticketId: string, priority: PriorityLevel) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, priority } : t))
    )

    try {
      await fetch(`/api/kds/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
    } catch (err) {
      console.error('Failed to reprioritize ticket:', err)
    }
  }

  // Filtered tickets based on search & active station
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        search === '' ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        String(t.tableNumber).toLowerCase().includes(search.toLowerCase()) ||
        (t.waiter || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        t.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()))

      const matchStation =
        activeStation === 'All' ||
        t.items.some((i) => i.station === activeStation)

      return matchSearch && matchStation
    })
  }, [tickets, search, activeStation])

  return (
    <main className="flex h-[calc(100vh-56px)] flex-col gap-0 overflow-hidden bg-background">
      {/* ── Summary & Control Bar ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/60 backdrop-blur-md px-6 py-3 shrink-0">
        {/* Status Count Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {columns.map((col) => {
            const count = tickets.filter((o) => o.status === col.id).length
            return (
              <div
                key={col.id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all',
                  col.badgeBg
                )}
              >
                <col.icon className={cn('size-4 shrink-0', col.color)} />
                <span className="text-xs font-semibold">{col.label}</span>
                <Badge
                  variant="secondary"
                  className={cn('text-xs font-bold h-5 min-w-5 px-1.5 rounded-md bg-background/80')}
                >
                  {count}
                </Badge>
              </div>
            )
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Search */}
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, table, dish..."
              className="pl-8 h-8 text-xs bg-muted/40"
            />
          </div>

          {/* View Mode Toggle: Kanban vs Batch Cooking */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                viewMode === 'kanban'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Kanban Board View"
            >
              <Kanban className="size-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                viewMode === 'batch'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Batch Cooking View (PRD Feature)"
            >
              <Layers className="size-3.5" />
              <span className="hidden sm:inline">Batch Cooking</span>
              {batchItems.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {batchItems.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Audio Chime Toggle */}
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg shrink-0"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Kitchen chime on' : 'Kitchen chime muted'}
          >
            {soundEnabled ? (
              <Volume2 className="size-3.5 text-primary" />
            ) : (
              <VolumeX className="size-3.5 text-muted-foreground" />
            )}
          </Button>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg shrink-0"
            onClick={() => fetchTickets(false)}
            title="Manual sync"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin text-primary')} />
          </Button>

          {/* Live Sync Status */}
          <div className="flex items-center gap-1.5 text-xs text-success font-medium pl-1">
            <span className="size-2 rounded-full bg-success animate-pulse" />
            <span className="hidden sm:inline">Live Kitchen</span>
          </div>
        </div>
      </div>

      {/* ── Kitchen Station Filter Bar (PRD Section 7) ──────────── */}
      <div className="flex items-center gap-2 border-b border-border bg-card/30 px-6 py-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap mr-1">
          Station:
        </span>
        {stations.map((st) => (
          <button
            key={st}
            onClick={() => setActiveStation(st)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
              activeStation === st
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
            )}
          >
            {st}
          </button>
        ))}
      </div>

      {/* ── Main Content Area ──────────────────────────────────── */}
      {tickets.length === 0 && !loading && (
        <div className="flex items-center justify-between px-6 py-2 bg-muted/20 border-b border-border text-xs shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="flex size-2 rounded-full bg-success animate-pulse" />
            <span className="font-semibold text-foreground">Live Kitchen Queue Ready</span>
            <span className="text-muted-foreground/60">·</span>
            <span>Waiting for live customer orders (QR scan or POS). Orders will appear here automatically.</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">0 active orders</span>
        </div>
      )}

      {viewMode === 'kanban' ? (
        /* Kanban Columns */
        <div className="flex flex-1 gap-0 overflow-hidden divide-x divide-border">
          {columns.map((col) => {
            const colTickets = filteredTickets.filter((t) => t.status === col.id)
            return (
              <div key={col.id} className={cn('flex flex-1 flex-col min-w-0', col.bg.split(' ')[1])}>
                {/* Column Header */}
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 border-b shrink-0 bg-background/50 backdrop-blur-xs',
                    col.bg
                  )}
                >
                  <col.icon className={cn('size-4 shrink-0', col.color)} />
                  <span className={cn('text-sm font-bold', col.color)}>{col.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'ml-auto h-6 min-w-6 px-1.5 text-xs font-bold',
                      colTickets.length > 0 && col.color
                    )}
                  >
                    {colTickets.length}
                  </Badge>
                </div>

                {/* Column Cards Container */}
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-3 p-4">
                    {colTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border">
                          <col.icon className="size-5 text-muted-foreground/60" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">No orders in {col.label}</p>
                      </div>
                    ) : (
                      colTickets.map((ticket) => (
                        <KitchenOrderCard
                          key={ticket.id}
                          ticket={ticket}
                          onAdvance={handleAdvance}
                          onToggleItem={handleToggleItem}
                          onReprioritize={handleReprioritize}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Batch Cooking View (PRD Requirement) ─────────────── */
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          <div className="max-w-6xl mx-auto flex flex-col gap-5">
            {/* Batch Cooking Header Description */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UtensilsCrossed className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Batch Cooking Queue</h3>
                  <p className="text-xs text-muted-foreground">
                    Aggregated dishes currently needed across all active accepted and cooking tickets. Group identical items to accelerate kitchen prep time.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary px-3 py-1 text-xs font-semibold">
                {batchItems.reduce((acc, curr) => acc + curr.totalQuantity, 0)} Total Portions
              </Badge>
            </div>

            {/* Batch Cards Grid */}
            {batchItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-border bg-card/40">
                <UtensilsCrossed className="size-10 text-muted-foreground/40 mb-3" />
                <h4 className="text-sm font-semibold">No Active Items to Batch</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Once incoming orders are accepted and queued for cooking, common dishes across tables will automatically aggregate here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchItems.map((batch) => (
                  <div
                    key={batch.name}
                    className="flex flex-col rounded-2xl border border-border bg-card p-4 gap-3 shadow-xs hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-foreground">{batch.name}</h4>
                        <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border">
                          {batch.station}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-primary font-mono">
                          {batch.totalQuantity}×
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Portions</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                        Orders Requiring This:
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {batch.orders.map((ord, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-mono font-medium text-foreground">
                              {ord.id} ({typeof ord.tableNumber === 'number' || !isNaN(Number(ord.tableNumber)) ? `Table ${ord.tableNumber}` : ord.tableNumber})
                            </span>
                            <span className="font-bold bg-background px-2 py-0.5 rounded border border-border text-xs">
                              {ord.quantity} qty
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
