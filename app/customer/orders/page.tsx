'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Clock,
  User,
  Mail,
  Phone,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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
  pending: { label: 'Pending Approval', className: 'bg-warning/15 text-warning border-warning/30' },
  PENDING: { label: 'Pending Approval', className: 'bg-warning/15 text-warning border-warning/30' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/15 text-primary border-primary/30' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-primary/15 text-primary border-primary/30' },
  preparing: { label: 'In Kitchen', className: 'bg-chart-4/15 text-chart-4 border-chart-4/30' },
  PREPARING: { label: 'In Kitchen', className: 'bg-chart-4/15 text-chart-4 border-chart-4/30' },
  ready: { label: 'Ready for Pickup', className: 'bg-chart-2/15 text-chart-2 border-chart-2/30' },
  READY: { label: 'Ready for Pickup', className: 'bg-chart-2/15 text-chart-2 border-chart-2/30' },
  served: { label: 'Served', className: 'bg-success/15 text-success border-success/30' },
  SERVED: { label: 'Served', className: 'bg-success/15 text-success border-success/30' },
  completed: { label: 'Completed', className: 'bg-success/20 text-success border-success/40' },
  COMPLETED: { label: 'Completed', className: 'bg-success/20 text-success border-success/40' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border-destructive/30' },
}

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Fetch customer profile & orders
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [meRes, ordersRes] = await Promise.all([
        fetch('/api/customer/auth/me'),
        fetch('/api/customer/orders'),
      ])

      if (meRes.status === 401 || ordersRes.status === 401) {
        router.push('/customer/auth')
        return
      }

      const meData = await meRes.json()
      const ordersData = await ordersRes.json()

      if (meData.success && meData.customer) {
        setProfile(meData.customer)
      }

      if (ordersData.success && Array.isArray(ordersData.orders)) {
        setOrders(ordersData.orders)
      }
    } catch (err: any) {
      console.error('Failed to load customer orders data:', err)
      setFeedback({ type: 'error', message: 'Failed to load order records. Please refresh.' })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Place dynamic test order
  const handlePlaceTestOrder = async () => {
    setActionLoading(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setFeedback({
          type: 'error',
          message: data.message || 'Failed to place test order.',
        })
        setActionLoading(false)
        return
      }

      setFeedback({
        type: 'success',
        message: `Order #${data.order.orderNumber} placed successfully! It is now live in the restaurant system.`,
      })

      // Reload fresh orders and customer stats
      await loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Error communicating with ordering API.',
      })
    } finally {
      setActionLoading(false)
    }
  }

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
              onClick={loadData}
              disabled={loading}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
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

        {/* ── Customer Profile Card ─────────────────────────── */}
        <Card className="border-border/60 bg-card/90 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 text-lg font-bold">
                  {profile?.name ? profile.name.slice(0, 2).toUpperCase() : <User className="size-6" />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      {profile?.name || 'Customer'}
                    </h2>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Verified Guest
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-primary" />
                      {profile?.email || 'Loading...'}
                    </span>
                    {profile?.mobile && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3.5 text-chart-1" />
                        {profile.mobile}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Orders Placed
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {profile?.totalOrders ?? orders.length}
                  </p>
                </div>
                <div className="w-px h-10 bg-border/60" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Total Spent
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{Number(profile?.totalSpent ?? 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

          <Button
            onClick={handlePlaceTestOrder}
            disabled={actionLoading}
            className="gap-2 h-10 font-semibold shadow-md shadow-primary/20 text-sm"
          >
            {actionLoading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                <span>Submitting Order...</span>
              </>
            ) : (
              <>
                <Plus className="size-4" />
                <span>Place New Test Order</span>
              </>
            )}
          </Button>
        </div>

        {/* ── Orders Listing ─────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full rounded-xl shimmer border border-border/40" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-dashed border-2 border-border/80 bg-card/40">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted/50 mb-3">
                <ShoppingBag className="size-7 stroke-1 text-muted-foreground" />
              </div>
              <h4 className="text-base font-semibold text-foreground">No orders placed yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                You haven&apos;t placed any dining or delivery orders yet. Click the button below to place your first test order!
              </p>
              <Button onClick={handlePlaceTestOrder} disabled={actionLoading} className="gap-2">
                <Plus className="size-4" />
                <span>Place New Test Order</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => {
              const badgeCfg = statusBadgeStyles[order.status] || {
                label: order.status,
                className: 'bg-muted text-muted-foreground border-border',
              }
              const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })

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
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-semibold px-2.5 py-0.5', badgeCfg.className)}
                        >
                          {badgeCfg.label}
                        </Badge>
                        <span className="text-base font-bold text-foreground">
                          ₹{Number(order.total || order.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3 pb-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Order Items
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border border-border/40"
                          >
                            <span className="font-medium text-foreground">
                              {item.quantity}× {item.name}
                            </span>
                            <span className="text-muted-foreground font-semibold">
                              ₹{item.total.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-3.5 text-primary" />
                      <span>Restaurant: {order.branchName || 'RestoSphere Flagship'}</span>
                    </div>
                    <span className="text-[11px] text-success font-medium">
                      Status: Active in Kitchen Pipeline
                    </span>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

