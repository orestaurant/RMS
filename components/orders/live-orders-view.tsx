'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Printer,
  Receipt,
  ChevronRight,
  RefreshCw,
  ChefHat,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type OrderStatus = 'pending' | 'accepted' | 'cooking' | 'ready' | 'served'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  notes?: string
}

export interface LiveOrder {
  id: string
  fullId?: string
  tableNumber: number | string
  waiter: string
  status: OrderStatus
  priority: 'normal' | 'high' | 'urgent'
  ticketTime: number
  items: OrderItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  createdAt?: string | Date
}

const statusConfig: Record<
  OrderStatus,
  {
    label: string
    icon: React.ElementType
    badge: string
    row: string
  }
> = {
  pending: {
    label: 'Pending',
    icon: AlertTriangle,
    badge: 'border-warning/40 bg-warning/10 text-warning',
    row: 'border-l-warning',
  },
  accepted: {
    label: 'Accepted',
    icon: ChefHat,
    badge: 'border-primary/40 bg-primary/10 text-primary',
    row: 'border-l-primary',
  },
  cooking: {
    label: 'Cooking',
    icon: Flame,
    badge: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
    row: 'border-l-chart-4',
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle2,
    badge: 'border-success/40 bg-success/10 text-success',
    row: 'border-l-success',
  },
  served: {
    label: 'Served',
    icon: CheckCircle2,
    badge: 'bg-muted text-muted-foreground border-border',
    row: 'border-l-border',
  },
}

const priorityConfig = {
  normal: { dot: 'bg-muted-foreground/40', label: 'Normal' },
  high: { dot: 'bg-warning', label: 'High' },
  urgent: { dot: 'bg-destructive animate-pulse', label: 'Urgent' },
}

function OrderRow({
  order,
  onOrderDeleted,
}: {
  order: LiveOrder
  onOrderDeleted?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cfg = statusConfig[order.status] || statusConfig.pending
  const pri = priorityConfig[order.priority] || priorityConfig.normal
  const StatusIcon = cfg.icon

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const orderKey = order.fullId || order.id
      const res = await fetch(`/api/orders/${orderKey}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success) {
        onOrderDeleted?.(order.id)
        setDeleteConfirmOpen(false)
        setDetailsOpen(false)
      } else {
        alert(json?.message || 'Failed to delete order')
      }
    } catch (err: any) {
      alert('Network error while deleting order: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className={cn(
        'border-b border-border last:border-0 border-l-2 transition-colors',
        cfg.row,
        expanded ? 'bg-accent/30' : 'hover:bg-muted/30'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Priority dot */}
        <span className={cn('size-2 shrink-0 rounded-full', pri.dot)} />

        {/* Order ID */}
        <div className="w-24 shrink-0">
          <span className="text-sm font-semibold font-mono">{order.id}</span>
        </div>

        {/* Table & waiter */}
        <div className="flex flex-col gap-0.5 w-32 shrink-0">
          <span className="text-xs font-medium">
            {typeof order.tableNumber === 'number' || !isNaN(Number(order.tableNumber))
              ? `Table ${order.tableNumber}`
              : order.tableNumber}
          </span>
          <span className="text-xs text-muted-foreground">{order.waiter}</span>
        </div>

        {/* Items summary */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {order.items.length > 0
              ? order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
              : 'No items recorded'}
          </p>
        </div>

        {/* Status badge */}
        <Badge variant="outline" className={cn('text-xs h-6 px-2 gap-1.5 shrink-0', cfg.badge)}>
          <StatusIcon className="size-3" />
          {cfg.label}
        </Badge>

        {/* Time */}
        <div className="flex items-center gap-1.5 w-20 shrink-0">
          <Clock className="size-3.5 text-muted-foreground" />
          <span
            className={cn(
              'text-xs font-mono font-medium',
              order.ticketTime > 20 ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {order.ticketTime}m ago
          </span>
        </div>

        {/* Total */}
        <div className="w-24 shrink-0 text-right">
          <span className="text-sm font-semibold">₹{order.total.toLocaleString('en-IN')}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="size-7" />}
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setDetailsOpen(true)}
              >
                <Eye className="size-3.5" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Printer className="size-3.5" /> Print KOT
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Receipt className="size-3.5" /> Print Bill
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="size-3.5 text-destructive" /> Delete Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChevronRight
            className={cn(
              'size-4 text-muted-foreground transition-transform duration-150',
              expanded && 'rotate-90'
            )}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Items list */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Items
                </p>
                <div className="flex flex-col gap-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">
                          {item.quantity}
                        </span>
                        <div>
                          <p className="text-xs font-medium">{item.name}</p>
                          {item.notes && (
                            <p className="text-xs text-warning mt-0.5">⚠ {item.notes}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold shrink-0">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill breakdown */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Bill
                </p>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (5%)</span>
                    <span>₹{order.tax.toLocaleString('en-IN')}</span>
                  </div>
                  <Separator className="my-0.5" />
                  <div className="flex justify-between font-bold text-sm">
                    <span>Total</span>
                    <span>₹{order.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <Separator className="mt-4 mb-3" />
            <div className="flex items-center gap-2">
              {order.status !== 'served' && (
                <Badge
                  variant="outline"
                  className={cn('gap-1', priorityConfig[order.priority].dot && 'text-xs')}
                >
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      priorityConfig[order.priority].dot
                    )}
                  />
                  {priorityConfig[order.priority].label} priority
                </Badge>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteConfirmOpen(true)
                  }}
                >
                  <Trash2 className="size-3" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailsOpen(true)
                  }}
                >
                  <Eye className="size-3" />
                  Details
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Printer className="size-3" />
                  KOT
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1.5">
                  <Receipt className="size-3" />
                  Bill
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-base font-bold font-mono">
                {order.id}
              </DialogTitle>
              <Badge variant="outline" className={cn('text-xs h-6 px-2 gap-1.5', cfg.badge)}>
                <StatusIcon className="size-3" />
                {cfg.label}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Order placed {order.ticketTime}m ago • Table {order.tableNumber} • Waiter: {order.waiter}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1 text-xs">
            {/* Meta attributes */}
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Table</span>
                <span className="font-semibold text-foreground">
                  {typeof order.tableNumber === 'number' || !isNaN(Number(order.tableNumber))
                    ? `Table ${order.tableNumber}`
                    : order.tableNumber}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Server</span>
                <span className="font-semibold text-foreground">{order.waiter}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Priority</span>
                <span className="font-semibold capitalize text-foreground">{order.priority}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Status</span>
                <span className="font-semibold capitalize text-foreground">{order.status}</span>
              </div>
            </div>

            {/* Items list */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Ordered Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
              </p>
              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden max-h-48 overflow-y-auto">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2">
                    <div className="flex items-start gap-2">
                      <span className="size-5 rounded bg-muted flex items-center justify-center font-bold text-[11px] shrink-0">
                        {item.quantity}×
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.notes && (
                          <p className="text-[10px] text-warning mt-0.5">Note: {item.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-foreground shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill calculation */}
            <div className="bg-muted/30 p-2.5 rounded-lg border border-border flex flex-col gap-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>GST (5%)</span>
                <span>₹{order.tax.toLocaleString('en-IN')}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-sm text-foreground">
                <span>Total Amount</span>
                <span className="text-primary text-base">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-3">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => {
                setDetailsOpen(false)
                setDeleteConfirmOpen(true)
              }}
            >
              <Trash2 className="size-3.5" />
              Delete Order
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => window.print()}
              >
                <Printer className="size-3.5" />
                Print Bill
              </Button>
              <Button size="sm" className="text-xs h-8" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-4" /> Delete Order?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete order <strong className="text-foreground">{order.id}</strong>?
              This will remove it from active live orders and cancel it in the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Delete Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type TabFilter = 'all' | OrderStatus

export function LiveOrdersView() {
  const [tab, setTab] = useState<TabFilter>('all')
  const [orders, setOrders] = useState<LiveOrder[]>([])
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    accepted: 0,
    cooking: 0,
    ready: 0,
    served: 0,
  })
  const [stats, setStats] = useState({
    activeCount: 0,
    readyCount: 0,
    urgentCount: 0,
    overdueCount: 0,
  })
  const [loading, setLoading] = useState(true)

  // Fetch live orders directly from PostgreSQL via API
  const fetchLiveOrders = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/orders/live?status=${tab}`)
      const json = await res.json()

      if (json.success && json.data) {
        setOrders(json.data.orders || [])
        if (json.data.counts) {
          setCounts(json.data.counts)
        }
        if (json.data.stats) {
          setStats(json.data.stats)
        }
      } else {
        setOrders([])
      }
    } catch (err) {
      console.error('Failed to fetch live orders:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchLiveOrders()
    // Poll every 15 seconds to receive new live orders in real-time
    const timer = setInterval(fetchLiveOrders, 15000)
    return () => clearInterval(timer)
  }, [fetchLiveOrders])

  const handleOrderDeleted = (orderId: string) => {
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId)
      setCounts({
        all: updated.length,
        pending: updated.filter((o) => o.status === 'pending').length,
        accepted: updated.filter((o) => o.status === 'accepted').length,
        cooking: updated.filter((o) => o.status === 'cooking').length,
        ready: updated.filter((o) => o.status === 'ready').length,
        served: updated.filter((o) => o.status === 'served').length,
      })
      setStats((prevStats) => ({
        ...prevStats,
        activeCount: Math.max(0, prevStats.activeCount - 1),
      }))
      return updated
    })
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Summary KPIs - Dynamic from PostgreSQL */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Active Orders',
            value: stats.activeCount,
            icon: Zap,
            color: 'text-primary',
          },
          {
            label: 'Ready to Serve',
            value: stats.readyCount,
            icon: CheckCircle2,
            color: 'text-success',
          },
          {
            label: 'Urgent',
            value: stats.urgentCount,
            icon: AlertTriangle,
            color: 'text-destructive',
          },
          {
            label: 'Overdue (>20m)',
            value: stats.overdueCount,
            icon: Clock,
            color: 'text-warning',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              stat.label === 'Urgent' &&
                stats.urgentCount > 0 &&
                'border-destructive/30 bg-destructive/5',
              stat.label === 'Ready to Serve' &&
                stats.readyCount > 0 &&
                'border-success/30 bg-success/5'
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted',
                  stat.color
                )}
              >
                <stat.icon className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {loading && orders.length === 0 ? (
                  <Skeleton className="h-7 w-10 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold">{stat.value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="size-4 text-warning" />
              All Orders
              <div className="flex items-center gap-1 ml-1">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-normal text-muted-foreground">Live</span>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLiveOrders()}
                disabled={loading}
                className="h-7 gap-1.5 text-xs"
              >
                <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Status tabs */}
          <div className="pt-3 pb-0">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
              <TabsList className="h-8 bg-muted/50 p-0.5">
                {(
                  [
                    ['all', 'All'],
                    ['pending', 'Pending'],
                    ['accepted', 'Accepted'],
                    ['cooking', 'Cooking'],
                    ['ready', 'Ready'],
                  ] as [TabFilter, string][]
                ).map(([val, label]) => (
                  <TabsTrigger
                    key={val}
                    value={val}
                    className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-background"
                  >
                    {label}
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full text-[10px] font-bold',
                        'bg-muted text-muted-foreground',
                        tab === val && 'bg-primary/15 text-primary'
                      )}
                    >
                      {counts[val as keyof typeof counts] ?? 0}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        {/* Column headers */}
        <div className="flex items-center gap-4 px-5 py-2 border-y border-border bg-muted/20 mt-3">
          <span className="w-2 shrink-0" />
          <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Order
          </span>
          <span className="w-32 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Table / Waiter
          </span>
          <span className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Items
          </span>
          <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Status
          </span>
          <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Time
          </span>
          <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
            Total
          </span>
          <span className="w-16 shrink-0" />
        </div>

        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="size-2 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ShoppingBag className="size-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No active live orders</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Orders placed from the POS terminal or online orders will appear here in real-time.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLiveOrders()}
                className="mt-2 text-xs gap-1.5"
              >
                <RefreshCw className="size-3" /> Check for orders
              </Button>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onOrderDeleted={handleOrderDeleted}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
