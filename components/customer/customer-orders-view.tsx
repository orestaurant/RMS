'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Clock,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Music,
  Star,
  Printer,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LiveBatchAddonBanner } from '@/components/orders/LiveBatchAddonBanner'
import { SongRequestModal } from '@/components/customer/song-request-modal'
import { CustomerBillModal } from '@/components/billing/customer-bill-modal'
import { CustomerReceiptModal, type OrderReceiptData } from '@/components/customer/customer-receipt-modal'

interface CustomerProfile {
  id: string
  name: string
  email: string
  mobile?: string
  totalOrders: number
  totalSpent: number
  createdAt?: string
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
  total: number
  totalAmount: number
  subtotal?: number
  discountAmount?: number
  discountPercentage?: number
  discountReason?: string | null
  taxAmount?: number
  serviceCharge?: number
  source: string
  orderType: string
  paymentStatus: string
  isPaid?: boolean
  billId?: string | null
  billNumber?: string | null
  billStatus?: string | null
  billPaymentStatus?: string | null
  tableNumber?: string | null
  createdAt: string
  updatedAt?: string
  branchName?: string
  items: OrderItem[]
  receipt?: OrderReceiptData
}

const statusBadgeStyles: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  PENDING: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  accepted: { label: 'Accepted by Kitchen', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  ACCEPTED: { label: 'Accepted by Kitchen', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  confirmed: { label: 'Confirmed', className: 'bg-rose-500/15 text-[#E23744] dark:text-rose-400 border-rose-500/30' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-rose-500/15 text-[#E23744] dark:text-rose-400 border-rose-500/30' },
  preparing: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  PREPARING: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  cooking: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  COOKING: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  ready: { label: 'Ready for Pickup', className: 'bg-emerald-500/15 text-[#24963F] dark:text-emerald-400 border-emerald-500/30' },
  READY: { label: 'Ready for Pickup', className: 'bg-emerald-500/15 text-[#24963F] dark:text-emerald-400 border-emerald-500/30' },
  served: { label: 'Served', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  SERVED: { label: 'Served', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  completed: { label: 'Completed', className: 'bg-[#24963F]/15 text-[#24963F] dark:text-emerald-400 border-[#24963F]/35' },
  COMPLETED: { label: 'Completed', className: 'bg-[#24963F]/15 text-[#24963F] dark:text-emerald-400 border-[#24963F]/35' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
}

function isOrderPaid(order: CustomerOrder): boolean {
  if (order.isPaid) return true
  const paySt = String(order.paymentStatus || '').toLowerCase()
  const billSt = String(order.billStatus || '').toLowerCase()
  const billPaySt = String(order.billPaymentStatus || '').toLowerCase()
  return (
    ['completed', 'paid', 'settled'].includes(paySt) ||
    ['paid', 'settled'].includes(billSt) ||
    ['completed', 'paid', 'settled'].includes(billPaySt)
  )
}

interface CustomerOrdersViewProps {
  hideHeader?: boolean
}

export function CustomerOrdersView({ hideHeader = false }: CustomerOrdersViewProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'queue' | 'live' | 'completed'>('all')
  const [showSongModal, setShowSongModal] = useState<boolean>(false)

  // Receipt & Bill Modals
  const [receiptOrder, setReceiptOrder] = useState<CustomerOrder | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [billTargetOrder, setBillTargetOrder] = useState<CustomerOrder | null>(null)
  const [showBillModal, setShowBillModal] = useState(false)
  const autoOpenedReceiptRef = useRef(false)

  // High-performance Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [ordersPerPage] = useState<number>(6)

  const isInitialMountRef = useRef(true)
  const ordersCacheRef = useRef<string>('')

  // Reset pagination to Page 1 whenever status filter tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const queueCount = orders.filter((o) => ['pending', 'confirmed', 'accepted'].includes(o.status.toLowerCase())).length
  const liveCount = orders.filter((o) => ['preparing', 'cooking', 'ready'].includes(o.status.toLowerCase())).length

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = o.status.toLowerCase()
      if (statusFilter === 'queue') return ['pending', 'confirmed', 'accepted'].includes(st)
      if (statusFilter === 'live') return ['preparing', 'cooking', 'ready'].includes(st)
      if (statusFilter === 'completed') return ['served', 'completed', 'cancelled'].includes(st) || isOrderPaid(o)
      return true
    })
  }, [orders, statusFilter])

  // Total pages and paginated slice of orders
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage))
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ordersPerPage
    return filteredOrders.slice(startIndex, startIndex + ordersPerPage)
  }, [filteredOrders, currentPage, ordersPerPage])

  // Fetch customer profile & orders
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && isInitialMountRef.current) {
        setInitialLoading(true)
      } else if (!isSilent) {
        setIsRefreshing(true)
      }

      const fetchMe = isInitialMountRef.current || !isSilent
      const [meRes, ordersRes] = await Promise.all([
        fetchMe ? fetch('/api/customer/auth/me', { cache: 'no-store' }) : Promise.resolve(null),
        fetch('/api/customer/orders', { cache: 'no-store' }),
      ])

      if ((meRes && meRes.status === 401) || ordersRes.status === 401) {
        router.push('/customer/auth')
        return
      }

      if (meRes) {
        const meData = await meRes.json()
        if (meData.success && meData.customer) {
          setProfile(meData.customer)
        }
      }

      const ordersData = await ordersRes.json()
      if (ordersData.success && Array.isArray(ordersData.orders)) {
        const newOrdersStr = JSON.stringify(ordersData.orders)
        if (newOrdersStr !== ordersCacheRef.current) {
          ordersCacheRef.current = newOrdersStr
          setOrders(ordersData.orders)
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load customer orders data:', err)
      if (!isSilent) {
        setFeedback({ type: 'error', message: 'Failed to load order records. Please refresh.' })
      }
    } finally {
      setInitialLoading(false)
      setIsRefreshing(false)
      isInitialMountRef.current = false
    }
  }, [router])

  useEffect(() => {
    loadData(false)

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData(true)
      }
    }, 6000)

    const handleVis = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData(true)
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVis)
    }

    return () => {
      clearInterval(timer)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVis)
      }
    }
  }, [loadData])

  // Auto-open receipt modal if navigated with ?receipt=<orderId> or notification event
  useEffect(() => {
    if (orders.length === 0 || typeof window === 'undefined') return

    const openTarget = (targetKey?: string | null) => {
      if (!targetKey) return
      const clean = targetKey.replace(/^#/, '').trim().toLowerCase()
      const match = orders.find(
        (o) =>
          o.id.toLowerCase() === clean ||
          o.orderNumber.replace(/^#/, '').toLowerCase() === clean
      )
      if (match) {
        if (isOrderPaid(match)) {
          setReceiptOrder(match)
          setShowReceiptModal(true)
        } else {
          setBillTargetOrder(match)
          setShowBillModal(true)
        }
      }
    }

    if (!autoOpenedReceiptRef.current) {
      const params = new URLSearchParams(window.location.search)
      const targetReceiptId = params.get('receipt')
      if (targetReceiptId) {
        autoOpenedReceiptRef.current = true
        openTarget(targetReceiptId)
      }
    }

    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.pathname === '/customer-orders' && detail?.orderKey) {
        openTarget(detail.orderKey)
      }
    }
    window.addEventListener('rms:notification-navigate', onNav)
    return () => window.removeEventListener('rms:notification-navigate', onNav)
  }, [orders])

  const openReceiptForOrder = (order: CustomerOrder) => {
    setReceiptOrder(order)
    setShowReceiptModal(true)
  }

  const openBillForOrder = (order: CustomerOrder) => {
    setBillTargetOrder(order)
    setShowBillModal(true)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/auth/logout', { method: 'POST' })
      router.push('/customer/auth')
      router.refresh()
    } catch {
      router.push('/customer/auth')
    }
  }

  return (
    <div className={cn(hideHeader ? 'w-full' : 'min-h-screen bg-background text-foreground selection:bg-[#E23744]/20 selection:text-[#E23744]')}>
      {/* ── Standalone Top Navigation Bar (Only if hideHeader is false) ── */}
      {!hideHeader && (
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" title="Go to Home Page">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E23744] to-rose-500 text-white shadow-md shadow-rose-500/20">
                <UtensilsCrossed className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-foreground">
                    Resto<span className="text-[#E23744]">Sphere</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold text-[#E23744] border-[#E23744]/30 h-4 px-1.5 py-0">
                    Customer Portal
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Live Order Tracking • Back to Home</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSongModal(true)}
                className="h-8 gap-1.5 text-xs border-pink-500/40 text-pink-600 dark:text-pink-400 hover:bg-pink-500/10 cursor-pointer"
              >
                <Music className="size-3.5 text-pink-500" />
                <span className="hidden sm:inline">DJ Song</span>
              </Button>
              <Link href="/menu">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-[#E23744] border-[#E23744]/30 hover:bg-[#E23744]/10 cursor-pointer"
                >
                  <UtensilsCrossed className="size-3.5 text-[#E23744]" />
                  <span className="hidden sm:inline">Menu</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(false)}
                disabled={isRefreshing}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-3.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* ── Main Container ── */}
      <div className={cn(hideHeader ? 'flex flex-col gap-6' : 'container mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6')}>
        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={cn(
              'flex items-center justify-between rounded-xl border p-4 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200',
              feedback.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            )}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[11px] opacity-70 hover:opacity-100 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Live Chef Preparation Add-on Banner ───────── */}
        <LiveBatchAddonBanner
          currentTableNumber="Table 1"
          customerName={profile?.name || 'Customer'}
          onOrderPlaced={loadData}
        />

        {/* ── Order Section Header & Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="size-5 text-[#E23744]" />
              <span>All Orders History</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live orders, settled bills &amp; official payment receipts synced directly with kitchen
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              className="gap-1.5 h-9 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
            <Link href="/customer/feedback">
              <Button
                variant="outline"
                className="gap-1.5 h-9 font-semibold rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs cursor-pointer"
              >
                <Star className="size-4 fill-amber-500" />
                <span>Review &amp; 10% Off</span>
              </Button>
            </Link>
            <Link href="/menu">
              <Button
                variant="default"
                className="gap-1.5 h-9 font-bold rounded-xl bg-[#E23744] hover:bg-[#CB202D] text-white shadow-xs text-xs cursor-pointer"
              >
                <UtensilsCrossed className="size-3.5" />
                <span>Browse Menu</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Status Tabs Filter (All vs Queue vs Live vs Completed) ── */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer shrink-0',
              statusFilter === 'all'
                ? 'bg-[#E23744] text-white border-[#E23744] shadow-xs'
                : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
            )}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('queue')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer shrink-0',
              statusFilter === 'queue'
                ? 'bg-amber-500 text-black border-amber-500 shadow-xs font-bold'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            )}
          >
            <span>Kitchen Queue</span>
            {queueCount > 0 && (
              <Badge className="h-4 px-1 text-[10px] bg-amber-500 text-black font-extrabold">
                {queueCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('live')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer shrink-0',
              statusFilter === 'live'
                ? 'bg-chart-4 text-white border-chart-4 shadow-xs font-bold'
                : 'bg-chart-4/10 text-chart-4 border-chart-4/30 hover:bg-chart-4/20'
            )}
          >
            <span>Live in Kitchen</span>
            {liveCount > 0 && (
              <Badge className="h-4 px-1 text-[10px] bg-chart-4 text-white font-extrabold animate-pulse">
                {liveCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer shrink-0',
              statusFilter === 'completed'
                ? 'bg-[#24963F] text-white border-[#24963F] shadow-xs font-bold'
                : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
            )}
          >
            Served &amp; History
          </button>
        </div>

        {/* ── Orders Listing ── */}
        {initialLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 w-full rounded-2xl shimmer border border-border/40" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-dashed border-2 border-border/80 bg-card/40 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted/50 mb-3">
                <ShoppingBag className="size-7 stroke-1 text-muted-foreground" />
              </div>
              <h4 className="text-base font-semibold text-foreground">
                {statusFilter === 'queue'
                  ? 'No orders in queue right now'
                  : statusFilter === 'live'
                    ? 'No live orders cooking currently'
                    : 'No orders found'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                {statusFilter === 'all'
                  ? "You haven't placed any dining or delivery orders yet. Explore our fresh menu to place an order!"
                  : 'Your orders will appear here automatically as their status updates in real time.'}
              </p>
              <Link href="/menu">
                <Button className="gap-2 font-bold rounded-xl bg-[#E23744] hover:bg-[#CB202D] text-white">
                  <UtensilsCrossed className="size-4" />
                  <span>Browse Menu &amp; Order</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {paginatedOrders.map((order: CustomerOrder) => {
              const badgeCfg = statusBadgeStyles[order.status] || {
                label: order.status,
                className: 'bg-muted text-muted-foreground border-border',
              }
              const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
              const paid = isOrderPaid(order)
              const statusLower = String(order.status || '').toLowerCase()
              const isCancelled = statusLower === 'cancelled' || statusLower === 'refunded'
              const isActiveAppendable = !paid && ['pending', 'confirmed', 'accepted', 'preparing', 'cooking', 'ready'].includes(statusLower)
              const orderTableParam = encodeURIComponent(order.tableNumber || '1')

              return (
                <Card
                  key={order.id}
                  className="overflow-hidden rounded-2xl border-border/75 bg-card hover:border-[#E23744]/35 transition-all shadow-sm"
                >
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/15">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'flex size-10 items-center justify-center rounded-xl font-mono text-xs font-bold shrink-0',
                          paid
                            ? 'bg-[#24963F]/10 text-[#24963F] dark:text-emerald-400'
                            : 'bg-[#E23744]/10 text-[#E23744] dark:text-rose-400'
                        )}>
                          {paid ? <Receipt className="size-4.5" /> : '#'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm tracking-tight text-foreground font-mono">
                              {order.orderNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 uppercase font-semibold">
                              {order.source || 'ONLINE'}
                            </Badge>
                            {order.tableNumber && (
                              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-semibold border-[#E23744]/25 bg-[#E23744]/8 text-[#E23744] dark:text-rose-400">
                                {String(order.tableNumber).toLowerCase().startsWith('table')
                                  ? order.tableNumber
                                  : `Table ${order.tableNumber}`}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3" />
                            {orderDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {isActiveAppendable && (
                          <Link href={`/menu?appendOrderId=${order.id}&table=${orderTableParam}`}>
                            <Button
                              size="sm"
                              className="h-7.5 rounded-xl text-xs font-bold gap-1 bg-[#E23744] hover:bg-[#CB202D] text-white cursor-pointer shadow-xs"
                              title="Add dishes to this running order"
                            >
                              <Plus className="size-3" />
                              <span>Add on Live Order</span>
                            </Button>
                          </Link>
                        )}
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full', badgeCfg.className)}
                        >
                          {badgeCfg.label}
                        </Badge>
                        <span className="text-base font-extrabold font-mono text-foreground">
                          ₹{Number(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3.5 pb-3.5">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Ordered Items ({order.items?.length || 0})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-muted/35 border border-border/50 text-xs"
                          >
                            <span className="font-semibold text-foreground truncate mr-2">
                              <span className="font-mono text-[#E23744] dark:text-rose-400 mr-1">
                                {item.quantity}×
                              </span>
                              {item.name}
                            </span>
                            <span className="font-mono font-semibold text-muted-foreground shrink-0">
                              ₹{Number(item.total || item.price * item.quantity || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 pb-3 border-t border-border/50 bg-muted/15 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Payment:</span>
                      {paid ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] py-0.5 px-2 rounded-full border-[#24963F]/35 bg-[#24963F]/10 text-[#24963F] dark:text-emerald-400 font-bold gap-1"
                        >
                          <ShieldCheck className="size-3" />
                          Paid
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] py-0.5 px-2 rounded-full border-amber-500/35 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold capitalize"
                        >
                          {order.paymentStatus || 'Pending'}
                        </Badge>
                      )}

                      {paid && order.receipt?.paymentMethod && (
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                          · {order.receipt.paymentMethod.replace(/_/g, ' ')}
                        </span>
                      )}
                      {paid && (order.receipt?.receiptNumber || order.billNumber) && (
                        <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                          · {order.receipt?.receiptNumber || order.billNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {paid ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openReceiptForOrder(order)}
                            className="h-8.5 rounded-xl bg-[#24963F] hover:bg-[#1E7E34] text-white px-3.5 text-xs font-extrabold shadow-xs cursor-pointer gap-1.5"
                          >
                            <Receipt className="size-3.5" />
                            <span>View Receipt</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openReceiptForOrder(order)}
                            className="h-8.5 rounded-xl border-border/80 bg-background px-3 text-xs font-semibold hover:bg-accent cursor-pointer gap-1.5"
                            title="Open receipt to print or save PDF"
                          >
                            <Printer className="size-3.5 text-muted-foreground" />
                            <span className="hidden sm:inline">Print</span>
                          </Button>
                          <Link href="/menu">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8.5 rounded-xl px-2.5 text-xs font-semibold text-[#E23744] hover:text-[#CB202D] hover:bg-[#E23744]/8 cursor-pointer gap-1"
                            >
                              <span>Reorder</span>
                              <ArrowRight className="size-3" />
                            </Button>
                          </Link>
                        </>
                      ) : !isCancelled ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openBillForOrder(order)}
                            className="h-8.5 rounded-xl bg-[#24963F] hover:bg-[#1E7E34] text-white px-3.5 text-xs font-extrabold shadow-xs cursor-pointer gap-1.5"
                          >
                            <Receipt className="size-3.5" />
                            <span>Bill &amp; Pay</span>
                          </Button>
                          <Link href={`/menu?appendOrderId=${order.id}&table=${orderTableParam}`}>
                            <span className="text-[#E23744] hover:underline font-semibold cursor-pointer flex items-center gap-1 px-2">
                              Order More Dishes <ArrowRight className="size-3" />
                            </span>
                          </Link>
                        </>
                      ) : (
                        <Link href="/menu">
                          <span className="text-[#E23744] hover:underline font-semibold cursor-pointer flex items-center gap-1">
                            Browse Menu <ArrowRight className="size-3" />
                          </span>
                        </Link>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              )
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Official Paid Receipt Modal */}
      <CustomerReceiptModal
        open={showReceiptModal}
        onOpenChange={(open) => {
          setShowReceiptModal(open)
          if (!open) setReceiptOrder(null)
        }}
        order={receiptOrder}
      />

      {/* Digital Bill & Payment Modal for unpaid orders */}
      <CustomerBillModal
        open={showBillModal}
        onOpenChange={(open) => {
          setShowBillModal(open)
          if (!open) setBillTargetOrder(null)
        }}
        tableNumber={billTargetOrder?.tableNumber || 'Table 1'}
        tableOrders={billTargetOrder ? [billTargetOrder] : []}
        selectedOrderId={billTargetOrder?.id || null}
        defaultCustomerPhone={profile?.mobile || ''}
        defaultCustomerName={profile?.name || ''}
        onSuccess={() => {
          loadData(false)
        }}
      />

      {/* Song Playing Request (DJ Sync) Modal */}
      <SongRequestModal
        open={showSongModal}
        onOpenChange={setShowSongModal}
        tableNumber="Table 1"
        guestName={profile?.name || 'Customer'}
      />
    </div>
  )
}
