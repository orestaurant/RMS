'use client'

import { useState } from 'react'
import {
  Calendar, Clock, Users, Phone, Mail, Plus,
  CheckCircle2, XCircle, AlertCircle, ChevronRight,
  MoreVertical, Search, Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { reservations, tables, type Reservation } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'seated'

const statusConfig: Record<Reservation['status'], {
  label: string
  icon: React.ElementType
  card: string
  badge: string
}> = {
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    card: 'border-success/25 bg-success/5',
    badge: 'border-success/40 bg-success/10 text-success',
  },
  pending: {
    label: 'Pending',
    icon: AlertCircle,
    card: 'border-warning/25 bg-warning/5',
    badge: 'border-warning/40 bg-warning/10 text-warning',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    card: 'border-destructive/20 bg-destructive/5 opacity-70',
    badge: 'border-destructive/30 bg-destructive/5 text-destructive',
  },
  no_show: {
    label: 'No Show',
    icon: XCircle,
    card: 'border-destructive/20 bg-destructive/5 opacity-70',
    badge: 'border-destructive/30 bg-destructive/5 text-destructive',
  },
  seated: {
    label: 'Seated',
    icon: CheckCircle2,
    card: 'border-primary/25 bg-primary/8',
    badge: 'border-primary/40 bg-primary/15 text-primary',
  },
}

// Upcoming time slots for the visual timeline
const timeSlots = [
  '18:00', '18:30', '19:00', '19:30', '20:00',
  '20:30', '21:00', '21:30', '22:00',
]

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const cfg = statusConfig[reservation.status]
  const StatusIcon = cfg.icon
  const table = tables.find((t) => t.id === reservation.tableId)
  const initials = reservation.guestName.split(' ').map((n) => n[0]).join('').slice(0, 2)

  return (
    <div className={cn(
      'group rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm cursor-pointer',
      cfg.card
    )}>
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Name + status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{reservation.guestName}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 font-medium', cfg.badge)}>
                <StatusIcon className="size-2.5 mr-1" />
                {cfg.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                  }
                >
                  <MoreVertical className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {reservation.status === 'confirmed' && (
                    <DropdownMenuItem>Seat Guests</DropdownMenuItem>
                  )}
                  <DropdownMenuItem>Edit Reservation</DropdownMenuItem>
                  <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {reservation.date === '2024-01-15' ? 'Today' : 'Tomorrow'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {reservation.time}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {reservation.guestCount} guests
            </span>
            {table && (
              <span className="flex items-center gap-1 text-foreground font-medium">
                Table {table.number}
                {table.section === 'vip' && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1">VIP</Badge>
                )}
              </span>
            )}
          </div>

          {/* Contact */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="size-3" />
              {reservation.guestPhone}
            </span>
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="mt-2.5 rounded-lg bg-warning/10 border border-warning/20 px-3 py-1.5 text-xs text-warning/90">
              {reservation.notes}
            </div>
          )}

          {/* Prepayment */}
          {reservation.prepayment && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" />
              <span>Prepaid ₹{reservation.prepayment.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      </div>

      {/* CTA for confirmed */}
      {reservation.status === 'confirmed' && (
        <>
          <Separator className="my-3" />
          <Button size="sm" className="w-full h-8 text-xs gap-1.5">
            Seat Guests
            <ChevronRight className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}

// Summary stats
const summaryStats = [
  { label: "Today's Bookings", value: 3, sub: '2 tonight' },
  { label: 'Expected Covers', value: 15, sub: 'guests tonight' },
  { label: 'Pending Confirmation', value: 1, sub: 'needs action' },
  { label: 'Avg Party Size', value: '4.6', sub: 'per table' },
]

export function ReservationsView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = reservations.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchSearch = r.guestName.toLowerCase().includes(search.toLowerCase()) ||
      r.guestPhone.includes(search)
    return matchStatus && matchSearch
  })

  const todayCount = reservations.filter((r) => r.date === '2024-01-15').length
  const tonightCount = reservations.filter(
    (r) => r.date === '2024-01-15' && r.status === 'confirmed'
  ).length

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content: reservation list + timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Reservations list (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guest name or phone..."
                className="pl-8 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="size-3.5" />
              Filter
            </Button>
            <Button size="sm" className="h-9 gap-1.5">
              <Plus className="size-3.5" />
              New Reservation
            </Button>
          </div>

          {/* Status tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({reservations.length})</TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed ({reservations.filter((r) => r.status === 'confirmed').length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({reservations.filter((r) => r.status === 'pending').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Cards */}
          <ScrollArea className="max-h-[600px]">
            <div className="flex flex-col gap-3 pr-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <p className="text-sm text-muted-foreground">No reservations found</p>
                </div>
              ) : (
                filtered.map((r) => <ReservationCard key={r.id} reservation={r} />)
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Timeline sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tonight&apos;s Timeline</CardTitle>
            <CardDescription className="text-xs">Booking slots for today</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-1">
              {timeSlots.map((slot) => {
                const slotRes = reservations.filter((r) => r.time === slot && r.date === '2024-01-15')
                return (
                  <div key={slot} className="flex gap-3">
                    {/* Time label */}
                    <span className="w-12 shrink-0 pt-2.5 text-xs font-mono text-muted-foreground">
                      {slot}
                    </span>

                    {/* Slot content */}
                    <div className="flex-1 min-h-[40px] border-l border-border pl-3 pb-1">
                      {slotRes.length === 0 ? (
                        <div className="flex h-8 items-center">
                          <span className="text-xs text-muted-foreground/40">Available</span>
                        </div>
                      ) : (
                        slotRes.map((r) => (
                          <div
                            key={r.id}
                            className={cn(
                              'rounded-lg px-2.5 py-1.5 mb-1 border text-xs',
                              statusConfig[r.status].card
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium truncate">{r.guestName}</span>
                              <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                                <Users className="size-2.5" />
                                {r.guestCount}
                              </span>
                            </div>
                            <span className="text-muted-foreground">
                              T{tables.find((t) => t.id === r.tableId)?.number}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
