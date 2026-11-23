'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users,
  Clock,
  ChefHat,
  MoreVertical,
  Plus,
  Filter,
  QrCode,
  RefreshCw,
  Loader2,
  Calendar,
  AlertCircle,
  Search,
  Trash2,
  Receipt,
  UtensilsCrossed,
  Sparkles,
  Share2,
  History,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCircle2,
  ShoppingBag,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react'
import { BillSettlementModal } from '@/components/billing/bill-settlement-modal'
import { WaiterTipTracker } from '@/components/billing/waiter-tip-tracker'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { TableQRGenerator } from '@/components/tables/table-qr-generator'
import { TableDishMenuModal } from '@/components/tables/table-dish-menu-modal'
import { TakeawayQRScannerModal } from '@/components/tables/takeaway-qr-scanner-modal'
import { WaiterHistoryModal } from '@/components/tables/waiter-history-modal'
import { KpiDetailDrawer } from '@/components/tables/kpi-detail-drawer'
import { LiveBatchAddonBanner } from '@/components/orders/LiveBatchAddonBanner'
import { useAuthContext } from '@/hooks/useAuthContext'
import { triggerNotificationFeedback } from '@/lib/sound-vibrate'
import { checkPermission } from '@/lib/rolesAndPermission'

export function formatTableDisplay(tableNumber: string | number, isVip?: boolean) {
  let s = String(tableNumber || '').trim()
  if (!s) return isVip ? 'VIP Table' : 'Table'

  // If accidentally stored with double TT (e.g. TT11, TT12), normalize to T11, T12
  if (/^tt\d+/i.test(s)) {
    s = s.replace(/^tt(\d+)/i, 'T$1')
  }

  const prefix = isVip && !s.toLowerCase().includes('vip') ? 'VIP ' : ''

  // If already starts with T/t followed by numbers (e.g. T1, T12, t12)
  if (/^t\d+/i.test(s)) {
    return `${prefix}${s.toUpperCase()}`
  }

  // If purely digits (e.g. 1, 2, 12), show as T1, T2, T12
  if (/^\d+$/.test(s)) {
    return `${prefix}T${s}`
  }

  // If string already has a custom name like "Takeaway", "VIP-1", "Outdoor 5"
  return `${prefix}${s}`
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service' | 'maintenance'

export interface TableData {
  id: string
  number: number | string
  tableNumber: string
  section: string
  rawSection?: string
  capacity: number
  status: TableStatus
  waiter?: string
  waiterId?: string
  occupiedSince?: string
  guestCount?: number
  order?: { id: string; status: string }
  activeReservation?: { guestName: string; guestCount: number; time?: string }
  billRequested?: boolean
  activeBillId?: string
  x?: number
  y?: number
}

const statusConfig: Record<
  TableStatus,
  {
    label: string
    dot: string
    card: string
    badge: string
  }
> = {
  available: {
    label: 'Available',
    dot: 'bg-success',
    card: 'border-success/25 bg-success/5 hover:border-success/50 hover:bg-success/10',
    badge: 'border-success/40 bg-success/10 text-success',
  },
  occupied: {
    label: 'Occupied',
    dot: 'bg-primary',
    card: 'border-primary/30 bg-primary/8 hover:border-primary/50 hover:bg-primary/12',
    badge: 'border-primary/40 bg-primary/15 text-primary',
  },
  reserved: {
    label: 'Reserved',
    dot: 'bg-warning',
    card: 'border-warning/30 bg-warning/5 hover:border-warning/50 hover:bg-warning/10',
    badge: 'border-warning/40 bg-warning/10 text-warning',
  },
  cleaning: {
    label: 'Cleaning',
    dot: 'bg-muted-foreground',
    card: 'border-border bg-muted/30',
    badge: 'border-border bg-muted text-muted-foreground',
  },
  maintenance: {
    label: 'Maintenance',
    dot: 'bg-destructive/50',
    card: 'border-destructive/20 bg-destructive/5 opacity-70',
    badge: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  out_of_service: {
    label: 'Out of Service',
    dot: 'bg-destructive/50',
    card: 'border-destructive/20 bg-destructive/3 opacity-60',
    badge: 'border-destructive/30 bg-destructive/5 text-destructive/70',
  },
}

function TableCard({
  table,
  onGenerateQR,
  onShareQR,
  onOpenMenu,
  onUpdateStatus,
  onDelete,
  onGenerateBill,
  onAssignWaiter,
}: {
  table: TableData
  onGenerateQR?: (tableNum: string | number) => void
  onShareQR?: (tableNum: string | number) => void
  onOpenMenu?: (table: TableData) => void
  onUpdateStatus?: (tableId: string, status: TableStatus) => Promise<void>
  onDelete?: (table: TableData) => void
  onGenerateBill?: (table: TableData) => void
  onAssignWaiter?: (table: TableData) => void
}) {
  const normStatus: TableStatus = statusConfig[table.status] ? table.status : 'available'
  const cfg = statusConfig[normStatus]
  const occupancyPct = table.guestCount ? Math.round((table.guestCount / table.capacity) * 100) : 0
  const isVip = table.section.toLowerCase().includes('vip')

  return (
    <div
      onClick={() => onOpenMenu?.(table)}
      className={cn(
        'group relative rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer select-none flex flex-col justify-between hover:shadow-md hover:scale-[1.01] overflow-hidden',
        table.billRequested && 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30',
        cfg.card
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} />
            <span className="font-bold text-base leading-none">
              {formatTableDisplay(table.tableNumber || table.number, isVip)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {table.billRequested && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 font-black border-amber-500/50 bg-amber-500/20 text-amber-500 animate-pulse shadow-xs"
              >
                🔔 Bill Requested
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 font-medium', cfg.badge)}>
              {cfg.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                  />
                }
              >
                <MoreVertical className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenMenu?.(table)
                  }}
                  className="gap-2 font-bold text-primary cursor-pointer"
                >
                  <UtensilsCrossed className="size-3.5" />
                  Take Order / Dish Menu
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onAssignWaiter?.(table)
                  }}
                  className="gap-2 font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  <UserCheck className="size-3.5" />
                  Assign Waiter
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onShareQR?.(table.tableNumber || table.number)
                  }}
                  className="gap-2 font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer"
                >
                  <Share2 className="size-3.5" />
                  Send Booking QR (WhatsApp)
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onGenerateQR?.(table.tableNumber || table.number)
                  }}
                  className="gap-2 font-medium text-muted-foreground cursor-pointer"
                >
                  <QrCode className="size-3.5" />
                  Print QR Sticker
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {normStatus === 'available' && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus?.(table.id, 'occupied')
                      }}
                    >
                      Seat Guests
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus?.(table.id, 'reserved')
                      }}
                    >
                      Mark Reserved
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus?.(table.id, 'cleaning')
                      }}
                    >
                      Mark Cleaning
                    </DropdownMenuItem>
                  </>
                )}

                {normStatus === 'occupied' && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus?.(table.id, 'cleaning')
                      }}
                    >
                      Mark Cleaning
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus?.(table.id, 'available')
                      }}
                    >
                      Free Table (Available)
                    </DropdownMenuItem>
                  </>
                )}

                {normStatus === 'cleaning' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateStatus?.(table.id, 'available')
                    }}
                  >
                    Mark Available
                  </DropdownMenuItem>
                )}

                {normStatus === 'reserved' && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus?.(table.id, 'occupied')
                      }}
                    >
                      Seat Guests
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus?.(table.id, 'available')
                      }}
                    >
                      Release Reservation
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(table)
                  }}
                  className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Delete Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Capacity row */}
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="size-3.5 text-muted-foreground" />
          {normStatus === 'occupied' && table.guestCount ? (
            <span className="text-xs text-foreground font-medium">
              {table.guestCount}/{table.capacity} guests
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Seats {table.capacity}</span>
          )}
        </div>

        {/* Occupancy bar */}
        {normStatus === 'occupied' && Boolean(table.guestCount) && (
          <div className="mb-3">
            <div className="h-1 w-full rounded-full bg-primary/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all"
                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Waiter & time */}
        {table.waiter ? (
          <div
            onClick={(e) => {
              e.stopPropagation()
              onAssignWaiter?.(table)
            }}
            className="flex items-center gap-1.5 mb-1.5 cursor-pointer group/w hover:opacity-80"
            title="Click to change waiter"
          >
            <div className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
              {table.waiter.split(' ').map((w) => w[0]).join('')}
            </div>
            <span className="text-xs text-muted-foreground font-medium group-hover/w:text-primary transition-colors">{table.waiter}</span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAssignWaiter?.(table)
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary mb-1.5 transition-colors cursor-pointer"
            title="Assign Waiter to this table"
          >
            <UserCheck className="size-3" />
            <span className="underline">+ Assign Waiter</span>
          </button>
        )}

        {normStatus === 'occupied' && table.occupiedSince && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
            <Clock className="size-3" />
            <span>Since {table.occupiedSince}</span>
          </div>
        )}

        {/* Active reservation indicator */}
        {table.activeReservation && normStatus === 'reserved' && (
          <div className="flex items-center gap-1 text-xs text-warning/90 mt-1 mb-1.5">
            <Calendar className="size-3" />
            <span className="truncate">{table.activeReservation.guestName}</span>
          </div>
        )}

        {/* Order indicator */}
        {normStatus === 'occupied' && table.order && (
          <>
            <Separator className="my-2.5" />
            <div className="flex items-center gap-1.5 min-w-0">
              <ChefHat className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium truncate">{table.order.id}</span>
              <Badge
                variant="outline"
                className={cn(
                  'ml-auto text-[9px] h-4 px-1 capitalize shrink-0',
                  (table.order.status === 'cooking' || table.order.status === 'preparing') && 'border-chart-4/50 text-chart-4',
                  table.order.status === 'ready' && 'border-success/50 text-success',
                  table.order.status === 'pending' && 'border-warning/50 text-warning',
                  (table.order.status === 'accepted' || table.order.status === 'confirmed') && 'border-primary/50 text-primary',
                  table.order.status === 'served' && 'border-primary/40 text-primary'
                )}
              >
                {table.order.status}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40 w-full min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenMenu?.(table)
          }}
          className="flex-1 min-w-0 shrink h-7 px-2 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer overflow-hidden"
          title="Open Menu / Take Order"
        >
          <UtensilsCrossed className="size-3 shrink-0" />
          <span className="truncate">
            <span className="hidden 2xl:inline">Menu / </span>Order
          </span>
        </Button>

        {/* Available CTA */}
        {normStatus === 'available' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onUpdateStatus?.(table.id, 'occupied')
            }}
            className="flex-1 min-w-0 shrink h-7 px-2 text-xs font-bold text-success hover:bg-success/10 hover:text-success cursor-pointer overflow-hidden"
            title="Seat Guests"
          >
            Seat
          </Button>
        )}

        {/* Occupied CTA - Bill / Settle */}
        {normStatus === 'occupied' && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onGenerateBill?.(table)
            }}
            className={cn(
              'flex-1 min-w-0 shrink h-7 px-2 text-xs font-bold gap-1 shadow-xs cursor-pointer overflow-hidden',
              table.billRequested
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
            title={table.billRequested ? 'Settle Table Bill' : 'Generate Bill'}
          >
            <Receipt className="size-3 shrink-0" />
            <span className="truncate">{table.billRequested ? 'Settle' : 'Bill'}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

const statsItems: { key: TableStatus; label: string }[] = [
  { key: 'available', label: 'Available' },
  { key: 'occupied', label: 'Occupied' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'cleaning', label: 'Cleaning' },
]

export function TablesView() {
  const { auth } = useAuthContext()
  const branchId = auth?.branchId
  const restaurantName = auth?.restaurantName || 'RestoSphere'
  const isWaiter = (auth?.role || '').toLowerCase() === 'waiter'
  const role = auth?.role || 'WAITER'

  const [tables, setTables] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [section, setSection] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all')

  // Live incoming customer order requests queue (Without requiring QR scan)
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const prevPendingCount = useRef(0)

  // Manager Bypass & Fallback state
  const [managerBypassActive, setManagerBypassActive] = useState(false)
  const [isManagerLoggedIn, setIsManagerLoggedIn] = useState(true) // will fall back to false if no manager active

  // Modals state
  const [qrOpen, setQrOpen] = useState(false)
  const [qrTable, setQrTable] = useState<string | number>('1')

  // Dish Menu Modal state
  const [menuTableTarget, setMenuTableTarget] = useState<TableData | null>(null)

  // Takeaway QR Scanner Modal state
  const [takeawayScannerOpen, setTakeawayScannerOpen] = useState(false)

  // History Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  // KPI Detail Drawer state
  const [kpiDrawerStatus, setKpiDrawerStatus] = useState<TableStatus | null>(null)

  // Add Table Modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTableNum, setNewTableNum] = useState('')
  const [newCapacity, setNewCapacity] = useState('4')
  const [newSection, setNewSection] = useState('Indoor')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Waiter assignment state
  const [assignTableTarget, setAssignTableTarget] = useState<TableData | null>(null)
  const [waitersList, setWaitersList] = useState<Array<{ id: string; name: string; phone: string }>>([])
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [waitersLoading, setWaitersLoading] = useState(false)

  const handleOpenAssignWaiter = async (tbl: TableData) => {
    setAssignTableTarget(tbl)
    setSelectedWaiterId(tbl.waiterId || '')
    setWaitersLoading(true)
    try {
      const res = await fetch(`/api/staff/waiters?branchId=${encodeURIComponent(branchId || '')}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setWaitersList(data.data)
        const match = data.data.find(
          (w: any) =>
            (tbl.waiterId && w.id === tbl.waiterId) ||
            (tbl.waiter && w.name.trim().toLowerCase() === tbl.waiter.trim().toLowerCase())
        )
        if (match) {
          setSelectedWaiterId(match.id)
        } else if (!tbl.waiter && !tbl.waiterId) {
          setSelectedWaiterId('')
        }
      }
    } catch (err) {
      console.error('Error fetching waiters:', err)
    } finally {
      setWaitersLoading(false)
    }
  }

  const handleSaveWaiterAssignment = async () => {
    if (!assignTableTarget) return
    setIsAssigning(true)
    const targetTableId = assignTableTarget.id
    const prevWaiter = assignTableTarget.waiter
    const prevWaiterId = assignTableTarget.waiterId

    try {
      const selected = waitersList.find((w) => w.id === selectedWaiterId)
      const newWaiterName = selected?.name || ''
      const newWaiterId = selectedWaiterId || null

      // Optimistic update for instant UI responsiveness
      setTables((prev) =>
        prev.map((t) =>
          t.id === targetTableId
            ? {
                ...t,
                waiter: newWaiterName || undefined,
                waiterId: newWaiterId || undefined,
              }
            : t
        )
      )
      setAssignTableTarget(null)

      const res = await fetch('/api/tables/assign-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: targetTableId,
          waiterId: newWaiterId,
          waiterName: newWaiterName,
          branchId,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        // Rollback on failure
        setTables((prev) =>
          prev.map((t) =>
            t.id === targetTableId
              ? {
                  ...t,
                  waiter: prevWaiter,
                  waiterId: prevWaiterId,
                }
              : t
          )
        )
        alert(data.message || 'Failed to assign waiter')
      } else {
        // Background re-sync
        fetchTables()
      }
    } catch (err: any) {
      // Rollback on network/client error
      setTables((prev) =>
        prev.map((t) =>
          t.id === targetTableId
            ? {
                ...t,
                waiter: prevWaiter,
                waiterId: prevWaiterId,
              }
            : t
        )
      )
      alert(err.message || 'Assignment failed')
    } finally {
      setIsAssigning(false)
    }
  }

  // Delete Table Modal state
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Bill Settlement Modal state
  const [settlementTarget, setSettlementTarget] = useState<TableData | null>(null)

  // Fetch real tables from database API + check for active bill requests
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = branchId ? `/api/tables?branchId=${encodeURIComponent(branchId)}` : '/api/tables'
      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch tables')
      }

      // Check for any active requested bills
      let requestedTableNumbers: Set<string> = new Set()
      try {
        const billsRes = await fetch('/api/bills?status=REQUESTED')
        if (billsRes.ok) {
          const billsJson = await billsRes.json()
          if (billsJson.success && Array.isArray(billsJson.data?.bills)) {
            requestedTableNumbers = new Set(
              billsJson.data.bills.map((b: any) =>
                String(b.tableNumber || '').toLowerCase().trim().replace(/[^0-9]/g, '')
              )
            )
          }
        }
      } catch (bErr) {
        console.warn('Could not query active requested bills:', bErr)
      }

      const rawTables = json.data || []
      const mappedTables: TableData[] = rawTables.map((t: any) => {
        const cleanNum = String(t.tableNumber || t.number || '').toLowerCase().trim().replace(/[^0-9]/g, '')
        const isReq = (t.status === 'occupied') && requestedTableNumbers.has(cleanNum)
        return {
          ...t,
          billRequested: isReq,
        }
      })

      setTables(mappedTables)
    } catch (err: any) {
      console.error('Failed to load tables:', err)
      setError(err.message || 'Unable to load live tables')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  // Fetch live incoming customer order requests (without scanning QR)
  const fetchPendingOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/live')
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const pending = json.data.filter((o: any) => o.status === 'pending')
          // If new order arrived, trigger haptic vibration and sound chime!
          if (pending.length > prevPendingCount.current) {
            triggerNotificationFeedback('order')
          }
          prevPendingCount.current = pending.length
          setPendingOrders(pending)
        }
      }
    } catch (e) {
      // silent background sync
    }
  }, [])

  useEffect(() => {
    fetchTables()
    fetchPendingOrders()
    const intervalTables = setInterval(fetchTables, 10000)
    const intervalOrders = setInterval(fetchPendingOrders, 3500)
    return () => {
      clearInterval(intervalTables)
      clearInterval(intervalOrders)
    }
  }, [fetchTables, fetchPendingOrders])

  // Accept incoming customer order request
  const handleAcceptOrder = async (orderId: string, fullId?: string) => {
    try {
      const targetId = fullId || orderId
      const res = await fetch(`/api/orders/${targetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      })
      if (res.ok) {
        triggerNotificationFeedback('order')
        fetchPendingOrders()
        fetchTables()
      }
    } catch (err) {
      console.error('Error accepting order:', err)
    }
  }

  // Update table status in database
  const handleUpdateStatus = async (tableId: string, newStatus: TableStatus) => {
    try {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status: newStatus,
                order: newStatus === 'available' ? undefined : t.order,
                occupiedSince: newStatus === 'available' ? undefined : t.occupiedSince,
                guestCount: newStatus === 'available' ? undefined : t.guestCount,
                billRequested: newStatus === 'available' ? false : t.billRequested,
              }
            : t
        )
      )

      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId, status: newStatus }),
      })

      if (!res.ok) fetchTables()
    } catch (err) {
      fetchTables()
    }
  }

  // Handle Add Table form submit
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTableNum.trim()
    if (!trimmed) {
      setAddError('Table number is required')
      return
    }

    const cleanTableNum = /^tt\d+/i.test(trimmed) ? trimmed.replace(/^tt(\d+)/i, 'T$1') : trimmed

    try {
      setAddLoading(true)
      setAddError(null)

      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: cleanTableNum,
          capacity: parseInt(newCapacity) || 4,
          section: newSection,
          branchId: branchId || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create table')
      }

      setIsAddOpen(false)
      setNewTableNum('')
      setNewCapacity('4')
      fetchTables()
    } catch (err: any) {
      setAddError(err.message || 'Failed to create table')
    } finally {
      setAddLoading(false)
    }
  }

  // Delete Table from database
  const handleConfirmDeleteTable = async () => {
    if (!deleteTableTarget) return
    try {
      setDeleteLoading(true)
      setDeleteError(null)

      const res = await fetch(`/api/tables?id=${encodeURIComponent(deleteTableTarget.id)}`, {
        method: 'DELETE',
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete table')
      }

      setDeleteTableTarget(null)
      fetchTables()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete table')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenQR = (tableNum: string | number) => {
    setQrTable(tableNum)
    setQrOpen(true)
  }

  // Send Table / Order Booking QR (WhatsApp or Web Share trigger)
  const handleShareBookingQR = (tableNum: string | number) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://restosphere.com'
    const link = `${origin}/menu?table=${encodeURIComponent(tableNum)}`
    const msg = encodeURIComponent(
      `Welcome to ${restaurantName}! Scan or click this link to access digital menu and place table bookings & dish orders for Table ${tableNum}:\n${link}`
    )

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({
        title: `${restaurantName} — Table ${tableNum}`,
        text: `Digital Table Booking & Menu for Table ${tableNum}`,
        url: link,
      }).catch(() => {
        window.open(`https://wa.me/?text=${msg}`, '_blank')
      })
    } else {
      window.open(`https://wa.me/?text=${msg}`, '_blank')
    }
  }

  // Dynamic sections
  const dynamicSections = Array.from(
    new Set(tables.map((t) => t.section.toLowerCase()).filter(Boolean))
  )

  // Filter tables
  const filtered = tables.filter((t) => {
    const matchSection = section === 'all' || t.section.toLowerCase() === section.toLowerCase()
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchSearch =
      !search ||
      String(t.tableNumber || t.number).toLowerCase().includes(search.toLowerCase()) ||
      formatTableDisplay(t.tableNumber || t.number).toLowerCase().includes(search.toLowerCase()) ||
      t.section.toLowerCase().includes(search.toLowerCase())
    return matchSection && matchStatus && matchSearch
  })

  // Dynamic live counts from database
  const counts = {
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  }

  return (
    <main className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Top Banner: Waiter Tip Tracker with Compact Walk-In Mode */}
      {isWaiter && <WaiterTipTracker waiterId={auth?.id} />}

      {/* Top Banner: Real-Time Live 20s Addon Banner with Bypass Support */}
      <LiveBatchAddonBanner
        currentTableNumber="Table 1"
        customerName="Floor Waiter"
        onOrderPlaced={() => fetchTables()}
      />

      {/* ── View New Order Requests Without Scanning (Live Waiter Queue) ── */}
      {pendingOrders.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 sm:p-5 shadow-sm space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Zap className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-foreground">
                    Incoming Order Requests
                  </h3>
                  <Badge className="bg-amber-500 text-black font-extrabold text-[10px] px-2 py-0.5">
                    {pendingOrders.length} New Requests
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Placed automatically from customer phones — no scanning required! Click &quot;Accept Order&quot; to route immediately to Chef.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingOrders}
              className="h-8 text-xs font-bold gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            >
              <RefreshCw className="size-3.5" />
              Sync Requests
            </Button>
          </div>

          {/* Cards Grid for Incoming Order Requests */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingOrders.map((ord) => (
              <Card
                key={ord.id}
                className="border border-amber-500/40 bg-card shadow-sm rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div className="p-3.5 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        variant="outline"
                        className="border-amber-500 text-amber-500 bg-amber-500/10 font-black text-xs px-2.5 py-0.5"
                      >
                        {typeof ord.tableNumber === 'number' || !isNaN(Number(ord.tableNumber))
                          ? `Table ${ord.tableNumber}`
                          : ord.tableNumber}
                      </Badge>
                      <div className="font-mono text-xs font-bold text-foreground mt-1">
                        #{ord.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 justify-end">
                        <Clock className="size-3" />
                        {ord.ticketTime || 1}m ago
                      </span>
                      <span className="text-xs font-black text-primary font-mono">
                        ₹{Number(ord.total || ord.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs border-t border-border/50 pt-2 mt-2">
                    {(ord.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-muted-foreground">
                        <span className="font-medium text-foreground">
                          <span className="font-bold text-primary mr-1">{it.quantity}×</span>
                          {it.name || it.itemName}
                        </span>
                        <span className="font-mono">₹{Number(it.price * it.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  {ord.notes && (
                    <div className="mt-2 text-[11px] bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-amber-600 dark:text-amber-400 font-medium">
                      ⚠ Special Notes: {ord.notes}
                    </div>
                  )}
                </div>

                <div className="p-3 pt-0 border-t border-border/50 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-9 font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm cursor-pointer"
                    onClick={() => handleAcceptOrder(ord.id, ord.fullId)}
                  >
                    <Check className="size-3.5" />
                    Accept Order
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Generator Modal */}
      <TableQRGenerator
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        initialTable={qrTable}
        restaurantName={restaurantName}
      />

      {/* Interactive Table Dish Menu Selector Modal */}
      {menuTableTarget && (
        <TableDishMenuModal
          open={!!menuTableTarget}
          onOpenChange={(open) => {
            if (!open) setMenuTableTarget(null)
          }}
          tableNumber={menuTableTarget.tableNumber || menuTableTarget.number}
          tableId={menuTableTarget.id}
          isVip={menuTableTarget.section.toLowerCase().includes('vip')}
          onOrderPlaced={() => {
            fetchTables()
            fetchPendingOrders()
          }}
        />
      )}

      {/* Takeaway QR Scanner Modal */}
      <TakeawayQRScannerModal
        open={takeawayScannerOpen}
        onOpenChange={setTakeawayScannerOpen}
        onOrderLoaded={() => fetchTables()}
      />

      {/* Waiter History Modal */}
      <WaiterHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />

      {/* KPI Detail Drawer */}
      <KpiDetailDrawer
        open={!!kpiDrawerStatus}
        onOpenChange={(open) => {
          if (!open) setKpiDrawerStatus(null)
        }}
        status={kpiDrawerStatus}
        tables={tables}
        onSelectTableForOrder={(tbl) => setMenuTableTarget(tbl)}
        onSelectTableForBill={(tbl) => setSettlementTarget(tbl)}
        onUpdateTableStatus={handleUpdateStatus}
      />

      {/* Add Table Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>
              Create a new dining table backed directly by the PostgreSQL database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTable} className="space-y-4 py-2">
            {addError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                {addError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tableNumber">Table Number / Label</Label>
              <Input
                id="tableNumber"
                placeholder="e.g. 11, 12, VIP-1"
                value={newTableNum}
                onChange={(e) => setNewTableNum(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="50"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="section">Floor / Section</Label>
              <Input
                id="section"
                placeholder="e.g. Indoor, Outdoor, VIP, Terrace"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Create Table
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Clickable KPI Cards Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsItems.map((s) => {
          const isSelected = statusFilter === s.key
          return (
            <Card
              key={s.key}
              onClick={() => {
                setStatusFilter(isSelected ? 'all' : s.key)
                setKpiDrawerStatus(s.key)
              }}
              className={cn(
                'cursor-pointer transition-all hover:scale-[1.02] shadow-2xs hover:shadow-md select-none',
                isSelected
                  ? 'ring-2 ring-primary border-primary bg-primary/10'
                  : s.key === 'occupied'
                  ? 'border-primary/30 bg-primary/5 hover:border-primary/60'
                  : ''
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">{s.label}</p>
                      <span className="text-[10px] text-primary underline">Inspect</span>
                    </div>
                    <p className="text-2xl font-black mt-0.5 font-mono">
                      {loading ? (
                        <span className="inline-block size-6 animate-pulse bg-muted rounded" />
                      ) : (
                        counts[s.key as keyof typeof counts] ?? 0
                      )}
                    </p>
                  </div>
                  <span className={cn('size-3 rounded-full', statusConfig[s.key].dot)} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Section tabs + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={section} onValueChange={(v) => setSection(v)}>
          <TabsList>
            <TabsTrigger value="all">All ({tables.length})</TabsTrigger>
            {dynamicSections.map((sec) => (
              <TabsTrigger key={sec} value={sec} className="capitalize">
                {sec}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Search */}
          <div className="relative w-36 sm:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table..."
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          {/* Manager Bypass & Override Toggle */}
          <button
            type="button"
            onClick={() => setManagerBypassActive(!managerBypassActive)}
            className={cn(
              'h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer',
              managerBypassActive
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 shadow-2xs'
                : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground'
            )}
            title="Bypass Manager: Enables waiter override controls for discounts, live orders, and billing"
          >
            {managerBypassActive ? (
              <>
                <ShieldCheck className="size-3.5 text-amber-500" />
                <span>Bypass Active</span>
              </>
            ) : (
              <>
                <ShieldAlert className="size-3.5" />
                <span>Bypass Manager</span>
              </>
            )}
          </button>

          {/* Takeaway QR Scanner Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTakeawayScannerOpen(true)}
            className="h-8 gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 shadow-2xs"
          >
            <ShoppingBag className="size-3.5" />
            <span>Scan Takeaway QR</span>
          </Button>

          {/* History Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-bold border-border hover:bg-muted"
          >
            <History className="size-3.5" />
            <span>History</span>
          </Button>

          {/* Table QR Codes */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenQR(tables[0]?.tableNumber || 1)}
            className="h-8 gap-1.5 text-xs border-border"
          >
            <QrCode className="size-3.5" />
            <span>Print QRs</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTables()
              fetchPendingOrders()
            }}
            disabled={loading}
            className="h-8 gap-1.5"
            title="Refresh tables"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            <span>Add Table</span>
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchTables()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && tables.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-border bg-card/50 p-4 animate-pulse flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-12 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-6 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Users className="size-8 text-muted-foreground mb-2" />
          <p className="text-base font-semibold">No tables found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {search || section !== 'all' || statusFilter !== 'all'
              ? 'Try resetting the section or status filters above.'
              : 'Add your first table to start managing floor map occupancy.'}
          </p>
          {(search || section !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSection('all')
                setStatusFilter('all')
                setSearch('')
              }}
              className="mt-4 text-xs h-8"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        /* Tables grid */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filtered.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onOpenMenu={(tbl) => setMenuTableTarget(tbl)}
              onShareQR={(num) => handleShareBookingQR(num)}
              onGenerateQR={handleOpenQR}
              onUpdateStatus={handleUpdateStatus}
              onGenerateBill={(tbl) => setSettlementTarget(tbl)}
              onAssignWaiter={handleOpenAssignWaiter}
              onDelete={(tbl) => {
                setDeleteError(null)
                setDeleteTableTarget(tbl)
              }}
            />
          ))}
        </div>
      )}

      {/* Delete Table Confirmation Dialog */}
      <Dialog
        open={!!deleteTableTarget}
        onOpenChange={(open) => !open && !deleteLoading && setDeleteTableTarget(null)}
      >
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="size-5" />
              Delete Table
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove this table from the floor layout?
            </DialogDescription>
          </DialogHeader>

          {deleteTableTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-destructive/15 text-destructive font-bold text-sm flex items-center justify-center">
                    {formatTableDisplay(deleteTableTarget.tableNumber || deleteTableTarget.number)}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">
                      Table {formatTableDisplay(deleteTableTarget.tableNumber || deleteTableTarget.number)}
                    </div>
                    <div className="text-muted-foreground">
                      Section: <span className="capitalize text-foreground font-medium">{deleteTableTarget.section}</span> • Capacity: {deleteTableTarget.capacity} seats
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {deleteTableTarget.status}
                </Badge>
              </div>

              {deleteError && (
                <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  {deleteError}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTableTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteTable}
              disabled={deleteLoading}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
              {deleteLoading ? 'Deleting...' : 'Yes, Delete Table'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Settlement Modal */}
      {settlementTarget && (
        <BillSettlementModal
          open={!!settlementTarget}
          onOpenChange={(open) => {
            if (!open) setSettlementTarget(null)
          }}
          tableId={settlementTarget.id}
          tableNumber={settlementTarget.tableNumber || settlementTarget.number}
          waiterName={settlementTarget.waiter}
          isHighwayOrder={settlementTarget.section.toLowerCase().includes('highway')}
          onSuccess={() => {
            fetchTables()
          }}
        />
      )}

      {/* Assign Waiter Modal */}
      <Dialog open={!!assignTableTarget} onOpenChange={(open) => !open && setAssignTableTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <UserCheck className="size-4" />
              </div>
              <DialogTitle>Assign Waiter to Table {assignTableTarget?.tableNumber || assignTableTarget?.number}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Select an active waiter to assign to this table. All orders and billing will be automatically attributed to them.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Select Waiter</Label>
              {waitersLoading && (
                <span className="text-[11px] text-muted-foreground animate-pulse">Fetching staff...</span>
              )}
            </div>
            <select
              value={selectedWaiterId}
              onChange={(e) => setSelectedWaiterId(e.target.value)}
              disabled={waitersLoading || isAssigning}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            >
              <option value="">-- Unassigned (No Waiter) --</option>
              {waitersLoading ? (
                <option disabled value="__loading__">
                  Loading active waiters...
                </option>
              ) : waitersList.length === 0 ? (
                <option disabled value="__empty__">
                  No active waiters found
                </option>
              ) : (
                waitersList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.phone ? `(${w.phone})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAssignTableTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isAssigning}
              onClick={handleSaveWaiterAssignment}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isAssigning ? 'Saving...' : 'Confirm Assignment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
