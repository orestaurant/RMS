'use client'

import { useEffect, useState } from 'react'
import {
  IndianRupee,
  ShoppingBag,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Armchair,
  Car,
  Navigation,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { StatCard } from '@/components/ui/stat-card'
import { TableOccupancyGrid } from '@/components/dashboard/table-occupancy-grid'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAuthContext } from '@/hooks/useAuthContext'
import { getTopDishes, getInventoryAlerts } from '@/lib/api/dashboard'
import type { TopDish, InventoryAlert } from '@/types/dashboard'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function DashboardOverview() {
  const { auth, loading: authLoading } = useAuthContext()
  const activeBranchId = auth?.branchId || 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'

  // Dynamic dashboard stats from PostgreSQL via Prisma
  const { data: stats, loading: statsLoading } = useDashboardStats(activeBranchId)

  const [topDishes, setTopDishes] = useState<TopDish[]>([])
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        setAlertsLoading(true)
        const [dishes, alerts] = await Promise.all([
          getTopDishes(activeBranchId).catch(() => []),
          getInventoryAlerts(activeBranchId).catch(() => []),
        ])
        if (isMounted) {
          setTopDishes(dishes)
          setInventoryAlerts(alerts)
        }
      } catch (err) {
        console.error('Failed to load dashboard widgets data:', err)
      } finally {
        if (isMounted) {
          setAlertsLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [activeBranchId])

  // Dynamic User Greeting from Authenticated Session
  const userName = auth?.name || 'Admin'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Dynamic outlet status from Prisma
  const isOpen = stats?.outlet?.isOpen ?? true
  const closingTime = stats?.outlet?.closingTime ?? '11:00 PM'

  // Dynamic metrics with zero hardcoded fallbacks
  const todayRevenue = stats?.todayRevenue ?? 0
  const todayRevenueChange = stats && stats.todayRevenueChangePercent !== 0
    ? `${stats.todayRevenueChangePercent >= 0 ? '+' : ''}${stats.todayRevenueChangePercent}%`
    : ''
  const todayRevenuePositive = (stats?.todayRevenueChangePercent ?? 0) >= 0

  const totalOrders = stats?.totalOrders ?? 0
  const totalOrdersChange = stats && stats.totalOrdersChange !== 0
    ? `${stats.totalOrdersChange >= 0 ? '+' : ''}${stats.totalOrdersChange} vs yesterday`
    : ''
  const totalOrdersPositive = (stats?.totalOrdersChange ?? 0) >= 0

  const tableOccupancy = stats?.tableOccupancy ?? 0
  const tableOccupancyChange = stats && stats.tableOccupancyChange !== 0
    ? `${stats.tableOccupancyChange >= 0 ? '+' : ''}${stats.tableOccupancyChange}% vs last week`
    : ''
  const tableOccupancyPositive = (stats?.tableOccupancyChange ?? 0) >= 0

  const newGuests = stats?.newGuests ?? 0
  const newGuestsChange = stats && stats.newGuestsChange !== 0
    ? `${stats.newGuestsChange >= 0 ? '+' : ''}${stats.newGuestsChange} vs yesterday`
    : ''
  const newGuestsPositive = (stats?.newGuestsChange ?? 0) >= 0

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* ── Greeting bar ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats
              ? stats.todayRevenue > 0
                ? `Today is going well — revenue is ${todayRevenuePositive ? 'up' : 'down'} ${Math.abs(
                    stats.todayRevenueChangePercent
                  )}% vs yesterday`
                : `Connected to live restaurant metrics • Today: ${stats.totalOrders} orders recorded`
              : 'Connecting to live restaurant metrics...'}
          </p>
        </div>
      </div>

      {/* ── Metric Summary Cards ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Revenue */}
        <StatCard
          title="Today's Revenue"
          value={todayRevenue}
          prefix="₹"
          change={todayRevenueChange}
          positive={todayRevenuePositive}
          icon={IndianRupee}
          iconColor="text-primary"
          loading={statsLoading}
        />

        {/* Total Orders */}
        <StatCard
          title="Total Orders"
          value={totalOrders}
          change={totalOrdersChange}
          positive={totalOrdersPositive}
          icon={ShoppingBag}
          iconColor="text-chart-1"
          loading={statsLoading}
        />

        {/* Table Occupancy */}
        <StatCard
          title="Table Occupancy"
          value={tableOccupancy}
          suffix="%"
          change={tableOccupancyChange}
          positive={tableOccupancyPositive}
          icon={Armchair}
          iconColor="text-chart-2"
          loading={statsLoading}
        />

        {/* New Guests */}
        <StatCard
          title="New Guests"
          value={newGuests}
          change={newGuestsChange}
          positive={newGuestsPositive}
          icon={Users}
          iconColor="text-chart-4"
          loading={statsLoading}
        />
      </div>

      {/* Drive-in & Car Delivery Orders Overview Action */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Car className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-foreground">Drive-in & Remote Customer Spot Deliveries</p>
              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 border-primary/30 text-primary font-medium">
                Live GPS & Vehicle
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Track vehicle license numbers, landmark pins, and real-time locked GPS locations for quick delivery
            </p>
          </div>
        </div>
        <Link href="/orders">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
            <Navigation className="size-3.5" />
            View Car Orders & Map Pins
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>



      {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Table occupancy mini map */}
        <div className="lg:col-span-2">
          <TableOccupancyGrid branchId={activeBranchId} />
        </div>

        {/* Right column: top dishes + inventory alerts */}
        <div className="flex flex-col gap-6">
          {/* Top Dishes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Top Dishes Today</CardTitle>
                  <CardDescription className="text-xs">By order count</CardDescription>
                </div>
                <Link
                  href="/admin-menu"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 w-full rounded shimmer" />
                  ))}
                </div>
              ) : topDishes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No dishes sold today</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {topDishes.slice(0, 5).map((dish, i) => (
                    <div key={dish.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-muted-foreground w-4">{i + 1}</span>
                        <span
                          className={cn(
                            'size-1.5 rounded-full shrink-0',
                            dish.isVeg ? 'bg-success' : 'bg-destructive'
                          )}
                        />
                        <span className="font-medium truncate text-foreground">{dish.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-muted-foreground">{dish.orders} orders</span>
                        <span className="font-semibold text-foreground">
                          ₹{dish.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" />
                  <CardTitle className="text-sm font-semibold">Low Stock Alert</CardTitle>
                </div>
                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                  {inventoryAlerts.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-10 w-full rounded shimmer" />
                  ))}
                </div>
              ) : inventoryAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">All stock levels normal</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {inventoryAlerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-lg border text-xs',
                        alert.status === 'critical'
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-warning/30 bg-warning/5'
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{alert.item}</span>
                        <span className="text-muted-foreground">
                          Current: {alert.current} {alert.unit}
                        </span>
                      </div>
                      <Badge
                        variant={alert.status === 'critical' ? 'destructive' : 'outline'}
                        className={cn(
                          'text-[10px] uppercase font-mono tracking-wider',
                          alert.status === 'low' && 'border-warning text-warning'
                        )}
                      >
                        {alert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
