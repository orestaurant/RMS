'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Bell,
  AlertTriangle,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Scale,
  RefreshCw,
  Send,
  Boxes,
  Truck,
  CheckCheck,
  ShieldAlert,
  ArrowRight,
  PackageCheck,
  Timer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'

export interface VendorNotification {
  id: string
  recipientId: string | null
  recipientRole: string
  type: string
  title: string
  message: string
  rawMaterialId: string | null
  metadata: {
    materialName?: string
    sku?: string
    currentQuantity?: number
    minThreshold?: number
    weight?: string
    weightUnit?: string
    location?: string
    acknowledgedAt?: string
    inTransitAt?: string
    deliveredAt?: string
    completedAt?: string
    deliveredQuantity?: number
    newStock?: number
    vendorNotes?: string
    transitNotes?: string
    confirmedBy?: string
  }
  status:
    | 'PENDING'
    | 'ACKNOWLEDGED'
    | 'RESTOCK_INITIATED'
    | 'RESTOCK_IN_PROGRESS'
    | 'RESTOCK_IN_TRANSIT'
    | 'RESTOCK_DELIVERED'
    | 'RESTOCK_COMPLETED'
  isRead: boolean
  createdAt: string
  rawMaterial?: {
    id: string
    name: string
    sku: string
    quantity: number
    minThreshold: number
    weight: number
    weightUnit: string
    location: string
  } | null
}

export function VendorDashboardView() {
  const { auth } = useAuthContext()
  const [notifications, setNotifications] = useState<VendorNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  // Filter mode
  const [filterMode, setFilterMode] = useState<
    'all' | 'pending' | 'in_progress' | 'in_transit' | 'delivered' | 'completed'
  >('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(5)

  // Delivered Confirmation Modal state
  const [deliveryModalNotif, setDeliveryModalNotif] = useState<VendorNotification | null>(null)
  const [deliveryQty, setDeliveryQty] = useState<string>('20')
  const [deliveryNotes, setDeliveryNotes] = useState<string>('')
  const [submittingDelivery, setSubmittingDelivery] = useState(false)

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'error'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'info' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  // Fetch Vendor Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const recipientId = auth?.id || ''
      const res = await fetch(
        `/api/dashboard-notifications?role=VENDOR${recipientId ? `&recipientId=${recipientId}` : ''}`
      )
      const json = await res.json()
      if (json.success && json.data) {
        setNotifications(json.data.notifications || [])
        setUnreadCount(json.data.unreadCount || 0)
      }
    } catch (err) {
      console.warn('Error fetching vendor notifications:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [auth?.id])

  // Initial fetch and 20s Polling Loop for live updates without page reload
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 20000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Mark single as read
  const handleMarkAsRead = async (notifId: string) => {
    try {
      setActingId(notifId)
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: notifId }),
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
        )
        setUnreadCount((c) => Math.max(0, c - 1))
        showFeedback('info', 'Alert marked as read')
      }
    } catch {
      showFeedback('error', 'Failed to update alert status')
    } finally {
      setActingId(null)
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          id: 'all',
          role: 'VENDOR',
          recipientId: auth?.id || undefined,
        }),
      })
      showFeedback('info', 'All alerts marked as read')
    } catch {
      fetchNotifications()
    }
  }

  // STAGE 1: Vendor Accepts Request -> Status: RESTOCK_IN_PROGRESS
  const handleAcceptRequest = async (notifId: string, materialName: string) => {
    try {
      setActingId(notifId)
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_request',
          id: notifId,
          vendorNotes: `Restock request accepted by ${auth?.name || 'Vendor'}. Preparation in progress.`,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          `Restock request accepted for "${materialName}"! Status is now Request In Progress.`
        )
        fetchNotifications()
      } else {
        showFeedback('error', json.message || 'Failed to accept restock request')
      }
    } catch {
      showFeedback('error', 'Error accepting restock request')
    } finally {
      setActingId(null)
    }
  }

  // STAGE 2: Vendor Marks In Transit -> Status: RESTOCK_IN_TRANSIT
  const handleMarkInTransit = async (notifId: string, materialName: string) => {
    try {
      setActingId(notifId)
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_in_transit',
          id: notifId,
          vendorNotes: `Restock shipment dispatched by ${auth?.name || 'Vendor'}. Goods are currently in transit.`,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          `"${materialName}" marked as Restock In Transit! Order is on the way to warehouse.`
        )
        fetchNotifications()
      } else {
        showFeedback('error', json.message || 'Failed to mark restock in transit')
      }
    } catch {
      showFeedback('error', 'Error updating shipment status')
    } finally {
      setActingId(null)
    }
  }

  // Open Mark Delivered Dialog
  const openDeliveryModal = (notif: VendorNotification) => {
    const currentQty = notif.rawMaterial?.quantity ?? notif.metadata?.currentQuantity ?? 0
    const minThreshold = notif.rawMaterial?.minThreshold ?? notif.metadata?.minThreshold ?? 10
    const suggestedQty = Math.max(10, Math.ceil(minThreshold * 2 - currentQty))
    setDeliveryModalNotif(notif)
    setDeliveryQty(String(suggestedQty))
    setDeliveryNotes('Shipment delivered to warehouse receiving dock.')
  }

  // STAGE 3: Vendor Submits Delivery -> Status: RESTOCK_DELIVERED
  const handleSubmitDelivery = async () => {
    if (!deliveryModalNotif) return
    const qty = Number(deliveryQty)
    if (isNaN(qty) || qty <= 0) {
      showFeedback('error', 'Please provide a valid delivered quantity greater than 0')
      return
    }

    try {
      setSubmittingDelivery(true)
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_delivered',
          id: deliveryModalNotif.id,
          deliveredQuantity: qty,
          vendorNotes: deliveryNotes.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          `Restock marked as Delivered! Awaiting Inventory Manager verification to complete restock.`
        )
        setDeliveryModalNotif(null)
        fetchNotifications()
      } else {
        showFeedback('error', json.message || 'Failed to mark restock delivered')
      }
    } catch {
      showFeedback('error', 'Error recording delivery')
    } finally {
      setSubmittingDelivery(false)
    }
  }

  // Filter change handler with auto-reset page
  const handleFilterChange = (mode: typeof filterMode) => {
    setFilterMode(mode)
    setCurrentPage(1)
  }

  // Memoized KPI Calculations
  const pendingCount = useMemo(
    () => notifications.filter((n) => n.status === 'PENDING').length,
    [notifications]
  )
  const inProgressCount = useMemo(
    () =>
      notifications.filter(
        (n) => n.status === 'RESTOCK_IN_PROGRESS' || n.status === 'RESTOCK_INITIATED'
      ).length,
    [notifications]
  )
  const inTransitCount = useMemo(
    () => notifications.filter((n) => n.status === 'RESTOCK_IN_TRANSIT').length,
    [notifications]
  )
  const deliveredCount = useMemo(
    () => notifications.filter((n) => n.status === 'RESTOCK_DELIVERED').length,
    [notifications]
  )
  const completedCount = useMemo(
    () => notifications.filter((n) => n.status === 'RESTOCK_COMPLETED').length,
    [notifications]
  )

  // Memoized Filtered List
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (filterMode === 'pending') return notif.status === 'PENDING'
      if (filterMode === 'in_progress')
        return notif.status === 'RESTOCK_IN_PROGRESS' || notif.status === 'RESTOCK_INITIATED'
      if (filterMode === 'in_transit') return notif.status === 'RESTOCK_IN_TRANSIT'
      if (filterMode === 'delivered') return notif.status === 'RESTOCK_DELIVERED'
      if (filterMode === 'completed') return notif.status === 'RESTOCK_COMPLETED'
      return true
    })
  }, [notifications, filterMode])

  // Pagination Math
  const totalItems = filteredNotifications.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedNotifications = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage
    return filteredNotifications.slice(start, start + itemsPerPage)
  }, [filteredNotifications, safeCurrentPage, itemsPerPage])

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(safeCurrentPage * itemsPerPage, totalItems)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between p-3.5 rounded-xl border text-sm shadow-sm transition-all',
            feedback.type === 'success' &&
              'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium',
            feedback.type === 'info' && 'bg-primary/10 border-primary/20 text-primary',
            feedback.type === 'error' &&
              'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' && <CheckCircle2 className="size-4 shrink-0" />}
            {feedback.type === 'info' && <Bell className="size-4 shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="size-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-xs">
              <Truck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vendor Portal & Restock Center</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Logged in as <strong className="text-foreground">{auth?.name || 'Registered Vendor'}</strong> ({auth?.email})
              </p>
            </div>
          </div>
        </div>

        {/* Live Notification Bell & Sync indicator */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              fetchNotifications()
            }}
            disabled={refreshing}
            className="gap-1.5 h-9 text-xs"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>

          {/* Dedicated Vendor Notification Bell with Unread Badge */}
          <div className="relative inline-flex items-center">
            <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-muted/60 border border-border">
              <div className="relative">
                <Bell
                  className={cn(
                    'size-4 text-foreground',
                    unreadCount > 0 && 'text-orange-500 animate-bounce'
                  )}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-foreground">
                {unreadCount > 0 ? `${unreadCount} New Alert${unreadCount > 1 ? 's' : ''}` : 'All Caught Up'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards for Lifecycle Tracking */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* 1. Pending Requests */}
        <Card
          onClick={() => handleFilterChange('pending')}
          className={cn(
            'border shadow-xs transition-all cursor-pointer hover:border-amber-500/60',
            pendingCount > 0
              ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20'
              : 'border-border/70',
            filterMode === 'pending' && 'ring-2 ring-amber-500'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending
            </CardTitle>
            <div
              className={cn(
                'p-1.5 rounded-lg',
                pendingCount > 0
                  ? 'bg-amber-500/20 text-amber-600 animate-pulse'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertTriangle className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Need acknowledgement</p>
          </CardContent>
        </Card>

        {/* 2. In Progress */}
        <Card
          onClick={() => handleFilterChange('in_progress')}
          className={cn(
            'border border-border/70 shadow-xs transition-all cursor-pointer hover:border-sky-500/60',
            filterMode === 'in_progress' && 'ring-2 ring-sky-500'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              In Progress
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
              <Timer className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{inProgressCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Preparing supplies</p>
          </CardContent>
        </Card>

        {/* 3. Restock In Transit */}
        <Card
          onClick={() => handleFilterChange('in_transit')}
          className={cn(
            'border border-border/70 shadow-xs transition-all cursor-pointer hover:border-purple-500/60',
            filterMode === 'in_transit' && 'ring-2 ring-purple-500'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              In Transit
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <Truck className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{inTransitCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">On the way to restaurant</p>
          </CardContent>
        </Card>

        {/* 4. Restock Delivered */}
        <Card
          onClick={() => handleFilterChange('delivered')}
          className={cn(
            'border border-border/70 shadow-xs transition-all cursor-pointer hover:border-teal-500/60',
            filterMode === 'delivered' && 'ring-2 ring-teal-500'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Delivered
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
              <PackageCheck className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{deliveredCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting manager check</p>
          </CardContent>
        </Card>

        {/* 5. Restock Completed */}
        <Card
          onClick={() => handleFilterChange('completed')}
          className={cn(
            'border border-border/70 shadow-xs col-span-2 sm:col-span-1 transition-all cursor-pointer hover:border-emerald-500/60',
            filterMode === 'completed' && 'ring-2 ring-emerald-500'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Stock updated in warehouse</p>
          </CardContent>
        </Card>
      </div>

      {/* DEDICATED LIVE RESTOCK CENTER SECTION */}
      <Card className="border border-border/70 shadow-xs overflow-hidden">
        {/* Well-structured, fully aligned header */}
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Low Inventory Alerts / Restock Requests
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-muted/60 font-medium">
                  Auto-sync: 20s
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1 text-muted-foreground">
                Real-time multi-stage replenishment workflow synced directly with Inventory Managers.
              </CardDescription>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-8 text-xs gap-1 self-start sm:self-auto text-muted-foreground hover:text-foreground shrink-0"
              >
                <CheckCheck className="size-3.5" />
                Mark All Read ({unreadCount})
              </Button>
            )}
          </div>

          {/* Full-width responsive filter tabs container (Clean Segmented Bar) */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 flex-wrap">
            <div className="inline-flex rounded-xl border border-input/80 p-1 bg-muted/40 gap-1 flex-wrap">
              <button
                onClick={() => handleFilterChange('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  filterMode === 'all'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => handleFilterChange('pending')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  filterMode === 'pending'
                    ? 'bg-background text-amber-600 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => handleFilterChange('in_progress')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  filterMode === 'in_progress'
                    ? 'bg-background text-sky-600 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                onClick={() => handleFilterChange('in_transit')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  filterMode === 'in_transit'
                    ? 'bg-background text-purple-600 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                In Transit ({inTransitCount})
              </button>
              <button
                onClick={() => handleFilterChange('delivered')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  filterMode === 'delivered'
                    ? 'bg-background text-teal-600 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Delivered ({deliveredCount})
              </button>
              <button
                onClick={() => handleFilterChange('completed')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  filterMode === 'completed'
                    ? 'bg-background text-emerald-600 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Quick Count Info */}
            <div className="text-xs text-muted-foreground hidden sm:block">
              {totalItems} {totalItems === 1 ? 'request' : 'requests'} found
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full size-12 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="font-semibold text-base">No restock requests in this filter</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {filterMode === 'pending'
                  ? 'All low-stock items have been accepted. Great job!'
                  : 'No restock requests match the current status filter.'}
              </p>
              {filterMode !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('all')}
                  className="mt-4 text-xs h-8"
                >
                  View All Requests
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {paginatedNotifications.map((notif) => {
                const materialName =
                  notif.rawMaterial?.name || notif.metadata?.materialName || 'Raw Material'
                const sku = notif.rawMaterial?.sku || notif.metadata?.sku || 'RM-SKU'
                const currentQty =
                  notif.rawMaterial?.quantity ?? notif.metadata?.currentQuantity ?? 0
                const minThreshold =
                  notif.rawMaterial?.minThreshold ?? notif.metadata?.minThreshold ?? 10
                const weight =
                  notif.rawMaterial?.weight && notif.rawMaterial?.weightUnit
                    ? `${notif.rawMaterial.weight} ${notif.rawMaterial.weightUnit}`
                    : notif.metadata?.weight || 'Standard'
                const location =
                  notif.rawMaterial?.location || notif.metadata?.location || 'Main Warehouse'

                const isPending = notif.status === 'PENDING'
                const isInProgress =
                  notif.status === 'RESTOCK_IN_PROGRESS' || notif.status === 'RESTOCK_INITIATED'
                const isInTransit = notif.status === 'RESTOCK_IN_TRANSIT'
                const isDelivered = notif.status === 'RESTOCK_DELIVERED'
                const isCompleted = notif.status === 'RESTOCK_COMPLETED'
                const isActing = actingId === notif.id

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 sm:p-5 transition-colors flex flex-col gap-3.5 hover:bg-muted/10',
                      !notif.isRead && 'bg-orange-500/[0.03] dark:bg-orange-950/[0.12]',
                      isPending && 'border-l-4 border-l-amber-500',
                      isInProgress && 'border-l-4 border-l-sky-500',
                      isInTransit && 'border-l-4 border-l-purple-500',
                      isDelivered && 'border-l-4 border-l-teal-500',
                      isCompleted && 'border-l-4 border-l-emerald-500'
                    )}
                  >
                    {/* Top Row: Title, SKU, Stage Badges, and Action Area */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground tracking-tight">
                          {materialName}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                          {sku}
                        </Badge>

                        {/* STAGE STATUS BADGES */}
                        {isPending && (
                          <Badge
                            variant="destructive"
                            className="text-[11px] bg-amber-600 hover:bg-amber-600 gap-1 px-2"
                          >
                            <AlertTriangle className="size-3" />
                            Restock Required
                          </Badge>
                        )}
                        {isInProgress && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 gap-1 px-2 font-medium"
                          >
                            <Timer className="size-3" />
                            Request In Progress
                          </Badge>
                        )}
                        {isInTransit && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 gap-1 px-2 font-medium"
                          >
                            <Truck className="size-3" />
                            Restock In Transit
                          </Badge>
                        )}
                        {isDelivered && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 gap-1 px-2 font-medium"
                          >
                            <PackageCheck className="size-3" />
                            Restock Delivered
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 px-2 font-medium"
                          >
                            <CheckCircle2 className="size-3" />
                            Restock Completed
                          </Badge>
                        )}

                        {!notif.isRead && (
                          <Badge className="text-[10px] bg-orange-500 text-white px-1.5 py-0">
                            Unread
                          </Badge>
                        )}
                      </div>

                      {/* Right: Vendor Actionability Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notif.id)}
                            disabled={isActing}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Mark Read
                          </Button>
                        )}

                        {/* STAGE 1: PENDING -> ACCEPT REQUEST */}
                        {isPending && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(notif.id, materialName)}
                            disabled={isActing}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs gap-1.5"
                          >
                            <Send className="size-3.5" />
                            {isActing ? 'Updating...' : 'Accept Request'}
                          </Button>
                        )}

                        {/* STAGE 2: IN PROGRESS -> MARK IN TRANSIT */}
                        {isInProgress && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkInTransit(notif.id, materialName)}
                            disabled={isActing}
                            className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs gap-1.5"
                          >
                            <Truck className="size-3.5" />
                            {isActing ? 'Dispatching...' : 'Mark In Transit (On the Way)'}
                          </Button>
                        )}

                        {/* STAGE 3: IN TRANSIT -> MARK DELIVERED */}
                        {isInTransit && (
                          <Button
                            size="sm"
                            onClick={() => openDeliveryModal(notif)}
                            disabled={isActing}
                            className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs gap-1.5"
                          >
                            <PackageCheck className="size-3.5" />
                            Mark Restock Delivered
                          </Button>
                        )}

                        {/* STAGE 4: DELIVERED -> WAITING CONFIRMATION */}
                        {isDelivered && (
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge
                              variant="outline"
                              className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 px-2.5 py-0.5 font-semibold"
                            >
                              Restock Delivered
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Awaiting Manager Confirmation
                            </span>
                          </div>
                        )}

                        {/* STAGE 5: COMPLETED */}
                        {isCompleted && (
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge
                              variant="outline"
                              className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 font-semibold"
                            >
                              ✓ Restock Completed
                            </Badge>
                            {notif.metadata?.deliveredQuantity && (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                +{notif.metadata.deliveredQuantity} supplied to stock
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle: Alert Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Specifications & Location Grid - Dedicated Card Layout with NO TEXT CLIPPING */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-xl border border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <Scale className="size-3.5 text-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Current Stock
                          </div>
                          <div className="font-bold text-foreground">
                            <span
                              className={cn(
                                currentQty <= minThreshold ? 'text-rose-600' : 'text-emerald-600'
                              )}
                            >
                              {currentQty}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal ml-1">
                              {notif.rawMaterial?.weightUnit || 'kg'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <ShieldAlert className="size-3.5 text-amber-500" />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Min Threshold
                          </div>
                          <div className="font-bold text-foreground">
                            {minThreshold}{' '}
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {notif.rawMaterial?.weightUnit || 'kg'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <Package className="size-3.5 text-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Specification
                          </div>
                          <div className="font-bold text-foreground">{weight}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <MapPin className="size-3.5 text-orange-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Warehouse Location
                          </div>
                          <div className="font-semibold text-foreground break-words" title={location}>
                            {location}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Status Timeline Progression */}
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 shrink-0" />
                        Alert received:{' '}
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {notif.metadata?.acknowledgedAt && (
                        <span className="text-sky-600 dark:text-sky-400 font-medium">
                          ✓ Accepted at{' '}
                          {new Date(notif.metadata.acknowledgedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}

                      {notif.metadata?.inTransitAt && (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          🚚 In Transit at{' '}
                          {new Date(notif.metadata.inTransitAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}

                      {notif.metadata?.deliveredAt && (
                        <span className="text-teal-600 dark:text-teal-400 font-medium">
                          📦 Delivered at{' '}
                          {new Date(notif.metadata.deliveredAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}

                      {notif.metadata?.completedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✅ Confirmed & Restocked at{' '}
                          {new Date(notif.metadata.completedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* HIGH-PERFORMANCE PAGINATION BAR */}
          {totalItems > 0 && (
            <div className="p-4 border-t border-border/60 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Left Info & Per-Page Selector */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground font-semibold">{startIndex}</strong> to{' '}
                  <strong className="text-foreground font-semibold">{endIndex}</strong> of{' '}
                  <strong className="text-foreground font-semibold">{totalItems}</strong> alerts
                </span>

                <div className="flex items-center gap-1.5 pl-2 border-l border-border/50">
                  <span>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="h-7 text-xs rounded-md border border-input bg-background px-2 py-0 font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                  </select>
                </div>
              </div>

              {/* Right Page Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage <= 1}
                  title="First Page"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {/* Page Number Pills */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show current page, edges, and neighbors
                      if (totalPages <= 5) return true
                      if (p === 1 || p === totalPages) return true
                      return Math.abs(p - safeCurrentPage) <= 1
                    })
                    .map((pageNum, idx, arr) => {
                      const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1
                      return (
                        <div key={pageNum} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-1 text-xs text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={safeCurrentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                              'size-8 text-xs p-0 font-medium',
                              safeCurrentPage === pageNum && 'font-bold'
                            )}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        </div>
                      )
                    })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  title="Next Page"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage >= totalPages}
                  title="Last Page"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Vendor Mark Restock Delivered */}
      <Dialog
        open={Boolean(deliveryModalNotif)}
        onOpenChange={(open) => !open && setDeliveryModalNotif(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="size-5 text-teal-600" />
              Confirm Restock Delivery
            </DialogTitle>
            <DialogDescription>
              Confirm delivery details for{' '}
              <strong className="text-foreground">
                {deliveryModalNotif?.rawMaterial?.name ||
                  deliveryModalNotif?.metadata?.materialName}
              </strong>
              . Once submitted, the Inventory Manager will verify and confirm stock replenishment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold text-foreground">
                  {deliveryModalNotif?.rawMaterial?.location ||
                    deliveryModalNotif?.metadata?.location ||
                    'Main Warehouse'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Stock in Warehouse:</span>
                <span className="font-semibold text-foreground">
                  {deliveryModalNotif?.rawMaterial?.quantity ??
                    deliveryModalNotif?.metadata?.currentQuantity ??
                    0}{' '}
                  {deliveryModalNotif?.rawMaterial?.weightUnit || 'kg'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Threshold:</span>
                <span className="font-semibold text-amber-600">
                  {deliveryModalNotif?.rawMaterial?.minThreshold ??
                    deliveryModalNotif?.metadata?.minThreshold ??
                    10}{' '}
                  {deliveryModalNotif?.rawMaterial?.weightUnit || 'kg'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="del-qty" className="text-xs font-semibold">
                Delivered / Replenished Quantity ({deliveryModalNotif?.rawMaterial?.weightUnit || 'kg'})
              </Label>
              <Input
                id="del-qty"
                type="number"
                min="1"
                step="any"
                value={deliveryQty}
                onChange={(e) => setDeliveryQty(e.target.value)}
                placeholder="e.g. 20"
                className="h-10 text-sm font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Upon manager confirmation, this quantity will be automatically added to the warehouse inventory.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="del-notes" className="text-xs font-semibold">
                Delivery Notes (Optional)
              </Label>
              <Input
                id="del-notes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Delivered Batch #441 via delivery truck"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeliveryModalNotif(null)}
              disabled={submittingDelivery}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitDelivery}
              disabled={submittingDelivery}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {submittingDelivery ? 'Submitting...' : 'Mark Restock Delivered'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
