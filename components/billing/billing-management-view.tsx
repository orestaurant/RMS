'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Receipt,
  IndianRupee,
  Search,
  Filter,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  Heart,
  TrendingUp,
  Percent,
  Banknote,
  QrCode,
  CreditCard,
  User,
  Calendar,
  Eye,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { BillSettlementModal } from '@/components/billing/bill-settlement-modal'
import { cn } from '@/lib/utils'

interface BillRecord {
  id: string
  billNumber: string
  orderNumber: string
  tableId?: string
  tableNumber: string
  customerName: string
  customerPhone: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  tipAmount: number
  grandTotal: number
  status: string
  paymentStatus: string
  paymentMethod: string
  paidAt?: string
  createdAt: string
  waiterId?: string
  waiterName?: string
  items: Array<{
    id: string
    name: string
    quantity: number
    price: number
    total: number
  }>
}

interface SalesSummary {
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  totalTaxCollected: number
  totalTipsCollected: number
  waiterTipsSummary: Array<{
    waiterName: string
    totalTips: number
    count: number
  }>
  totalBills: number
  paymentMethods: {
    upi: number
    cash: number
    card: number
    wallet: number
  }
}

export function BillingManagementView() {
  const [bills, setBills] = useState<BillRecord[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('all')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  // Selected Bill for Settle / View Modal
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null)
  const [printableBill, setPrintableBill] = useState<BillRecord | null>(null)

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let url = '/api/bills?'
      if (dateFilter === 'today') url += 'date=today&'
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`

      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch billing data')
      }

      setBills(json.data.bills || [])
      setSummary(json.data.salesSummary || null)
    } catch (err: any) {
      console.error('Error loading billing records:', err)
      setError(err.message || 'Unable to retrieve invoices.')
    } finally {
      setLoading(false)
    }
  }, [dateFilter, search])

  useEffect(() => {
    fetchBills()
    const timer = setInterval(fetchBills, 12000)
    return () => clearInterval(timer)
  }, [fetchBills])

  // Filtered bills
  const filteredBills = bills.filter((b) => {
    // Status filter
    if (statusFilter === 'active') {
      const isPaid = b.status === 'PAID' || b.paymentStatus === 'completed'
      if (isPaid) return false
    } else if (statusFilter === 'paid') {
      const isPaid = b.status === 'PAID' || b.paymentStatus === 'completed'
      if (!isPaid) return false
    }

    // Payment method filter
    if (methodFilter !== 'all') {
      if ((b.paymentMethod || '').toLowerCase() !== methodFilter.toLowerCase()) {
        return false
      }
    }

    return true
  })

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="size-6 text-primary" />
              Billing & Invoices
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/25 font-bold">
              Live POS Ledger
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage table invoices, apply manager discounts, process settlements, and audit waiter tip distributions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
            <TabsList className="h-9">
              <TabsTrigger value="today" className="text-xs font-bold">
                Today
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs font-bold">
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchBills}
            disabled={loading}
            className="h-9 px-3 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          {error}
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="p-4 rounded-2xl bg-card border-border/80 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Total Revenue
          </span>
          <div className="text-xl font-black text-foreground mt-1 font-mono">
            ₹{(summary?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {summary?.totalBills || 0} bills issued
          </span>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Paid / Settled
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            ₹{(summary?.paidRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Collected into cash/bank
          </span>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-amber-500/30 bg-amber-500/5 shadow-xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
            Active / Pending
          </span>
          <div className="text-xl font-black text-amber-500 mt-1 font-mono">
            ₹{(summary?.pendingRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Tables currently dining
          </span>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border/80 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            GST Tax Collected
          </span>
          <div className="text-xl font-black text-foreground mt-1 font-mono">
            ₹{(summary?.totalTaxCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            CGST + SGST breakdown
          </span>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-rose-500/30 bg-rose-500/5 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
            <Heart className="size-3 fill-rose-500" />
            Total Server Tips
          </span>
          <div className="text-xl font-black text-rose-500 mt-1 font-mono">
            ₹{(summary?.totalTipsCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            100% credited to waiters
          </span>
        </Card>
      </div>

      {/* Waiter Tips Summary Breakdown */}
      {summary?.waiterTipsSummary && summary.waiterTipsSummary.length > 0 && (
        <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-muted/20 border-b border-border/60">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <Heart className="size-3.5 text-rose-500 fill-rose-500" />
              Waiter Tip Ledger Distribution
            </CardTitle>
            <CardDescription className="text-[11px]">
              Itemized tip earnings credited to individual servers for this period
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              <div className="grid grid-cols-3 p-3 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase">
                <span>Waiter / Server</span>
                <span className="text-center">Tables Tipped</span>
                <span className="text-right">Total Tips Credited</span>
              </div>
              {summary.waiterTipsSummary.map((w, idx) => (
                <div key={idx} className="grid grid-cols-3 p-3 text-xs items-center hover:bg-muted/10">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                      {w.waiterName.slice(0, 1)}
                    </div>
                    <span className="font-semibold text-foreground">{w.waiterName}</span>
                  </div>
                  <div className="text-center font-mono text-muted-foreground">
                    {w.count} tables
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{w.totalTips.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 rounded-2xl border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs font-bold">
                  All ({bills.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs font-bold text-amber-500">
                  Active / Requested
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs font-bold text-emerald-500">
                  Paid
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground"
            >
              <option value="all">All Payment Methods</option>
              <option value="upi">UPI / QR</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Bill #, Table, Server..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>
      </Card>

      {/* Bills Data Table */}
      <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Table</th>
                <th className="py-3 px-3">Server / Waiter</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">Tax (5%)</th>
                <th className="py-3 px-3 text-right">Server Tip</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Method</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    No bills matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => {
                  const isPaid = b.status === 'PAID' || b.paymentStatus === 'completed'
                  const isRequested = b.status === 'REQUESTED'

                  return (
                    <tr key={b.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {b.billNumber}
                        <span className="block text-[10px] text-muted-foreground font-sans font-normal">
                          {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <Badge variant="outline" className="text-xs font-bold">
                          {b.tableNumber}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-3 text-muted-foreground">
                        {b.waiterName || 'Staff'}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-foreground">
                          {b.items.reduce((s, i) => s + i.quantity, 0)} items
                        </span>
                        <span className="block text-[10px] text-muted-foreground truncate max-w-[130px]">
                          {b.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">
                        ₹{b.subtotal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">
                        ₹{b.taxAmount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono">
                        {b.tipAmount > 0 ? (
                          <span className="text-emerald-500 font-bold">+₹{b.tipAmount.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-extrabold text-foreground text-sm">
                        ₹{b.grandTotal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-extrabold capitalize px-2 py-0.5',
                            isPaid
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                              : isRequested
                              ? 'border-amber-500/50 bg-amber-500/20 text-amber-500 animate-pulse'
                              : 'border-primary/40 bg-primary/10 text-primary'
                          )}
                        >
                          {isRequested ? '🔔 Requested' : b.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono font-bold text-[11px] uppercase text-muted-foreground">
                        {b.paymentMethod || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid ? (
                            <Button
                              size="sm"
                              onClick={() => setSelectedBill(b)}
                              className="h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                            >
                              <Receipt className="size-3" />
                              Settle
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPrintableBill(b)}
                              className="h-7 px-2 text-xs font-semibold gap-1"
                            >
                              <Printer className="size-3" />
                              Receipt
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bill Settlement Modal */}
      {selectedBill && (
        <BillSettlementModal
          open={!!selectedBill}
          onOpenChange={(open) => {
            if (!open) setSelectedBill(null)
          }}
          tableId={selectedBill.tableId}
          tableNumber={selectedBill.tableNumber}
          waiterName={selectedBill.waiterName}
          onSuccess={() => {
            fetchBills()
          }}
        />
      )}

      {/* Printable Receipt Preview Modal */}
      {printableBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white text-black rounded-2xl shadow-2xl p-6 font-mono text-xs space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-base font-black">SPICE GARDEN RESTAURANT</h2>
              <p className="text-[11px] text-zinc-600">GSTIN: 27AABCS1429B1ZB</p>
              <p className="text-[11px] text-zinc-600">Table: {printableBill.tableNumber}</p>
              <p className="text-[11px] text-zinc-600">
                Invoice #{printableBill.billNumber} · {new Date(printableBill.createdAt).toLocaleDateString()}
              </p>
            </div>

            <Separator className="bg-zinc-300" />

            <div className="space-y-1.5">
              {printableBill.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {it.quantity}x {it.name}
                  </span>
                  <span>₹{it.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Separator className="bg-zinc-300" />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{printableBill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (2.5%)</span>
                <span>₹{(printableBill.taxAmount / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (2.5%)</span>
                <span>₹{(printableBill.taxAmount / 2).toFixed(2)}</span>
              </div>
              {printableBill.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-₹{printableBill.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {printableBill.tipAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Server Tip ({printableBill.waiterName || 'Staff'})</span>
                  <span>₹{printableBill.tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="bg-zinc-300 my-1" />
              <div className="flex justify-between text-sm font-black">
                <span>GRAND TOTAL</span>
                <span>₹{printableBill.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>Payment Mode</span>
                <span className="uppercase">{printableBill.paymentMethod}</span>
              </div>
            </div>

            <Separator className="bg-zinc-300" />

            <p className="text-center text-[10px] text-zinc-500">
              Thank you for dining with us! Have a wonderful day!
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-9 rounded-xl text-xs"
                onClick={() => setPrintableBill(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1 h-9 rounded-xl text-xs font-bold gap-1 bg-black text-white hover:bg-zinc-800"
                onClick={() => window.print()}
              >
                <Printer className="size-3.5" /> Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

