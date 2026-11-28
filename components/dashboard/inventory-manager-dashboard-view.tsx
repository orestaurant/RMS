'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Package,
  AlertTriangle,
  Boxes,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Truck,
  Search,
  MapPin,
  Scale,
  UserCheck,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'
import {
  STAGE_CONFIG,
  STAGE_KEYS,
  type FilterMode,
  type StageKey,
  type VendorNotification,
  getStageKey,
  formatShortTime,
  formatShortDate,
  matchesRestockSearch,
} from '@/components/dashboard/vendor-dashboard-view'

const MANAGER_STAGE_LABELS: Record<StageKey, string> = {
  pending: 'Restock Requested',
  in_progress: 'Vendor Accepted',
  in_transit: 'In Transit',
  delivered: 'Delivered · Confirm',
  completed: 'Auto-Restocked',
}

function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemLabel,
  onPageChange,
  onItemsPerPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  itemLabel: string
  onPageChange: (page: number) => void
  onItemsPerPageChange: (size: number) => void
}) {
  if (totalItems <= 0) return null
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const startIndex = (safePage - 1) * itemsPerPage + 1
  const endIndex = Math.min(safePage * itemsPerPage, totalItems)

  return (
    <div className="p-4 border-t border-border/60 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Showing <strong className="text-foreground font-semibold">{startIndex}</strong> to{' '}
          <strong className="text-foreground font-semibold">{endIndex}</strong> of{' '}
          <strong className="text-foreground font-semibold">{totalItems}</strong> {itemLabel}
        </span>

        <div className="flex items-center gap-1.5 pl-2 border-l border-border/50">
          <span>Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            aria-label="Items per page"
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
          className="size-8 cursor-pointer"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          title="First Page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 cursor-pointer"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          title="Previous Page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (totalPages <= 5) return true
              if (p === 1 || p === totalPages) return true
              return Math.abs(p - safePage) <= 1
            })
            .map((pageNum, idx, arr) => {
              const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1
              return (
                <div key={pageNum} className="flex items-center gap-1">
                  {showEllipsisBefore && (
                    <span className="px-1 text-xs text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={safePage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'size-8 text-xs p-0 font-medium cursor-pointer',
                      safePage === pageNum && 'font-bold'
                    )}
                    onClick={() => onPageChange(pageNum)}
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
          className="size-8 cursor-pointer"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          title="Next Page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 cursor-pointer"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          title="Last Page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function InventoryManagerDashboardView({
  mode = 'dashboard',
}: {
  mode?: 'dashboard' | 'vendor-requests'
}) {
  const isRequestsMode = mode === 'vendor-requests'
  const { auth } = useAuthContext()
  const [stats, setStats] = useState({
    total: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  })
  const [notifications, setNotifications] = useState<VendorNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(isRequestsMode ? 10 : 5)
  const [serverPagination, setServerPagination] = useState({
    totalCount: 0,
    totalPages: 1,
  })
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const statsAbortRef = useRef<AbortController | null>(null)
  const notifAbortRef = useRef<AbortController | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4500)
  }, [])

  // Fetch raw material KPI stats independently (only used in dashboard mode)
  const loadStats = useCallback(async () => {
    if (isRequestsMode) return
    statsAbortRef.current?.abort()
    const controller = new AbortController()
    statsAbortRef.current = controller

    try {
      const matRes = await fetch('/api/inventory/raw-materials', {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (matRes.ok) {
        const matJson = await matRes.json()
        if (matJson.success && matJson.stats) {
          setStats(matJson.stats)
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn(err)
      }
    }
  }, [isRequestsMode])

  // Fetch notifications (server-side paginated in dashboard mode for ultra-fast loads)
  const loadNotifications = useCallback(
    async (opts?: { showPageSpinner?: boolean }) => {
      notifAbortRef.current?.abort()
      const controller = new AbortController()
      notifAbortRef.current = controller

      if (opts?.showPageSpinner) {
        setPageLoading(true)
      }

      try {
        const url = isRequestsMode
          ? '/api/dashboard-notifications?role=INVENTORY_MANAGER&limit=100'
          : `/api/dashboard-notifications?role=INVENTORY_MANAGER&page=${currentPage}&limit=${itemsPerPage}`

        const notifRes = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (notifRes.ok) {
          const notifJson = await notifRes.json()
          if (notifJson.success && notifJson.data) {
            setNotifications(notifJson.data.notifications || [])
            if (notifJson.data.pagination) {
              setServerPagination({
                totalCount: notifJson.data.pagination.totalCount ?? 0,
                totalPages: notifJson.data.pagination.totalPages ?? 1,
              })
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn(err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setPageLoading(false)
          setRefreshing(false)
        }
      }
    },
    [isRequestsMode, currentPage, itemsPerPage]
  )

  // Initial load + visibility/focus-aware 10s sync
  useEffect(() => {
    loadStats()
    loadNotifications()

    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadStats()
        loadNotifications()
      }
    }, 10000)

    const onFocusOrVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadStats()
        loadNotifications()
      }
    }

    document.addEventListener('visibilitychange', onFocusOrVisible)
    window.addEventListener('focus', onFocusOrVisible)

    return () => {
      clearInterval(interval)
      statsAbortRef.current?.abort()
      notifAbortRef.current?.abort()
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      document.removeEventListener('visibilitychange', onFocusOrVisible)
      window.removeEventListener('focus', onFocusOrVisible)
    }
  }, [loadStats, loadNotifications])

  const handleConfirmSupply = useCallback(
    async (req: VendorNotification) => {
      try {
        setConfirmingId(req.id)
        const res = await fetch('/api/dashboard-notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm_delivery', id: req.id }),
        })
        const json = await res.json()
        if (json.success) {
          showFeedback('success', json.message || 'Supply confirmed and stock updated.')
          loadNotifications()
        } else {
          showFeedback('error', json.message || 'Failed to confirm supply')
        }
      } catch {
        showFeedback('error', 'Failed to confirm supply')
      } finally {
        setConfirmingId(null)
      }
    },
    [loadNotifications, showFeedback]
  )

  const canDeleteRequest =
    !auth?.role ||
    ['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'].includes(
      String(auth.role).toUpperCase().trim()
    )

  const handleDeleteRequest = useCallback(
    async (req: VendorNotification) => {
      if (!canDeleteRequest) return
      const label = req.rawMaterial?.name || req.metadata?.materialName || 'this request'
      if (!confirm(`Delete vendor request for "${label}"?`)) return

      const prevNotifications = notifications
      const prevPagination = serverPagination

      setDeletingId(req.id)
      setNotifications((prev) => prev.filter((item) => item.id !== req.id))
      if (!isRequestsMode) {
        const nextTotal = Math.max(0, serverPagination.totalCount - 1)
        const nextPages = Math.max(1, Math.ceil(nextTotal / itemsPerPage))
        setServerPagination({ totalCount: nextTotal, totalPages: nextPages })
        if (currentPage > nextPages) {
          setCurrentPage(nextPages)
        }
      }

      try {
        const res = await fetch(
          `/api/dashboard-notifications?id=${encodeURIComponent(req.id)}`,
          { method: 'DELETE' }
        )
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Failed to delete request')
        }
        showFeedback('success', `Deleted request for "${label}".`)
      } catch (err: any) {
        setNotifications(prevNotifications)
        setServerPagination(prevPagination)
        showFeedback('error', err?.message || 'Failed to delete request')
      } finally {
        setDeletingId(null)
      }
    },
    [
      canDeleteRequest,
      currentPage,
      isRequestsMode,
      itemsPerPage,
      notifications,
      serverPagination,
      showFeedback,
    ]
  )

  const { stageCounts, filteredRequests } = useMemo(() => {
    const counts: Record<StageKey, number> = {
      pending: 0,
      in_progress: 0,
      in_transit: 0,
      delivered: 0,
      completed: 0,
    }
    const filtered: VendorNotification[] = []

    for (const req of notifications) {
      const stage = getStageKey(req.status)
      counts[stage]++
      if (!isRequestsMode) continue
      if (filterMode !== 'all' && stage !== filterMode) continue
      if (!matchesRestockSearch(req, searchQuery)) continue
      filtered.push(req)
    }

    return { stageCounts: counts, filteredRequests: filtered }
  }, [notifications, isRequestsMode, filterMode, searchQuery])

  const handleFilterChange = (nextMode: FilterMode) => {
    setFilterMode(nextMode)
    setCurrentPage(1)
  }

  const totalItems = filteredRequests.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedRequests = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage
    return filteredRequests.slice(start, start + itemsPerPage)
  }, [filteredRequests, safeCurrentPage, itemsPerPage])

  const feedbackBanner = feedback ? (
    <div
      className={cn(
        'flex items-center justify-between p-3.5 rounded-xl border text-sm shadow-sm',
        feedback.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
      )}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={() => setFeedback(null)}
        className="text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
      >
        ✕
      </button>
    </div>
  ) : null

  // VENDOR REQUESTS MODE (/inventory-manager/vendor-requests): No Dashboard Summaries
  if (isRequestsMode) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {feedbackBanner}

        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                    Vendor Requests &amp; Supply Activity
                  </CardTitle>
                  <Badge variant="outline" className="text-[11px] bg-muted/60 font-medium gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync · 10s
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                  Track all low-stock restock requests, vendor responses, transit updates, and supply confirmations.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshing(true)
                  loadNotifications()
                }}
                disabled={refreshing}
                className="gap-1.5 h-8 px-2.5 text-xs self-start sm:self-auto shrink-0 cursor-pointer"
              >
                <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>

            {/* Search Bar + Small Inline Status Filters on the Same Row */}
            <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between pt-2 border-t border-border/40">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by vendor, material, place, SKU, or date..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  aria-label="Search vendor requests"
                  className="pl-8 pr-7 h-8 text-xs bg-background/80"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setCurrentPage(1)
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 border border-border/50 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleFilterChange('all')}
                  className={cn(
                    'h-7 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer',
                    filterMode === 'all'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  All ({notifications.length})
                </button>
                {STAGE_KEYS.map((stageKey) => {
                  const cfg = STAGE_CONFIG[stageKey]
                  return (
                    <button
                      key={stageKey}
                      type="button"
                      onClick={() => handleFilterChange(stageKey)}
                      className={cn(
                        'h-7 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer',
                        filterMode === stageKey
                          ? cn('bg-background shadow-xs', cfg.accentText)
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {cfg.tabLabel} ({stageCounts[stageKey]})
                    </button>
                  )
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
                <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
                <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
              </div>
            ) : paginatedRequests.length === 0 ? (
              <div className="text-center py-14 px-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full size-12 mx-auto flex items-center justify-center mb-3">
                  <Truck className="size-6" />
                </div>
                <h3 className="font-semibold text-base">No matching vendor requests</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery || filterMode !== 'all'
                    ? 'Try clearing your search or selecting a different status filter.'
                    : 'Vendor restock requests and supply confirmations will appear here automatically.'}
                </p>
                {(searchQuery || filterMode !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      handleFilterChange('all')
                    }}
                    className="mt-4 text-xs h-8 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {paginatedRequests.map((req) => {
                  const stage = getStageKey(req.status)
                  const cfg = STAGE_CONFIG[stage]
                  const StageIcon = cfg.Icon

                  const materialName =
                    req.rawMaterial?.name || req.metadata?.materialName || 'Raw Material'
                  const sku = req.rawMaterial?.sku || req.metadata?.sku || 'RM-SKU'
                  const location =
                    req.rawMaterial?.location || req.metadata?.location || 'Main Warehouse'
                  const weightUnit =
                    req.rawMaterial?.weightUnit || req.metadata?.weightUnit || 'kg'
                  const currentQty =
                    req.rawMaterial?.quantity ?? req.metadata?.currentQuantity ?? 0
                  const minThreshold =
                    req.rawMaterial?.minThreshold ?? req.metadata?.minThreshold ?? 10
                  const vendorName =
                    req.rawMaterial?.vendor?.name || req.metadata?.vendorName || 'Unassigned'
                  const plannedQty = req.metadata?.plannedQuantity
                  const deliveredQty = req.metadata?.deliveredQuantity
                  const newStock = req.metadata?.newStock
                  const responseNotes = req.metadata?.vendorNotes || req.metadata?.transitNotes

                  return (
                    <div
                      key={req.id}
                      className={cn(
                        'p-4 sm:p-5 flex flex-col gap-3 transition-colors hover:bg-muted/10',
                        cfg.borderLeft
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                            {materialName}
                          </span>
                          <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5">
                            {sku}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-[11px] font-semibold gap-1 px-2', cfg.badgeClass)}
                          >
                            <StageIcon className="size-3" />
                            {MANAGER_STAGE_LABELS[stage]}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                          {stage === 'delivered' && (
                            <Button
                              size="sm"
                              onClick={() => handleConfirmSupply(req)}
                              disabled={confirmingId === req.id || deletingId === req.id}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 cursor-pointer"
                            >
                              <PackageCheck className="size-3.5" />
                              {confirmingId === req.id ? 'Confirming...' : 'Confirm Supply'}
                            </Button>
                          )}
                          {canDeleteRequest && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRequest(req)}
                              disabled={deletingId === req.id}
                              title="Delete request"
                              aria-label={`Delete request for ${materialName}`}
                              className="size-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{req.message}</p>
                      {responseNotes && stage !== 'pending' && (
                        <p className="text-[11px] text-foreground/85 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
                          <span className="font-semibold text-muted-foreground">
                            Vendor Response:{' '}
                          </span>
                          {responseNotes}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-muted/30 p-3 rounded-xl border border-border/50 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                            <UserCheck className="size-3.5 text-orange-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              Vendor
                            </div>
                            <div className="font-semibold text-foreground truncate" title={vendorName}>
                              {vendorName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                            <Scale className="size-3.5 text-primary" />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              Current / Min
                            </div>
                            <div className="font-bold text-foreground">
                              <span
                                className={cn(
                                  currentQty <= minThreshold ? 'text-amber-500' : 'text-emerald-500'
                                )}
                              >
                                {currentQty}
                              </span>
                              <span className="text-muted-foreground font-normal">
                                {' '}
                                / {minThreshold} {weightUnit}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                            <Package className="size-3.5 text-emerald-500" />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              {deliveredQty
                                ? 'Supplied Qty'
                                : plannedQty
                                ? 'Committed Qty'
                                : 'Requested'}
                            </div>
                            <div className="font-bold text-foreground">
                              {deliveredQty ? (
                                <span className="text-emerald-500">
                                  +{deliveredQty} {weightUnit}
                                  {newStock !== undefined ? ` → ${newStock}` : ''}
                                </span>
                              ) : plannedQty ? (
                                <span className="text-sky-500">
                                  {plannedQty} {req.metadata?.plannedUnit || weightUnit}
                                </span>
                              ) : (
                                <span className="text-amber-500">Awaiting vendor</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                            <MapPin className="size-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              Location
                            </div>
                            <div className="font-semibold text-foreground truncate" title={location}>
                              {location}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 shrink-0" />
                          {formatShortDate(req.createdAt)} · {formatShortTime(req.createdAt)}
                        </span>
                        {req.metadata?.acknowledgedAt && (
                          <span className="text-sky-500 font-medium">
                            Accepted at {formatShortTime(req.metadata.acknowledgedAt)}
                          </span>
                        )}
                        {req.metadata?.inTransitAt && (
                          <span className="text-purple-500 font-medium">
                            Dispatched at {formatShortTime(req.metadata.inTransitAt)}
                          </span>
                        )}
                        {req.metadata?.deliveredAt && (
                          <span className="text-teal-500 font-medium">
                            Delivered at {formatShortTime(req.metadata.deliveredAt)}
                          </span>
                        )}
                        {req.metadata?.completedAt && (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            Stock updated at {formatShortTime(req.metadata.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <PaginationBar
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              itemLabel="activities"
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size)
                setCurrentPage(1)
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // DASHBOARD MODE (/dashboard): Welcome Banner + KPI Summary Cards + Server-Paginated Activity Feed
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {feedbackBanner}

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
            <Package className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Inventory Management Center</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Welcome back, <strong className="text-foreground">{auth?.name || 'Inventory Manager'}</strong>. Real-time raw material tracking and automated vendor alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 shrink-0 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              loadStats()
              loadNotifications()
            }}
            disabled={refreshing}
            className="gap-1.5 h-9 text-xs cursor-pointer"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            render={<Link href="/inventory-manager/inventory" />}
            size="sm"
            className="h-9 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs whitespace-nowrap"
          >
            <Boxes className="size-4" />
            Manage Raw Materials &amp; QR
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

      {/* Server-Paginated Recent Activity Preview */}
      <Card className="border border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">
              Recent Vendor &amp; Stock Activity
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Latest automated alerts and vendor updates. Open Vendor Requests for full tracking, search, and filters.
            </CardDescription>
          </div>
          <Button
            render={<Link href="/inventory-manager/vendor-requests" />}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 shrink-0 self-start sm:self-auto"
          >
            View All Vendor Requests
            <ArrowRight className="size-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading || pageLoading ? (
            <div className="p-6 space-y-3">
              <div className="h-14 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-14 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-14 rounded-xl bg-muted/60 shimmer w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500/80 mb-2" />
              <p className="font-semibold text-sm">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                All raw material levels are currently optimal.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((notif) => {
                const stage = getStageKey(notif.status)
                const cfg = STAGE_CONFIG[stage]
                const StatusIcon = cfg.Icon
                const unit = notif.rawMaterial?.weightUnit || notif.metadata?.weightUnit || 'kg'
                const vendorName = notif.rawMaterial?.vendor?.name || notif.metadata?.vendorName

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 flex flex-col gap-2 transition-colors hover:bg-muted/10',
                      cfg.borderLeft
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-sm text-foreground">{notif.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn('text-[11px] font-semibold gap-1', cfg.badgeClass)}
                        >
                          <StatusIcon className="size-3" />
                          {MANAGER_STAGE_LABELS[stage]}
                        </Badge>
                        {canDeleteRequest && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRequest(notif)}
                            disabled={deletingId === notif.id}
                            title="Delete activity"
                            aria-label={`Delete ${notif.title}`}
                            className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{notif.message}</p>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatShortTime(notif.createdAt)}
                      </span>
                      {vendorName && (
                        <span>
                          Assigned Vendor: <strong>{vendorName}</strong>
                        </span>
                      )}
                      {notif.metadata?.deliveredQuantity && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Supplied: +{notif.metadata.deliveredQuantity} {unit}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <PaginationBar
            currentPage={currentPage}
            totalPages={serverPagination.totalPages}
            totalItems={serverPagination.totalCount}
            itemsPerPage={itemsPerPage}
            itemLabel="alerts"
            onPageChange={(nextPage) => {
              if (nextPage === currentPage) return
              setPageLoading(true)
              setCurrentPage(nextPage)
            }}
            onItemsPerPageChange={(size) => {
              setPageLoading(true)
              setItemsPerPage(size)
              setCurrentPage(1)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
