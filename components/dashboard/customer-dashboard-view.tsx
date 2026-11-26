'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  ShoppingBag,
  Clock,
  UtensilsCrossed,
  Receipt,
  ArrowRight,
  Sparkles,
  Flame,
  TableProperties,
  RefreshCw,
  Car,
  Plus,
  Star,
  Music,
  Headphones,
  Disc3,
  IndianRupee,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'
import { LiveBatchAddonBanner } from '@/components/orders/LiveBatchAddonBanner'
import { SongRequestModal } from '@/components/customer/song-request-modal'
import { CustomerBillModal } from '@/components/billing/customer-bill-modal'

interface CustomerProfile {
  id: string
  name: string
  email: string
  mobile?: string
  totalOrders: number
  totalSpent: number
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

interface CustomerOrder {
  id: string
  orderNumber: string
  status: string
  paymentStatus?: string
  isBilled?: boolean
  billId?: string | null
  billNumber?: string | null
  billStatus?: string | null
  billPaymentStatus?: string | null
  tableNumber?: string | null
  total: number
  totalAmount: number
  createdAt: string
  items: OrderItem[]
  customerId?: string
  customerEmail?: string
}

const statusBadgeStyles: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  PENDING: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/15 text-primary border-primary/30' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-primary/15 text-primary border-primary/30' },
  preparing: { label: 'In Kitchen (Chef Cooking)', className: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  PREPARING: { label: 'In Kitchen (Chef Cooking)', className: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  ready: { label: 'Ready for Pickup / Table', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  READY: { label: 'Ready for Pickup / Table', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  served: { label: 'Served', className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' },
  SERVED: { label: 'Served', className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' },
  completed: { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface OrderSummary {
  totalOrders: number
  activeOrdersCount: number
  completedOrdersCount: number
  totalSpent: number
}

export function CustomerDashboardView() {
  const { auth } = useAuthContext()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [showSongModal, setShowSongModal] = useState(false)
  const [showBillModal, setShowBillModal] = useState(false)
  const [selectedOrderIdForBill, setSelectedOrderIdForBill] = useState<string | null>(null)
  const [selectedTableForBill, setSelectedTableForBill] = useState<string>('Table 1')
  const profileRef = useRef<CustomerProfile | null>(null)

  // Server-side pagination state for Live Orders Tracker
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(3)
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 3,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [summary, setSummary] = useState<OrderSummary | null>(null)

  const customerName = auth?.name || profile?.name || 'Customer'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const fetchCustomerData = useCallback(
    async (isPageChange = false, silent = false) => {
      try {
        if (!silent) {
          if (isPageChange) {
            setPageLoading(true)
          } else {
            setLoading(true)
          }
        }
        const currentCustId = auth?.id || profileRef.current?.id
        const queryParams = new URLSearchParams()
        if (currentCustId) {
          queryParams.set('customerId', currentCustId)
          queryParams.set('userId', currentCustId)
        }
        if (auth?.email) {
          queryParams.set('email', auth.email)
        }
        queryParams.set('scope', 'active')
        queryParams.set('page', String(currentPage))
        queryParams.set('limit', String(pageSize))
        queryParams.set('includeSummary', 'true')

        const ordersUrl = `/api/customer/orders?${queryParams.toString()}`
        const skipMeFetch = isPageChange || (silent && Boolean(profileRef.current))

        const [meRes, ordersRes] = await Promise.all([
          skipMeFetch ? Promise.resolve(null) : fetch('/api/customer/auth/me', { cache: 'no-store' }),
          fetch(ordersUrl, { cache: 'no-store' }),
        ])

        let loadedProfile: CustomerProfile | null = profileRef.current
        if (meRes && meRes.ok) {
          const meJson = await meRes.json()
          if (meJson.success && meJson.customer) {
            loadedProfile = meJson.customer
            profileRef.current = meJson.customer
            setProfile(meJson.customer)
          }
        }

        if (ordersRes.ok) {
          const ordersJson = await ordersRes.json()
          if (ordersJson.success && Array.isArray(ordersJson.orders)) {
            const targetCustomerId = loadedProfile?.id || auth?.id
            const targetEmail = (loadedProfile?.email || auth?.email || '').toLowerCase().trim()

            // Strict Account-Based Order Filtering:
            // Strictly exclude any walk-in, anonymous, table-only, or other customers' orders
            const strictlyCustomerOrders = ordersJson.orders.filter((order: CustomerOrder) => {
              if (!order) return false

              const orderCustId = order.customerId
              const orderCustEmail = (order.customerEmail || '').toLowerCase().trim()

              // Exclude orders with no customer association (walk-in, anonymous, table-only)
              if (!orderCustId && !orderCustEmail) {
                return false
              }

              // Exclude if customerId does not match current authenticated customer account
              if (targetCustomerId && orderCustId && orderCustId !== targetCustomerId) {
                return false
              }

              // Exclude if customerEmail does not match current authenticated customer account
              if (targetEmail && orderCustEmail && orderCustEmail !== targetEmail) {
                return false
              }

              return true
            })

            setOrders(strictlyCustomerOrders)
            if (ordersJson.pagination) {
              setPagination(ordersJson.pagination)
              if (currentPage > ordersJson.pagination.totalPages && ordersJson.pagination.totalPages >= 1) {
                setCurrentPage(ordersJson.pagination.totalPages)
              }
            }
            if (ordersJson.summary) {
              setSummary(ordersJson.summary)
            }
          } else if (!silent) {
            setOrders([])
          }
        } else if (!silent) {
          setOrders([])
        }
      } catch (err) {
        console.error('Failed to load customer dashboard details:', err)
        if (!silent) {
          setOrders([])
        }
      } finally {
        if (!silent) {
          setLoading(false)
          setPageLoading(false)
        }
      }
    },
    [auth?.id, auth?.email, currentPage, pageSize]
  )

  useEffect(() => {
    fetchCustomerData(currentPage > 1 || summary !== null, false)
  }, [fetchCustomerData])

  // Silent background refresh when returning to tab so served/paid transitions reflect promptly
  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchCustomerData(false, true)
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }
  }, [fetchCustomerData])

  // Active orders stay visible (including when served) until bill payment is completed
  const activeOrders = useMemo(
    () =>
      orders.filter((o) => {
        const st = String(o.status || '').toLowerCase()
        const paySt = String(o.paymentStatus || '').toLowerCase()
        const billSt = String(o.billStatus || '').toLowerCase()
        const billPaySt = String(o.billPaymentStatus || '').toLowerCase()
        if (['cancelled', 'refunded', 'completed'].includes(st)) return false
        if (['completed', 'paid', 'settled', 'refunded', 'cancelled'].includes(paySt)) return false
        if (billSt === 'paid' || billPaySt === 'completed') return false
        return true
      }),
    [orders]
  )

  const activeTableNumber = useMemo(
    () => activeOrders.find((o) => o.tableNumber)?.tableNumber || 'Table 1',
    [activeOrders]
  )

  const openBillModalForOrder = useCallback(
    (order?: CustomerOrder) => {
      if (order) {
        setSelectedOrderIdForBill(order.id)
        setSelectedTableForBill(order.tableNumber || activeTableNumber)
      } else {
        const firstOrder = activeOrders[0]
        const shouldUseSingleOrder = activeOrders.length === 1 || !firstOrder?.tableNumber
        setSelectedOrderIdForBill(shouldUseSingleOrder && firstOrder ? firstOrder.id : null)
        setSelectedTableForBill(activeTableNumber)
      }
      setShowBillModal(true)
    },
    [activeOrders, activeTableNumber]
  )
  // Lifetime KPI totals from server summary (fallback to local calculation if summary absent)
  const totalOrdersCount = summary ? summary.totalOrders : orders.length
  const completedOrdersCount = summary
    ? summary.completedOrdersCount
    : orders.filter((o) => ['served', 'completed'].includes(String(o.status).toLowerCase())).length
  const activeOrdersTotalCount = summary ? summary.activeOrdersCount : pagination.total || activeOrders.length
  const totalSpentAmount = summary
    ? summary.totalSpent
    : orders
        .filter((o) => ['completed', 'paid', 'settled'].includes(String(o.paymentStatus || '').toLowerCase()))
        .reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* ── Welcome Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {customerName}
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs">
              Verified Guest
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome to your dining dashboard — Track your live orders and explore what&apos;s cooking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomerData(false)}
            disabled={loading || pageLoading}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Customer Dining KPI Overview ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs flex flex-col justify-between h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded shimmer" />
                <div className="size-10 rounded-xl shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-20 rounded shimmer" />
                <div className="h-3 w-32 rounded shimmer" />
              </div>
            </div>
          ))
        ) : (
          <>
            {/* Card 1: All Orders (Total Orders) */}
            <Link
              href="/customer-orders"
              className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-blue-500/[0.04] hover:border-blue-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-blue-500 transition-colors">
                  All Orders
                </span>
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all duration-200 shadow-xs">
                  <ShoppingBag className="size-5" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                    {totalOrdersCount}
                  </span>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 text-[10px] font-semibold">
                    Lifetime
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Total dining orders placed</span>
                  <ArrowUpRight className="size-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>

            {/* Card 2: Total Spent */}
            <Link
              href="/customer-orders"
              className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-emerald-500/[0.04] hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-500 transition-colors">
                  Total Spent
                </span>
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-200 shadow-xs">
                  <IndianRupee className="size-5" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                    ₹{totalSpentAmount.toLocaleString('en-IN')}
                  </span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-[10px] font-semibold">
                    All Time
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Paid &amp; settled bills</span>
                  <ArrowUpRight className="size-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>

            {/* Card 3: Completed Orders */}
            <Link
              href="/customer-orders"
              className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-violet-500/[0.04] hover:border-violet-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-violet-500 transition-colors">
                  Completed Orders
                </span>
                <div className="size-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-all duration-200 shadow-xs">
                  <CheckCircle2 className="size-5" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                    {completedOrdersCount}
                  </span>
                  <Badge variant="outline" className="border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/5 text-[10px] font-semibold">
                    Served
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Delivered & enjoyed</span>
                  <ArrowUpRight className="size-3.5 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* ── 20-Second Live Chef Preparation Add-on Banner ───────── */}
      <LiveBatchAddonBanner
        currentTableNumber="Table 1"
        customerName={customerName}
        onOrderPlaced={fetchCustomerData}
      />

      {/* ── Main Content Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Active Order Status & Recent Orders */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Active Orders Section */}
          <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Flame className="size-4.5" />
                    {activeOrders.length > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold tracking-tight text-foreground">
                      Live Orders Tracker
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Real-time kitchen progress from preparation to your table
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeOrders.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openBillModalForOrder()}
                      className="h-8 px-3 rounded-full font-extrabold text-xs gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                      title="Generate bill, tip waiter, or pay online"
                    >
                      <Receipt className="size-3.5" />
                      <span>Bill &amp; Tip</span>
                    </Button>
                  )}
                  {activeOrdersTotalCount > 0 && (
                    <Badge
                      variant="outline"
                      className="shrink-0 whitespace-nowrap rounded-full border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500" />
                      {activeOrdersTotalCount} Active
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-36 w-full rounded-2xl shimmer" />
                  <div className="h-36 w-full rounded-2xl shimmer" />
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-10 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                    <UtensilsCrossed className="size-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">No active orders right now</h4>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Ready to dine? Explore our menu, view current table availability, or reorder your favorites.
                  </p>
                  <Link href="/menu" className="mt-4">
                    <Button size="sm" className="gap-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer">
                      <Sparkles className="size-3.5" />
                      <span>Order from Menu</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className={cn('space-y-4 transition-opacity duration-200', pageLoading && 'opacity-50 pointer-events-none')}>
                  {activeOrders.map((order) => {
                    const badge = statusBadgeStyles[order.status] || {
                      label: order.status,
                      className: 'bg-muted text-muted-foreground border-border',
                    }
                    const statusLower = String(order.status || '').toLowerCase()
                    const isServed = statusLower === 'served'
                    const currentStep =
                      isServed
                        ? 5
                        : statusLower === 'ready'
                          ? 4
                          : statusLower === 'preparing' || statusLower === 'cooking'
                            ? 3
                            : statusLower === 'confirmed' || statusLower === 'accepted'
                              ? 2
                              : 1

                    const steps = [
                      { step: 1, label: 'Placed' },
                      { step: 2, label: 'Confirmed' },
                      { step: 3, label: 'Cooking' },
                      { step: 4, label: 'Ready' },
                      { step: 5, label: 'Served' },
                    ]
                    const itemsList = Array.isArray(order.items) ? order.items : []
                    const visibleItems = itemsList.slice(0, 4)
                    const extraItemsCount = Math.max(0, itemsList.length - 4)
                    const orderTableParam = encodeURIComponent(order.tableNumber || '1')

                    return (
                      <div
                        key={order.id}
                        className="group overflow-hidden rounded-2xl border border-border/75 bg-gradient-to-b from-card to-muted/10 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                      >
                        {/* Top Header: Order Number + Time + Status Pill */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 pt-4 pb-3">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="whitespace-nowrap font-mono text-sm font-extrabold tracking-tight text-foreground">
                              #{order.orderNumber}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                              <Clock className="size-3" />
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {order.tableNumber && (
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap">
                                {String(order.tableNumber).toLowerCase().startsWith('table')
                                  ? order.tableNumber
                                  : `Table ${order.tableNumber}`}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isServed && (
                              <Badge
                                variant="outline"
                                className="shrink-0 whitespace-nowrap rounded-full border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
                              >
                                Bill Pending
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                'shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                                badge.className
                              )}
                            >
                              {badge.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Kitchen Progress Stepper */}
                        <div className="px-4 pb-3">
                          <div className="rounded-xl border border-border/50 bg-muted/25 px-3.5 py-2.5">
                            <div className="grid grid-cols-5 gap-2">
                              {steps.map((s) => {
                                const isDone = currentStep > s.step || (isServed && s.step === 5)
                                const isCurrent = !isServed && currentStep === s.step
                                return (
                                  <div key={s.step} className="flex flex-col gap-1.5">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/70">
                                      <div
                                        className={cn(
                                          'h-full rounded-full transition-all duration-500',
                                          isDone
                                            ? 'w-full bg-emerald-500'
                                            : isCurrent
                                              ? 'w-full bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse'
                                              : 'w-0'
                                        )}
                                      />
                                    </div>
                                    <span
                                      className={cn(
                                        'text-[10px] font-semibold tracking-wide',
                                        isCurrent
                                          ? 'text-orange-600 dark:text-orange-400'
                                          : isDone
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground/70'
                                      )}
                                    >
                                      {s.label}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            {isServed && (
                              <p className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                Order served to your table! Click <span className="font-bold">Bill &amp; Pay</span> below to generate your bill, tip your waiter, and settle payment.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Ordered Items Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4">
                          {visibleItems.length > 0 ? (
                            <>
                              {visibleItems.map((item, idx) => (
                                <span
                                  key={`${item.id || item.name}-${idx}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs"
                                >
                                  <span className="font-mono text-[11px] font-bold text-primary">
                                    {item.quantity}×
                                  </span>
                                  <span className="truncate max-w-[160px]">{item.name}</span>
                                </span>
                              ))}
                              {extraItemsCount > 0 && (
                                <span className="rounded-lg bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                  +{extraItemsCount} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Dish items</span>
                          )}
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/25 px-4 py-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Order Total
                            </span>
                            <span className="font-mono text-base font-extrabold tracking-tight text-foreground">
                              ₹{Number(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openBillModalForOrder(order)}
                              className="h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer gap-1.5"
                              title="Generate bill & pay for this order"
                            >
                              <Receipt className="size-3.5" />
                              <span>Bill &amp; Pay</span>
                            </Button>
                            {!isServed && (
                              <Link href={`/menu?appendOrderId=${order.id}&table=${orderTableParam}`}>
                                <Button
                                  size="sm"
                                  className="h-8.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 text-xs font-bold text-white shadow-xs transition-all hover:from-orange-600 hover:to-amber-600 hover:shadow-sm cursor-pointer gap-1.5"
                                  title="Add dishes directly to this live order"
                                >
                                  <Plus className="size-3.5" />
                                  <span>Add on Live Order</span>
                                </Button>
                              </Link>
                            )}
                            <Link href="/customer-orders">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8.5 rounded-xl border-border/80 bg-background/80 px-3 text-xs font-semibold hover:bg-accent cursor-pointer gap-1.5"
                              >
                                <Receipt className="size-3.5 text-muted-foreground" />
                                <span>View Receipt</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Scalable Server-Side Pagination Bar */}
                  {(pagination.total > pageSize || pagination.totalPages > 1) && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Showing{' '}
                          <span className="font-semibold text-foreground font-mono">
                            {(pagination.page - 1) * pagination.limit + 1}
                          </span>
                          –
                          <span className="font-semibold text-foreground font-mono">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>{' '}
                          of{' '}
                          <span className="font-semibold text-foreground font-mono">
                            {pagination.total}
                          </span>
                        </span>

                        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5">
                          {[3, 5, 10].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setPageSize(size)
                                setCurrentPage(1)
                              }}
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer',
                                pageSize === size
                                  ? 'bg-background text-foreground shadow-2xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!pagination.hasPrevPage || pageLoading}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-8 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="size-3.5" />
                          <span>Prev</span>
                        </Button>

                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(
                            (p) =>
                              p === 1 ||
                              p === pagination.totalPages ||
                              Math.abs(p - pagination.page) <= 1
                          )
                          .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                            if (idx > 0 && p - arr[idx - 1] > 1) {
                              acc.push('ellipsis')
                            }
                            acc.push(p)
                            return acc
                          }, [])
                          .map((item, idx) =>
                            item === 'ellipsis' ? (
                              <span key={`el-${idx}`} className="px-1.5 text-xs text-muted-foreground">
                                …
                              </span>
                            ) : (
                              <Button
                                key={item}
                                variant={pagination.page === item ? 'default' : 'outline'}
                                size="sm"
                                disabled={pageLoading}
                                onClick={() => setCurrentPage(item)}
                                className="h-8 w-8 p-0 rounded-lg font-mono text-xs cursor-pointer"
                              >
                                {item}
                              </Button>
                            )
                          )}

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!pagination.hasNextPage || pageLoading}
                          onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                          className="h-8 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Navigation & Services */}
        <div className="flex flex-col gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Services</CardTitle>
              <CardDescription className="text-xs">Direct access to restaurant guest services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {/* Highway / Car Drive-In Ordering */}
              <Link
                href="/menu?mode=drive_in"
                className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                    <Car className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      🚗 Highway Car Drive-In
                    </p>
                    <p className="text-[11px] text-muted-foreground">Order remotely from parked car or food cart</p>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Customer Feedback & Google Reviews */}
              <Link
                href="/customer/feedback"
                className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Star className="size-4 fill-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-amber-600 transition-colors">
                      ⭐ Google Review & 10% Discount
                    </p>
                    <p className="text-[11px] text-muted-foreground">Verify dining experience & claim meal coupon</p>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Browse Menu */}
              <Link
                href="/menu"
                className="flex items-center justify-between p-3 rounded-lg border border-border/70 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <UtensilsCrossed className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Browse Menu
                    </p>
                    <p className="text-[11px] text-muted-foreground">Explore available dishes & pricing</p>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* All Orders */}
              <Link
                href="/customer-orders"
                className="flex items-center justify-between p-3 rounded-lg border border-border/70 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Receipt className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Order Receipts & Tracking
                    </p>
                    <p className="text-[11px] text-muted-foreground">Detailed bills & itemized breakdown</p>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* DJ Song Request */}
              <button
                type="button"
                onClick={() => setShowSongModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border/70 hover:bg-muted/40 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                    <Music className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-pink-500 transition-colors">
                      DJ Song Request Booth
                    </p>
                    <p className="text-[11px] text-muted-foreground">Request tracks & dedications live</p>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Digital Bill & Payment Modal (Matches Menu Billing Flow) */}
      <CustomerBillModal
        open={showBillModal}
        onOpenChange={(open) => {
          setShowBillModal(open)
          if (!open) setSelectedOrderIdForBill(null)
        }}
        tableNumber={selectedTableForBill}
        tableOrders={activeOrders}
        selectedOrderId={selectedOrderIdForBill}
        onSuccess={() => {
          fetchCustomerData(false, true)
        }}
      />

      {/* Live DJ Song Request Modal */}
      <SongRequestModal
        open={showSongModal}
        onOpenChange={setShowSongModal}
        tableNumber={activeTableNumber}
        guestName={customerName}
      />
    </div>
  )
}

