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
  Clock,
  Heart,
  QrCode,
  CreditCard,
  Banknote,
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
  User,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomerBillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableNumber: string | number
  tableOrders: any[]
  onSuccess?: () => void
}

export function CustomerBillModal({
  open,
  onOpenChange,
  tableNumber,
  tableOrders,
  onSuccess,
}: CustomerBillModalProps) {
  const [loading, setLoading] = useState(false)
  const [bill, setBill] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Tipping state
  const [selectedTip, setSelectedTip] = useState<number>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [isCustomTip, setIsCustomTip] = useState<boolean>(false)
  const [tipLoading, setTipLoading] = useState(false)
  const [tipSuccessMessage, setTipSuccessMessage] = useState<string | null>(null)

  // Payment state
  const [payLoading, setPayLoading] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [paidMethod, setPaidMethod] = useState<string>('')
  const [physicalRequested, setPhysicalRequested] = useState(false)
  const [showUpiQr, setShowUpiQr] = useState(false)

  // Guest details
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Check if at least one order has been served to unlock tipping
  const hasServedOrder = tableOrders.some((ord) => {
    const s = String(ord.status || '').toLowerCase()
    return s === 'served' || s === 'ready' || s === 'delivered' || s === 'completed'
  })

  // Fetch or generate active bill for this table session
  const loadBill = useCallback(
    async (asCustomerRequest = false) => {
      if (!tableNumber) return
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/bills/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableNumber: String(tableNumber),
            source: asCustomerRequest ? 'customer' : 'waiter',
            customerName: customerName.trim() || undefined,
            customerPhone: customerPhone.trim() || undefined,
          }),
        })

        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to generate bill')
        }

        setBill(json.data)
        if (json.data.tipAmount > 0) {
          setSelectedTip(json.data.tipAmount)
        }
        if (asCustomerRequest) {
          setPhysicalRequested(true)
        }
      } catch (err: any) {
        console.error('Error loading bill:', err)
        setError(err.message || 'Unable to retrieve bill for this table.')
      } finally {
        setLoading(false)
      }
    },
    [tableNumber, customerName, customerPhone]
  )

  useEffect(() => {
    if (open) {
      setPaySuccess(false)
      setPhysicalRequested(false)
      setShowUpiQr(false)
      loadBill(false)
    }
  }, [open, loadBill])

  // Handle applying tip
  const handleApplyTip = async (amount: number) => {
    if (!bill?.id) return
    if (!hasServedOrder) {
      setError('Tipping is available once your food has been served.')
      return
    }

    try {
      setTipLoading(true)
      setError(null)
      setTipSuccessMessage(null)

      const res = await fetch(`/api/bills/${bill.id}/tip`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipAmount: amount }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update tip')
      }

      setSelectedTip(amount)
      setBill((prev: any) => ({
        ...prev,
        tipAmount: amount,
        grandTotal: json.data.bill.grandTotal,
      }))
      setTipSuccessMessage(amount > 0 ? `₹${amount} tip added for your waiter! ❤️` : 'Tip removed.')
      setTimeout(() => setTipSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Tip update error:', err)
      setError(err.message || 'Failed to update tip')
    } finally {
      setTipLoading(false)
    }
  }

  // Handle Requesting Physical Bill / Pay Cash
  const handleRequestPhysicalBill = async () => {
    await loadBill(true)
    setPhysicalRequested(true)
  }

  // Handle Digital Payment Settlement
  const handlePayOnline = async (method: 'UPI' | 'CARD' | 'WALLET') => {
    if (!bill?.id) return
    try {
      setPayLoading(true)
      setError(null)

      const res = await fetch(`/api/bills/${bill.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          customerName: customerName.trim() || bill.customerName || undefined,
          customerPhone: customerPhone.trim() || bill.customerPhone || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Payment settlement failed')
      }

      setBill(json.data.bill)
      setPaidMethod(method)
      setPaySuccess(true)
      onSuccess?.()
    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.message || 'Payment processing failed.')
    } finally {
      setPayLoading(false)
    }
  }

  const waiterName =
    bill?.waiter?.name ||
    (bill?.waiter?.firstName ? `${bill.waiter.firstName} ${bill.waiter.lastName || ''}`.trim() : null) ||
    'Your Server'

  const subtotal = Number(bill?.subtotal || 0)
  const taxAmount = Number(bill?.taxAmount || 0)
  const tipAmount = Number(bill?.tipAmount || selectedTip || 0)
  const discountAmount = Number(bill?.discountAmount || 0)
  const grandTotal = Number(bill?.grandTotal || subtotal + taxAmount - discountAmount + tipAmount)

  // Generate dynamic UPI QR string for instant payment
  const upiPayload = `upi://pay?pa=spicegarden@okhdfcbank&pn=Spice%20Garden%20Restaurant&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(bill?.billNumber || 'Dine-In')}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPayload)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        <DialogHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Receipt className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  Digital Bill & Checkout
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Table {tableNumber} · {bill?.billNumber || 'Preparing Bill...'}
                </DialogDescription>
              </div>
            </div>
            {bill?.status && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-extrabold capitalize px-2 py-0.5',
                  bill.status === 'PAID'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                    : bill.status === 'REQUESTED'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 animate-pulse'
                    : 'border-primary/40 bg-primary/10 text-primary'
                )}
              >
                {bill.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">Generating itemized bill...</p>
          </div>
        ) : paySuccess ? (
          /* Payment Success & Receipt Screen */
          <div className="p-6 text-center space-y-4 overflow-y-auto">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">Payment Received!</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Thank you for dining with us at Spice Garden
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-left space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Invoice Number</span>
                <span className="font-mono font-bold text-foreground">{bill?.billNumber}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Table</span>
                <span className="font-bold text-foreground">Table {tableNumber}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Payment Mode</span>
                <span className="font-bold uppercase text-foreground">{paidMethod}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Server Tip ({waiterName})</span>
                  <span className="font-bold text-emerald-500">₹{tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-extrabold text-foreground">
                <span>Total Amount Paid</span>
                <span className="text-primary font-mono font-black">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {customerPhone && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 py-2 px-3 rounded-xl border border-emerald-500/20">
                📲 E-Invoice sent via WhatsApp to {customerPhone}
              </p>
            )}

            <Button
              className="w-full h-11 rounded-xl font-bold cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Done & Close
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {physicalRequested && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2.5">
                <Clock className="size-4 shrink-0 animate-spin" />
                <span>Waiter notified! They are bringing your physical bill & cash change.</span>
              </div>
            )}

            {/* Itemized Order Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Order Breakdown
              </h4>
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
                    No active orders linked yet.
                  </div>
                )}
              </div>
            </div>

            {/* Post-Service Tipping Section (Only unlocked once food is served) */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-primary/5 via-card to-primary/10 border border-primary/20 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Heart className="size-3.5 text-rose-500 fill-rose-500" />
                    Tip your Waiter ({waiterName})
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    100% of your tip goes directly to your server.
                  </p>
                </div>
                {hasServedOrder ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                    Served ✨
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium">
                    Unlocks when served
                  </Badge>
                )}
              </div>

              {hasServedOrder ? (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '₹20', val: 20 },
                      { label: '₹50', val: 50 },
                      { label: '₹100', val: 100 },
                      { label: 'No Tip', val: 0 },
                    ].map((opt) => (
                      <Button
                        key={opt.val}
                        type="button"
                        variant={selectedTip === opt.val && !isCustomTip ? 'default' : 'outline'}
                        size="sm"
                        disabled={tipLoading}
                        onClick={() => {
                          setIsCustomTip(false)
                          setCustomTip('')
                          handleApplyTip(opt.val)
                        }}
                        className={cn(
                          'h-9 rounded-xl font-extrabold text-xs transition-all',
                          selectedTip === opt.val && !isCustomTip
                            ? 'shadow-xs'
                            : 'border-border/80 hover:border-primary/40'
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>

                  {/* Custom Tip Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <IndianRupee className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Custom amount"
                        value={customTip}
                        disabled={tipLoading}
                        onChange={(e) => {
                          setCustomTip(e.target.value)
                          setIsCustomTip(true)
                        }}
                        className="h-9 pl-8 text-xs rounded-xl"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={tipLoading || !customTip || Number(customTip) < 0}
                      onClick={() => handleApplyTip(Number(customTip))}
                      className="h-9 px-3 rounded-xl text-xs font-bold"
                    >
                      {tipLoading ? <Loader2 className="size-3 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>

                  {tipSuccessMessage && (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                      {tipSuccessMessage}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  🍽️ Your dishes are currently cooking in the kitchen. Post-service tipping will appear here as soon as your waiter serves the table!
                </p>
              )}
            </div>

            {/* Optional Customer Phone for Digital WhatsApp Invoice */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Send className="size-3 text-primary" />
                WhatsApp E-Invoice (Optional)
              </label>
              <Input
                type="tel"
                placeholder="+91 Phone number for receipt"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-9 text-xs rounded-xl bg-card"
              />
            </div>

            {/* Pricing Summary */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST / Taxes (5%)</span>
                <span className="font-mono font-medium">₹{taxAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Server Tip ({waiterName})</span>
                  <span className="font-mono">+₹{tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1.5" />
              <div className="flex justify-between text-sm font-black text-foreground">
                <span>Grand Total</span>
                <span className="text-primary font-mono text-base">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* UPI QR Display Accordion if chosen */}
            {showUpiQr && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-primary/30 text-center space-y-3 animate-in fade-in">
                <p className="text-xs font-bold text-foreground">Scan with GooglePay / PhonePe / Paytm</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="size-40 mx-auto rounded-xl border border-border shadow-md bg-white p-2"
                />
                <p className="text-[11px] text-muted-foreground font-mono">
                  spicegarden@okhdfcbank · ₹{grandTotal.toFixed(2)}
                </p>
                <Button
                  className="w-full h-9 rounded-xl font-bold text-xs"
                  disabled={payLoading}
                  onClick={() => handlePayOnline('UPI')}
                >
                  {payLoading ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
                  I Have Completed Payment
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal Action Footer */}
        {!paySuccess && (
          <div className="p-4 border-t border-border bg-card shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={loading || payLoading || physicalRequested}
                onClick={handleRequestPhysicalBill}
                className="h-11 rounded-2xl font-bold text-xs gap-1.5 border-border hover:bg-muted"
              >
                <Banknote className="size-4 text-muted-foreground" />
                <span>{physicalRequested ? 'Bill Requested' : 'Pay Cash / Physical Bill'}</span>
              </Button>

              <Button
                variant="default"
                disabled={loading || payLoading}
                onClick={() => {
                  if (!showUpiQr) {
                    setShowUpiQr(true)
                  } else {
                    handlePayOnline('UPI')
                  }
                }}
                className="h-11 rounded-2xl font-extrabold text-xs gap-1.5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              >
                <QrCode className="size-4" />
                <span>{showUpiQr ? 'Confirm UPI Payment' : 'Pay Online / UPI QR'}</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

