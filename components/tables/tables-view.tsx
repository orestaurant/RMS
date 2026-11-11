'use client'

import { useState } from 'react'
import { Users, Clock, ChefHat, MoreVertical, Plus, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tables, liveOrders, type DiningTable, type TableStatus } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type Section = 'all' | 'indoor' | 'outdoor' | 'vip' | 'beach'

const statusConfig: Record<TableStatus, {
  label: string
  dot: string
  card: string
  badge: string
}> = {
  available: {
    label: 'Available',
    dot: 'bg-success',
    card: 'border-success/25 bg-success/5 hover:border-success/50 hover:bg-success/10',
    badge: 'border-success/40 bg-success/10 text-success',
  },
  occupied: {
    label: 'Occupied',
    dot: 'bg-primary',
    card: 'border-primary/30 bg-primary/8 hover:border-primary/50 hover:bg-primary/12',
    badge: 'border-primary/40 bg-primary/15 text-primary',
  },
  reserved: {
    label: 'Reserved',
    dot: 'bg-warning',
    card: 'border-warning/30 bg-warning/5 hover:border-warning/50 hover:bg-warning/10',
    badge: 'border-warning/40 bg-warning/10 text-warning',
  },
  cleaning: {
    label: 'Cleaning',
    dot: 'bg-muted-foreground',
    card: 'border-border bg-muted/30',
    badge: 'border-border bg-muted text-muted-foreground',
  },
  out_of_service: {
    label: 'Out of Service',
    dot: 'bg-destructive/50',
    card: 'border-destructive/20 bg-destructive/3 opacity-60',
    badge: 'border-destructive/30 bg-destructive/5 text-destructive/70',
  },
}

function TableCard({ table }: { table: DiningTable }) {
  const cfg = statusConfig[table.status]
  const order = liveOrders.find((o) => o.tableId === table.id)
  const occupancyPct = table.guestCount ? Math.round((table.guestCount / table.capacity) * 100) : 0

  return (
    <div className={cn(
      'group relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer select-none',
      cfg.card
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} />
          <span className="font-bold text-base leading-none">
            {table.section === 'vip' ? 'VIP ' : ''}T{table.number}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 font-medium', cfg.badge)}>
            {cfg.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              }
            >
              <MoreVertical className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.status === 'available' && (
                <>
                  <DropdownMenuItem>Assign Waiter</DropdownMenuItem>
                  <DropdownMenuItem>Mark Reserved</DropdownMenuItem>
                  <DropdownMenuItem>Mark Cleaning</DropdownMenuItem>
                </>
              )}
              {table.status === 'occupied' && (
                <>
                  <DropdownMenuItem>View Order</DropdownMenuItem>
                  <DropdownMenuItem>Request Bill</DropdownMenuItem>
                  <DropdownMenuItem>Transfer Table</DropdownMenuItem>
                </>
              )}
              {table.status === 'cleaning' && (
                <DropdownMenuItem>Mark Available</DropdownMenuItem>
              )}
              {table.status === 'reserved' && (
                <>
                  <DropdownMenuItem>Seat Guests</DropdownMenuItem>
                  <DropdownMenuItem>Cancel Reservation</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Capacity row */}
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="size-3.5 text-muted-foreground" />
        {table.status === 'occupied' && table.guestCount ? (
          <span className="text-xs text-foreground font-medium">
            {table.guestCount}/{table.capacity} guests
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Seats {table.capacity}</span>
        )}
      </div>

      {/* Occupancy bar (only for occupied) */}
      {table.status === 'occupied' && (
        <div className="mb-3">
          <div className="h-1 w-full rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Waiter & time */}
      {table.waiter && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
            {table.waiter.split(' ').map((w) => w[0]).join('')}
          </div>
          <span className="text-xs text-muted-foreground">{table.waiter}</span>
        </div>
      )}

      {table.occupiedSince && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>Since {table.occupiedSince}</span>
        </div>
      )}

      {/* Order indicator */}
      {order && (
        <>
          <Separator className="my-2.5" />
          <div className="flex items-center gap-1.5">
            <ChefHat className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{order.id}</span>
            <Badge variant="outline" className={cn(
              'ml-auto text-[9px] h-4 px-1',
              order.status === 'cooking' && 'border-chart-4/50 text-chart-4',
              order.status === 'ready' && 'border-success/50 text-success',
              order.status === 'pending' && 'border-warning/50 text-warning',
              order.status === 'accepted' && 'border-primary/50 text-primary',
            )}>
              {order.status}
            </Badge>
          </div>
        </>
      )}

      {/* Available CTA */}
      {table.status === 'available' && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-7 text-xs text-success hover:bg-success/10 hover:text-success"
        >
          Seat Guests
        </Button>
      )}
    </div>
  )
}

const statsItems = [
  { key: 'available' as TableStatus, label: 'Available' },
  { key: 'occupied' as TableStatus, label: 'Occupied' },
  { key: 'reserved' as TableStatus, label: 'Reserved' },
  { key: 'cleaning' as TableStatus, label: 'Cleaning' },
]

export function TablesView() {
  const [section, setSection] = useState<Section>('all')

  const filtered = section === 'all' ? tables : tables.filter((t) => t.section === section)

  const counts = {
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsItems.map((s) => (
          <Card key={s.key} className={cn(
            'cursor-pointer transition-all',
            s.key === 'occupied' && 'border-primary/30 bg-primary/5',
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{counts[s.key as keyof typeof counts] ?? 0}</p>
                </div>
                <span className={cn(
                  'size-3 rounded-full',
                  statusConfig[s.key].dot
                )} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section tabs + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={section} onValueChange={(v) => setSection(v as Section)}>
          <TabsList>
            <TabsTrigger value="all">All ({tables.length})</TabsTrigger>
            <TabsTrigger value="indoor">Indoor</TabsTrigger>
            <TabsTrigger value="outdoor">Outdoor</TabsTrigger>
            <TabsTrigger value="vip">VIP</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Filter className="size-3.5" />
            Filter
          </Button>
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {filtered.map((table) => (
          <TableCard key={table.id} table={table} />
        ))}
      </div>
    </main>
  )
}
