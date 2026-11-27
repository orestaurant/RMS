'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Package,
  AlertTriangle,
  Boxes,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'

function getAlertPresentation(status: string) {
  if (status === 'RESTOCK_COMPLETED') {
    return {
      label: 'Auto-Restocked',
      borderClass: 'border-l-4 border-l-emerald-500',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      Icon: CheckCircle2,
    }
  }
  if (
    status === 'RESTOCK_IN_PROGRESS' ||
    status === 'RESTOCK_INITIATED' ||
    status === 'RESTOCK_IN_TRANSIT'
  ) {
    return {
      label: 'Vendor Restocking',
      borderClass: 'bg-sky-500/[0.02] border-l-4 border-l-sky-500',
      badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
      Icon: Send,
    }
  }
  return {
    label: 'Low Stock — Vendor Informed',
    borderClass: 'border-l-4 border-l-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    Icon: AlertTriangle,
  }
}

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

  const loadData = useCallback(async () => {
    try {
      const [matRes, notifRes] = await Promise.all([
        fetch('/api/inventory/raw-materials', { cache: 'no-store' }).catch(() => null),
        fetch('/api/dashboard-notifications?role=INVENTORY_MANAGER&limit=50', {
          cache: 'no-store',
        }).catch(() => null),
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
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadData()
      }
    }, 20000)
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData()
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [loadData])

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
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Package className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory Management Center</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Welcome back, <strong className="text-foreground">{auth?.name || 'Inventory Manager'}</strong>. Real-time raw material tracking and automated vendor alerts.
            </p>
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
            Manage Raw Materials & QR
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

      {/* Automatic Low Stock & Vendor Notification Feed */}
      <Card className="border border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <CardTitle className="text-base font-bold">
            Automated Low-Stock & Vendor Notifications
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Automatically alerts you and the assigned vendor when stock drops below threshold, and updates stock automatically when replenished.
          </CardDescription>
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
                const presentation = getAlertPresentation(notif.status)
                const StatusIcon = presentation.Icon
                const unit = notif.rawMaterial?.weightUnit || notif.metadata?.weightUnit || 'kg'

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 sm:p-5 flex flex-col gap-2.5 transition-colors hover:bg-muted/10',
                      presentation.borderClass
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-sm text-foreground">{notif.title}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-[11px] font-semibold gap-1', presentation.badgeClass)}
                      >
                        <StatusIcon className="size-3" />
                        {presentation.label}
                      </Badge>
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
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Supplied: +{notif.metadata.deliveredQuantity} {unit}
                        </span>
                      )}
                      {notif.metadata?.completedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Auto-updated at{' '}
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
    </div>
  )
}
