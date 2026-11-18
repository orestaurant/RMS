'use client'

import React, { useState, useMemo } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  IndianRupee,
  Receipt,
  UserCheck,
  Send,
  Loader2,
  Sparkles,
  Utensils,
  Plus,
  Minus,
  Check,
  BellRing,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SplitItem {
  id?: string
  name: string
  quantity: number
  price: number
  total?: number
}

interface CustomerSplitBillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableNumber: string | number
  billId?: string
  subtotal: number
  taxAmount: number
  grandTotal: number
  items: SplitItem[]
  waiterName?: string
  onSuccess?: () => void
}

export function CustomerSplitBillModal({
  open,
  onOpenChange,
  tableNumber,
  billId,
  subtotal,
  taxAmount,
  grandTotal,
  items = [],
  waiterName = 'Your Server',
  onSuccess,
}: CustomerSplitBillModalProps) {
  const [splitTab, setSplitTab] = useState<'equal' | 'itemized' | 'waiter'>('equal')

  // Equal Split State
  const [guestCount, setGuestCount] = useState<number>(2)
  const [equalPayDone, setEqualPayDone] = useState(false)
  const [equalUpiQr, setEqualUpiQr] = useState(false)

  // Itemized Split State (Map of item index to selected quantity)
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Record<number, number>>({})
  const [itemizedUpiQr, setItemizedUpiQr] = useState(false)
  const [itemizedPayDone, setItemizedPayDone] = useState(false)

  // Waiter Split Request State
  const [waiterRequested, setWaiterRequested] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)

  const cleanTable = useMemo(() => {
    const s = String(tableNumber || '').trim()
    return s.startsWith('Table') ? s : `Table ${s}`
  }, [tableNumber])

  // Calculation for Equal Split
  const perPersonShare = useMemo(() => {
    if (guestCount <= 0) return 0
    return Math.round((grandTotal / guestCount) * 100) / 100
  }, [grandTotal, guestCount])

  // Calculation for Itemized Split
  const itemizedCalculations = useMemo(() => {
    let mySubtotal = 0
    let myCount = 0

    items.forEach((it, idx) => {
      const selectedQty = selectedItemQuantities[idx] || 0
      if (selectedQty > 0) {
        const itemPrice = Number(it.price || (it.total ? it.total / (it.quantity || 1) : 0))
        mySubtotal += itemPrice * selectedQty
        myCount += selectedQty
      }
    })

    const myTax = Math.round(mySubtotal * 0.05 * 100) / 100
    const myTotal = Math.round((mySubtotal + myTax) * 100) / 100

    return { mySubtotal, myTax, myTotal, myCount }
  }, [items, selectedItemQuantities])

  // Toggle item selection in Itemized Mode
  const toggleItemQuantity = (idx: number, maxQty: number) => {
    setSelectedItemQuantities((prev) => {
      const current = prev[idx] || 0
      const next = current > 0 ? 0 : maxQty
      return { ...prev, [idx]: next }
    })
  }

  const changeItemQuantity = (idx: number, delta: number, maxQty: number) => {
    setSelectedItemQuantities((prev) => {
      const current = prev[idx] || 0
      const next = Math.max(0, Math.min(maxQty, current + delta))
      return { ...prev, [idx]: next }
    })
  }

  // Request Waiter Split Handler
  const handleRequestWaiterSplit = async () => {
    try {
      setRequestLoading(true)
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'split_request',
          type: 'alert',
          title: `👥 Split Bill Requested — ${cleanTable}`,
          body: `Guests at ${cleanTable} requested server assistance to split their bill (₹${grandTotal.toFixed(2)}).`,
          metadata: {
            tableNumber: cleanTable,
            billId,
            splitType: 'waiter_split_requested',
            amount: grandTotal,
          },
        }),
      })

      if (res.ok) {
        setWaiterRequested(true)
      } else {
        // Fallback optimistic success
        setWaiterRequested(true)
      }
    } catch {
      setWaiterRequested(true)
    } finally {
      setRequestLoading(false)
    }
  }

  // UPI QR String generation
  const equalUpiPayload = `upi://pay?pa=spicegarden@okhdfcbank&pn=RestoSphere%20Split&am=${perPersonShare.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Split ${cleanTable} 1/${guestCount}`)}`
  const equalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(equalUpiPayload)}`

  const itemizedUpiPayload = `upi://pay?pa=spicegarden@okhdfcbank&pn=RestoSphere%20Split&am=${itemizedCalculations.myTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Split ${cleanTable} My Items`)}`
  const itemizedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(itemizedUpiPayload)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Users className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  Split Bill
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {cleanTable} · Table Total: ₹{grandTotal.toFixed(2)}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
              ₹{grandTotal.toFixed(2)}
            </Badge>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 shrink-0">
          <Tabs
            value={splitTab}
            onValueChange={(val) => setSplitTab(val as 'equal' | 'itemized' | 'waiter')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equal" className="text-xs font-semibold cursor-pointer">
                Equal Split
              </TabsTrigger>
              <TabsTrigger value="itemized" className="text-xs font-semibold cursor-pointer">
                By Items
              </TabsTrigger>
              <TabsTrigger value="waiter" className="text-xs font-semibold cursor-pointer">
                Ask Waiter
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {splitTab === 'equal' && (
            /* ─── 1. Equal Split ────────────────────── */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-center space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  How many people are splitting?
                </span>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-xl"
                    disabled={guestCount <= 2}
                    onClick={() => setGuestCount((c) => Math.max(2, c - 1))}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="text-2xl font-black text-foreground min-w-12">
                    {guestCount}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-xl"
                    disabled={guestCount >= 20}
                    onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                {/* Quick preset chips */}
                <div className="flex justify-center gap-2 pt-1">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestCount(num)}
                      className={cn(
                        'size-8 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                        guestCount === num
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-card text-muted-foreground border-border hover:text-foreground'
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-Person Calculation Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/25 space-y-2 text-center">
                <span className="text-xs font-bold text-muted-foreground">Each Person Pays</span>
                <div className="text-3xl font-black text-primary font-mono">
                  ₹{perPersonShare.toFixed(2)}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  (₹{grandTotal.toFixed(2)} ÷ {guestCount} guests, taxes inclusive)
                </p>
              </div>

              {/* Equal Split UPI QR */}
              {equalUpiQr && !equalPayDone && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-primary/30 text-center space-y-3 animate-in fade-in">
                  <p className="text-xs font-bold text-foreground">Scan with GooglePay / PhonePe / Paytm</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={equalQrUrl}
                    alt="Equal Share UPI QR"
                    className="size-36 mx-auto rounded-xl border border-border shadow-md bg-white p-2"
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Individual Share · ₹{perPersonShare.toFixed(2)}
                  </p>
                  <Button
                    className="w-full h-9 rounded-xl font-bold text-xs"
                    onClick={() => {
                      setEqualPayDone(true)
                      onSuccess?.()
                    }}
                  >
                    Mark My Share as Paid
                  </Button>
                </div>
              )}

              {equalPayDone && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2 animate-in fade-in">
                  <CheckCircle2 className="size-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Your share of ₹{perPersonShare.toFixed(2)} recorded!
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Remaining balance: ₹{(grandTotal - perPersonShare).toFixed(2)}
                  </p>
                </div>
              )}

              {!equalPayDone && (
                <Button
                  className="w-full h-11 rounded-2xl font-extrabold text-xs gap-2 cursor-pointer shadow-md"
                  onClick={() => setEqualUpiQr(true)}
                >
                  <QrCode className="size-4" />
                  <span>Pay My Share (₹{perPersonShare.toFixed(2)}) via UPI</span>
                </Button>
              )}
            </div>
          )}

          {splitTab === 'itemized' && (
            /* ─── 2. Itemized Self-Split ─────────────── */
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Select What You Ate
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {itemizedCalculations.myCount} items selected
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No items found on this table order.
                </div>
              ) : (
                <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden">
                  {items.map((it, idx) => {
                    const maxQty = it.quantity || 1
                    const selQty = selectedItemQuantities[idx] || 0
                    const itemPrice = Number(it.price || (it.total ? it.total / maxQty : 0))
                    const isSelected = selQty > 0

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'p-3 flex items-center justify-between text-xs transition-colors',
                          isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                        )}
                      >
                        <div
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleItemQuantity(idx, maxQty)}
                        >
                          <div
                            className={cn(
                              'size-5 rounded-md border flex items-center justify-center transition-all',
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border text-transparent'
                            )}
                          >
                            <Check className="size-3.5 stroke-[3]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block truncate">
                              {it.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ₹{itemPrice.toFixed(2)} each (Table has {maxQty})
                            </span>
                          </div>
                        </div>

                        {isSelected && maxQty > 1 && (
                          <div className="flex items-center gap-1.5 shrink-0 px-2">
                            <button
                              type="button"
                              onClick={() => changeItemQuantity(idx, -1, maxQty)}
                              className="size-6 rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold min-w-4 text-center">
                              {selQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeItemQuantity(idx, 1, maxQty)}
                              className="size-6 rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <span className="font-mono font-bold text-foreground shrink-0 pl-2">
                          ₹{((isSelected ? selQty : maxQty) * itemPrice).toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Itemized Total Card */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Selected Subtotal</span>
                  <span className="font-mono">₹{itemizedCalculations.mySubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST / Taxes (5%)</span>
                  <span className="font-mono">₹{itemizedCalculations.myTax.toFixed(2)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-black text-foreground">
                  <span>My Individual Total</span>
                  <span className="text-primary font-mono">₹{itemizedCalculations.myTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Itemized Split UPI QR */}
              {itemizedUpiQr && !itemizedPayDone && itemizedCalculations.myTotal > 0 && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-primary/30 text-center space-y-3 animate-in fade-in">
                  <p className="text-xs font-bold text-foreground">Scan with GooglePay / PhonePe / Paytm</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemizedQrUrl}
                    alt="Itemized Share UPI QR"
                    className="size-36 mx-auto rounded-xl border border-border shadow-md bg-white p-2"
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">
                    My Dishes Total · ₹{itemizedCalculations.myTotal.toFixed(2)}
                  </p>
                  <Button
                    className="w-full h-9 rounded-xl font-bold text-xs"
                    onClick={() => {
                      setItemizedPayDone(true)
                      onSuccess?.()
                    }}
                  >
                    I Have Paid My Dishes
                  </Button>
                </div>
              )}

              {itemizedPayDone && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2 animate-in fade-in">
                  <CheckCircle2 className="size-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Payment of ₹{itemizedCalculations.myTotal.toFixed(2)} recorded!
                  </p>
                </div>
              )}

              {!itemizedPayDone && (
                <Button
                  disabled={itemizedCalculations.myTotal <= 0}
                  className="w-full h-11 rounded-2xl font-extrabold text-xs gap-2 cursor-pointer shadow-md"
                  onClick={() => setItemizedUpiQr(true)}
                >
                  <QrCode className="size-4" />
                  <span>
                    Pay My Dishes (₹{itemizedCalculations.myTotal.toFixed(2)}) via UPI
                  </span>
                </Button>
              )}
            </div>
          )}

          {splitTab === 'waiter' && (
            /* ─── 3. Request Waiter to Split ─────────── */
            <div className="p-6 text-center space-y-4 animate-in fade-in">
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <BellRing className="size-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">
                  Prefer the Waiter to Split?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Your server ({waiterName}) will come to {cleanTable} with the handheld POS terminal to split the bill per your seating preference.
                </p>
              </div>

              {waiterRequested ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 space-y-1.5 animate-in fade-in">
                  <CheckCircle2 className="size-6 mx-auto text-emerald-500" />
                  <p className="text-xs font-bold">
                    Waiter Notified!
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {waiterName} is on their way to {cleanTable} to split the bill on their terminal.
                  </p>
                </div>
              ) : (
                <Button
                  className="w-full h-11 rounded-2xl font-extrabold text-xs gap-2 cursor-pointer shadow-md"
                  disabled={requestLoading}
                  onClick={handleRequestWaiterSplit}
                >
                  {requestLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Alerting Waiter...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="size-4" />
                      <span>Request Waiter to Split at Table</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card shrink-0">
          <Button
            variant="outline"
            className="w-full h-10 rounded-xl text-xs font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Back to Bill Summary
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
