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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Receipt,
  IndianRupee,
  CheckCircle2,
  Printer,
  Share2,
  Banknote,
  CreditCard,
  QrCode,
  Loader2,
  Clock,
  Heart,
  User,
  Send,
  Percent,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BillSettlementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableId?: string
  tableNumber: string | number
  waiterName?: string
  onSuccess?: () => void
}

export function BillSettlementModal({
  open,
  onOpenChange,
  tableId,
  tableNumber,
  waiterName,
  onSuccess,
}: BillSettlementModalProps) {
  const [loading, setLoading] = useState(false)
  const [bill, setBill] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Settlement & Discount state
  const [discountInput, setDiscountInput] = useState<string>('')
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [settledMethod, setSettledMethod] = useState<string>('')

  // WhatsApp link & Guest Phone
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [whatsAppSuccess, setWhatsAppSuccess] = useState(false)

  // Fetch or generate the bill
  const loadBill = useCallback(async () => {
    if (!tableNumber && !tableId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/bills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          tableNumber: String(tableNumber),
          source: 'waiter',
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to generate bill')
      }

      setBill(json.data)
      if (json.data.discountAmount > 0) {
        setDiscountInput(String(json.data.discountAmount))
      }
      if (json.data.customerPhone) {
        setCustomerPhone(json.data.customerPhone)
      }
      if (json.data.customerName) {
        setCustomerName(json.data.customerName)
      }
    } catch (err: any) {
      console.error('Error in BillSettlementModal:', err)
      setError(err.message || 'Unable to load bill for this table.')
    } finally {
      setLoading(false)
    }
  }, [tableId, tableNumber])

  useEffect(() => {
    if (open) {
      setPaySuccess(false)
      setWhatsAppSuccess(false)
      loadBill()
    }
  }, [open, loadBill])

  // Apply discount
  const handleApplyDiscount = async () => {
    if (!bill?.id) return
    try {
      setApplyingDiscount(true)
      setError(null)
      const discVal = Math.max(0, Number(discountInput || 0))

      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountAmount: discVal }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update discount')
      }

      setBill(json.data)
    } catch (err: any) {
      console.error('Discount error:', err)
      setError(err.message || 'Failed to apply discount')
    } finally {
      setApplyingDiscount(false)
    }
  }

  // Settle Bill
  const handleSettle = async (method: 'CASH' | 'UPI' | 'CARD') => {
    if (!bill?.id) return
    try {
      setPayLoading(true)
      setError(null)

      const res = await fetch(`/api/bills/${bill.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          customerPhone: customerPhone.trim() || undefined,
          customerName: customerName.trim() || undefined,
          discountAmount: discountInput ? Number(discountInput) : undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Payment settlement failed')
      }

      setBill(json.data.bill)
      setSettledMethod(method)
      setPaySuccess(true)
      onSuccess?.()
    } catch (err: any) {
      console.error('Settlement error:', err)
      setError(err.message || 'Settlement failed.')
    } finally {
      setPayLoading(false)
    }
  }

  // Send WhatsApp bill link to customer
  const handleSendWhatsAppLink = () => {
    if (!bill) return
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '')
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || '919876543210'

    const message = encodeURIComponent(
      `Hello! Thank you for dining at Spice Garden (Table ${tableNumber}). Your Invoice #${bill.billNumber} for ₹${Number(bill.grandTotal).toFixed(2)} is ready.\nSubtotal: ₹${Number(bill.subtotal).toFixed(2)}\nTax: ₹${Number(bill.taxAmount).toFixed(2)}${Number(bill.tipAmount) > 0 ? `\nServer Tip: ₹${Number(bill.tipAmount).toFixed(2)}` : ''}\nGrand Total: ₹${Number(bill.grandTotal).toFixed(2)}.\nPay via UPI: upi://pay?pa=spicegarden@okhdfcbank&pn=Spice%20Garden&am=${Number(bill.grandTotal).toFixed(2)}&cu=INR`
    )

    const waUrl = `https://wa.me/${targetPhone}?text=${message}`
    window.open(waUrl, '_blank')
    setWhatsAppSuccess(true)
    setTimeout(() => setWhatsAppSuccess(false), 4000)
  }

  // Handle Printing Bill
  const handlePrint = () => {
    window.print()
  }

  const subtotal = Number(bill?.subtotal || 0)
  const taxAmount = Number(bill?.taxAmount || 0)
  const tipAmount = Number(bill?.tipAmount || 0)
  const discountAmount = Number(bill?.discountAmount || 0)
  const grandTotal = Number(bill?.grandTotal || subtotal + taxAmount - discountAmount + tipAmount)

  const serverDisplayName =
    bill?.waiter?.name ||
    waiterName ||
    (bill?.waiter?.firstName ? `${bill.waiter.firstName} ${bill.waiter.lastName || ''}`.trim() : null) ||
    'Assigned Server'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        <DialogHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Receipt className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  Invoice & Settlement — Table {tableNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {bill?.billNumber || 'Generating bill...'} · Server: {serverDisplayName}
                </DialogDescription>
              </div>
            </div>
            {bill?.status && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-extrabold capitalize px-2.5 py-0.5',
                  bill.status === 'PAID'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                    : bill.status === 'REQUESTED'
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-500 animate-pulse'
                    : 'border-primary/40 bg-primary/10 text-primary'
                )}
              >
                {bill.status === 'REQUESTED' ? '🔔 Bill Requested' : bill.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">Fetching table orders and calculating bill...</p>
          </div>
        ) : paySuccess ? (
          /* Settlement Confirmation View */
          <div className="p-6 text-center space-y-4 overflow-y-auto">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">Table Settled Successfully!</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invoice #{bill?.billNumber} marked as PAID via {settledMethod}.
              </p>
              <Badge className="mt-2 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-xs px-2.5 py-0.5">
                Table {tableNumber} is now Available
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-left space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (GST)</span>
                <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Server Tip Settled ({serverDisplayName})</span>
                  <span className="font-mono">₹{tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1.5" />
              <div className="flex justify-between text-sm font-black text-foreground">
                <span>Total Collected</span>
                <span className="text-primary font-mono">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl font-bold text-xs gap-1.5"
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                Print Receipt
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl font-bold text-xs"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {/* Bill Requested Alert Banner */}
            {bill?.status === 'REQUESTED' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2.5 animate-pulse">
                <Clock className="size-4 shrink-0" />
                <span>Guest requested the bill from their mobile QR menu. Ready for settlement.</span>
              </div>
            )}

            {/* Itemized Order Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Itemized Dishes ({bill?.items?.length || 0})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrint}
                  className="h-7 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Printer className="size-3.5" />
                  Print
                </Button>
              </div>

              <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card overflow-hidden">
                {bill?.items && bill.items.length > 0 ? (
                  bill.items.map((it: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-md bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px]">
                          {it.quantity}x
                        </span>
                        <span className="font-semibold text-foreground">{it.name || it.itemName}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        ₹{Number(it.total || it.itemTotal || 0).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No items found on active orders.
                  </div>
                )}
              </div>
            </div>

            {/* Tip Highlight Widget if customer tipped */}
            {tipAmount > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Heart className="size-4 text-rose-500 fill-rose-500" />
                  <span>Customer Tip Added for {serverDisplayName}:</span>
                </div>
                <span className="font-mono font-black text-emerald-500 text-sm">
                  +₹{tipAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Discount Adjustment */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Percent className="size-3 text-primary" />
                Apply Discount (₹)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Discount in ₹ (e.g. 50)"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-card"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={applyingDiscount}
                  onClick={handleApplyDiscount}
                  className="h-9 px-3 rounded-xl text-xs font-bold"
                >
                  {applyingDiscount ? <Loader2 className="size-3 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            </div>

            {/* Guest WhatsApp for E-Bill */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Send className="size-3 text-primary" />
                Customer Phone for WhatsApp Invoice
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-card"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendWhatsAppLink}
                  className="h-9 px-3 rounded-xl text-xs font-bold gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                >
                  <Share2 className="size-3.5" />
                  WhatsApp
                </Button>
              </div>
              {whatsAppSuccess && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  WhatsApp bill link opened!
                </p>
              )}
            </div>

            {/* Bill Calculation Totals */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST Tax (5%)</span>
                <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Customer Tip</span>
                  <span className="font-mono">+₹{tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1.5" />
              <div className="flex justify-between text-sm font-black text-foreground">
                <span>Grand Total</span>
                <span className="text-primary font-mono text-base">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Settlement Action Footer */}
        {!paySuccess && (
          <div className="p-4 border-t border-border bg-card shrink-0 space-y-2">
            <p className="text-[11px] text-muted-foreground font-semibold text-center mb-1">
              Confirm Settlement & Free Table
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={loading || payLoading}
                onClick={() => handleSettle('CASH')}
                className="h-11 rounded-2xl font-bold text-xs gap-1.5 border-border hover:bg-muted"
              >
                <Banknote className="size-4 text-emerald-500" />
                <span>Mark Paid (Cash)</span>
              </Button>

              <Button
                variant="default"
                disabled={loading || payLoading}
                onClick={() => handleSettle('UPI')}
                className="h-11 rounded-2xl font-extrabold text-xs gap-1.5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              >
                <QrCode className="size-4" />
                <span>Mark Paid (UPI / Card)</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

