'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/hooks/useAuthContext'

export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'no_show' | 'seated'

export interface ReservationItem {
  id: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  tableId?: string | null
  tableNumber?: number | string | null
  tableName?: string
  tableSection?: string | null
  date: string
  time: string
  guestCount: number
  status: ReservationStatus
  notes?: string
  prepayment?: number
  createdAt?: string
}

export interface SimpleTable {
  id: string
  tableNumber: string
  capacity: number
  section: string
  status: string
}

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'seated' | 'cancelled'

const statusConfig: Record<
  ReservationStatus,
  {
    label: string
    icon: React.ElementType
    card: string
    badge: string
  }
> = {
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

const timeSlots = [
  '12:00', '13:00', '14:00', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
]

function ReservationCard({
  reservation,
  onUpdateStatus,
}: {
  reservation: ReservationItem
  onUpdateStatus: (id: string, status: ReservationStatus) => Promise<void>
}) {
  const normStatus: ReservationStatus = statusConfig[reservation.status]
    ? reservation.status
    : 'confirmed'
  const cfg = statusConfig[normStatus]
  const StatusIcon = cfg.icon

  const initials = reservation.guestName
    ? reservation.guestName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'G'

  const todayStr = new Date().toISOString().split('T')[0]
  const isToday = reservation.date === todayStr

  return (
    <div
      className={cn(
        'group rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm cursor-pointer',
        cfg.card
      )}
    >
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
                  {normStatus === 'confirmed' && (
                    <DropdownMenuItem onClick={() => onUpdateStatus(reservation.id, 'seated')}>
                      Seat Guests
                    </DropdownMenuItem>
                  )}
                  {normStatus === 'pending' && (
                    <DropdownMenuItem onClick={() => onUpdateStatus(reservation.id, 'confirmed')}>
                      Confirm Booking
                    </DropdownMenuItem>
                  )}
                  {normStatus !== 'cancelled' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onUpdateStatus(reservation.id, 'cancelled')}
                        className="text-destructive"
                      >
                        Cancel Reservation
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {isToday ? 'Today' : reservation.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {reservation.time}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {reservation.guestCount} guests
            </span>
            {reservation.tableNumber && (
              <span className="flex items-center gap-1 text-foreground font-medium">
                Table {reservation.tableNumber}
                {reservation.tableSection?.toLowerCase().includes('vip') && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                    VIP
                  </Badge>
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
            {reservation.guestEmail && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground hidden sm:inline-flex">
                <Mail className="size-3" />
                {reservation.guestEmail}
              </span>
            )}
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="mt-2.5 rounded-lg bg-warning/10 border border-warning/20 px-3 py-1.5 text-xs text-warning/90">
              {reservation.notes}
            </div>
          )}

          {/* Prepayment */}
          {reservation.prepayment ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" />
              <span>Prepaid ₹{reservation.prepayment.toLocaleString('en-IN')}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* CTA for confirmed */}
      {normStatus === 'confirmed' && (
        <>
          <Separator className="my-3" />
          <Button
            size="sm"
            onClick={() => onUpdateStatus(reservation.id, 'seated')}
            className="w-full h-8 text-xs gap-1.5"
          >
            Seat Guests
            <ChevronRight className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}

export function ReservationsView() {
  const { auth } = useAuthContext()
  const branchId = auth?.branchId

  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [tables, setTables] = useState<SimpleTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  // New Reservation modal state
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [resDate, setResDate] = useState(new Date().toISOString().split('T')[0])
  const [resTime, setResTime] = useState('19:30')
  const [guestCount, setGuestCount] = useState('2')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [notes, setNotes] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Fetch reservations from real DB API
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const resQuery = branchId ? `/api/reservations?branchId=${encodeURIComponent(branchId)}` : '/api/reservations'
      const tableQuery = branchId ? `/api/tables?branchId=${encodeURIComponent(branchId)}` : '/api/tables'

      const [resRes, tableRes] = await Promise.all([
        fetch(resQuery),
        fetch(tableQuery),
      ])

      const resData = await resRes.json()
      const tableData = await tableRes.json()

      if (!resRes.ok || !resData.success) {
        throw new Error(resData.message || 'Failed to fetch reservations')
      }

      setReservations(resData.data || [])
      if (tableData.success && Array.isArray(tableData.data)) {
        setTables(tableData.data)
      }
    } catch (err: any) {
      console.error('Failed to load reservations:', err)
      setError(err.message || 'Failed to load reservations')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  // Update reservation status in database
  const handleUpdateStatus = async (id: string, newStatus: ReservationStatus) => {
    try {
      // Optimistic update
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      )

      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!res.ok) {
        fetchReservations()
      }
    } catch (err) {
      console.error('Error updating reservation:', err)
      fetchReservations()
    }
  }

  // Handle Create Reservation
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim() || !guestPhone.trim()) {
      setCreateError('Guest name and phone number are required')
      return
    }

    try {
      setCreateLoading(true)
      setCreateError(null)

      const payload = {
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        reservationDate: resDate,
        reservationTime: resTime,
        numberOfGuests: parseInt(guestCount) || 2,
        tableId: selectedTableId || undefined,
        branchId: branchId || undefined,
        notes: notes.trim() || undefined,
        status: 'confirmed',
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create reservation')
      }

      setIsNewOpen(false)
      setGuestName('')
      setGuestPhone('')
      setGuestEmail('')
      setSelectedTableId('')
      setNotes('')
      fetchReservations()
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create reservation')
    } finally {
      setCreateLoading(false)
    }
  }

  // Filter reservations
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const q = search.toLowerCase()
      const matchSearch =
        !search ||
        r.guestName.toLowerCase().includes(q) ||
        r.guestPhone.includes(q) ||
        (r.tableNumber && String(r.tableNumber).includes(q))
      return matchStatus && matchSearch
    })
  }, [reservations, statusFilter, search])

  // Dynamic calculations from live database records
  const totalCovers = useMemo(() => {
    return reservations
      .filter((r) => r.status === 'confirmed' || r.status === 'seated')
      .reduce((sum, r) => sum + (r.guestCount || 0), 0)
  }, [reservations])

  const pendingCount = useMemo(() => {
    return reservations.filter((r) => r.status === 'pending').length
  }, [reservations])

  const confirmedCount = useMemo(() => {
    return reservations.filter((r) => r.status === 'confirmed').length
  }, [reservations])

  const seatedCount = useMemo(() => {
    return reservations.filter((r) => r.status === 'seated').length
  }, [reservations])

  const avgPartySize = useMemo(() => {
    if (reservations.length === 0) return '0.0'
    const total = reservations.reduce((sum, r) => sum + (r.guestCount || 0), 0)
    return (total / reservations.length).toFixed(1)
  }, [reservations])

  const summaryStats = [
    {
      label: 'Total Bookings',
      value: reservations.length,
      sub: reservations.length === 0 ? '0 confirmed' : `${confirmedCount} confirmed`,
    },
    {
      label: 'Expected Covers',
      value: totalCovers,
      sub: totalCovers === 0 ? '0 guests expected' : `${totalCovers} guests expected`,
    },
    {
      label: 'Pending Action',
      value: pendingCount,
      sub: pendingCount === 0 ? '0 needs confirmation' : `${pendingCount} needs confirmation`,
    },
    {
      label: 'Avg Party Size',
      value: avgPartySize,
      sub: 'guests per table',
    },
  ]

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* New Reservation Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
            <DialogDescription>
              Book a table for a guest. Saved directly to PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReservation} className="space-y-3.5 py-2">
            {createError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                {createError}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="guestName">Guest Full Name</Label>
              <Input
                id="guestName"
                placeholder="e.g. Rahul Sharma"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="guestPhone">Phone Number</Label>
                <Input
                  id="guestPhone"
                  placeholder="+91 98765 43210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guestEmail">Email (optional)</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  placeholder="guest@mail.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="resDate">Date</Label>
                <Input
                  id="resDate"
                  type="date"
                  value={resDate}
                  onChange={(e) => setResDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="resTime">Time</Label>
                <Input
                  id="resTime"
                  type="time"
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guestCount">Guests</Label>
                <Input
                  id="guestCount"
                  type="number"
                  min="1"
                  max="30"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tableSelect">Assign Table (optional)</Label>
              <select
                id="tableSelect"
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Auto-assign or Unassigned</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.tableNumber} ({t.section || 'Indoor'}, Seats {t.capacity}) - {t.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Special Requests / Notes</Label>
              <Input
                id="notes"
                placeholder="e.g. Birthday anniversary cake, window seat"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Confirm Booking
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5">
                {loading ? <span className="inline-block size-6 animate-pulse bg-muted rounded" /> : s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error notification */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchReservations()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

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
                placeholder="Search guest name, phone, or table..."
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchReservations()}
              disabled={loading}
              className="h-9 gap-1.5"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>

            <Button size="sm" onClick={() => setIsNewOpen(true)} className="h-9 gap-1.5">
              <Plus className="size-3.5" />
              New Reservation
            </Button>
          </div>

          {/* Status tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({reservations.length})</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed ({confirmedCount})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
              <TabsTrigger value="seated">Seated ({seatedCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Cards */}
          <ScrollArea className="max-h-[600px]">
            <div className="flex flex-col gap-3 pr-1">
              {loading && reservations.length === 0 ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-28 rounded-2xl border border-border bg-card/40 p-4 animate-pulse flex items-start gap-3"
                    >
                      <div className="size-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-48 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed rounded-2xl">
                  <UtensilsCrossed className="size-8 text-muted-foreground" />
                  <p className="text-sm font-semibold">No reservations found</p>
                  <p className="text-xs text-muted-foreground">
                    {search || statusFilter !== 'all'
                      ? 'No reservations matched your filter criteria.'
                      : 'No live bookings currently recorded in the database.'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsNewOpen(true)}
                    className="mt-2 text-xs"
                  >
                    Create First Reservation
                  </Button>
                </div>
              ) : (
                filtered.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Timeline sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Today&apos;s Timeline</CardTitle>
            <CardDescription className="text-xs">Live booking slots for today</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-1">
              {timeSlots.map((slot) => {
                // Find reservations matching slot hour or nearby
                const slotRes = reservations.filter((r) => {
                  const hour = r.time?.slice(0, 2)
                  const slotHour = slot.slice(0, 2)
                  return hour === slotHour
                })

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
                        slotRes.map((r) => {
                          const c = statusConfig[r.status] || statusConfig.confirmed
                          return (
                            <div
                              key={r.id}
                              className={cn('rounded-lg px-2.5 py-1.5 mb-1 border text-xs', c.card)}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-medium truncate">{r.guestName}</span>
                                <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                                  <Users className="size-2.5" />
                                  {r.guestCount}
                                </span>
                              </div>
                              <span className="text-muted-foreground">
                                {r.tableNumber ? `Table ${r.tableNumber}` : 'Unassigned'}
                              </span>
                            </div>
                          )
                        })
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
