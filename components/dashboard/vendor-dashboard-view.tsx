'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
    location?: string
    acknowledgedAt?: string
    vendorNotes?: string
  }
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESTOCK_INITIATED'
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
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'acknowledged'>('all')

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
    } catch (err) {
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

  // Vendor Action: Acknowledge / Initiate Restock
  const handleInitiateRestock = async (notifId: string, materialName: string) => {
    try {
      setActingId(notifId)
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate_restock',
          id: notifId,
          vendorNotes: `Restock acknowledged by ${auth?.name || 'Vendor'}. Supply delivery initiated.`,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          `Restock initiated for "${materialName}"! Inventory Manager alerted of restock initiation.`
        )
        fetchNotifications()
      } else {
        showFeedback('error', json.message || 'Failed to acknowledge restock')
      }
    } catch (err) {
      showFeedback('error', 'Error acknowledging restock request')
    } finally {
      setActingId(null)
    }
  }

  // Filtered Notifications list
  const filteredNotifications = notifications.filter((notif) => {
    if (filterMode === 'pending') {
      return notif.status === 'PENDING'
    }
    if (filterMode === 'acknowledged') {
      return notif.status === 'RESTOCK_INITIATED' || notif.status === 'ACKNOWLEDGED'
    }
    return true
  })

  // KPI Calculations
  const pendingCount = notifications.filter((n) => n.status === 'PENDING').length
  const restockedCount = notifications.filter((n) => n.status === 'RESTOCK_INITIATED').length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between p-3.5 rounded-xl border text-sm shadow-sm transition-all',
            feedback.type === 'success' &&
              'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium',
            feedback.type === 'info' &&
              'bg-primary/10 border-primary/20 text-primary',
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

      {/* Top Banner & Notification Bell */}
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
                <Bell className={cn('size-4 text-foreground', unreadCount > 0 && 'text-orange-500 animate-bounce')} />
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Restock Alerts */}
        <Card
          className={cn(
            'border shadow-xs transition-colors',
            pendingCount > 0
              ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20'
              : 'border-border/70'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Restock Requests
            </CardTitle>
            <div
              className={cn(
                'p-2 rounded-lg',
                pendingCount > 0
                  ? 'bg-amber-500/20 text-amber-600 animate-pulse'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Low-inventory alerts requiring your acknowledgement
            </p>
          </CardContent>
        </Card>

        {/* Initiated / In Progress */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Restocks Initiated
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Truck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{restockedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Supply replenishments dispatched to restaurant
            </p>
          </CardContent>
        </Card>

        {/* Total Alerts Handled */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Recorded Alerts
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Boxes className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime inventory restock notifications received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DEDICATED LIVE ALERT CENTER SECTION */}
      <Card className="border border-border/70 shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">
                  Low Inventory Alerts / Restock Requests
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-muted">
                  Auto-sync: 20s
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Real-time database-backed restock requests dispatched by the Inventory Manager.
              </CardDescription>
            </div>

            {/* Filter Tabs & Mark All Read */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/40">
                <button
                  onClick={() => setFilterMode('all')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                    filterMode === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                  )}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilterMode('pending')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                    filterMode === 'pending' ? 'bg-background text-amber-600 font-semibold shadow-xs' : 'text-muted-foreground'
                  )}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setFilterMode('acknowledged')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                    filterMode === 'acknowledged' ? 'bg-background text-emerald-600 font-semibold shadow-xs' : 'text-muted-foreground'
                  )}
                >
                  Initiated ({restockedCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="size-3.5" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="h-16 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-16 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-16 rounded-xl bg-muted/60 shimmer w-full" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full size-12 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="font-semibold text-base">No active restock requests</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {filterMode === 'pending'
                  ? 'All low-stock items have been acknowledged. Great job!'
                  : 'All raw materials assigned to your vendor account are currently sufficiently stocked.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredNotifications.map((notif) => {
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
                const isActing = actingId === notif.id

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4',
                      !notif.isRead && 'bg-orange-500/[0.03] dark:bg-orange-950/[0.15]',
                      isPending && 'border-l-4 border-l-amber-500'
                    )}
                  >
                    {/* Left: Material Name, SKU & Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground tracking-tight">
                          {materialName}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {sku}
                        </Badge>
                        {isPending ? (
                          <Badge
                            variant="destructive"
                            className="text-[11px] bg-amber-600 hover:bg-amber-600 gap-1 px-2"
                          >
                            <AlertTriangle className="size-3" />
                            Restock Required
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 px-2"
                          >
                            <CheckCircle2 className="size-3" />
                            Restock Dispatched
                          </Badge>
                        )}
                        {!notif.isRead && (
                          <Badge className="text-[10px] bg-orange-500 text-white px-1.5 py-0">
                            Unread
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">{notif.message}</p>

                      {/* Specification & Location Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Scale className="size-3.5 text-primary shrink-0" />
                          <span>
                            Current Stock:{' '}
                            <strong className="text-foreground text-rose-600">{currentQty}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />
                          <span>
                            Min Threshold: <strong className="text-foreground">{minThreshold}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Package className="size-3.5 text-primary shrink-0" />
                          <span>
                            Spec: <strong className="text-foreground">{weight}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="size-3.5 text-primary shrink-0" />
                          <span className="truncate" title={location}>
                            Location: <strong className="text-foreground">{location}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Timestamp & Notes */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Alert received: {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' '}({new Date(notif.createdAt).toLocaleDateString()})
                        </span>
                        {notif.metadata?.acknowledgedAt && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Restock acknowledged at{' '}
                            {new Date(notif.metadata.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Vendor Actionability */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notif.id)}
                          disabled={isActing}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Mark as Read
                        </Button>
                      )}

                      {isPending ? (
                        <Button
                          size="sm"
                          onClick={() => handleInitiateRestock(notif.id, materialName)}
                          disabled={isActing}
                          className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                        >
                          <Send className="size-3.5" />
                          {isActing ? 'Updating...' : 'Acknowledge / Initiate Restock'}
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 font-medium"
                        >
                          Restock In Progress
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
