'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Lock,
  Unlock,
  Sparkles,
  Timer,
  AlertOctagon,
  Bell,
  MessageSquare,
  Phone,
  Send,
  X,
} from 'lucide-react'
import { getItemCuisine } from '@/lib/kds-utils'
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
  cuisine?: string
  completed?: boolean
}

export interface KitchenTicket {
  id: string
  fullId?: string
  orderNumber?: string
  tableNumber: number | string
  tableName?: string
  source?: 'dine_in' | 'takeaway' | 'qr_order' | 'delivery'
  waiter?: string
  customerName?: string
  status: KanbanStatus
  priority: PriorityLevel
  createdAt: string
  specialNotes?: string
  cuisines?: string[]
  items: KitchenTicketItem[]
}

export interface CuisineBatch {
  cuisine: string
  startedAt: number
  expiresAt: number
  remainingSeconds: number
  isLocked: boolean
  leadTicketId: string
  ticketIds: string[]
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
  accepted: 'Start Preparing',
  cooking: 'Mark Ready',
  ready: 'Mark Served',
}

// Kitchen lock notification sound (Web Audio API)
function playLockChime() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(440, now) // A4
    osc.frequency.setValueAtTime(330, now + 0.15) // E4
    osc.frequency.setValueAtTime(220, now + 0.3) // A3

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.5)
  } catch (e) {
    // Audio context may be restricted by autoplay policy
  }
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

// Order Prepared notification chime (Pleasant ascending chime C5 -> E5 -> G5 -> C6)
function playOrderPreparedChime() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now) // C5
    osc.frequency.setValueAtTime(659.25, now + 0.12) // E5
    osc.frequency.setValueAtTime(783.99, now + 0.24) // G5
    osc.frequency.setValueAtTime(1046.5, now + 0.36) // C6

    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.7)
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

const KitchenOrderCard = React.memo(function KitchenOrderCard({
  ticket,
  onAdvance,
  onToggleItem,
  onReprioritize,
  cuisineBatches,
  onQuickAddBatch,
}: {
  ticket: KitchenTicket
  onAdvance: (id: string, nextStatus: KanbanStatus) => void
  onToggleItem: (ticketId: string, itemId: string) => void
  onReprioritize: (ticketId: string, priority: PriorityLevel) => void
  cuisineBatches: Record<string, CuisineBatch>
  onQuickAddBatch?: (ticketId: string, cuisine: string) => void
}) {
  const currentStatus = ticket.status as 'pending' | 'accepted' | 'cooking' | 'ready'
  const nextStatus = nextTransitions[currentStatus] || null

  // Compute cuisines for this ticket
  const ticketCuisines = useMemo(() => {
    if (ticket.cuisines && ticket.cuisines.length > 0) return ticket.cuisines
    return Array.from(
      new Set(
        ticket.items.map((it) => it.cuisine || getItemCuisine(it.name, it.station))
      )
    )
  }, [ticket])

  // Check if any cuisine of this ticket has an active batch in the 20s window or is locked
  const matchingBatch = useMemo(() => {
    for (const c of ticketCuisines) {
      if (cuisineBatches[c]) {
        return cuisineBatches[c]
      }
    }
    return null
  }, [ticketCuisines, cuisineBatches])

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

          {/* Cuisines Tag List */}
          {ticketCuisines.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {ticketCuisines.map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-xs">Quick Advance</DropdownMenuLabel>
              {currentStatus !== 'cooking' && (
                <DropdownMenuItem onClick={() => onAdvance(ticket.id, 'cooking')} className="text-xs text-chart-4 font-semibold">
                  Start Cooking
                </DropdownMenuItem>
              )}
              {currentStatus !== 'ready' && (
                <DropdownMenuItem onClick={() => onAdvance(ticket.id, 'ready')} className="text-xs text-success font-semibold">
                  Mark Ready
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onAdvance(ticket.id, 'served')} className="text-xs">
                Mark Served
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Set Priority</DropdownMenuLabel>
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

      {/* 20-Second Batch Cooking Indicator for Queued Orders */}
      {(currentStatus === 'pending' || currentStatus === 'accepted') && matchingBatch && (
        <div
          className={cn(
            'p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-all',
            !matchingBatch.isLocked
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          )}
        >
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              {!matchingBatch.isLocked ? (
                <>
                  <Timer className="size-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>Same Cuisine: {matchingBatch.cuisine}</span>
                </>
              ) : (
                <>
                  <Lock className="size-3.5" />
                  <span>{matchingBatch.cuisine} Locked</span>
                </>
              )}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 font-bold',
                !matchingBatch.isLocked ? 'border-amber-500 text-amber-500' : 'border-destructive text-destructive'
              )}
            >
              {!matchingBatch.isLocked ? `${matchingBatch.remainingSeconds}s window` : '20s Expired'}
            </Badge>
          </div>

          {!matchingBatch.isLocked ? (
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-[11px] text-muted-foreground">
                Batch cooking window active! Add now with same cuisine.
              </span>
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-sm shrink-0 px-2.5"
                onClick={() => onQuickAddBatch && onQuickAddBatch(ticket.id, matchingBatch.cuisine)}
              >
                + Add ({matchingBatch.remainingSeconds}s)
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-destructive/90 leading-tight">
              20s selection timer expired. Chef cannot add this to active {matchingBatch.cuisine} batch.
            </p>
          )}
        </div>
      )}

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

      {/* Action Advance Buttons per Lifecycle State Machine */}
      <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2 shrink-0">
        {currentStatus === 'accepted' ? (
          <>
            <Button
              size="sm"
              className="flex-1 h-10 text-xs font-bold tracking-wide bg-chart-4 hover:bg-chart-4/90 text-white shadow-sm active:scale-[0.98] cursor-pointer"
              onClick={() => onAdvance(ticket.id, 'cooking')}
            >
              <Flame className="size-3.5 mr-1 text-white animate-pulse" />
              Start Preparing
            </Button>
            <Button
              size="sm"
              className="flex-1 h-10 text-xs font-bold tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.98] cursor-pointer"
              onClick={() => onAdvance(ticket.id, 'ready')}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              Mark Ready
            </Button>
          </>
        ) : currentStatus === 'cooking' ? (
          <Button
            size="sm"
            className="flex-1 h-10 text-sm font-extrabold tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98] cursor-pointer"
            onClick={() => onAdvance(ticket.id, 'ready')}
          >
            <CheckCircle2 className="size-4 mr-1.5" />
            Mark Ready
          </Button>
        ) : currentStatus === 'ready' ? (
          <Button
            size="sm"
            className="flex-1 h-10 text-sm font-extrabold tracking-wide bg-sky-600 hover:bg-sky-700 text-white shadow-md active:scale-[0.98] cursor-pointer"
            onClick={() => onAdvance(ticket.id, 'served')}
          >
            <Check className="size-4 mr-1.5" />
            Mark Served
          </Button>
        ) : currentStatus === 'pending' ? (
          <Button
            size="sm"
            className="flex-1 h-10 text-sm font-bold tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm active:scale-[0.98] cursor-pointer"
            onClick={() => onAdvance(ticket.id, 'accepted')}
          >
            Accept Order
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-10 text-sm font-bold border-success/50 text-success hover:bg-success/15 active:scale-[0.98] cursor-pointer"
            onClick={() => onAdvance(ticket.id, 'served')}
          >
            <CheckCircle2 className="size-4 mr-1.5" />
            Mark Served
          </Button>
        )}
      </div>
    </div>
  )
})

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
  // Track recent optimistic updates to prevent race-condition rollbacks from stale server polling
  const recentStatusUpdatesRef = useRef<Map<string, { status: KanbanStatus; timestamp: number }>>(new Map())

  // Fetch live tickets from backend API
  const fetchTickets = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      const res = await fetch(`/api/kds/tickets?station=${encodeURIComponent(activeStation)}`, {
        cache: 'no-store',
      })
      const json = await res.json()

      if (json.success && json.data) {
        const incomingTickets: KitchenTicket[] = json.data.tickets || []
        const currentTime = Date.now()

        // Clean up locks older than 15 seconds
        for (const [k, val] of recentStatusUpdatesRef.current.entries()) {
          if (currentTime - val.timestamp > 15000) {
            recentStatusUpdatesRef.current.delete(k)
          }
        }

        // Reconcile with optimistic locks to prevent rolling back to previous status
        const reconciledTickets: KitchenTicket[] = []
        const seenTicketKeys = new Set<string>()

        for (const ticket of incomingTickets) {
          const tKeys = [ticket.id, ticket.fullId, ticket.orderNumber].filter(Boolean) as string[]

          let activeLockedStatus: KanbanStatus | null = null
          for (const k of tKeys) {
            const lock = recentStatusUpdatesRef.current.get(k)
            if (lock && currentTime - lock.timestamp < 15000) {
              activeLockedStatus = lock.status
              break
            }
          }

          const resolvedStatus = activeLockedStatus || ticket.status

          // Exclude served or cancelled orders from live board
          if (resolvedStatus === 'served') continue

          // Strictly deduplicate by primary key (order cannot exist in multiple columns)
          const primaryKey = ticket.fullId || ticket.orderNumber || ticket.id
          if (seenTicketKeys.has(primaryKey)) continue
          seenTicketKeys.add(primaryKey)

          reconciledTickets.push({
            ...ticket,
            status: resolvedStatus,
          })
        }

        setTickets(reconciledTickets)

        if (json.data.batchItems) {
          setBatchItems(json.data.batchItems)
        }
        if (json.data.stations && json.data.stations.length > 0) {
          setStations(json.data.stations)
        }

        // Sound alert if new incoming orders arrived
        const pendingCount = reconciledTickets.filter((t) => t.status === 'pending').length
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

  // Active 20-second cuisine batch timers state
  const [cuisineBatches, setCuisineBatches] = useState<Record<string, CuisineBatch>>({})
  const [batchLockAlert, setBatchLockAlert] = useState<{
    open: boolean
    cuisine: string
    message: string
  } | null>(null)

  // Order Prepared Notification State (Sound + Toast + WhatsApp/SMS Dispatch)
  const [orderPreparedAlert, setOrderPreparedAlert] = useState<{
    open: boolean
    orderNumber: string
    tableNumber: string
    customerName: string
    itemsSummary: string
  } | null>(null)

  // 20-Second Ticking Interval for active preparation batches
  useEffect(() => {
    const timer = setInterval(() => {
      setCuisineBatches((prev) => {
        const now = Date.now()
        let hasChanges = false
        const nextBatches = { ...prev }

        for (const [cuisine, batch] of Object.entries(nextBatches)) {
          if (!batch.isLocked) {
            const diff = Math.max(0, Math.ceil((batch.expiresAt - now) / 1000))
            if (diff !== batch.remainingSeconds) {
              hasChanges = true
              if (diff === 0) {
                nextBatches[cuisine] = {
                  ...batch,
                  remainingSeconds: 0,
                  isLocked: true,
                }
                if (soundEnabled) {
                  playLockChime()
                }
              } else {
                nextBatches[cuisine] = {
                  ...batch,
                  remainingSeconds: diff,
                }
              }
            }
          }
        }

        return hasChanges ? nextBatches : prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [soundEnabled])

  // Initial load and periodic polling every 5 seconds for real-time dynamic sync
  useEffect(() => {
    fetchTickets(true)
    const interval = setInterval(() => {
      fetchTickets(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchTickets])

  // Reset or manual unlock of cuisine batch
  const handleResetCuisineBatch = (cuisine: string) => {
    setCuisineBatches((prev) => {
      const copy = { ...prev }
      delete copy[cuisine]
      return copy
    })
  }

  // Quick add queued order to existing active batch
  const handleQuickAddBatch = (ticketId: string, cuisine: string) => {
    const batch = cuisineBatches[cuisine]
    if (batch && batch.isLocked) {
      setBatchLockAlert({
        open: true,
        cuisine,
        message: `The 20-second selection timer for ${cuisine} has expired. Chef cannot add more ${cuisine} orders to this preparation batch.`,
      })
      return
    }
    handleAdvance(ticketId, 'cooking')
  }

  // Optimistic status advance with backend persistence & 20s cuisine batch timer logic
  const handleAdvance = async (id: string, nextStatus: KanbanStatus) => {
    const targetTicket = tickets.find((t) => t.id === id || t.fullId === id)
    if (!targetTicket) return

    // When advancing into Preparation (Cooking) from Queue:
    if (nextStatus === 'cooking') {
      const ticketCuisines = targetTicket.cuisines || Array.from(
        new Set(targetTicket.items.map((it) => it.cuisine || getItemCuisine(it.name, it.station)))
      )

      // Initialize or start fresh 20-second batch timer for each cuisine
      setCuisineBatches((prev) => {
        const next = { ...prev }
        const now = Date.now()

        for (const c of ticketCuisines) {
          const existing = next[c]
          // If no active batch OR the previous batch was locked/expired, start a fresh 20-second window!
          if (!existing || existing.isLocked) {
            next[c] = {
              cuisine: c,
              startedAt: now,
              expiresAt: now + 20_000,
              remainingSeconds: 20,
              isLocked: false,
              leadTicketId: targetTicket.id,
              ticketIds: [targetTicket.id],
            }
          } else if (!existing.isLocked) {
            if (!existing.ticketIds.includes(targetTicket.id)) {
              existing.ticketIds.push(targetTicket.id)
            }
          }
        }

        return next
      })
    }

    // When tickets are served or ready, clean up completed batches
    if (nextStatus === 'ready' || nextStatus === 'served') {
      if (nextStatus === 'ready') {
        if (soundEnabled) {
          playOrderPreparedChime()
        }
        const targetOrderNumber = targetTicket.orderNumber || targetTicket.fullId || targetTicket.id
        const tableDisplay =
          targetTicket.tableName ||
          (typeof targetTicket.tableNumber === 'number' || !isNaN(Number(targetTicket.tableNumber))
            ? `Table ${targetTicket.tableNumber}`
            : targetTicket.tableNumber) ||
          'Dine-In'
        const itemsSummary = targetTicket.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')

        setOrderPreparedAlert({
          open: true,
          orderNumber: targetOrderNumber,
          tableNumber: tableDisplay,
          customerName: targetTicket.customerName || 'Valued Guest',
          itemsSummary,
        })

        // Auto-dismiss notification after 7 seconds
        setTimeout(() => {
          setOrderPreparedAlert((curr) => (curr?.orderNumber === targetOrderNumber ? null : curr))
        }, 7000)

        // Automatically dispatch WhatsApp & SMS alerts to Communication Ledger
        fetch('/api/communication/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'order_prepared',
            orderNumber: targetOrderNumber,
            tableNumber: tableDisplay,
            customerName: targetTicket.customerName || 'Valued Guest',
          }),
        }).catch((e) => console.warn('Could not post order prepared alert to ledger:', e))

        // Dispatch live notification to TopNavbar bell
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'order_prepared',
            orderNumber: targetOrderNumber,
            tableNumber: tableDisplay,
            customerName: targetTicket.customerName || 'Valued Guest',
            itemsSummary,
          }),
        }).catch((e) => console.warn('Could not post order prepared alert to notifications:', e))
      }

      setCuisineBatches((prev) => {
        const next = { ...prev }
        for (const [cuisine, batch] of Object.entries(next)) {
          if (batch.ticketIds.includes(targetTicket.id) || batch.ticketIds.includes(id)) {
            const activeRemaining = tickets.filter(
              (t) => (t.id !== id && t.fullId !== id) && batch.ticketIds.includes(t.id) && t.status === 'cooking'
            )
            if (activeRemaining.length === 0) {
              delete next[cuisine]
            }
          }
        }
        return next
      })
    }

    // Register optimistic lock so stale polling responses cannot revert the status
    const targetKeys = Array.from(
      new Set([targetTicket.id, targetTicket.fullId, targetTicket.orderNumber, id].filter(Boolean))
    ) as string[]

    const now = Date.now()
    for (const key of targetKeys) {
      recentStatusUpdatesRef.current.set(key, { status: nextStatus, timestamp: now })
    }

    // Instant UI update: Remove from previous column immediately, move to new status column
    setTickets((prev) => {
      if (nextStatus === 'served') {
        return prev.filter(
          (t) =>
            !targetKeys.includes(t.id) &&
            !(t.fullId && targetKeys.includes(t.fullId)) &&
            !(t.orderNumber && targetKeys.includes(t.orderNumber))
        )
      }
      return prev.map((t) => {
        const isMatch =
          targetKeys.includes(t.id) ||
          (t.fullId && targetKeys.includes(t.fullId)) ||
          (t.orderNumber && targetKeys.includes(t.orderNumber))
        if (isMatch) {
          return { ...t, status: nextStatus }
        }
        return t
      })
    })

    try {
      const sendId = targetTicket.fullId || targetTicket.orderNumber || targetTicket.id || id
      await fetch(`/api/kds/tickets/${encodeURIComponent(sendId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          fullId: targetTicket.fullId,
          orderNumber: targetTicket.orderNumber || targetTicket.id,
        }),
      })

      // Silently sync in background after a brief delay without racing
      setTimeout(() => {
        fetchTickets(false)
      }, 600)
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

  // Filtered tickets based on search
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        search === '' ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        String(t.tableNumber).toLowerCase().includes(search.toLowerCase()) ||
        (t.waiter || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        t.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()))

      return matchSearch
    })
  }, [tickets, search])

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
        /* Kanban Columns with full horizontal and vertical responsiveness */
        <div className="flex flex-1 gap-0 overflow-x-auto overflow-y-hidden divide-x divide-border min-h-0 w-full">
          {columns.map((col) => {
            const colTickets = filteredTickets.filter((t) => t.status === col.id)
            return (
              <div
                key={col.id}
                className={cn(
                  'flex flex-1 flex-col min-w-[280px] sm:min-w-[320px] max-w-[420px] h-full min-h-0',
                  col.bg.split(' ')[1]
                )}
              >
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

                {/* Column Cards Container - Native Smooth Scroll */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
                  {/* Active 20-Second Cuisine Batch Countdown Card in Cooking Column */}
                    {col.id === 'cooking' && Object.keys(cuisineBatches).length > 0 && (
                      <div className="flex flex-col gap-2 mb-1 shrink-0">
                        {Object.values(cuisineBatches).map((batch) => {
                          const displayName = batch.cuisine.length > 20 ? 'Station' : batch.cuisine
                          return (
                            <div
                              key={batch.cuisine}
                              className={cn(
                                'p-2.5 rounded-xl border flex flex-col gap-1.5 shadow-xs transition-all',
                                !batch.isLocked
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                                  : 'bg-muted/40 border-border text-muted-foreground'
                              )}
                            >
                              <div className="flex items-center justify-between font-bold text-xs">
                                <div className="flex items-center gap-1.5">
                                  {!batch.isLocked ? (
                                    <Timer className="size-3.5 animate-spin text-amber-500" style={{ animationDuration: '3s' }} />
                                  ) : (
                                    <Lock className="size-3.5 text-muted-foreground" />
                                  )}
                                  <span className="font-extrabold truncate max-w-[170px]">{displayName} Batch</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    className={cn(
                                      'text-[10px] font-mono font-bold px-1.5 py-0',
                                      !batch.isLocked ? 'bg-amber-500 text-black animate-pulse' : 'bg-secondary text-muted-foreground'
                                    )}
                                  >
                                    {!batch.isLocked ? `${batch.remainingSeconds}s Window` : '20s Closed'}
                                  </Badge>
                                  <button
                                    onClick={() => handleResetCuisineBatch(batch.cuisine)}
                                    className="text-[10px] text-muted-foreground hover:text-foreground p-0.5"
                                    title="Dismiss"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {!batch.isLocked && (
                                <div className="space-y-1">
                                  <div className="w-full bg-amber-500/20 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
                                      style={{ width: `${(batch.remainingSeconds / 20) * 100}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    Chef selection window: Add queued orders before timer ends ({batch.remainingSeconds}s).
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

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
                          cuisineBatches={cuisineBatches}
                          onQuickAddBatch={handleQuickAddBatch}
                        />
                      ))
                    )}
                </div>
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

      {/* ── Order Prepared Notification Floating Alert ── */}
      {orderPreparedAlert && (
        <div className="fixed top-16 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="relative rounded-2xl bg-card border-2 border-success/40 shadow-2xl p-4 bg-gradient-to-r from-success/10 via-card to-card">
            <button
              onClick={() => setOrderPreparedAlert(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <X className="size-4" />
            </button>
            <div className="flex items-start gap-3.5">
              <div className="size-11 rounded-xl bg-success/20 text-success flex items-center justify-center shrink-0 border border-success/30">
                <Bell className="size-5 animate-bounce" />
              </div>
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-success uppercase tracking-wider">
                    Order Prepared & Ready
                  </span>
                  <Badge variant="outline" className="border-success/30 text-success text-[10px] h-4">
                    {orderPreparedAlert.tableNumber}
                  </Badge>
                </div>
                <h4 className="text-sm font-extrabold text-foreground mt-0.5">
                  Order #{orderPreparedAlert.orderNumber}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {orderPreparedAlert.itemsSummary}
                </p>

                {/* Readiness Badge */}
                <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-success/15 text-success font-semibold border border-success/30">
                    <CheckCircle2 className="size-3" /> Ready for Table Pickup
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Waitstaff Alerted
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 20-Second Cuisine Batch Lock Alert Modal ── */}
      {batchLockAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-card border border-destructive/40 shadow-2xl rounded-3xl p-6 text-center space-y-4">
            <div className="size-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto border border-destructive/30">
              <Lock className="size-7" />
            </div>
            <div>
              <Badge variant="outline" className="border-destructive/40 text-destructive text-xs mb-2">
                20s Timer Expired
              </Badge>
              <h3 className="text-lg font-bold text-foreground">
                Cannot Add {batchLockAlert.cuisine} Order
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {batchLockAlert.message}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                className="w-full bg-primary hover:bg-primary/90 font-bold text-xs rounded-xl h-11"
                onClick={() => setBatchLockAlert(null)}
              >
                Understood, Return to Kitchen
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
