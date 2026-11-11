'use client'

import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, IndianRupee, ShoppingBag,
  Users, Star, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  weeklyRevenue, categoryRevenue, topDishes, todayStats,
} from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type Range = '7d' | '30d' | '90d'

const monthlyRevenue = [
  { month: 'Aug', revenue: 2840000, orders: 6120 },
  { month: 'Sep', revenue: 3120000, orders: 6840 },
  { month: 'Oct', revenue: 2980000, orders: 6450 },
  { month: 'Nov', revenue: 3450000, orders: 7280 },
  { month: 'Dec', revenue: 4120000, orders: 8640 },
  { month: 'Jan', revenue: 3780000, orders: 7920 },
]

const hourlyHeatmap = [
  { hour: '12am', Mon: 12, Tue: 8, Wed: 15, Thu: 10, Fri: 22, Sat: 35, Sun: 28 },
  { hour: '6am',  Mon: 45, Tue: 52, Wed: 38, Thu: 61, Fri: 48, Sat: 32, Sun: 41 },
  { hour: '9am',  Mon: 78, Tue: 82, Wed: 71, Thu: 88, Fri: 92, Sat: 65, Sun: 74 },
  { hour: '12pm', Mon: 95, Tue: 88, Wed: 92, Thu: 98, Fri: 100, Sat: 86, Sun: 91 },
  { hour: '3pm',  Mon: 62, Tue: 68, Wed: 58, Thu: 72, Fri: 78, Sat: 94, Sun: 88 },
  { hour: '6pm',  Mon: 85, Tue: 91, Wed: 79, Thu: 96, Fri: 100, Sat: 100, Sun: 97 },
  { hour: '9pm',  Mon: 72, Tue: 78, Wed: 65, Thu: 82, Fri: 96, Sat: 98, Sun: 92 },
]

const staffPerformance = [
  { name: 'Neha R.', ordersServed: 12, avgRating: 4.9, revenue: 42100, role: 'VIP' },
  { name: 'Arjun S.', ordersServed: 24, avgRating: 4.7, revenue: 38400, role: 'Senior' },
  { name: 'Rohit K.', ordersServed: 21, avgRating: 4.6, revenue: 32800, role: 'Waiter' },
  { name: 'Priya M.', ordersServed: 18, avgRating: 4.5, revenue: 28600, role: 'Waiter' },
  { name: 'Vikram S.', ordersServed: 16, avgRating: 4.4, revenue: 24200, role: 'Waiter' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mt-0.5">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.dataKey === 'orders'
              ? entry.value
              : `₹${Number(entry.value).toLocaleString('en-IN')}`}
          </span>
        </div>
      ))}
    </div>
  )
}

const kpiCards = [
  {
    label: 'Monthly Revenue',
    value: '₹37.8L',
    change: '+12.4%',
    positive: true,
    icon: IndianRupee,
    sub: 'vs last month',
  },
  {
    label: 'Total Orders',
    value: '7,920',
    change: '+8.2%',
    positive: true,
    icon: ShoppingBag,
    sub: 'this month',
  },
  {
    label: 'Repeat Customers',
    value: '68%',
    change: '+3.1%',
    positive: true,
    icon: Users,
    sub: 'retention rate',
  },
  {
    label: 'Avg Rating',
    value: '4.7',
    change: '+0.2',
    positive: true,
    icon: Star,
    sub: 'customer satisfaction',
  },
]

export function AnalyticsView() {
  const [range, setRange] = useState<Range>('7d')

  const chartData = range === '7d' ? weeklyRevenue : monthlyRevenue
  const xKey = range === '7d' ? 'day' : 'month'

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">Performance Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Insights and trends across all metrics</p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5 gap-0.5">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setRange(r)}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    kpi.positive ? 'text-success' : 'text-destructive'
                  )}>
                    {kpi.positive
                      ? <ArrowUpRight className="size-3" />
                      : <ArrowDownRight className="size-3" />}
                    {kpi.change}
                    <span className="text-muted-foreground font-normal">{kpi.sub}</span>
                  </div>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <kpi.icon className="size-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue trend — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
                <CardDescription className="text-xs">
                  {range === '7d' ? 'Daily revenue vs target this week' : 'Monthly revenue trend'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pr-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData as any} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={range === '7d' ? 20 : 24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v) => <span style={{ color: 'var(--muted-foreground)' }}>{v}</span>}
                />
                <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                {range === '7d' && (
                  <Bar dataKey="target" name="Target" fill="var(--muted)" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by category — donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle>
            <CardDescription className="text-xs">Share of total revenue</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryRevenue}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryRevenue.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'Share']}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {categoryRevenue.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="text-muted-foreground">{cat.name}</span>
                  </div>
                  <span className="font-semibold">{cat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top dishes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Performing Dishes</CardTitle>
            <CardDescription className="text-xs">By revenue contribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-3">
            {topDishes.map((dish, i) => (
              <div key={dish.id} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium truncate">{dish.name}</span>
                    <span className="text-xs font-semibold text-success shrink-0">{dish.trend}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${(dish.orders / 60) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ₹{(dish.revenue / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Staff performance — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Staff Performance</CardTitle>
            <CardDescription className="text-xs">Orders served and revenue generated today</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Staff Member', 'Role', 'Orders', 'Avg Rating', 'Revenue'].map((h) => (
                      <th key={h} className="text-left text-muted-foreground font-medium uppercase tracking-wide py-2 px-3 first:pl-0 last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffPerformance.map((s, i) => (
                    <tr key={s.name} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 pl-0">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary shrink-0">
                            {s.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5">
                          {s.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold">{s.ordersServed}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 fill-warning text-warning" />
                          <span className="font-semibold">{s.avgRating}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 pr-0">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[40px]">
                            <div
                              className="h-full rounded-full bg-success/70"
                              style={{ width: `${(s.revenue / 42100) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-foreground shrink-0">
                            ₹{(s.revenue / 1000).toFixed(1)}k
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
