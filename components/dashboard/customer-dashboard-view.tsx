'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingBag,
  Clock,
  UtensilsCrossed,
  IndianRupee,
  Receipt,
  ArrowRight,
  Sparkles,
  ChefHat,
  Flame,
  CheckCircle2,
  TableProperties,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'

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

  const customerName = auth?.name || profile?.name || 'Customer'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true)
      const [meRes, ordersRes] = await Promise.all([
        fetch('/api/customer/auth/me', { cache: 'no-store' }),
        fetch('/api/customer/orders', { cache: 'no-store' }),
      ])

      if (meRes.ok) {
        const meJson = await meRes.json()
        if (meJson.success && meJson.customer) {
          setProfile(meJson.customer)
        }
      }

      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json()
        if (ordersJson.success && Array.isArray(ordersJson.orders)) {
          setOrders(ordersJson.orders)
        }
      }
    } catch (err) {
      console.error('Failed to load customer dashboard details:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomerData()
  }, [fetchCustomerData])

  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(String(o.status).toLowerCase())
  )
  const completedOrders = orders.filter((o) =>
    ['served', 'completed'].includes(String(o.status).toLowerCase())
  )
  const totalOrdersCount = profile?.totalOrders ?? orders.length
  const totalSpentAmount = profile?.totalSpent ?? orders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0)

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
          <Link href="/customer/orders">
            <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold shadow-sm">
              <Receipt className="size-3.5" />
              <span>My Orders & History</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Customer Metric Cards (Zero Admin/Revenue Numbers) ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Live Orders */}
        <StatCard
          title="Active Live Orders"
          value={activeOrders.length}
          icon={Flame}
          iconColor="text-orange-500"
          loading={loading}
        />

        {/* Total Orders Placed */}
        <StatCard
          title="Orders Placed"
          value={totalOrdersCount}
          icon={ShoppingBag}
          iconColor="text-primary"
          loading={loading}
        />

        {/* Total Completed */}
        <StatCard
          title="Past Orders"
          value={completedOrders.length}
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          loading={loading}
        />

        {/* Total Spent */}
        <StatCard
          title="Total Spent"
          value={Number(totalSpentAmount).toLocaleString('en-IN')}
          prefix="₹"
          icon={IndianRupee}
          iconColor="text-chart-1"
          loading={loading}
        />
      </div>

      {/* ── Promotional / Menu Callout Banner ─────────────────── */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/25">
            <ChefHat className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Explore Our Fresh Restaurant Menu</p>
              <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-600 dark:text-orange-400 font-medium">
                Chef Specials
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Discover chef-crafted starters, mains, and desserts prepared hot to order
            </p>
          </div>
        </div>
        <Link href="/admin-menu">
          <Button size="sm" className="h-8.5 gap-1.5 text-xs font-semibold">
            <UtensilsCrossed className="size-3.5" />
            <span>Browse Full Menu</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

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
                  <Link href="/admin-menu" className="mt-4">
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

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                          <span className="text-sm font-bold text-foreground">
                            ₹{Number(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                          </span>
                          <Link href="/customer/orders">
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

          {/* Recent Order History */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Order History</CardTitle>
                  <CardDescription className="text-xs">Your completed and past dining orders</CardDescription>
                </div>
                <Link
                  href="/customer/orders"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  View All Orders <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2 py-2">
                  <div className="h-10 w-full rounded shimmer" />
                  <div className="h-10 w-full rounded shimmer" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No order records found yet.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {orders.slice(0, 4).map((o) => (
                    <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Receipt className="size-3.5 text-muted-foreground" />
                        <span className="font-mono font-medium text-foreground">#{o.orderNumber}</span>
                        <span className="text-muted-foreground">
                          {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">
                          ₹{Number(o.total || o.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="capitalize text-[11px] text-muted-foreground">{o.status}</span>
                      </div>
                    </div>
                  ))}
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
              {/* Browse Menu */}
              <Link
                href="/admin-menu"
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
                href="/customer/orders"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

