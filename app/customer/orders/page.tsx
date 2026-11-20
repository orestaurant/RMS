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
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Trash2,
  ShieldCheck,
  Music,
  Flame,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { LiveBatchAddonBanner } from '@/components/orders/LiveBatchAddonBanner'
import { SongRequestModal } from '@/components/customer/song-request-modal'

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
  source: string
  orderType: string
  paymentStatus: string
  createdAt: string
  branchName?: string
  items: OrderItem[]
}

const statusBadgeStyles: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  PENDING: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  accepted: { label: 'Accepted by Kitchen', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  ACCEPTED: { label: 'Accepted by Kitchen', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/15 text-primary border-primary/30' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-primary/15 text-primary border-primary/30' },
  preparing: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  PREPARING: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  cooking: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  COOKING: { label: 'In Kitchen (Cooking)', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  ready: { label: 'Ready for Pickup', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  READY: { label: 'Ready for Pickup', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  served: { label: 'Served', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  SERVED: { label: 'Served', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  completed: { label: 'Completed', className: 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-600/40' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-600/40' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
}

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'queue' | 'live' | 'completed'>('all')
  const [showSongModal, setShowSongModal] = useState<boolean>(false)

  // Delete & Cancellation State
  const [orderToDelete, setOrderToDelete] = useState<CustomerOrder | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // High-performance Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [ordersPerPage] = useState<number>(5)

  const isInitialMountRef = useRef(true)
  const ordersCacheRef = useRef<string>('')

  // Real-time tick for dish timing countdowns (15s interval is optimal, avoiding 1s re-render thrashing)
  const [liveNow, setLiveNow] = useState<number>(Date.now())
  useEffect(() => {
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setLiveNow(Date.now())
      }
    }, 15000)
    return () => clearInterval(t)
  }, [])

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
      if (statusFilter === 'completed') return ['served', 'completed', 'cancelled'].includes(st)
      return true
    })
  }, [orders, statusFilter])

  // Total pages and paginated slice of orders
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage))
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ordersPerPage
    return filteredOrders.slice(startIndex, startIndex + ordersPerPage)
  }, [filteredOrders, currentPage, ordersPerPage])

  // Delete order handler (Instant optimistic update + backend dispatch)
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return
    setIsDeleting(true)
    const targetId = orderToDelete.id || orderToDelete.orderNumber
    const targetNumber = orderToDelete.orderNumber

    // Instant optimistic update
    setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id && o.orderNumber !== orderToDelete.orderNumber))
    setOrderToDelete(null)

    try {
      const res = await fetch(`/api/orders/${targetId}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && (data.success || data.data?.deleted)) {
        setFeedback({
          type: 'success',
          message: `Order #${targetNumber} has been deleted successfully.`,
        })
      } else {
        // Fallback to customer orders delete endpoint
        const fallbackRes = await fetch(`/api/customer/orders?id=${targetId}`, {
          method: 'DELETE',
        })
        const fallbackData = await fallbackRes.json().catch(() => ({}))
        if (fallbackRes.ok && fallbackData.success) {
          setFeedback({
            type: 'success',
            message: `Order #${targetNumber} has been deleted successfully.`,
          })
        } else {
          throw new Error(data.message || fallbackData.message || 'Failed to delete order')
        }
      }
    } catch (err: any) {
      console.error('Delete order error:', err)
      setFeedback({
        type: 'error',
        message: err?.message || `Failed to delete order #${targetNumber}. Refreshing records...`,
      })
      loadData(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Fetch customer profile & orders with non-blocking background synchronization
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && isInitialMountRef.current) {
        setInitialLoading(true)
      } else if (!isSilent) {
        setIsRefreshing(true)
      }

      const fetchMe = isInitialMountRef.current || !isSilent
      const [meRes, ordersRes] = await Promise.all([
        fetchMe ? fetch('/api/customer/auth/me') : Promise.resolve(null),
        fetch('/api/customer/orders'),
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
        // Fast serialization comparison to prevent duplicate state updates & unnecessary DOM renders
        const newOrdersStr = JSON.stringify(ordersData.orders)
        if (newOrdersStr !== ordersCacheRef.current) {
          ordersCacheRef.current = newOrdersStr
          setOrders(ordersData.orders)
        }
      }
    } catch (err: any) {
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
    // Initial load
    loadData(false)

    // Silent background polling every 6 seconds without flashing loading skeletons
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

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/customer/auth/logout', { method: 'POST' })
      router.push('/customer/auth')
      router.refresh()
    } catch (err) {
      router.push('/customer/auth')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ── Top Navigation Bar ────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" title="Go to Home Page">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-foreground">
                  Resto<span className="text-rose-500">Sphere</span>
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold text-primary border-primary/30 h-4 px-1.5 py-0">
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
                className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
              >
                <UtensilsCrossed className="size-3.5 text-primary" />
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

      {/* ── Main Container ─────────────────────────────────── */}
      <main className="container mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6">
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
              className="text-[11px] opacity-70 hover:opacity-100 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── 20-Second Live Chef Preparation Add-on Banner ───────── */}
        <LiveBatchAddonBanner
          currentTableNumber="Table 1"
          customerName={profile?.name || 'Customer'}
          onOrderPlaced={loadData}
        />

        {/* ── Order Section Header & Place Test Order Button ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              Your Orders
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live orders sync directly with the restaurant POS and kitchen display
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/customer/feedback">
              <Button
                variant="outline"
                className="gap-1.5 h-10 font-semibold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs cursor-pointer"
              >
                <Star className="size-4 fill-amber-500" />
                <span>Review & 10% Off</span>
              </Button>
            </Link>
            <Link href="/menu">
              <Button
                variant="default"
                className="gap-1.5 h-10 font-semibold shadow-md shadow-primary/20 text-xs cursor-pointer"
              >
                <UtensilsCrossed className="size-4" />
                <span>Browse Menu</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Status Tabs Filter (Queue vs Live vs Completed) ── */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border',
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
            )}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('queue')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5',
              statusFilter === 'queue'
                ? 'bg-amber-500 text-black border-amber-500 shadow-xs font-bold'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20'
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
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5',
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
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border',
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
            )}
          >
            Served & History
          </button>
        </div>

        {/* ── Orders Listing ─────────────────────────────────── */}
        {initialLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full rounded-xl shimmer border border-border/40" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-dashed border-2 border-border/80 bg-card/40">
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
                  ? 'You haven\'t placed any dining or delivery orders yet. Explore our fresh menu to place an order!'
                  : 'Your orders will appear here automatically as their status updates in real time.'}
              </p>
              <Link href="/menu">
                <Button className="gap-2 font-semibold">
                  <UtensilsCrossed className="size-4" />
                  <span>Browse Menu & Order</span>
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

              const ordStatus = String(order.status || '').toLowerCase().trim()
              const isOrderPending = !ordStatus || ordStatus === 'pending'
              const isOrderCooking = ordStatus === 'accepted' || ordStatus === 'confirmed' || ordStatus === 'preparing' || ordStatus === 'cooking'
              const isOrderReady = ordStatus === 'ready'
              const isOrderServed = ordStatus === 'served' || ordStatus === 'completed'

              return (
                <Card
                  key={order.id}
                  className="border-border/70 bg-card hover:border-primary/40 transition-colors shadow-sm"
                >
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">
                          #
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-tight text-foreground font-mono">
                              {order.orderNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase font-medium">
                              {order.source || 'ONLINE'}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3" />
                            {orderDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {['pending', 'confirmed', 'preparing', 'ready'].includes(order.status.toLowerCase()) && (
                          <Link href={`/menu?appendOrderId=${order.id}&table=1`}>
                            <Button
                              size="sm"
                              className="h-7 text-xs font-bold gap-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer shadow-xs"
                              title="Add dishes to this running order"
                            >
                              <Plus className="size-3" />
                              <span>Add on Live Order</span>
                            </Button>
                          </Link>
                        )}
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-semibold px-2.5 py-0.5', badgeCfg.className)}
                        >
                          {badgeCfg.label}
                        </Badge>
                        <span className="text-base font-bold text-foreground">
                          ₹{Number(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                        </span>

                        {/* Delete / Cancel Order Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOrderToDelete(order)}
                          className="h-7 px-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 cursor-pointer gap-1 transition-colors"
                          title="Delete / Cancel Order"
                        >
                          <Trash2 className="size-3 text-destructive" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3 pb-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Order Items
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {order.items.map((item: OrderItem) => {
                          const dishPrepMinutes = 15
                          const orderStartTime = order.createdAt ? new Date(order.createdAt).getTime() : Date.now()
                          const elapsedMins = Math.max(0, Math.floor((liveNow - orderStartTime) / 60000))
                          const remainingMins = Math.max(1, dishPrepMinutes - elapsedMins)

                          return (
                            <div
                              key={item.id}
                              className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-muted/30 border border-border/40"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground">
                                  {item.quantity}× {item.name}
                                </span>
                                <span className="text-muted-foreground font-semibold font-mono">
                                  ₹{item.total.toLocaleString('en-IN')}
                                </span>
                              </div>

                              {/* Real-time Dish Timing & Status Badge */}
                              <div className="flex items-center justify-between text-[10px]">
                                {isOrderPending && (
                                  <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1 px-1.5 py-0 h-4">
                                    <Clock className="size-2.5 animate-spin text-amber-500" />
                                    <span>Pending Approval</span>
                                  </Badge>
                                )}
                                {isOrderCooking && (
                                  <Badge variant="outline" className="text-[10px] font-extrabold bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 gap-1 px-1.5 py-0 h-4">
                                    <Flame className="size-2.5 text-orange-500 animate-pulse" />
                                    <span>Preparing ({remainingMins} mins left)</span>
                                  </Badge>
                                )}
                                {isOrderReady && (
                                  <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1 px-1.5 py-0 h-4">
                                    <Sparkles className="size-2.5 text-emerald-500" />
                                    <span>Ready</span>
                                  </Badge>
                                )}
                                {isOrderServed && (
                                  <Badge variant="outline" className="text-[10px] font-bold bg-sky-500/15 text-sky-500 border-sky-500/30 gap-1 px-1.5 py-0 h-4">
                                    <UtensilsCrossed className="size-2.5 text-sky-500" />
                                    <span>Served</span>
                                  </Badge>
                                )}
                                <span className="text-muted-foreground font-mono">
                                  Est ~{dishPrepMinutes}m
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-3.5 text-primary" />
                      <span>Restaurant: {order.branchName || 'RestoSphere Flagship'}</span>
                    </div>
                    {isOrderPending ? (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                        <Clock className="size-3 text-amber-500 animate-spin" />
                        Status: Pending Kitchen Approval
                      </span>
                    ) : isOrderCooking ? (
                      <span className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1.5">
                        <Flame className="size-3 text-orange-500 animate-pulse" />
                        Status: Cooking in Kitchen
                      </span>
                    ) : isOrderReady ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3 text-emerald-500" />
                        Status: Ready for Pickup
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="size-3 text-success" />
                        Status: {order.status ? order.status.toUpperCase() : 'SERVED'}
                      </span>
                    )}
                  </CardFooter>
                </Card>
              )
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Showing <strong className="text-foreground font-mono">{(currentPage - 1) * ordersPerPage + 1}</strong> to{' '}
                  <strong className="text-foreground font-mono">{Math.min(currentPage * ordersPerPage, filteredOrders.length)}</strong> of{' '}
                  <strong className="text-foreground font-mono">{filteredOrders.length}</strong> orders
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Previous</span>
                  </Button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1
                    if (totalPages > 6 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} className="text-xs text-muted-foreground px-1 select-none">...</span>
                      }
                      return null
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'size-8 p-0 text-xs font-bold cursor-pointer',
                          currentPage === pageNum ? 'shadow-xs' : ''
                        )}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Delete / Cancel Order Confirmation Dialog */}
      <Dialog open={orderToDelete !== null} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              <span>Delete Order #{orderToDelete?.orderNumber}?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5">
              Are you sure you want to cancel and delete this order? It will be removed from your active queue and kitchen display.
            </DialogDescription>
          </DialogHeader>

          {orderToDelete && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
              <div className="flex justify-between font-bold">
                <span>{orderToDelete.items.length} items</span>
                <span>₹{Number(orderToDelete.total || orderToDelete.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {orderToDelete.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setOrderToDelete(null)}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteOrder}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Yes, Delete Order</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

