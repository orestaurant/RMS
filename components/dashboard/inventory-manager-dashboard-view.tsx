'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Package,
  AlertTriangle,
  Boxes,
  Truck,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  QrCode,
  MapPin,
  Scale,
  PackageCheck,
  Timer,
  Check,
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

export function InventoryManagerDashboardView() {
  const { auth } = useAuthContext()
  const [stats, setStats] = useState({
    total: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  })
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(5)

  // Manager confirmation modal state
  const [confirmModalNotif, setConfirmModalNotif] = useState<any | null>(null)
  const [confirmQty, setConfirmQty] = useState<string>('20')
  const [confirming, setConfirming] = useState(false)

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  const loadData = useCallback(async () => {
    try {
      const [matRes, notifRes] = await Promise.all([
        fetch('/api/inventory/raw-materials').catch(() => null),
        fetch('/api/dashboard-notifications?role=INVENTORY_MANAGER&limit=50').catch(() => null),
      ])

      if (matRes && matRes.ok) {
        const matJson = await matRes.json()
        if (matJson.success && matJson.stats) {
          setStats(matJson.stats)
        }
      }

      if (notifRes && notifRes.ok) {
        const notifJson = await notifRes.json()
        if (notifJson.success && notifJson.data?.notifications) {
          setNotifications(notifJson.data.notifications)
        }
      }
    } catch (e) {
      console.warn(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 20000)
    return () => clearInterval(interval)
  }, [loadData])

  const openConfirmModal = (notif: any) => {
    const qty =
      notif.metadata?.deliveredQuantity ||
      Math.max(
        10,
        Math.ceil((notif.rawMaterial?.minThreshold || 10) * 2 - (notif.rawMaterial?.quantity || 0))
      )
    setConfirmModalNotif(notif)
    setConfirmQty(String(qty))
  }

  // Inventory Manager confirms delivery -> RESTOCK_COMPLETED and updates inventory stock in DB!
  const handleConfirmDelivery = async () => {
    if (!confirmModalNotif) return
    const qty = Number(confirmQty)
    if (isNaN(qty) || qty <= 0) {
      showFeedback('error', 'Please enter a valid stock quantity to add')
      return
    }

    try {
      setConfirming(true)
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_delivery',
          id: confirmModalNotif.id,
          restockQuantity: qty,
          vendorNotes: `Delivery verified and stock confirmed by ${auth?.name || 'Inventory Manager'}.`,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          json.message || `Delivery confirmed! Stock updated to ${json.data?.newStock || 'new count'}.`
        )
        setConfirmModalNotif(null)
        loadData()
      } else {
        showFeedback('error', json.message || 'Failed to confirm restock delivery')
      }
    } catch {
      showFeedback('error', 'Error confirming restock delivery')
    } finally {
      setConfirming(false)
    }
  }

  // Pagination math
  const totalItems = notifications.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedNotifications = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage
    return notifications.slice(start, start + itemsPerPage)
  }, [notifications, safeCurrentPage, itemsPerPage])

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
            {feedback.type === 'info' && <Clock className="size-4 shrink-0" />}
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

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inventory Management Center</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Welcome back, <strong className="text-foreground">{auth?.name || 'Inventory Manager'}</strong>. Real-time ingredient tracking and automated vendor replenishment.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              loadData()
            }}
            disabled={refreshing}
            className="gap-1.5 h-9 text-xs"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            render={<Link href="/inventory-manager/inventory" />}
            size="sm"
            className="h-9 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs"
          >
            <Boxes className="size-4" />
            Open Raw Materials
            <ArrowRight className="size-3.5 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Raw Materials
            </CardTitle>
            <Boxes className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Tracked warehouse ingredients</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border shadow-xs transition-colors',
            stats.lowStockCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/70'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Below minimum threshold</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border shadow-xs transition-colors',
            stats.outOfStockCount > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-border/70'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Out of Stock (Critical)
            </CardTitle>
            <AlertTriangle className="size-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{stats.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Immediate restock needed</p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Healthy Stock
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.inStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Above reorder threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Restock & Vendor Lifecycle Activity Feed */}
      <Card className="border border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">
              Automated Vendor Alerts & Restock Status
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Real-time lifecycle tracking of restock requests, in-transit shipments, and stock confirmations.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/inventory-manager/inventory" />}
              className="text-xs gap-1 h-8"
            >
              Manage Inventory
              <ArrowRight className="size-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="h-16 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-16 rounded-xl bg-muted/60 shimmer w-full" />
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500/80 mb-2" />
              <p className="font-semibold text-sm">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                All raw material levels are currently optimal.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {paginatedNotifications.map((notif: any) => {
                const isCompleted = notif.status === 'RESTOCK_COMPLETED'
                const isDelivered = notif.status === 'RESTOCK_DELIVERED'
                const isInTransit = notif.status === 'RESTOCK_IN_TRANSIT'
                const isInProgress =
                  notif.status === 'RESTOCK_IN_PROGRESS' || notif.status === 'RESTOCK_INITIATED'
                const isPending = notif.status === 'PENDING'

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 sm:p-5 flex flex-col gap-3 transition-colors hover:bg-muted/10',
                      isDelivered && 'bg-teal-500/[0.04] border-l-4 border-l-teal-500',
                      isInTransit && 'bg-purple-500/[0.02] border-l-4 border-l-purple-500',
                      isInProgress && 'bg-sky-500/[0.02] border-l-4 border-l-sky-500',
                      isCompleted && 'border-l-4 border-l-emerald-500',
                      isPending && 'border-l-4 border-l-amber-500'
                    )}
                  >
                    {/* Top Row: Title, Badges, and Action Area */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{notif.title}</span>

                        {/* STATUS BADGES */}
                        {isCompleted && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1"
                          >
                            <CheckCircle2 className="size-3" />
                            Restock Completed
                          </Badge>
                        )}
                        {isDelivered && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 font-semibold gap-1 animate-pulse"
                          >
                            <PackageCheck className="size-3" />
                            Restock Delivered
                          </Badge>
                        )}
                        {isInTransit && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-semibold gap-1"
                          >
                            <Truck className="size-3" />
                            Restock In Transit
                          </Badge>
                        )}
                        {isInProgress && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 font-semibold gap-1"
                          >
                            <Timer className="size-3" />
                            Request In Progress
                          </Badge>
                        )}
                        {isPending && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold gap-1"
                          >
                            <AlertTriangle className="size-3" />
                            Awaiting Vendor
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {/* ACTION: Confirm Delivery when vendor marks Restock Delivered */}
                        {isDelivered && (
                          <Button
                            size="sm"
                            onClick={() => openConfirmModal(notif)}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
                          >
                            <Check className="size-3.5" />
                            Confirm Delivery & Restock
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href="/inventory-manager/inventory" />}
                          className="text-xs h-8 text-primary"
                        >
                          View Material
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{notif.message}</p>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {notif.metadata?.vendorName && (
                        <span>
                          Assigned Vendor: <strong>{notif.metadata.vendorName}</strong>
                        </span>
                      )}
                      {notif.metadata?.deliveredQuantity && (
                        <span className="text-teal-600 dark:text-teal-400 font-semibold">
                          Supplied: +{notif.metadata.deliveredQuantity}
                        </span>
                      )}
                      {notif.metadata?.completedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Confirmed at{' '}
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

          {/* PAGINATION FOOTER */}
          {totalItems > 0 && (
            <div className="p-4 border-t border-border/60 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3">
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

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
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

      {/* CONFIRM DELIVERY & UPDATE STOCK DIALOG FOR INVENTORY MANAGER */}
      <Dialog
        open={Boolean(confirmModalNotif)}
        onOpenChange={(open) => !open && setConfirmModalNotif(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Confirm Delivery & Update Inventory
            </DialogTitle>
            <DialogDescription>
              Verify received supplies for{' '}
              <strong className="text-foreground">
                {confirmModalNotif?.rawMaterial?.name ||
                  confirmModalNotif?.metadata?.materialName}
              </strong>
              . Once confirmed, the inventory stock will be automatically updated in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold text-foreground">
                  {confirmModalNotif?.rawMaterial?.location ||
                    confirmModalNotif?.metadata?.location ||
                    'Main Warehouse'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Stock in Warehouse:</span>
                <span className="font-semibold text-foreground">
                  {confirmModalNotif?.rawMaterial?.quantity ??
                    confirmModalNotif?.metadata?.currentQuantity ??
                    0}{' '}
                  {confirmModalNotif?.rawMaterial?.weightUnit || 'kg'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor Note:</span>
                <span className="text-muted-foreground italic">
                  {confirmModalNotif?.metadata?.vendorNotes || 'Goods delivered at dock.'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conf-qty" className="text-xs font-semibold">
                Verified Received Quantity ({confirmModalNotif?.rawMaterial?.weightUnit || 'kg'})
              </Label>
              <Input
                id="conf-qty"
                type="number"
                min="1"
                step="any"
                value={confirmQty}
                onChange={(e) => setConfirmQty(e.target.value)}
                placeholder="e.g. 20"
                className="h-10 text-sm font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                New inventory stock level will become:{' '}
                <strong className="text-emerald-600">
                  {(confirmModalNotif?.rawMaterial?.quantity ??
                    confirmModalNotif?.metadata?.currentQuantity ??
                    0) + (Number(confirmQty) || 0)}{' '}
                  {confirmModalNotif?.rawMaterial?.weightUnit || 'kg'}
                </strong>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModalNotif(null)}
              disabled={confirming}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelivery}
              disabled={confirming}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {confirming ? 'Updating Stock...' : 'Confirm Delivery & Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
