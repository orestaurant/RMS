'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  History,
  Calendar,
  Users,
  Receipt,
  Search,
  Loader2,
  Clock,
  IndianRupee,
  Phone,
  CheckCircle2,
  CalendarDays,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaiterHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WaiterHistoryModal({ open, onOpenChange }: WaiterHistoryModalProps) {
  const [range, setRange] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [search, setSearch] = useState('')
  const [historyTab, setHistoryTab] = useState<'customer' | 'booking' | 'table'>('customer')

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    customerHistory: any[]
    bookingHistory: any[]
    tableHistory: any[]
    summary?: any
  }>({
    customerHistory: [],
    bookingHistory: [],
    tableHistory: [],
  })

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      let url = `/api/waiter/history?range=${range}`
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (range === 'custom' && customStart) {
        url += `&startDate=${encodeURIComponent(customStart)}`
        if (customEnd) url += `&endDate=${encodeURIComponent(customEnd)}`
      }

      const res = await fetch(url)
      const json = await res.json()
      if (res.ok && json.success) {
        setData(json.data)
      }
    } catch (e) {
      console.warn('Failed to fetch history:', e)
    } finally {
      setLoading(false)
    }
  }, [range, customStart, customEnd, search])

  useEffect(() => {
    if (open) {
      fetchHistory()
    }
  }, [open, fetchHistory])

  const { customerHistory, bookingHistory, tableHistory, summary } = data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        <DialogHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <History className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-foreground">
                  Restaurant History & Archive
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Date-filtered records for Customer Orders, Table Bookings, and Floor Settlements.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Date Filter & Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Range Pills */}
            <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border">
              {(['today', 'yesterday', 'week', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all',
                    range === r
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {r === 'week' ? 'Last 7 Days' : r}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                placeholder="Search guest, phone, table..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-7 text-xs bg-card rounded-xl"
              />
            </div>
          </div>

          {/* Custom Date Pickers if range is custom */}
          {range === 'custom' && (
            <div className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-xl border border-border">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs bg-card"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs bg-card"
              />
              <Button size="sm" onClick={fetchHistory} className="h-8 text-xs font-bold">
                Apply
              </Button>
            </div>
          )}

          {/* Summary Stat Cards */}
          {summary && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block font-medium">Orders Count</span>
                <span className="font-mono font-bold text-base text-foreground">{summary.totalOrders}</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block font-medium">Reservations</span>
                <span className="font-mono font-bold text-base text-foreground">{summary.totalBookings}</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block font-medium">Settled Revenue</span>
                <span className="font-mono font-bold text-base text-primary">₹{summary.totalRevenue.toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* 3 Main History Tabs */}
          <Tabs value={historyTab} onValueChange={(v: any) => setHistoryTab(v)}>
            <TabsList className="grid grid-cols-3 w-full h-9">
              <TabsTrigger value="customer" className="text-xs font-bold gap-1.5">
                <Users className="size-3.5" />
                Customer History ({customerHistory.length})
              </TabsTrigger>
              <TabsTrigger value="booking" className="text-xs font-bold gap-1.5">
                <CalendarDays className="size-3.5" />
                Booking History ({bookingHistory.length})
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs font-bold gap-1.5">
                <Receipt className="size-3.5" />
                Table History ({tableHistory.length})
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 text-primary animate-spin" />
                <span>Loading history records...</span>
              </div>
            ) : (
              <>
                {/* 1. Customer History View */}
                <TabsContent value="customer" className="space-y-2 mt-3">
                  {customerHistory.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No customer order history found.</div>
                  ) : (
                    customerHistory.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{c.customerName}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 h-4">
                              Table {c.tableNumber}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1.5 h-4 capitalize text-primary border-primary/30">
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {c.itemsSummary || `${c.itemCount} dishes`}
                          </p>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="size-2.5" />
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-primary text-sm">
                            ₹{c.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* 2. Booking History View */}
                <TabsContent value="booking" className="space-y-2 mt-3">
                  {bookingHistory.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No booking records found.</div>
                  ) : (
                    bookingHistory.map((b) => (
                      <div key={b.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{b.guestName}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-amber-500/40 text-amber-500">
                              {b.guestCount} Guests
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1.5 h-4">
                              {b.tableNumber}
                            </Badge>
                          </div>
                          {b.guestPhone && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Phone className="size-2.5" />
                              {b.guestPhone}
                            </p>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="size-2.5" />
                            {new Date(b.reservationTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {b.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* 3. Table History View */}
                <TabsContent value="table" className="space-y-2 mt-3">
                  {tableHistory.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No table settlement records found.</div>
                  ) : (
                    tableHistory.map((t) => (
                      <div key={t.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">Table {t.tableNumber}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">#{t.billNumber}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                              {t.paymentMethod}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Server: {t.waiterName}
                          </p>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="size-2.5" />
                            {new Date(t.paidAt || t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-foreground text-sm">
                            ₹{t.grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
