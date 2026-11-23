'use client'

import { useEffect, useState, useCallback } from 'react'
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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'
import { LiveBatchAddonBanner } from '@/components/orders/LiveBatchAddonBanner'
import { SongRequestModal } from '@/components/customer/song-request-modal'
import { CustomerTopQrSearch } from '@/components/customer/customer-top-qr-search'

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

export function CustomerDashboardView() {
  const { auth } = useAuthContext()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showSongModal, setShowSongModal] = useState(false)

  const customerName = auth?.name || profile?.name || 'Customer'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true)
      const currentCustId = auth?.id || profile?.id
      const queryParams = new URLSearchParams()
      if (currentCustId) {
        queryParams.set('customerId', currentCustId)
        queryParams.set('userId', currentCustId)
      }
      if (auth?.email) {
        queryParams.set('email', auth.email)
      }
      const ordersUrl = queryParams.toString()
        ? `/api/customer/orders?${queryParams.toString()}`
        : '/api/customer/orders'

      const [meRes, ordersRes] = await Promise.all([
        fetch('/api/customer/auth/me', { cache: 'no-store' }),
        fetch(ordersUrl, { cache: 'no-store' }),
      ])

      let loadedProfile: CustomerProfile | null = profile
      if (meRes.ok) {
        const meJson = await meRes.json()
        if (meJson.success && meJson.customer) {
          loadedProfile = meJson.customer
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
        } else {
          setOrders([])
        }
      } else {
        setOrders([])
      }
    } catch (err) {
      console.error('Failed to load customer dashboard details:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [auth?.id, auth?.email, profile?.id])

  useEffect(() => {
    fetchCustomerData()
  }, [fetchCustomerData])

  // Strict Account-Based Order Filtering:
  // Dynamically compute all 4 KPI metrics strictly from the authenticated customer's orders
  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready', 'accepted'].includes(String(o.status).toLowerCase())
  )
  const completedOrders = orders.filter((o) =>
    ['served', 'completed', 'cancelled', 'refunded'].includes(String(o.status).toLowerCase())
  )
  const totalOrdersCount = orders.length
  const totalSpentAmount = orders
    .filter((o) => !['cancelled', 'refunded'].includes(String(o.status).toLowerCase()))
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
            onClick={fetchCustomerData}
            disabled={loading}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Top QR Code & Dishes Search Section ───────────────── */}
      <CustomerTopQrSearch initialTable="1" />

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
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    Live Orders Tracker
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live updates as your order moves from kitchen preparation to your table
                  </CardDescription>
                </div>
                {activeOrders.length > 0 && (
                  <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
                    {activeOrders.length} Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-3 py-2">
                  <div className="h-16 w-full rounded-lg shimmer" />
                  <div className="h-16 w-full rounded-lg shimmer" />
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl border-border/80 bg-muted/20">
                  <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <UtensilsCrossed className="size-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">No active orders right now</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Ready to dine? Explore our menu, view current table availability, or reorder your favorites.
                  </p>
                  <Link href="/menu" className="mt-4">
                    <Button size="sm" className="gap-2 text-xs">
                      <Sparkles className="size-3.5" />
                      <span>Order from Menu</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order) => {
                    const badge = statusBadgeStyles[order.status] || {
                      label: order.status,
                      className: 'bg-muted text-muted-foreground border-border',
                    }
                    const itemsSummary = Array.isArray(order.items)
                      ? order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
                      : 'Dish items'

                    return (
                      <div
                        key={order.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-colors gap-3"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground font-mono">
                              #{order.orderNumber}
                            </span>
                            <Badge variant="outline" className={cn('text-[11px] font-medium border', badge.className)}>
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 truncate">
                            {itemsSummary}
                          </p>
                          <span className="text-[11px] text-muted-foreground/80">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                          <span className="text-sm font-bold text-foreground mr-1">
                            ₹{Number(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                          </span>
                          <Link href={`/menu?appendOrderId=${order.id}&table=1`}>
                            <Button
                              size="sm"
                              className="h-8 text-xs font-bold gap-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer shadow-xs"
                              title="Add dishes directly to this live order"
                            >
                              <Plus className="size-3" />
                              <span>Add on Live Order</span>
                            </Button>
                          </Link>
                          <Link href="/customer-orders">
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                              <span>View Receipt</span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
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

      {/* Live DJ Song Request Modal */}
      <SongRequestModal
        open={showSongModal}
        onOpenChange={setShowSongModal}
        tableNumber="Table 1"
        guestName={customerName}
      />
    </div>
  )
}

