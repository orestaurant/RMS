'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Car,
  MapPin,
  Navigation,
  Lock,
  Unlock,
  ExternalLink,
  Compass,
  Copy,
  Check,
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
import { BillSettlementModal } from '@/components/billing/bill-settlement-modal'
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
import { CustomerLocationLock, CustomerLocationData, isValidCoord } from '@/components/orders/CustomerLocationLock'
import { useAuthContext } from '@/hooks/useAuthContext'

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
  tableId?: string
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
  isLocationLocked?: boolean
  vehicleNumber?: string | null
  landmarkNote?: string | null
  customerLat?: number | null
  customerLng?: number | null
  locationAccuracy?: number | null
  locationCapturedAt?: string | Date | null
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
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium',
    row: 'border-l-sky-500/80',
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
  onOrderUpdated,
  onAcceptOrder,
  onMarkServed,
  onGenerateBill,
}: {
  order: LiveOrder
  onOrderDeleted?: (id: string) => void
  onOrderUpdated?: (order: LiveOrder) => void
  onAcceptOrder?: (orderId: string, fullId?: string) => void
  onMarkServed?: (orderId: string, fullId?: string) => void
  onGenerateBill?: (order: LiveOrder) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [locateModalOpen, setLocateModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const [draftLocation, setDraftLocation] = useState<CustomerLocationData>({
    isLocationLocked: order.isLocationLocked,
    vehicleNumber: order.vehicleNumber,
    landmarkNote: order.landmarkNote,
    customerLat: order.customerLat,
    customerLng: order.customerLng,
    locationAccuracy: order.locationAccuracy,
    locationCapturedAt: order.locationCapturedAt,
  })

  useEffect(() => {
    setDraftLocation({
      isLocationLocked: order.isLocationLocked,
      vehicleNumber: order.vehicleNumber,
      landmarkNote: order.landmarkNote,
      customerLat: order.customerLat,
      customerLng: order.customerLng,
      locationAccuracy: order.locationAccuracy,
      locationCapturedAt: order.locationCapturedAt,
    })
  }, [
    order.isLocationLocked,
    order.vehicleNumber,
    order.landmarkNote,
    order.customerLat,
    order.customerLng,
    order.locationAccuracy,
    order.locationCapturedAt,
    locateModalOpen,
    detailsOpen,
  ])

  const cfg = statusConfig[order.status] || statusConfig.pending
  const pri = priorityConfig[order.priority] || priorityConfig.normal
  const StatusIcon = cfg.icon

  const hasCoords = isValidCoord(order.customerLat, order.customerLng)
  const hasLocation = Boolean(
    order.vehicleNumber || order.landmarkNote || hasCoords || order.isLocationLocked
  )
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${order.customerLat},${order.customerLng}`
    : null

  const modalHasCoords = isValidCoord(draftLocation.customerLat, draftLocation.customerLng)
  const modalMapsUrl = modalHasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${draftLocation.customerLat},${draftLocation.customerLng}`
    : null

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
        <div className="flex flex-col gap-0.5 w-36 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">
              {typeof order.tableNumber === 'number' || !isNaN(Number(order.tableNumber))
                ? `Table ${order.tableNumber}`
                : order.tableNumber}
            </span>
            {order.isLocationLocked && (
              <span title="Location Locked" className="inline-flex items-center">
                <Lock className="size-3 text-emerald-500 shrink-0" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">{order.waiter}</span>
            {order.vehicleNumber && (
              <span className="text-[10px] font-mono font-bold text-primary truncate max-w-[70px]">
                • {order.vehicleNumber}
              </span>
            )}
          </div>
        </div>

        {/* Items summary */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {order.items.length > 0
              ? order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
              : 'No items recorded'}
          </p>
        </div>

        {/* Status badge - STRICT FIXED COLUMN WIDTH */}
        <div className="w-28 shrink-0 flex items-center">
          <Badge variant="outline" className={cn('text-xs h-6 px-2 gap-1.5 shrink-0', cfg.badge)}>
            <StatusIcon className="size-3" />
            {cfg.label}
          </Badge>
        </div>

        {/* Time - STRICT FIXED COLUMN WIDTH */}
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground shrink-0" />
          <span
            className={cn(
              'text-xs font-mono font-medium',
              order.ticketTime > 20 ? 'text-destructive font-bold' : 'text-muted-foreground'
            )}
          >
            {order.ticketTime}m ago
          </span>
        </div>

        {/* Total - STRICT FIXED COLUMN WIDTH */}
        <div className="w-20 shrink-0 text-right">
          <span className="text-sm font-semibold font-mono">₹{order.total.toLocaleString('en-IN')}</span>
        </div>

        {/* Actions - STRICT FIXED COLUMN WIDTH */}
        <div className="w-28 shrink-0 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {order.status === 'pending' && (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onAcceptOrder?.(order.id, order.fullId)
              }}
            >
              <Check className="size-3" />
              Accept
            </Button>
          )}
          {order.status === 'ready' && (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white gap-1 shadow-sm shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onMarkServed?.(order.id, order.fullId)
              }}
            >
              <Check className="size-3" />
              Serve
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="size-7 cursor-pointer" />}
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="gap-2 cursor-pointer font-medium text-primary"
                onClick={() => setLocateModalOpen(true)}
              >
                <Navigation className="size-3.5" /> Locate Customer
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setDetailsOpen(true)}
              >
                <Eye className="size-3.5" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer font-bold text-emerald-600 dark:text-emerald-400"
                onClick={() => onGenerateBill?.(order)}
              >
                <Receipt className="size-3.5 text-emerald-600" /> Generate Bill
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
                {hasLocation && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (hasCoords) {
                        window.open(mapsUrl!, '_blank')
                      } else {
                        setLocateModalOpen(true)
                      }
                    }}
                  >
                    <Navigation className="size-3" />
                    Locate Customer
                  </Button>
                )}
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
                {order.status === 'pending' && (
                  <Button
                    size="sm"
                    className="h-7 text-xs font-extrabold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAcceptOrder?.(order.id, order.fullId)
                    }}
                  >
                    <Check className="size-3" />
                    Accept Order
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button
                    size="sm"
                    className="h-7 text-xs font-extrabold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkServed?.(order.id, order.fullId)
                    }}
                  >
                    <Check className="size-3" />
                    Mark Served
                  </Button>
                )}
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border shrink-0">
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

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5 text-xs">
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

            {/* Embedded Customer Location & Vehicle Spot Lock */}
            <CustomerLocationLock
              title="Customer Location & Vehicle Details"
              data={draftLocation}
              onChange={setDraftLocation}
              isEditable={true}
              onSave={async (updated, unlockOverride) => {
                const orderKey = order.fullId || order.id
                const res = await fetch(`/api/orders/${orderKey}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...updated,
                    unlockOverride: Boolean(unlockOverride),
                  }),
                })
                const json = await res.json()
                if (res.ok && json.success) {
                  const merged = {
                    ...order,
                    ...updated,
                    isLocationLocked: updated.isLocationLocked ?? order.isLocationLocked,
                  }
                  setDraftLocation(updated)
                  onOrderUpdated?.(merged)
                  alert('Customer location details updated successfully!')
                } else {
                  alert(json.message || 'Failed to update location details')
                }
              }}
            />

            {/* Items list */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Ordered Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
              </p>
              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden max-h-48 overflow-y-auto">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5">
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
                    <span className="font-semibold text-foreground shrink-0 pl-2">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill calculation */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border flex flex-col gap-1.5">
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

          <DialogFooter className="p-4 border-t border-border bg-muted/30 shrink-0 mx-0 mb-0 flex items-center justify-between sm:justify-between gap-2">
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
                size="sm"
                className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                onClick={() => {
                  setDetailsOpen(false)
                  onGenerateBill?.(order)
                }}
              >
                <Receipt className="size-3.5" />
                Generate Bill
              </Button>
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

      {/* Locate Customer Dialog */}
      <Dialog open={locateModalOpen} onOpenChange={setLocateModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Navigation className="size-4 text-primary" /> Locate Customer & Delivery Spot
              </DialogTitle>
              {order.isLocationLocked ? (
                <Badge
                  variant="outline"
                  className="text-xs h-6 px-2 gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                >
                  <Lock className="size-3" /> Locked
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs h-6 px-2 gap-1 text-muted-foreground">
                  <Unlock className="size-3" /> Editable
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Order #{order.id} • Table/Spot: {order.tableNumber} • Server: {order.waiter}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
            {/* Indian High-Security Style License Plate Card */}
            {(draftLocation.vehicleNumber || order.vehicleNumber) ? (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-b from-muted/60 to-muted/20 border-2 border-border shadow-inner">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Car className="size-3.5 text-primary" /> Target Customer Vehicle
                </div>
                <div className="inline-flex items-center rounded-lg border-2 border-slate-700 bg-white dark:bg-slate-900 px-5 py-2 shadow-md">
                  <div className="flex flex-col items-center mr-3 pr-3 border-r border-slate-300 dark:border-slate-700 text-blue-600 select-none">
                    <span className="text-[10px] font-black leading-none tracking-tight">IND</span>
                    <span className="text-[10px] leading-none mt-0.5">🇮🇳</span>
                  </div>
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-slate-900 dark:text-slate-100 select-all">
                    {draftLocation.vehicleNumber || order.vehicleNumber}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Landmark & Spot Description */}
            {(draftLocation.landmarkNote || order.landmarkNote) && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                  Landmark / Parking Spot Description
                </span>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="size-4 text-primary shrink-0" />
                  {draftLocation.landmarkNote || order.landmarkNote}
                </p>
              </div>
            )}

            {/* GPS Coordinates & Navigation button */}
            {modalHasCoords ? (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Compass className="size-4 text-primary" /> Customer GPS Pin
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    ±{draftLocation.locationAccuracy || 5}m Accuracy
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-background/60 p-2 rounded-lg border border-border/50">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">Latitude</span>
                    <span className="font-bold text-foreground">{draftLocation.customerLat}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">Longitude</span>
                    <span className="font-bold text-foreground">{draftLocation.customerLng}</span>
                  </div>
                </div>
                {draftLocation.locationCapturedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Captured: {new Date(draftLocation.locationCapturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}

                <div className="pt-1.5 flex flex-col sm:flex-row gap-2">
                  <a
                    href={modalMapsUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold shadow hover:bg-primary/90 transition-all"
                  >
                    <ExternalLink className="size-4" />
                    Open in Google Maps Navigation
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs gap-1.5"
                    onClick={() => {
                      if (modalMapsUrl) {
                        navigator.clipboard.writeText(modalMapsUrl)
                        setCopiedLink(true)
                        setTimeout(() => setCopiedLink(false), 2000)
                      }
                    }}
                  >
                    {copiedLink ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    {copiedLink ? 'Copied Link' : 'Copy Map Link'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning-foreground space-y-1">
                <p className="font-semibold text-warning flex items-center gap-1.5">
                  <AlertTriangle className="size-4" /> No GPS Coordinates Recorded
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Use the Vehicle Number ({draftLocation.vehicleNumber || order.vehicleNumber || 'N/A'}) and Landmark description above to locate the customer on foot, or capture GPS coordinates below.
                </p>
              </div>
            )}

            {/* Embedded Location & Vehicle Lock editor */}
            <CustomerLocationLock
              title="Lock / Edit Location & Vehicle"
              data={draftLocation}
              onChange={setDraftLocation}
              isEditable={true}
              onSave={async (updated, unlockOverride) => {
                const orderKey = order.fullId || order.id
                const res = await fetch(`/api/orders/${orderKey}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...updated,
                    unlockOverride: Boolean(unlockOverride),
                  }),
                })
                const json = await res.json()
                if (res.ok && json.success) {
                  const merged = {
                    ...order,
                    ...updated,
                    isLocationLocked: updated.isLocationLocked ?? order.isLocationLocked,
                  }
                  setDraftLocation(updated)
                  onOrderUpdated?.(merged)
                  alert('Customer location details updated successfully!')
                } else {
                  alert(json.message || 'Failed to update location details')
                }
              }}
            />
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/30 shrink-0 mx-0 mb-0 flex justify-end">
            <Button size="sm" className="text-xs" onClick={() => setLocateModalOpen(false)}>
              Close
            </Button>
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
  const { auth } = useAuthContext()
  const activeBranchId = auth?.branchId

  const [tab, setTab] = useState<TabFilter>('all')
  const [filterMode, setFilterMode] = useState<'all' | 'car'>('all')
  const [urgentOnly, setUrgentOnly] = useState<boolean>(false)
  const [orders, setOrders] = useState<LiveOrder[]>([])
  const [settlementTable, setSettlementTable] = useState<{ id?: string; tableNumber: string | number; waiter?: string } | null>(null)
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    accepted: 0,
    cooking: 0,
    ready: 0,
    served: 0,
    carOrders: 0,
  })
  const [stats, setStats] = useState({
    activeCount: 0,
    readyCount: 0,
    urgentCount: 0,
    overdueCount: 0,
    carOrdersCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const isInitialLoadRef = useRef(true)

  // Fetch live orders directly from PostgreSQL via API (with background non-blocking refresh)
  const fetchLiveOrders = useCallback(async (isManualRefresh = false) => {
    try {
      if (isInitialLoadRef.current || isManualRefresh) {
        setLoading(true)
      }
      const branchParam = activeBranchId ? `&branchId=${encodeURIComponent(activeBranchId)}` : ''
      const res = await fetch(`/api/orders/live?status=all${branchParam}`)
      const json = await res.json()

      if (json.success && json.data) {
        const fetchedOrders: LiveOrder[] = json.data.orders || []
        setOrders(fetchedOrders)
        if (json.data.counts) {
          setCounts(json.data.counts)
        }
        if (json.data.stats) {
          setStats(json.data.stats)
        }
        isInitialLoadRef.current = false
      } else {
        if (isInitialLoadRef.current) {
          setOrders([])
        }
      }
    } catch (err) {
      console.error('Failed to fetch live orders:', err)
      if (isInitialLoadRef.current) {
        setOrders([])
      }
    } finally {
      setLoading(false)
    }
  }, [activeBranchId])

  useEffect(() => {
    fetchLiveOrders()
    // Poll every 5 seconds to receive new live orders in real-time without UI flash
    const timer = setInterval(() => {
      fetchLiveOrders(false)
    }, 5000)
    return () => clearInterval(timer)
  }, [fetchLiveOrders])

  const handleAcceptOrder = async (orderId: string, fullId?: string) => {
    try {
      const targetId = fullId || orderId
      // Optimistic local state update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.fullId === targetId
            ? { ...o, status: 'accepted' as OrderStatus }
            : o
        )
      )
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        accepted: prev.accepted + 1,
      }))

      const res = await fetch(`/api/orders/${encodeURIComponent(targetId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted',
          fullId: fullId || targetId,
          orderNumber: orderId,
        }),
      })

      if (!res.ok) {
        await fetch(`/api/orders/${encodeURIComponent(targetId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'accepted',
            fullId: fullId || targetId,
            orderNumber: orderId,
          }),
        })
      }
      fetchLiveOrders(false)
    } catch (err) {
      console.error('Failed to accept order:', err)
      fetchLiveOrders(false)
    }
  }

  const handleMarkServed = async (orderId: string, fullId?: string) => {
    try {
      const targetId = fullId || orderId
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.fullId === targetId
            ? { ...o, status: 'served' as OrderStatus }
            : o
        )
      )
      setCounts((prev) => ({
        ...prev,
        ready: Math.max(0, prev.ready - 1),
        served: prev.served + 1,
      }))

      await fetch(`/api/orders/${encodeURIComponent(targetId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'served',
          fullId: fullId || targetId,
          orderNumber: orderId,
        }),
      })
      fetchLiveOrders(false)
    } catch (err) {
      console.error('Failed to mark order as served:', err)
      fetchLiveOrders(false)
    }
  }

  const handleOrderDeleted = (orderId: string) => {
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId && o.fullId !== orderId)
      const carCount = updated.filter(
        (o) => Boolean(o.vehicleNumber || o.landmarkNote || o.customerLat || o.isLocationLocked)
      ).length
      setCounts({
        all: updated.length,
        pending: updated.filter((o) => o.status === 'pending').length,
        accepted: updated.filter((o) => o.status === 'accepted').length,
        cooking: updated.filter((o) => o.status === 'cooking').length,
        ready: updated.filter((o) => o.status === 'ready').length,
        served: updated.filter((o) => o.status === 'served').length,
        carOrders: carCount,
      })
      setStats((prevStats) => ({
        ...prevStats,
        activeCount: Math.max(0, prevStats.activeCount - 1),
        readyCount: updated.filter((o) => o.status === 'ready').length,
        carOrdersCount: carCount,
      }))
      return updated
    })
  }

  const handleOrderUpdated = (updatedOrder: LiveOrder) => {
    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === updatedOrder.id || o.fullId === updatedOrder.fullId
          ? { ...o, ...updatedOrder }
          : o
      )
      const carCount = updated.filter(
        (o) => Boolean(o.vehicleNumber || o.landmarkNote || o.customerLat || o.isLocationLocked)
      ).length
      setCounts({
        all: updated.length,
        pending: updated.filter((o) => o.status === 'pending').length,
        accepted: updated.filter((o) => o.status === 'accepted').length,
        cooking: updated.filter((o) => o.status === 'cooking').length,
        ready: updated.filter((o) => o.status === 'ready').length,
        served: updated.filter((o) => o.status === 'served').length,
        carOrders: carCount,
      })
      setStats((prevStats) => ({
        ...prevStats,
        readyCount: updated.filter((o) => o.status === 'ready').length,
        carOrdersCount: carCount,
      }))
      return updated
    })
  }

  const carOrdersCount = useMemo(
    () =>
      orders.filter(
        (o) => Boolean(o.vehicleNumber || o.landmarkNote || o.customerLat || o.isLocationLocked)
      ).length,
    [orders]
  )

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'pending'),
    [orders]
  )

  const displayedOrders = useMemo(() => {
    return orders.filter((o) => {
      if (urgentOnly && o.priority !== 'urgent' && (o.ticketTime || 0) <= 20) {
        return false
      }
      if (tab !== 'all' && o.status !== tab) {
        return false
      }
      if (filterMode === 'car') {
        return Boolean(o.vehicleNumber || o.landmarkNote || o.customerLat || o.isLocationLocked)
      }
      return true
    })
  }, [orders, tab, filterMode, urgentOnly])

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Summary KPIs - Dynamic from PostgreSQL with Interactive One-Click Filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: 'Total Orders',
            value: counts.all || stats.activeCount || orders.length,
            icon: Zap,
            color: 'text-primary',
            active: tab === 'all' && filterMode === 'all' && !urgentOnly,
            activeClass: 'ring-2 ring-primary border-primary bg-primary/10 shadow-sm',
            onClick: () => {
              setTab('all')
              setFilterMode('all')
              setUrgentOnly(false)
            },
          },
          {
            label: 'Ready to Serve',
            value: stats.readyCount,
            icon: CheckCircle2,
            color: 'text-success',
            active: tab === 'ready' && filterMode === 'all' && !urgentOnly,
            activeClass: 'ring-2 ring-success border-success bg-success/10 shadow-sm',
            onClick: () => {
              setTab('ready')
              setFilterMode('all')
              setUrgentOnly(false)
            },
          },
          {
            label: 'Served Today',
            value: counts.served,
            icon: ShoppingBag,
            color: 'text-sky-500',
            active: tab === 'served' && filterMode === 'all' && !urgentOnly,
            activeClass: 'ring-2 ring-sky-500 border-sky-500 bg-sky-500/10 shadow-sm',
            onClick: () => {
              setTab('served')
              setFilterMode('all')
              setUrgentOnly(false)
            },
          },
          {
            label: 'Car / Drive-In',
            value: carOrdersCount,
            icon: Car,
            color: 'text-amber-500',
            active: filterMode === 'car',
            activeClass: 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/10 shadow-sm',
            onClick: () => {
              setUrgentOnly(false)
              setFilterMode((m) => (m === 'car' ? 'all' : 'car'))
            },
          },
          {
            label: 'Urgent',
            value: stats.urgentCount,
            icon: AlertTriangle,
            color: 'text-destructive',
            active: urgentOnly,
            activeClass: 'ring-2 ring-destructive border-destructive bg-destructive/10 shadow-sm',
            onClick: () => {
              setUrgentOnly((u) => !u)
              setFilterMode('all')
            },
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            onClick={stat.onClick}
            role="button"
            tabIndex={0}
            className={cn(
              'transition-all duration-200 cursor-pointer select-none relative overflow-hidden',
              'hover:shadow-md hover:border-primary/50 active:scale-[0.98]',
              stat.active
                ? stat.activeClass
                : 'border-border/70 bg-card/60 hover:bg-muted/30',
              stat.label === 'Urgent' &&
                stats.urgentCount > 0 &&
                !stat.active &&
                'border-destructive/30 bg-destructive/5 hover:border-destructive/60',
              stat.label === 'Ready to Serve' &&
                stats.readyCount > 0 &&
                !stat.active &&
                'border-success/30 bg-success/5 hover:border-success/60',
              stat.label === 'Car / Drive-In' &&
                carOrdersCount > 0 &&
                !stat.active &&
                'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted transition-transform duration-200',
                    stat.color,
                    stat.active && 'scale-110 shadow-sm'
                  )}
                >
                  <stat.icon className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    {stat.active && (
                      <span className="size-1.5 rounded-full bg-primary animate-ping" />
                    )}
                  </div>
                  {loading && orders.length === 0 ? (
                    <Skeleton className="h-7 w-10 mt-0.5" />
                  ) : (
                    <p className="text-xl font-bold">{stat.value}</p>
                  )}
                </div>
              </div>
              {stat.active && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] h-5 px-1.5 font-medium shrink-0',
                    stat.label === 'Urgent' && 'border-destructive/40 text-destructive bg-destructive/10',
                    stat.label === 'Ready to Serve' && 'border-success/40 text-success bg-success/10',
                    stat.label === 'Served Today' && 'border-sky-500/40 text-sky-500 bg-sky-500/10',
                    stat.label === 'Car / Drive-In' && 'border-amber-500/40 text-amber-500 bg-amber-500/10',
                    stat.label === 'Total Orders' && 'border-primary/40 text-primary bg-primary/10'
                  )}
                >
                  Active
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── New / Pending Requests Section (Waiter Order Acceptance) ── */}
      {pendingOrders.length > 0 && (
        <div className="rounded-2xl border-2 border-warning/40 bg-warning/5 p-4 md:p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-warning/20 text-warning flex items-center justify-center font-bold">
                <AlertTriangle className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-foreground">
                    New / Pending Requests
                  </h3>
                  <Badge className="bg-warning text-black font-extrabold text-[10px] px-2 py-0.5">
                    {pendingOrders.length} Awaiting Acceptance
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customer QR orders placed from tables — click Accept Order to route immediately to Chef&apos;s queue
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTab('pending')
                setFilterMode('all')
                setUrgentOnly(false)
              }}
              className="h-8 text-xs font-bold gap-1 border-warning/40 text-warning hover:bg-warning/10"
            >
              View Pending Tab ({pendingOrders.length})
            </Button>
          </div>

          {/* Cards Grid for Pending Requests */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingOrders.map((ord) => (
              <Card
                key={ord.id}
                className="border border-warning/30 bg-card/95 shadow-sm rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <CardHeader className="p-3.5 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        variant="outline"
                        className="border-warning/50 text-warning bg-warning/10 font-black text-xs px-2.5 py-0.5"
                      >
                        {typeof ord.tableNumber === 'number' || !isNaN(Number(ord.tableNumber))
                          ? `Table ${ord.tableNumber}`
                          : ord.tableNumber}
                      </Badge>
                      <div className="font-mono text-xs font-bold text-foreground mt-1">
                        {ord.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 justify-end">
                        <Clock className="size-3" />
                        {ord.ticketTime}m ago
                      </span>
                      <span className="text-xs font-black text-primary">
                        ₹{ord.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1 text-xs border-t border-border/50 pt-2">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-muted-foreground">
                        <span className="font-medium text-foreground">
                          <span className="font-bold text-primary mr-1">{it.quantity}×</span>
                          {it.name}
                        </span>
                        <span>₹{(it.price * it.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  {ord.items.some((it) => it.notes) && (
                    <div className="text-[11px] bg-warning/10 border border-warning/20 p-2 rounded-lg text-warning font-medium">
                      ⚠ Special Notes: {ord.items.filter((it) => it.notes).map((it) => it.notes).join(', ')}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      className="flex-1 h-9 font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                      onClick={() => handleAcceptOrder(ord.id, ord.fullId)}
                    >
                      <Check className="size-3.5" />
                      Accept Order
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => handleOrderDeleted(ord.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="size-4 text-warning" />
              {filterMode === 'car'
                ? 'Car & GPS Locked Orders'
                : urgentOnly
                ? 'Urgent Orders (>20m)'
                : tab === 'ready'
                ? 'Ready to Serve Orders'
                : tab === 'served'
                ? 'Served Today Orders'
                : tab !== 'all'
                ? `${tab.charAt(0).toUpperCase() + tab.slice(1)} Orders`
                : 'All Orders'}
              <div className="flex items-center gap-1 ml-1">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-normal text-muted-foreground">Live</span>
              </div>
              {urgentOnly && (
                <Badge
                  variant="outline"
                  className="cursor-pointer gap-1 border-destructive/40 bg-destructive/10 text-destructive text-xs py-0.5 px-2 hover:bg-destructive/20 ml-2"
                  onClick={() => setUrgentOnly(false)}
                >
                  Urgent Only ✕
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Filter: All Orders | Car / GPS Locked Orders */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/50">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('all')
                    setUrgentOnly(false)
                  }}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                    filterMode === 'all' && !urgentOnly
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  All Orders ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrgentOnly(false)
                    setFilterMode('car')
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all',
                    filterMode === 'car'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Car className="size-3.5" />
                  <span>Car / GPS Orders ({carOrdersCount})</span>
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLiveOrders(true)}
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
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as TabFilter)
                if (urgentOnly) setUrgentOnly(false)
              }}
            >
              <TabsList className="h-8 bg-muted/50 p-0.5">
                {(
                  [
                    ['all', 'All'],
                    ['pending', 'Pending'],
                    ['accepted', 'Accepted'],
                    ['cooking', 'Cooking'],
                    ['ready', 'Ready'],
                    ['served', 'Served'],
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
        <div className="flex items-center gap-4 px-5 py-2.5 border-y border-border bg-muted/20 mt-3 select-none">
          <span className="w-2 shrink-0" />
          <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Order
          </span>
          <span className="w-36 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Table / Waiter
          </span>
          <span className="flex-1 min-w-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Items
          </span>
          <span className="w-28 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Status
          </span>
          <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Time
          </span>
          <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
            Total
          </span>
          <span className="w-28 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
            Actions
          </span>
        </div>

        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="size-2 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-28" />
                </div>
              ))}
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ShoppingBag className="size-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {filterMode === 'car'
                    ? 'No active Car / GPS Locked Orders'
                    : 'No active live orders'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {filterMode === 'car'
                    ? 'Orders with vehicle numbers or captured GPS locations will appear here.'
                    : 'Orders placed from the POS terminal or online orders will appear here in real-time.'}
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
              {displayedOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onOrderDeleted={handleOrderDeleted}
                  onOrderUpdated={handleOrderUpdated}
                  onAcceptOrder={handleAcceptOrder}
                  onMarkServed={handleMarkServed}
                  onGenerateBill={(ord) =>
                    setSettlementTable({
                      id: ord.tableId,
                      tableNumber: ord.tableNumber,
                      waiter: ord.waiter,
                    })
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Settlement Modal */}
      {settlementTable && (
        <BillSettlementModal
          open={!!settlementTable}
          onOpenChange={(open) => {
            if (!open) setSettlementTable(null)
          }}
          tableId={settlementTable.id}
          tableNumber={settlementTable.tableNumber}
          waiterName={settlementTable.waiter}
          onSuccess={() => {
            fetchLiveOrders()
          }}
        />
      )}
    </main>
  )
}
