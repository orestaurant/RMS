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
  RefreshCw,
  Car,
  Plus,
  Star,
  Gift,
  Copy,
  Check,
  Music,
  IndianRupee,
  CheckCircle2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Leaf,
  Zap,
  ShieldCheck,
  Soup,
  Pizza,
  Coffee,
  IceCream,
  Salad,
  Sandwich,
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

interface MenuDiscoveryItem {
  id: string
  name: string
  description?: string
  categoryId?: string
  category: string
  price: number
  image?: string
  isVeg?: boolean
  isVegan?: boolean
  isSpicy?: boolean
  isAvailable?: boolean
  prepTime?: number
  rating?: number
}

interface MenuCategoryItem {
  id: string
  name: string
  description?: string
  itemCount?: number
  isActive?: boolean
}

const statusBadgeStyles: Record<string, { label: string; headline: string; className: string; bannerBg: string }> = {
  pending: {
    label: 'Pending Approval',
    headline: 'Sent to restaurant — awaiting kitchen confirmation',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    bannerBg: 'bg-amber-500/[0.06] border-amber-500/20',
  },
  PENDING: {
    label: 'Pending Approval',
    headline: 'Sent to restaurant — awaiting kitchen confirmation',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    bannerBg: 'bg-amber-500/[0.06] border-amber-500/20',
  },
  confirmed: {
    label: 'Confirmed',
    headline: 'Order confirmed — chef is lining up your dishes',
    className: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    bannerBg: 'bg-rose-500/[0.06] border-rose-500/20',
  },
  CONFIRMED: {
    label: 'Confirmed',
    headline: 'Order confirmed — chef is lining up your dishes',
    className: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    bannerBg: 'bg-rose-500/[0.06] border-rose-500/20',
  },
  preparing: {
    label: 'Cooking Live',
    headline: 'Chef is freshly preparing your order in the kitchen',
    className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
    bannerBg: 'bg-orange-500/[0.07] border-orange-500/25',
  },
  PREPARING: {
    label: 'Cooking Live',
    headline: 'Chef is freshly preparing your order in the kitchen',
    className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
    bannerBg: 'bg-orange-500/[0.07] border-orange-500/25',
  },
  ready: {
    label: 'Ready to Serve',
    headline: 'Plated & hot — arriving at your table any moment',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    bannerBg: 'bg-emerald-500/[0.07] border-emerald-500/25',
  },
  READY: {
    label: 'Ready to Serve',
    headline: 'Plated & hot — arriving at your table any moment',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    bannerBg: 'bg-emerald-500/[0.07] border-emerald-500/25',
  },
  served: {
    label: 'Served',
    headline: 'Enjoy your meal! Settle your bill anytime with Bill & Pay',
    className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
    bannerBg: 'bg-emerald-500/[0.07] border-emerald-500/25',
  },
  SERVED: {
    label: 'Served',
    headline: 'Enjoy your meal! Settle your bill anytime with Bill & Pay',
    className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
    bannerBg: 'bg-emerald-500/[0.07] border-emerald-500/25',
  },
  completed: {
    label: 'Completed',
    headline: 'Order completed & settled',
    className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
    bannerBg: 'bg-emerald-500/[0.06] border-emerald-500/20',
  },
  COMPLETED: {
    label: 'Completed',
    headline: 'Order completed & settled',
    className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
    bannerBg: 'bg-emerald-500/[0.06] border-emerald-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    headline: 'This order was cancelled',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    bannerBg: 'bg-destructive/[0.06] border-destructive/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    headline: 'This order was cancelled',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    bannerBg: 'bg-destructive/[0.06] border-destructive/20',
  },
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

function getCategoryVisual(name: string) {
  const n = name.toLowerCase()
  if (n.includes('pizza') || n.includes('italian')) {
    return { Icon: Pizza, gradient: 'from-rose-500/15 via-orange-500/10 to-amber-500/15', iconColor: 'text-[#E23744]' }
  }
  if (n.includes('drink') || n.includes('beverage') || n.includes('coffee') || n.includes('tea') || n.includes('shake')) {
    return { Icon: Coffee, gradient: 'from-amber-500/15 via-yellow-500/10 to-orange-500/15', iconColor: 'text-amber-600 dark:text-amber-400' }
  }
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice') || n.includes('cake')) {
    return { Icon: IceCream, gradient: 'from-pink-500/15 via-rose-500/10 to-fuchsia-500/15', iconColor: 'text-pink-600 dark:text-pink-400' }
  }
  if (n.includes('salad') || n.includes('healthy') || n.includes('veg')) {
    return { Icon: Salad, gradient: 'from-emerald-500/15 via-green-500/10 to-teal-500/15', iconColor: 'text-emerald-600 dark:text-emerald-400' }
  }
  if (n.includes('fast') || n.includes('burger') || n.includes('sandwich') || n.includes('snack')) {
    return { Icon: Sandwich, gradient: 'from-orange-500/15 via-amber-500/10 to-red-500/15', iconColor: 'text-orange-600 dark:text-orange-400' }
  }
  if (n.includes('soup') || n.includes('starter') || n.includes('appetizer')) {
    return { Icon: Soup, gradient: 'from-red-500/15 via-rose-500/10 to-orange-500/15', iconColor: 'text-rose-600 dark:text-rose-400' }
  }
  return { Icon: UtensilsCrossed, gradient: 'from-[#E23744]/15 via-orange-500/10 to-amber-500/15', iconColor: 'text-[#E23744]' }
}

function VegNonVegBadge({ isVeg }: { isVeg?: boolean }) {
  const veg = isVeg !== false
  return (
    <span
      title={veg ? 'Pure Veg' : 'Non-Veg'}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] bg-white/95 dark:bg-zinc-950/95 shadow-2xs',
        veg ? 'border-[#24963F]' : 'border-[#E23744]'
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full',
          veg ? 'bg-[#24963F]' : 'bg-[#E23744]'
        )}
      />
    </span>
  )
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
  const [selectedTableForBill, setSelectedTableForBill] = useState<string>('')
  const profileRef = useRef<CustomerProfile | null>(null)

  // Menu discovery state (for Zomato-style "What's on your mind?" & "Chef's Picks")
  const [categories, setCategories] = useState<MenuCategoryItem[]>([])
  const [featuredDishes, setFeaturedDishes] = useState<MenuDiscoveryItem[]>([])
  const [discoveryLoading, setDiscoveryLoading] = useState(true)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const cravingsScrollRef = useRef<HTMLDivElement>(null)

  // Review & 10% Off reward state synced from /api/customer/feedback
  const [reviewDiscountPercent, setReviewDiscountPercent] = useState(10)
  const [reviewDiscountEnabled, setReviewDiscountEnabled] = useState(true)
  const [reviewCouponCode, setReviewCouponCode] = useState<string | null>(null)
  const [copiedRewardCode, setCopiedRewardCode] = useState(false)

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

  // Fetch menu categories & trending dishes for Zomato-style discovery
  useEffect(() => {
    let active = true
    const loadMenuDiscovery = async () => {
      try {
        setDiscoveryLoading(true)
        const [catRes, itemsRes] = await Promise.all([
          fetch('/api/menu/categories', { cache: 'no-store' }),
          fetch('/api/menu/items?available=true&limit=24', { cache: 'no-store' }),
        ])
        if (!active) return

        if (catRes.ok) {
          const catJson = await catRes.json()
          if (catJson.success && Array.isArray(catJson.data)) {
            setCategories(
              catJson.data.filter(
                (c: MenuCategoryItem) =>
                  c.isActive !== false &&
                  (c.itemCount === undefined || c.itemCount > 0)
              )
            )
          }
        }

        if (itemsRes.ok) {
          const itemsJson = await itemsRes.json()
          if (itemsJson.success && Array.isArray(itemsJson.data)) {
            setFeaturedDishes(itemsJson.data.filter((d: MenuDiscoveryItem) => d.isAvailable !== false))
          }
        }
      } catch (e) {
        console.warn('Could not load menu discovery highlights:', e)
      } finally {
        if (active) setDiscoveryLoading(false)
      }
    }
    loadMenuDiscovery()
    return () => {
      active = false
    }
  }, [])

  // Fetch customer review reward status & discount settings
  useEffect(() => {
    let active = true
    const loadReviewReward = async () => {
      try {
        const res = await fetch('/api/customer/feedback', { cache: 'no-store' })
        if (!res.ok || !active) return
        const json = await res.json()
        if (!active || !json?.success || !json?.data) return
        const d = json.data
        if (d.settings) {
          if (typeof d.settings.reviewDiscountPercent === 'number' && d.settings.reviewDiscountPercent > 0) {
            setReviewDiscountPercent(d.settings.reviewDiscountPercent)
          }
          if (typeof d.settings.reviewDiscountEnabled === 'boolean') {
            setReviewDiscountEnabled(d.settings.reviewDiscountEnabled)
          }
        }
        if (d.alreadyReviewed && d.previousFeedback?.discountCode) {
          setReviewCouponCode(String(d.previousFeedback.discountCode))
        }
      } catch (e) {
        console.warn('Could not load review reward status:', e)
      }
    }
    loadReviewReward()
    return () => {
      active = false
    }
  }, [])

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
    () => activeOrders.find((o) => o.tableNumber)?.tableNumber || null,
    [activeOrders]
  )

  const firstAppendableOrder = useMemo(
    () => activeOrders.find((o) => String(o.status || '').toLowerCase() !== 'served'),
    [activeOrders]
  )

  const feedbackHref = useMemo(() => {
    const params = new URLSearchParams()
    if (activeTableNumber) params.set('table', activeTableNumber)
    const primaryOrderId = activeOrders[0]?.id
    if (primaryOrderId) params.set('orderId', primaryOrderId)
    const qs = params.toString()
    return qs ? `/customer/feedback?${qs}` : '/customer/feedback'
  }, [activeTableNumber, activeOrders])

  const handleCopyRewardCode = useCallback(() => {
    if (!reviewCouponCode || typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(reviewCouponCode)
    setCopiedRewardCode(true)
    setTimeout(() => setCopiedRewardCode(false), 2000)
  }, [reviewCouponCode])

  const openBillModalForOrder = useCallback(
    (order?: CustomerOrder) => {
      if (order) {
        setSelectedOrderIdForBill(order.id)
        setSelectedTableForBill(order.tableNumber || activeTableNumber || '')
      } else {
        const firstOrder = activeOrders[0]
        const shouldUseSingleOrder = activeOrders.length === 1 || !firstOrder?.tableNumber
        setSelectedOrderIdForBill(shouldUseSingleOrder && firstOrder ? firstOrder.id : null)
        setSelectedTableForBill(activeTableNumber || '')
      }
      setShowBillModal(true)
    },
    [activeOrders, activeTableNumber]
  )

  // Map category names to the first dish image in that category for Zomato-style craving circles
  const categoryImageMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const dish of featuredDishes) {
      const catKey = (dish.category || '').toLowerCase().trim()
      if (catKey && dish.image && !map[catKey]) {
        map[catKey] = dish.image
      }
    }
    return map
  }, [featuredDishes])

  // Pick up to 4 visually rich dishes for the "Chef's Picks" showcase
  const chefPicks = useMemo(() => {
    const withImages = featuredDishes.filter((d) => Boolean(d.image))
    const withoutImages = featuredDishes.filter((d) => !d.image)
    return [...withImages, ...withoutImages].slice(0, 4)
  }, [featuredDishes])

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

  const scrollCravings = (direction: 'left' | 'right') => {
    if (!cravingsScrollRef.current) return
    const offset = direction === 'left' ? -280 : 280
    cravingsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* ── 1. Zomato-Inspired Editorial Hero + Floating KPI Strip ───────────── */}
      <section className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl border border-rose-950/15 dark:border-rose-500/20 bg-gradient-to-br from-[#1B1114] via-[#2C1319] to-[#681421] p-6 sm:p-7 text-white shadow-lg shadow-rose-950/10">
          {/* Decorative Ambient Glows */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[#E23744]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-amber-500/15 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-rose-100 backdrop-blur-md border border-white/10">
                  <Sparkles className="size-3 text-amber-300" />
                  RestoSphere Dining Club
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 border border-emerald-400/25">
                  <ShieldCheck className="size-3 text-emerald-300" />
                  Verified Guest
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {greeting}, <span className="text-rose-200">{customerName}</span>
              </h1>
              <p className="text-xs sm:text-sm text-rose-100/80 leading-relaxed">
                Track your dishes live from the chef&apos;s pass to your table, explore today&apos;s cravings, or unlock 10% off your next meal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href={
                  firstAppendableOrder
                    ? `/menu?appendOrderId=${firstAppendableOrder.id}&table=${encodeURIComponent(
                        firstAppendableOrder.tableNumber || '1'
                      )}`
                    : '/menu'
                }
              >
                <Button className="h-10 rounded-xl bg-[#E23744] hover:bg-[#CB202D] text-white font-bold text-xs sm:text-sm px-4 shadow-md shadow-[#E23744]/30 border border-rose-400/30 cursor-pointer gap-2 transition-all hover:scale-[1.01]">
                  <UtensilsCrossed className="size-4" />
                  <span>{firstAppendableOrder ? 'Order More Dishes' : 'Explore Digital Menu'}</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCustomerData(false)}
                disabled={loading || pageLoading}
                className="h-10 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-md px-3.5 text-xs font-semibold cursor-pointer gap-1.5"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── 2. Elevated 3-Stat Dining Summary Strip ────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs flex items-center justify-between h-[96px]"
              >
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded shimmer" />
                  <div className="h-7 w-24 rounded shimmer" />
                </div>
                <div className="size-11 rounded-2xl shimmer" />
              </div>
            ))
          ) : (
            <>
              {/* Card 1: All Orders */}
              <Link
                href="/customer-orders"
                className="group relative flex items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border border-border/70 bg-card shadow-[0_4px_20px_-6px_rgba(0,0,0,0.06)] hover:border-[#E23744]/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#E23744] to-rose-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-1 pl-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-[#E23744] transition-colors">
                      All Orders
                    </span>
                    <Badge className="bg-rose-500/10 text-[#E23744] dark:text-rose-400 border-rose-500/20 text-[10px] font-semibold px-1.5 py-0 h-4">
                      Lifetime
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                      {totalOrdersCount}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">dining orders</span>
                  </div>
                </div>
                <div className="size-11 rounded-2xl bg-rose-500/10 text-[#E23744] dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:bg-[#E23744] group-hover:text-white transition-all duration-200">
                  <ShoppingBag className="size-5" />
                </div>
              </Link>

              {/* Card 2: Total Spent */}
              <Link
                href="/customer-orders"
                className="group relative flex items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border border-border/70 bg-card shadow-[0_4px_20px_-6px_rgba(0,0,0,0.06)] hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#24963F] to-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-1 pl-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-[#24963F] dark:group-hover:text-emerald-400 transition-colors">
                      Total Spent
                    </span>
                    <Badge className="bg-emerald-500/10 text-[#24963F] dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold px-1.5 py-0 h-4">
                      Settled
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                      ₹{totalSpentAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="size-11 rounded-2xl bg-emerald-500/10 text-[#24963F] dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-[#24963F] group-hover:text-white transition-all duration-200">
                  <IndianRupee className="size-5" />
                </div>
              </Link>

              {/* Card 3: Completed Orders */}
              <Link
                href="/customer-orders"
                className="group relative flex items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border border-border/70 bg-card shadow-[0_4px_20px_-6px_rgba(0,0,0,0.06)] hover:border-amber-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-500 to-orange-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-1 pl-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Completed
                    </span>
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-semibold px-1.5 py-0 h-4">
                      Served
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                      {completedOrdersCount}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">meals enjoyed</span>
                  </div>
                </div>
                <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all duration-200">
                  <CheckCircle2 className="size-5" />
                </div>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── 3. Zomato Signature: "What's on your mind?" Cravings Carousel ────── */}
      {(discoveryLoading || categories.length > 0) && (
        <section className="rounded-2xl border border-border/60 bg-card/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                What&apos;s on your mind?
              </h2>
              <p className="text-xs text-muted-foreground">
                Tap a craving to jump straight to fresh dishes in our digital menu
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Link href="/menu?dietary=veg" className="hidden sm:inline-flex">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#24963F]/30 bg-[#24963F]/10 px-3 py-1 text-[11px] font-bold text-[#24963F] dark:text-emerald-400 hover:bg-[#24963F]/20 transition-colors">
                  <Leaf className="size-3" />
                  Pure Veg
                </span>
              </Link>
              <button
                type="button"
                onClick={() => scrollCravings('left')}
                aria-label="Scroll categories left"
                className="size-7 rounded-full border border-border/70 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCravings('right')}
                aria-label="Scroll categories right"
                className="size-7 rounded-full border border-border/70 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {discoveryLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 shrink-0 w-24">
                  <div className="size-20 rounded-full shimmer" />
                  <div className="h-3 w-16 rounded shimmer" />
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={cravingsScrollRef}
              className="flex items-stretch gap-3 sm:gap-5 overflow-x-auto pb-1 scrollbar-none scroll-smooth"
            >
              {categories.map((cat) => {
                const catKey = cat.name.toLowerCase().trim()
                const catImage = categoryImageMap[catKey]
                const showImg = Boolean(catImage && !failedImages[`cat-${cat.id}`])
                const visual = getCategoryVisual(cat.name)
                const VisualIcon = visual.Icon

                return (
                  <Link
                    key={cat.id}
                    href={
                      activeTableNumber
                        ? `/menu?category=${encodeURIComponent(cat.name)}&table=${encodeURIComponent(
                            activeTableNumber
                          )}`
                        : `/menu?category=${encodeURIComponent(cat.name)}`
                    }
                    className="group flex flex-col items-center gap-2 shrink-0 w-22 sm:w-24 text-center"
                  >
                    <div
                      className={cn(
                        'relative size-18 sm:size-20 rounded-full overflow-hidden border-2 border-border/70 group-hover:border-[#E23744] shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200 flex items-center justify-center bg-gradient-to-br',
                        visual.gradient
                      )}
                    >
                      {showImg ? (
                        <img
                          src={catImage}
                          alt={cat.name}
                          className="size-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [`cat-${cat.id}`]: true }))
                          }
                        />
                      ) : (
                        <VisualIcon className={cn('size-8 transition-transform group-hover:scale-110', visual.iconColor)} />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground group-hover:text-[#E23744] transition-colors line-clamp-1">
                        {cat.name}
                      </p>
                      {typeof cat.itemCount === 'number' && cat.itemCount > 0 && (
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {cat.itemCount} {cat.itemCount === 1 ? 'dish' : 'dishes'}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 4. 20-Second Live Chef Preparation Add-on Banner ─────────────────── */}
      {activeTableNumber && (
        <LiveBatchAddonBanner
          currentTableNumber={activeTableNumber}
          customerName={customerName}
          onOrderPlaced={fetchCustomerData}
        />
      )}

      {/* ── 5. Main Content Grid: Live Tracker (2/3) + Quick Services (1/3) ──── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Live Orders Tracker + Chef's Picks */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Active Orders Section (Zomato Live Order Tracking Card) */}
          <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-[0_6px_24px_-8px_rgba(0,0,0,0.08)]">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-rose-500/[0.04] via-card to-amber-500/[0.04] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#E23744]/10 text-[#E23744] dark:text-rose-400">
                    <Flame className="size-5" />
                    {activeOrders.length > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#24963F] opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-[#24963F] ring-2 ring-card" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
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
                      className="h-8.5 px-3.5 rounded-full font-extrabold text-xs gap-1.5 border-[#24963F]/40 bg-[#24963F]/10 text-[#24963F] dark:text-emerald-400 hover:bg-[#24963F] hover:text-white transition-all cursor-pointer"
                      title="Generate bill, tip waiter, or pay online"
                    >
                      <Receipt className="size-3.5" />
                      <span>Bill &amp; Tip</span>
                    </Button>
                  )}
                  {activeOrdersTotalCount > 0 && (
                    <Badge
                      variant="outline"
                      className="shrink-0 whitespace-nowrap rounded-full border-[#24963F]/30 bg-[#24963F]/10 px-3 py-1 font-mono text-[11px] font-bold text-[#24963F] dark:text-emerald-400"
                    >
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#24963F] animate-pulse" />
                      {activeOrdersTotalCount} Active
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-40 w-full rounded-2xl shimmer" />
                  <div className="h-40 w-full rounded-2xl shimmer" />
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-muted/20 to-background px-6 py-10 text-center">
                  <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#E23744]/10 text-[#E23744] shadow-xs">
                    <UtensilsCrossed className="size-6" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">No active orders right now</h4>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
                    Hungry? Browse our digital menu for freshly cooked starters, biryanis, pizzas &amp; desserts — served straight to your table.
                  </p>
                  <Link href="/menu" className="mt-4">
                    <Button
                      size="sm"
                      className="h-9 gap-2 rounded-xl bg-[#E23744] hover:bg-[#CB202D] text-white px-4 text-xs font-bold shadow-sm shadow-[#E23744]/25 cursor-pointer"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Explore Menu &amp; Order</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className={cn('space-y-4 transition-opacity duration-200', pageLoading && 'opacity-50 pointer-events-none')}>
                  {activeOrders.map((order) => {
                    const badge = statusBadgeStyles[order.status] || {
                      label: order.status,
                      headline: 'Tracking your kitchen progress live',
                      className: 'bg-muted text-muted-foreground border-border',
                      bannerBg: 'bg-muted/30 border-border/60',
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
                      { step: 1, label: 'Placed', Icon: Receipt },
                      { step: 2, label: 'Confirmed', Icon: CheckCircle2 },
                      { step: 3, label: 'Cooking', Icon: ChefHat },
                      { step: 4, label: 'Ready', Icon: Sparkles },
                      { step: 5, label: 'Served', Icon: UtensilsCrossed },
                    ]
                    const itemsList = Array.isArray(order.items) ? order.items : []
                    const visibleItems = itemsList.slice(0, 4)
                    const extraItemsCount = Math.max(0, itemsList.length - 4)
                    const orderTableParam = encodeURIComponent(order.tableNumber || '1')

                    return (
                      <div
                        key={order.id}
                        className="group overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-[#E23744]/35 hover:shadow-md"
                      >
                        {/* Status Headline Banner (Zomato Live Status Strip) */}
                        <div className={cn('flex flex-wrap items-center justify-between gap-2.5 border-b px-4 py-3', badge.bannerBg)}>
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="whitespace-nowrap font-mono text-sm font-extrabold tracking-tight text-foreground">
                              #{order.orderNumber}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-background/80 border border-border/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                              <Clock className="size-3" />
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {order.tableNumber && (
                              <span className="inline-flex items-center rounded-full bg-[#E23744]/10 border border-[#E23744]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#E23744] dark:text-rose-400 whitespace-nowrap">
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
                                className="shrink-0 whitespace-nowrap rounded-full border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400"
                              >
                                Bill Pending
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                'shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                                badge.className
                              )}
                            >
                              {badge.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Friendly Live Kitchen Narrative + Connected Milestone Stepper */}
                        <div className="px-4 pt-3.5 pb-3 space-y-3">
                          <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                            <span
                              className={cn(
                                'size-2 rounded-full shrink-0',
                                isServed
                                  ? 'bg-[#24963F]'
                                  : 'bg-[#E23744] animate-pulse'
                              )}
                            />
                            <span>{badge.headline}</span>
                          </p>

                          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 sm:px-4 py-3">
                            <div className="relative flex items-start justify-between gap-1">
                              {/* Connecting background track */}
                              <div className="absolute left-4 right-4 top-3.5 h-0.5 bg-border/80" />
                              {/* Active filled progress track */}
                              <div
                                className={cn(
                                  'absolute left-4 top-3.5 h-0.5 transition-all duration-500',
                                  isServed ? 'bg-[#24963F]' : 'bg-gradient-to-r from-[#24963F] to-[#E23744]'
                                )}
                                style={{
                                  width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 16px)`,
                                }}
                              />

                              {steps.map((s) => {
                                const isDone = currentStep > s.step || (isServed && s.step === 5)
                                const isCurrent = !isServed && currentStep === s.step
                                const StepIcon = s.Icon
                                return (
                                  <div key={s.step} className="relative z-10 flex flex-col items-center gap-1.5 flex-1 text-center">
                                    <div
                                      className={cn(
                                        'size-7 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                        isDone
                                          ? 'bg-[#24963F] border-[#24963F] text-white shadow-xs'
                                          : isCurrent
                                            ? 'bg-[#E23744] border-[#E23744] text-white shadow-md shadow-[#E23744]/30 scale-110'
                                            : 'bg-card border-border text-muted-foreground/60'
                                      )}
                                    >
                                      <StepIcon className="size-3.5" />
                                    </div>
                                    <span
                                      className={cn(
                                        'text-[10px] font-bold tracking-wide',
                                        isCurrent
                                          ? 'text-[#E23744] dark:text-rose-400'
                                          : isDone
                                            ? 'text-[#24963F] dark:text-emerald-400'
                                            : 'text-muted-foreground/70'
                                      )}
                                    >
                                      {s.label}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Ordered Items Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4">
                          {visibleItems.length > 0 ? (
                            <>
                              {visibleItems.map((item, idx) => (
                                <span
                                  key={`${item.id || item.name}-${idx}`}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-muted/25 px-2.5 py-1 text-xs font-medium text-foreground"
                                >
                                  <span className="inline-flex items-center justify-center rounded-md bg-[#E23744]/10 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-[#E23744] dark:text-rose-400">
                                    {item.quantity}×
                                  </span>
                                  <span className="truncate max-w-[165px] font-semibold">{item.name}</span>
                                </span>
                              ))}
                              {extraItemsCount > 0 && (
                                <span className="rounded-xl bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                                  +{extraItemsCount} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Dish items</span>
                          )}
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-4 py-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Order Total
                            </span>
                            <span className="font-mono text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                              ₹{Number(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openBillModalForOrder(order)}
                              className="h-8.5 rounded-xl bg-[#24963F] hover:bg-[#1E7E34] px-3.5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer gap-1.5"
                              title="Generate bill & pay for this order"
                            >
                              <Receipt className="size-3.5" />
                              <span>Bill &amp; Pay</span>
                            </Button>
                            {!isServed && (
                              <Link href={`/menu?appendOrderId=${order.id}&table=${orderTableParam}`}>
                                <Button
                                  size="sm"
                                  className="h-8.5 rounded-xl bg-[#E23744] hover:bg-[#CB202D] px-3.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer gap-1.5"
                                  title="Add dishes directly to this live order"
                                >
                                  <Plus className="size-3.5" />
                                  <span>Add on Live Order</span>
                                </Button>
                              </Link>
                            )}
                            <Link href={`/customer-orders?receipt=${order.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8.5 rounded-xl border-border/80 bg-background px-3 text-xs font-semibold hover:bg-accent cursor-pointer gap-1.5"
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
                                className={cn(
                                  'h-8 w-8 p-0 rounded-lg font-mono text-xs cursor-pointer',
                                  pagination.page === item && 'bg-[#E23744] hover:bg-[#CB202D] text-white border-[#E23744]'
                                )}
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

          {/* ── Chef's Picks & Trending Today (Zomato Restaurant Dish Grid) ────── */}
          {(discoveryLoading || chefPicks.length > 0) && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <span>Chef&apos;s Picks &amp; Popular Today</span>
                    <Badge className="bg-[#E23744]/10 text-[#E23744] dark:text-rose-400 border-[#E23744]/20 text-[10px] font-bold">
                      Freshly Prepared
                    </Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Guest-favorite dishes ready to order directly to your table
                  </p>
                </div>
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E23744] hover:text-[#CB202D] transition-colors shrink-0"
                >
                  <span>See full menu</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              {discoveryLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-44 rounded-2xl border border-border/60 bg-card shimmer" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {chefPicks.map((dish) => {
                    const showDishImg = Boolean(dish.image && !failedImages[`dish-${dish.id}`])
                    const visual = getCategoryVisual(dish.category || '')
                    const DishIcon = visual.Icon
                    const orderLink = firstAppendableOrder
                      ? `/menu?appendOrderId=${firstAppendableOrder.id}&dishId=${dish.id}&table=${encodeURIComponent(
                          firstAppendableOrder.tableNumber || ''
                        )}`
                      : activeTableNumber
                        ? `/menu?dishId=${dish.id}&table=${encodeURIComponent(activeTableNumber)}`
                        : `/menu?dishId=${dish.id}`

                    return (
                      <Link
                        key={dish.id}
                        href={orderLink}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs hover:shadow-lg hover:border-[#E23744]/40 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {/* Dish Cover Image with Zomato Rating & Prep Time Overlay */}
                        <div className={cn('relative h-32 w-full overflow-hidden bg-gradient-to-br', visual.gradient)}>
                          {showDishImg ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={() =>
                                setFailedImages((prev) => ({ ...prev, [`dish-${dish.id}`]: true }))
                              }
                            />
                          ) : (
                            <div className="size-full flex flex-col items-center justify-center gap-1.5">
                              <DishIcon className={cn('size-10 opacity-75', visual.iconColor)} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                {dish.category}
                              </span>
                            </div>
                          )}

                          {/* Subtle bottom scrim */}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />

                          {/* Top Left Veg / Non-Veg Marker */}
                          <div className="absolute left-3 top-3">
                            <VegNonVegBadge isVeg={dish.isVeg} />
                          </div>

                          {/* Top Right Prep Time Pill */}
                          <div className="absolute right-3 top-3 rounded-full bg-black/65 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                            <Clock className="size-2.5 text-amber-300" />
                            <span>{dish.prepTime || 15} mins</span>
                          </div>

                          {/* Bottom Left Category & Bottom Right Zomato Green Rating Pill */}
                          <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-white/95 truncate drop-shadow-xs">
                              {dish.category}
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-[#24963F] px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow-xs">
                              <span>{(dish.rating || 4.8).toFixed(1)}</span>
                              <Star className="size-2.5 fill-white" />
                            </span>
                          </div>
                        </div>

                        {/* Dish Body */}
                        <div className="flex flex-1 flex-col justify-between p-3.5 gap-2.5">
                          <div>
                            <h3 className="text-sm font-extrabold text-foreground group-hover:text-[#E23744] transition-colors line-clamp-1">
                              {dish.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {dish.description || 'Freshly cooked with authentic spices & chef signature garnish'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/50">
                            <span className="font-mono text-sm font-extrabold text-foreground">
                              ₹{Number(dish.price || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[#E23744]/35 bg-[#E23744]/8 px-2.5 py-1 text-[11px] font-extrabold text-[#E23744] dark:text-rose-400 group-hover:bg-[#E23744] group-hover:text-white transition-colors">
                              <Plus className="size-3 stroke-[2.5]" />
                              <span>Order</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Curated Guest Services */}
        <div className="flex flex-col gap-5">
          {/* Curated Guest Experiences & Services */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-[0_6px_24px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-base font-extrabold tracking-tight">Guest Services</CardTitle>
              <CardDescription className="text-xs">
                Curated conveniences for your table &amp; drive-in visit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {/* Highway / Car Drive-In Ordering */}
              <Link
                href="/menu?mode=drive_in"
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E23744]/25 bg-gradient-to-r from-[#E23744]/[0.07] via-card to-orange-500/[0.04] hover:border-[#E23744]/50 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-[#E23744] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Car className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-extrabold text-foreground group-hover:text-[#E23744] transition-colors truncate">
                        Highway Car Drive-In
                      </p>
                      <Badge className="bg-[#E23744]/15 text-[#E23744] dark:text-rose-400 border-0 text-[9px] font-bold px-1.5 py-0 h-4">
                        Curbside
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      Order remotely from parked car or food cart
                    </p>
                  </div>
                </div>
                <ArrowRight className="size-4 text-[#E23744] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* DJ Song Request Booth */}
              <button
                type="button"
                onClick={() => setShowSongModal(true)}
                className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-pink-500/25 bg-gradient-to-r from-pink-500/[0.07] via-card to-purple-500/[0.04] hover:border-pink-500/50 hover:shadow-xs transition-all group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Music className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-extrabold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors truncate">
                        DJ Song Request Booth
                      </p>
                      <Badge className="bg-pink-500/15 text-pink-600 dark:text-pink-400 border-0 text-[9px] font-bold px-1.5 py-0 h-4">
                        Live Vibe
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      Request tracks &amp; table dedications live
                    </p>
                  </div>
                </div>
                <ArrowRight className="size-4 text-pink-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Review & 10% Off Guest Reward */}
              {reviewCouponCode ? (
                <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] via-card to-amber-500/[0.06] p-3.5 transition-all hover:border-emerald-500/50 hover:shadow-xs group">
                  <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-emerald-400/15 blur-xl" />
                  <div className="relative flex items-center justify-between gap-2.5">
                    <Link href={feedbackHref} className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/20">
                        <Gift className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            Review &amp; {reviewDiscountPercent}% Off
                          </p>
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0 text-[9px] font-extrabold px-1.5 py-0 h-4 shrink-0">
                            Unlocked
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          Tap to view or apply at billing
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={handleCopyRewardCode}
                      title="Copy coupon code"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[10px] font-mono font-extrabold text-emerald-700 dark:text-emerald-300 transition-colors shrink-0 cursor-pointer"
                    >
                      <span>{reviewCouponCode}</span>
                      {copiedRewardCode ? <Check className="size-3" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href={feedbackHref}
                  className="relative overflow-hidden flex items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.09] via-card to-orange-500/[0.06] hover:border-amber-500/55 hover:shadow-xs transition-all group"
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-amber-400/15 blur-xl group-hover:bg-amber-400/25 transition-colors" />
                  <div className="relative flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/25">
                      <Star className="size-5 fill-white/90" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-extrabold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                          {reviewDiscountEnabled ? `Review & ${reviewDiscountPercent}% Off` : 'Share Dining Review'}
                        </p>
                        {reviewDiscountEnabled && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[9px] font-extrabold px-1.5 py-0 h-4 tracking-wide shrink-0">
                            {reviewDiscountPercent}% OFF
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {reviewDiscountEnabled
                          ? 'Rate your meal & unlock instant bill savings'
                          : 'Tell us how we did on food, service & vibe'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="relative size-4 text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}

              {/* Compact 2-up Grid: Digital Menu & Order Receipts */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Link
                  href="/menu"
                  className="group flex flex-col justify-between gap-2.5 rounded-xl border border-border/70 bg-muted/20 p-3.5 hover:border-orange-500/40 hover:bg-orange-500/[0.05] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                      <UtensilsCrossed className="size-4" />
                    </div>
                    <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Digital Menu</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Dishes &amp; prices</p>
                  </div>
                </Link>

                <Link
                  href="/customer-orders"
                  className="group flex flex-col justify-between gap-2.5 rounded-xl border border-border/70 bg-muted/20 p-3.5 hover:border-emerald-500/40 hover:bg-emerald-500/[0.05] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-emerald-500/15 text-[#24963F] dark:text-emerald-400 flex items-center justify-center">
                      <Receipt className="size-4" />
                    </div>
                    <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">All Receipts</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Bills &amp; history</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Dining Assurance Pill Card */}
          <div className="rounded-2xl border border-border/60 bg-muted/25 p-4 flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[#24963F]/10 text-[#24963F] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Instant Kitchen Sync</p>
              <p className="text-[11px] text-muted-foreground">
                Orders &amp; live add-ons update directly with our kitchen pass
              </p>
            </div>
          </div>
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
        tableNumber={activeTableNumber || 'Guest'}
        guestName={customerName}
      />
    </div>
  )
}
