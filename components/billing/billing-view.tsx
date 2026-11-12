'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  Printer,
  Receipt,
  CreditCard,
  Wallet,
  QrCode,
  FileText,
  X,
  RefreshCw,
  ShieldCheck,
  BookOpen,
} from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface BillItem {
  name: string
  quantity: number
  price: number
  total: number
}

interface Bill {
  id: string
  billNumber: string
  orderNumber: string
  tableNumber: string
  customerName: string
  customerPhone: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  cgst: number
  sgst: number
  serviceCharge: number
  totalAmount: number
  paymentStatus: 'paid' | 'pending' | 'overdue'
  paymentMethod: 'upi' | 'cash' | 'card' | 'credit'
  createdAt: string
  items: BillItem[]
}

export function BillingView() {
  const [activeTab, setActiveTab] = useState<'bills' | 'sales'>('bills')

  // Real Bills State
  const [bills, setBills] = useState<Bill[]>([])
  const [salesSummary, setSalesSummary] = useState<any>({
    totalRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    totalTaxCollected: 0,
    totalBills: 0,
    paymentMethods: { upi: 0, cash: 0, card: 0, credit: 0 },
  })
  const [loadingBills, setLoadingBills] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all')

  // Thermal Printing Modal
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  // Generate Bill Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [newBillForm, setNewBillForm] = useState({
    tableNumber: '',
    customerName: '',
    customerPhone: '',
    paymentMethod: 'upi' as 'upi' | 'cash' | 'card' | 'credit',
    discount: 0,
    itemsText: '',
  })

  // Fetch Real Bills & Sales Ledger
  const fetchBills = async () => {
    try {
      setLoadingBills(true)
      const res = await fetch(`/api/bills?status=${statusFilter}&search=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()
      if (data.success && data.data) {
        setBills(data.data.bills || [])
        if (data.data.salesSummary) {
          setSalesSummary(data.data.salesSummary)
        }
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err)
    } finally {
      setLoadingBills(false)
    }
  }

  useEffect(() => {
    fetchBills()
  }, [statusFilter])

  // Generate QR Code when print modal opens
  useEffect(() => {
    if (selectedBillForPrint) {
      const upiUri = `upi://pay?pa=spicegarden@okhdfcbank&pn=RestoSphere%20Bistro&am=${selectedBillForPrint.totalAmount}&cu=INR&tn=${encodeURIComponent(selectedBillForPrint.billNumber)}`
      QRCode.toDataURL(upiUri, { width: 140, margin: 1, errorCorrectionLevel: 'M' })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(''))
    } else {
      setQrCodeDataUrl('')
    }
  }, [selectedBillForPrint])

  // Direct print trigger handler
  const handlePrintBill = (bill: Bill) => {
    setSelectedBillForPrint(bill)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.print()
      }
    }, 450)
  }

  // Filter bills in client
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchSearch =
        searchTerm === '' ||
        b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'all' || b.paymentStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [bills, searchTerm, statusFilter])

  // Handle Mark Paid
  const handleMarkPaid = async (bill: Bill, method: 'upi' | 'cash' | 'card' | 'credit') => {
    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? { ...b, paymentStatus: 'paid', paymentMethod: method } : b))
    )
  }

  // Handle Generate New Bill form submit
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()

    // Parse items text
    const lines = newBillForm.itemsText.split('\n').filter((l) => l.trim())
    const items = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim())
      const name = parts[0] || 'Menu Item'
      const quantity = Number(parts[1]) || 1
      const price = Number(parts[2]) || 150
      return { name, quantity, price, total: quantity * price }
    })

    const subtotal = items.reduce((s, it) => s + it.total, 0)

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: newBillForm.tableNumber || 'Counter',
          customerName: newBillForm.customerName || 'Walk-in Guest',
          customerPhone: newBillForm.customerPhone || '',
          paymentMethod: newBillForm.paymentMethod,
          discount: Number(newBillForm.discount) || 0,
          items: items.length > 0 ? items : [{ name: 'Dining Platter', quantity: 1, price: 350, total: 350 }],
          subtotal: subtotal > 0 ? subtotal : 350,
        }),
      })

      const data = await res.json()
      if (data.success && data.data) {
        setBills((prev) => [data.data, ...prev])
        setShowGenerateModal(false)
        handlePrintBill(data.data) // Open print preview & trigger print dialog
        fetchBills()
      }
    } catch (err) {
      console.error('Failed to create bill:', err)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 pb-24">
      {/* ────────────────── TOP STATS & SALES LEDGER RECONCILIATION ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <Card className="p-4 bg-gradient-to-br from-card to-card/60 border-border/70 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Sales</p>
              <p className="text-2xl font-black text-foreground">
                ₹{salesSummary.totalRevenue?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-[11px] text-muted-foreground">Across {salesSummary.totalBills} bills generated</p>
            </div>
            <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="size-5" />
            </div>
          </div>
        </Card>

        {/* Paid Revenue */}
        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-card border-emerald-500/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Collected (Paid)
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{salesSummary.paidRevenue?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-[11px] text-muted-foreground">UPI + Cash + Card settled</p>
            </div>
            <div className="size-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
          </div>
        </Card>

        {/* Outstanding / Credit */}
        <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-card border-amber-500/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Pending / Credit
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                ₹{salesSummary.pendingRevenue?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-[11px] text-muted-foreground">Unpaid pending orders</p>
            </div>
            <div className="size-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <AlertCircle className="size-5" />
            </div>
          </div>
        </Card>

        {/* Tax Collected (CGST + SGST) */}
        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-card border-blue-500/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                GST Collected (5%)
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                ₹{Math.round(salesSummary.totalTaxCollected || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-muted-foreground">CGST 2.5% + SGST 2.5%</p>
            </div>
            <div className="size-11 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* ────────────────── NAVIGATION TABS (CLEAN 3 TABS) ────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
          <button
            onClick={() => setActiveTab('bills')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === 'bills'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Receipt className="size-4 text-primary" />
            <span>Bills & Invoicing</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
              {bills.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === 'sales'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TrendingUp className="size-4 text-emerald-500" />
            <span>Sales Ledger</span>
          </button>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBills}
            className="h-9 gap-1.5 rounded-xl text-xs font-semibold"
          >
            <RefreshCw className={cn('size-3.5', loadingBills && 'animate-spin')} />
            Sync
          </Button>
          <Button
            size="sm"
            onClick={() => setShowGenerateModal(true)}
            className="h-9 gap-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="size-4" />
            Generate New Bill
          </Button>
        </div>
      </div>

      {/* ────────────────── TAB 1: BILLS & INVOICING (CLEAN TABLE) ────────────────── */}
      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search Bill #, Table, Guest, Order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'paid', 'pending', 'overdue'] as const).map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className="h-8 text-xs capitalize rounded-lg px-3"
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          {/* Bills Table */}
          <Card className="rounded-2xl overflow-hidden border-border/80 shadow-xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[140px]">Bill Number</TableHead>
                  <TableHead>Table / Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Tax (5%)</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {bill.billNumber}
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">
                          {bill.tableNumber}
                        </span>
                        <span className="block font-mono text-[10px] text-muted-foreground mt-0.5">
                          {bill.orderNumber}
                        </span>
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold text-xs text-foreground">{bill.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{bill.customerPhone || 'Walk-in'}</p>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {bill.items.length} items
                        <span className="block text-[10px] text-muted-foreground/80 truncate max-w-[150px]">
                          {bill.items.map((i) => i.name).join(', ')}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        ₹{bill.taxAmount.toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-sm font-extrabold text-foreground">
                        ₹{bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center gap-1 uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted border border-border">
                          {bill.paymentMethod === 'upi' && <QrCode className="size-3 text-emerald-500" />}
                          {bill.paymentMethod === 'cash' && <Wallet className="size-3 text-amber-500" />}
                          {bill.paymentMethod === 'card' && <CreditCard className="size-3 text-blue-500" />}
                          {bill.paymentMethod === 'credit' && <BookOpen className="size-3 text-rose-500" />}
                          {bill.paymentMethod}
                        </span>
                      </TableCell>

                      <TableCell>
                        {bill.paymentStatus === 'paid' && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Paid
                          </Badge>
                        )}
                        {bill.paymentStatus === 'pending' && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                            Pending
                          </Badge>
                        )}
                        {bill.paymentStatus === 'overdue' && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 80mm Print Thermal Bill (Direct Instant Print) */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 px-3 text-xs font-semibold rounded-lg hover:border-primary hover:text-primary active:scale-95"
                            onClick={() => handlePrintBill(bill)}
                            title="Print 80mm Thermal Receipt (Direct)"
                          >
                            <Printer className="size-3.5 text-primary" />
                            <span>Print</span>
                          </Button>

                          {/* Quick Settle if pending */}
                          {bill.paymentStatus !== 'paid' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 px-2.5 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleMarkPaid(bill, 'upi')}
                            >
                              Settle
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground text-xs">
                      No invoices found. Click "Generate New Bill" above to create a bill.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ────────────────── TAB 2: SALES LEDGER ────────────────── */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Payment Method Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* UPI */}
            <Card className="p-4 rounded-2xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <QrCode className="size-4" />
                    <span>UPI Collections</span>
                  </div>
                  <p className="text-2xl font-black mt-2">
                    ₹{salesSummary.paymentMethods?.upi?.toLocaleString('en-IN') || '0'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {salesSummary.totalRevenue > 0
                      ? `${Math.round(((salesSummary.paymentMethods?.upi || 0) / salesSummary.totalRevenue) * 100)}% of total sales`
                      : '0%'}
                  </p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                  Fastest
                </Badge>
              </div>
            </Card>

            {/* Cash */}
            <Card className="p-4 rounded-2xl border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Wallet className="size-4" />
                    <span>Cash in Drawer</span>
                  </div>
                  <p className="text-2xl font-black mt-2">
                    ₹{salesSummary.paymentMethods?.cash?.toLocaleString('en-IN') || '0'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {salesSummary.totalRevenue > 0
                      ? `${Math.round(((salesSummary.paymentMethods?.cash || 0) / salesSummary.totalRevenue) * 100)}% of total sales`
                      : '0%'}
                  </p>
                </div>
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]">
                  Cash Box
                </Badge>
              </div>
            </Card>

            {/* Card */}
            <Card className="p-4 rounded-2xl border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <CreditCard className="size-4" />
                    <span>Card POS Machine</span>
                  </div>
                  <p className="text-2xl font-black mt-2">
                    ₹{salesSummary.paymentMethods?.card?.toLocaleString('en-IN') || '0'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {salesSummary.totalRevenue > 0
                      ? `${Math.round(((salesSummary.paymentMethods?.card || 0) / salesSummary.totalRevenue) * 100)}% of total sales`
                      : '0%'}
                  </p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px]">
                  EDC Terminal
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ────────────────── 80MM THERMAL RECEIPT PRINT MODAL ────────────────── */}
      {selectedBillForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-sm bg-background border border-border shadow-2xl rounded-3xl p-6 text-foreground my-8">
            {/* Modal Actions Header */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-border/80 mb-4">
              <div className="flex items-center gap-2">
                <Printer className="size-5 text-primary" />
                <h3 className="text-sm font-bold">80mm Thermal Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedBillForPrint(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* ── ACTUAL 80MM THERMAL RECEIPT CONTAINER (ID for print css) ── */}
            <div
              id="thermal-receipt"
              className="bg-white text-black p-5 rounded-xl border border-dashed border-gray-300 font-mono text-xs leading-relaxed shadow-sm"
              style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}
            >
              {/* Receipt Header */}
              <div className="text-center space-y-1">
                <h2 className="text-base font-black tracking-tight uppercase">RESTOSPHERE BISTRO</h2>
                <p className="text-[10px] text-gray-600 font-medium">Authentic Fine Dine & Bar</p>
                <p className="text-[10px] text-gray-600">GSTIN: 27AABCS1429B1ZB | FSSAI: 11521034000182</p>
                <p className="text-[10px] text-gray-600">104, High Street Park, Pune - 411001</p>
                <p className="text-[10px] text-gray-600">Tel: +91 98765 43210</p>
              </div>

              <div className="my-2 border-b border-black border-dashed" />

              {/* Order & Table Meta */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Bill No: <b>{selectedBillForPrint.billNumber}</b></span>
                  <span>Table: <b>{selectedBillForPrint.tableNumber}</b></span>
                </div>
                <div className="flex justify-between">
                  <span>Order: <b>{selectedBillForPrint.orderNumber}</b></span>
                  <span>Covers: <b>2</b></span>
                </div>
                <div className="flex justify-between">
                  <span>Date: {new Date(selectedBillForPrint.createdAt).toLocaleDateString()}</span>
                  <span>Time: {new Date(selectedBillForPrint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Guest: {selectedBillForPrint.customerName}</span>
                  <span>Server: POS Cashier</span>
                </div>
              </div>

              <div className="my-2 border-b border-black border-dashed" />

              {/* Table of Items */}
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Rate</th>
                    <th className="text-right py-1">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedBillForPrint.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1 font-sans text-[11px] font-semibold">{item.name}</td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">₹{item.price.toFixed(0)}</td>
                      <td className="text-right py-1 font-bold">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="my-2 border-b border-black border-dashed" />

              {/* Totals & Tax Calculation */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Sub Total:</span>
                  <span>₹{selectedBillForPrint.subtotal.toFixed(2)}</span>
                </div>
                {selectedBillForPrint.discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount:</span>
                    <span>-₹{selectedBillForPrint.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700">
                  <span>CGST @ 2.5%:</span>
                  <span>₹{selectedBillForPrint.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>SGST @ 2.5%:</span>
                  <span>₹{selectedBillForPrint.sgst.toFixed(2)}</span>
                </div>

                <div className="my-1 border-b border-black" />

                <div className="flex justify-between text-sm font-black pt-0.5">
                  <span>TOTAL PAYABLE:</span>
                  <span>₹{selectedBillForPrint.totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>Payment Mode:</span>
                  <span className="uppercase font-bold">{selectedBillForPrint.paymentMethod} ({selectedBillForPrint.paymentStatus})</span>
                </div>
              </div>

              <div className="my-2 border-b border-black border-dashed" />

              {/* UPI QR Code Payment Box */}
              <div className="text-center space-y-1.5 py-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-800">
                  Scan & Pay With Any UPI App
                </p>
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="UPI QR Code"
                    className="w-28 h-28 mx-auto border border-gray-300 p-1 rounded-md bg-white"
                  />
                ) : (
                  <div className="w-28 h-28 mx-auto border border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400">
                    UPI QR Code
                  </div>
                )}
                <p className="text-[9px] text-gray-600">GPay · PhonePe · Paytm · BHIM</p>
                <p className="text-[8px] text-gray-500 font-mono">VPA: spicegarden@okhdfcbank</p>
              </div>

              <div className="my-2 border-b border-black border-dashed" />

              {/* Footer */}
              <div className="text-center space-y-0.5 text-[9px] text-gray-600">
                <p className="font-bold">Thank you for dining with us!</p>
                <p>Have a wonderful day & visit again.</p>
                <p className="text-[8px] text-gray-400 pt-1">Powered by RestoSphere Restaurant OS</p>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="no-print mt-5 flex gap-2.5">
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-xs h-10 font-bold"
                onClick={() => setSelectedBillForPrint(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1 rounded-xl text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.print()
                  }
                }}
              >
                <Printer className="size-4" />
                Print (80mm)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── GENERATE NEW BILL MODAL ────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                <h3 className="text-base font-bold">Generate New Restaurant Bill</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Table / Seating
                  </label>
                  <Input
                    value={newBillForm.tableNumber}
                    onChange={(e) => setNewBillForm({ ...newBillForm, tableNumber: e.target.value })}
                    placeholder="e.g. Table 4"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={newBillForm.paymentMethod}
                    onChange={(e) =>
                      setNewBillForm({
                        ...newBillForm,
                        paymentMethod: e.target.value as any,
                      })
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="cash">Cash in Counter</option>
                    <option value="card">Card POS Machine</option>
                    <option value="credit">Pay Later / Tab</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Customer Name
                  </label>
                  <Input
                    value={newBillForm.customerName}
                    onChange={(e) => setNewBillForm({ ...newBillForm, customerName: e.target.value })}
                    placeholder="Guest Name (optional)"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={newBillForm.customerPhone}
                    onChange={(e) => setNewBillForm({ ...newBillForm, customerPhone: e.target.value })}
                    placeholder="+91 98765 43210 (optional)"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Ordered Items (Format: Item Name, Quantity, Price)
                </label>
                <textarea
                  rows={4}
                  value={newBillForm.itemsText}
                  onChange={(e) => setNewBillForm({ ...newBillForm, itemsText: e.target.value })}
                  placeholder="Butter Chicken, 1, 420&#10;Garlic Naan, 2, 70"
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">
                  One item per line. Automatically calculates 5% GST (CGST 2.5% + SGST 2.5%).
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Discount Amount (₹)
                </label>
                <Input
                  type="number"
                  value={newBillForm.discount}
                  onChange={(e) => setNewBillForm({ ...newBillForm, discount: Number(e.target.value) })}
                  placeholder="0"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs h-10 font-bold"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Generate & Print 80mm Bill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── PRINT MEDIA CSS STYLES (80MM THERMAL) ────────────────── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
