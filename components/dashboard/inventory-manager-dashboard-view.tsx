'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Package,
  AlertTriangle,
  Boxes,
  Truck,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  QrCode,
  MapPin,
  Scale,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'

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

  const loadData = useCallback(async () => {
    try {
      const [matRes, notifRes] = await Promise.all([
        fetch('/api/inventory/raw-materials').catch(() => null),
        fetch('/api/dashboard-notifications?role=INVENTORY_MANAGER&limit=10').catch(() => null),
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
    const interval = setInterval(loadData, 20000)
    return () => clearInterval(interval)
  }, [loadData])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inventory Management Center</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Welcome back, <strong className="text-foreground">{auth?.name || 'Inventory Manager'}</strong>. Real-time ingredient tracking and automated vendor replenishment.
              </p>
            </div>
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
            Open Raw Materials
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

      {/* Live Restock & Vendor Acknowledgement Activity Feed */}
      <Card className="border border-border/70 shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              Automated Vendor Alerts & Restock Status
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Live tracking of low-stock alerts dispatched to vendors and restock confirmations.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/inventory-manager/inventory" />}
            className="text-xs gap-1"
          >
            Manage Inventory
            <ArrowRight className="size-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500/80 mb-2" />
              <p className="font-semibold text-sm">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                All raw material levels are currently optimal.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((notif: any) => {
                const isRestockInitiated = notif.status === 'RESTOCK_INITIATED'
                return (
                  <div key={notif.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{notif.title}</span>
                        {isRestockInitiated ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium"
                          >
                            ✓ Vendor Initiated Restock
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium"
                          >
                            Awaiting Vendor
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{notif.message}</p>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {notif.metadata?.vendorName ? ` · Assigned Vendor: ${notif.metadata.vendorName}` : ''}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href="/inventory-manager/inventory" />}
                      className="text-xs h-8 text-primary"
                    >
                      View Material
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
