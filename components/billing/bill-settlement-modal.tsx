'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  Users,
  Send,
  Percent,
  Car,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Crown,
  DollarSign,
  Plus,
  Minus,
  Trash2,
  Phone,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/hooks/useAuthContext'
import { checkPermission } from '@/lib/rolesAndPermission'
import { triggerNotificationFeedback } from '@/lib/sound-vibrate'
import { buildWhatsAppUrl, formatPhoneForDisplay, isValidWhatsAppPhone } from '@/lib/phone'

interface BillSettlementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableId?: string
  tableNumber: string | number
  waiterName?: string
  orderId?: string
  isHighwayOrder?: boolean
  onSuccess?: () => void
}

export function BillSettlementModal({
  open,
  onOpenChange,
  tableId,
  tableNumber,
  waiterName,
  orderId,
  isHighwayOrder = false,
  onSuccess,
}: BillSettlementModalProps) {
  const { auth } = useAuthContext()
  const role = auth?.role || 'WAITER'

  const [loading, setLoading] = useState(false)
  const [bill, setBill] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Billing tabs: Single bill vs Split bill
  const [billingTab, setBillingTab] = useState<'standard' | 'split'>('standard')

  // Discount & Fees state
  const [discountInput, setDiscountInput] = useState<string>('')
  const [tipInput, setTipInput] = useState<string>('')
  const [coverChargeInput, setCoverChargeInput] = useState<string>('')
  const [penaltyInput, setPenaltyInput] = useState<string>('')
  const [applyingDiscount, setApplyingDiscount] = useState(false)

  // Party Thrower State
  const [isPartyThrowerEnabled, setIsPartyThrowerEnabled] = useState(false)
  const [partyThrowerName, setPartyThrowerName] = useState('')
  const [partyThrowerPhone, setPartyThrowerPhone] = useState('')

  // Split Bill State
  const [splitCount, setSplitCount] = useState<number>(2)
  const [splitMethod, setSplitMethod] = useState<'equal' | 'item'>('equal')
  const [guestSplits, setGuestSplits] = useState<Array<{ name: string; amount: number; isPaid: boolean }>>([])

  // Highway Payment Verified State
  const [highwayPaymentVerified, setHighwayPaymentVerified] = useState(false)

  // Settlement execution state
  const [payLoading, setPayLoading] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [settledMethod, setSettledMethod] = useState<string>('')

  // Communication state
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [savingContact, setSavingContact] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const savedServerPhoneRef = useRef<string>('')

  // Permission checks
  const canApplyDiscount = checkPermission(role, 'canApplyDiscount', { isManagerLoggedIn: true })
  const canApplyCoverCharge = checkPermission(role, 'canApplyCoverCharge')
  const canApplyPenalty = checkPermission(role, 'canApplyPenalty', { isManagerLoggedIn: true })

  // Fetch or generate the bill
  const loadBill = useCallback(async () => {
    if (!tableNumber && !tableId && !orderId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/bills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          tableId,
          tableNumber: String(tableNumber || ''),
          source: 'waiter',
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to generate bill')
      }

      const b = json.data
      setBill(b)

      setDiscountInput(b.discountAmount > 0 ? String(b.discountAmount) : '')
      setTipInput(b.tipAmount > 0 ? String(b.tipAmount) : '')

      const serverPhone = String(b.customerPhone || '').trim()
      savedServerPhoneRef.current = serverPhone
      setCustomerPhone(serverPhone)
      setCustomerName(String(b.customerName || '').trim())

      const meta = b.metadata || {}
      setCoverChargeInput(meta.coverCharges ? String(meta.coverCharges) : '')
      setPenaltyInput(meta.nonPaymentPenalty ? String(meta.nonPaymentPenalty) : '')
      if (meta.partyThrower) {
        setIsPartyThrowerEnabled(true)
        setPartyThrowerName(meta.partyThrower.name || '')
        setPartyThrowerPhone(meta.partyThrower.phone || '')
      } else {
        setIsPartyThrowerEnabled(false)
        setPartyThrowerName('')
        setPartyThrowerPhone('')
      }
      setHighwayPaymentVerified(Boolean(meta.highwayPaymentVerified))
    } catch (err: any) {
      console.error('Error in BillSettlementModal:', err)
      setError(err.message || 'Unable to load bill for this table.')
    } finally {
      setLoading(false)
    }
  }, [tableId, tableNumber, orderId])

  useEffect(() => {
    if (open) {
      setPaySuccess(false)
      setSettledMethod('')
      setActionNotice(null)
      setError(null)
      setCustomerPhone('')
      setCustomerName('')
      savedServerPhoneRef.current = ''
      loadBill()
    }
  }, [open, loadBill])

  // Calculations
  const subtotal = Number(bill?.subtotal || 0)
  const currentDiscount = Math.max(0, Number(discountInput || 0))
  const currentTip = Math.max(0, Number(tipInput || 0))
  const currentCover = Math.max(0, Number(coverChargeInput || 0))
  const currentPenalty = Math.max(0, Number(penaltyInput || 0))

  const taxable = Math.max(0, subtotal - currentDiscount)
  const taxAmount = Math.round(taxable * 0.05 * 100) / 100
  const grandTotal = Math.round((taxable + taxAmount + currentTip + currentCover + currentPenalty) * 100) / 100

  // Update equal share splits whenever grandTotal or splitCount changes
  useEffect(() => {
    const share = Math.round((grandTotal / splitCount) * 100) / 100
    setGuestSplits(
      Array.from({ length: splitCount }, (_, i) => ({
        name: `Guest ${i + 1}`,
        amount: share,
        isPaid: false,
      }))
    )
  }, [grandTotal, splitCount])

  // Apply discount / fees update via PATCH
  const handleApplyFeesAndDiscounts = async () => {
    if (!bill?.id) return
    try {
      setApplyingDiscount(true)
      setError(null)

      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountAmount: currentDiscount,
          tipAmount: currentTip,
          coverCharges: currentCover,
          nonPaymentPenalty: currentPenalty,
          partyThrower: isPartyThrowerEnabled ? { name: partyThrowerName, phone: partyThrowerPhone } : null,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          highwayPaymentVerified,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update bill fees')
      }

      setBill(json.data)
      setActionNotice('Bill adjustments updated successfully.')
      setTimeout(() => setActionNotice(null), 3500)
    } catch (err: any) {
      setError(err.message || 'Failed to update bill adjustments')
    } finally {
      setApplyingDiscount(false)
    }
  }

  // Persist customer phone & name on the bill
  const handleSaveCustomerContact = async (silent = false) => {
    if (!bill?.id) return
    const trimmedPhone = customerPhone.trim()
    const trimmedName = customerName.trim()
    try {
      if (!silent) setSavingContact(true)
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: trimmedName || undefined,
          customerPhone: trimmedPhone,
        }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success) {
        savedServerPhoneRef.current = trimmedPhone
        setBill((prev: any) =>
          prev
            ? {
                ...prev,
                customerPhone: trimmedPhone || null,
                customerName: trimmedName || prev.customerName,
              }
            : prev
        )
        if (!silent) {
          setActionNotice(
            trimmedPhone
              ? `Saved customer WhatsApp number (${formatPhoneForDisplay(trimmedPhone)}).`
              : 'Customer contact updated.'
          )
          setTimeout(() => setActionNotice(null), 3500)
        }
      } else if (!silent) {
        setError(json?.message || 'Failed to save customer contact.')
      }
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to save customer contact.')
    } finally {
      if (!silent) setSavingContact(false)
    }
  }

  // Unified WhatsApp dispatcher (never falls back to dummy numbers)
  const dispatchWhatsAppMessage = (params: {
    message: string
    recipient: string
    noticeLabel: string
    event: 'bill_invoice' | 'payment_receipt'
  }) => {
    const rawPhone =
      isPartyThrowerEnabled && partyThrowerPhone.trim()
        ? partyThrowerPhone.trim()
        : customerPhone.trim() || partyThrowerPhone.trim()

    const waUrl = buildWhatsAppUrl(rawPhone, params.message)
    if (!waUrl) {
      setError(
        'Please enter a valid customer WhatsApp phone number (e.g. 9876543210 or +91 98765 43210) before sending on WhatsApp.'
      )
      phoneInputRef.current?.focus()
      return
    }

    setError(null)
    window.open(waUrl, '_blank', 'noopener,noreferrer')

    // Persist edited phone on bill if needed (non-blocking)
    if (bill?.id && customerPhone.trim() && customerPhone.trim() !== savedServerPhoneRef.current) {
      handleSaveCustomerContact(true)
    }

    // Log WhatsApp dispatch in communication ledger (non-blocking)
    fetch('/api/communication/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientName: params.recipient,
        recipientPhone: formatPhoneForDisplay(rawPhone),
        channel: 'whatsapp',
        event: params.event,
        orderNumber: bill?.billNumber,
        tableNumber: `Table ${tableNumber}`,
        message: params.message,
        status: 'sent',
        cost: 0.15,
      }),
    }).catch(() => {})

    setActionNotice(`${params.noticeLabel} (${formatPhoneForDisplay(rawPhone)})`)
    setTimeout(() => setActionNotice(null), 4000)
  }

  // Send Bill (WhatsApp trigger)
  const handleSendBill = () => {
    const recipient = isPartyThrowerEnabled && partyThrowerName ? partyThrowerName : customerName || 'Guest'
    const message = `Hello ${recipient}! Your bill for RestoSphere Table ${tableNumber} is ready:\nInvoice #${bill?.billNumber || 'BILL'}\nSubtotal: ₹${subtotal.toFixed(2)}\nTax: ₹${taxAmount.toFixed(2)}${currentDiscount > 0 ? `\nDiscount: -₹${currentDiscount.toFixed(2)}` : ''}${currentCover > 0 ? `\nCover Charges: ₹${currentCover.toFixed(2)}` : ''}${currentPenalty > 0 ? `\nPenalty Fee: ₹${currentPenalty.toFixed(2)}` : ''}${currentTip > 0 ? `\nServer Tip: ₹${currentTip.toFixed(2)}` : ''}\nGrand Total: ₹${grandTotal.toFixed(2)}.\nPay via UPI: upi://pay?pa=restosphere@okhdfcbank&pn=RestoSphere&am=${grandTotal.toFixed(2)}&cu=INR`

    dispatchWhatsAppMessage({
      message,
      recipient,
      noticeLabel: `Bill sent on WhatsApp to ${recipient}`,
      event: 'bill_invoice',
    })
  }

  // Verify Highway Customer Payment
  const handleVerifyHighwayPayment = async () => {
    setHighwayPaymentVerified(true)
    setActionNotice('Highway / GPS pre-order payment recorded and verified!')
    setTimeout(() => setActionNotice(null), 4000)
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
          customerPhone: (isPartyThrowerEnabled && partyThrowerPhone ? partyThrowerPhone : customerPhone).trim() || undefined,
          customerName: (isPartyThrowerEnabled && partyThrowerName ? partyThrowerName : customerName).trim() || undefined,
          discountAmount: currentDiscount,
          tipAmount: currentTip,
          coverCharges: currentCover,
          nonPaymentPenalty: currentPenalty,
          highwayPaymentVerified,
          partyThrower: isPartyThrowerEnabled ? { name: partyThrowerName, phone: partyThrowerPhone } : null,
          splits: guestSplits,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Payment settlement failed')
      }

      setBill(json.data.bill)
      setSettledMethod(method)
      setPaySuccess(true)

      // Sound and haptic vibration trigger
      triggerNotificationFeedback('payment')

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('waiter-tip-updated'))
        window.dispatchEvent(new CustomEvent('bill-settled'))
      }
      onSuccess?.()
    } catch (err: any) {
      console.error('Settlement error:', err)
      setError(err.message || 'Settlement failed.')
    } finally {
      setPayLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const serverDisplayName =
    bill?.waiter?.name ||
    waiterName ||
    (bill?.waiter?.firstName ? `${bill.waiter.firstName} ${bill.waiter.lastName || ''}`.trim() : null) ||
    'Assigned Server'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        <DialogHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Receipt className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  Invoice & Settlement — Table {tableNumber}
                  {isHighwayOrder && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500 bg-amber-500/10">
                      <Car className="size-3 mr-1" />
                      Highway / GPS
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {bill?.billNumber || 'Generating bill...'} · Server: {serverDisplayName}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                <span>Tax (GST 5%)</span>
                <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
              </div>
              {currentDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono">-₹{currentDiscount.toFixed(2)}</span>
                </div>
              )}
              {currentCover > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Cover Charges</span>
                  <span className="font-mono">+₹{currentCover.toFixed(2)}</span>
                </div>
              )}
              {currentPenalty > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Non-Payment Penalty Fee</span>
                  <span className="font-mono">+₹{currentPenalty.toFixed(2)}</span>
                </div>
              )}
              {currentTip > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Server Tip Settled ({serverDisplayName})</span>
                  <span className="font-mono">₹{currentTip.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1.5" />
              <div className="flex justify-between text-sm font-black text-foreground">
                <span>Total Collected</span>
                <span className="text-primary font-mono text-base">₹{grandTotal.toFixed(2)}</span>
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
              {isValidWhatsAppPhone(isPartyThrowerEnabled && partyThrowerPhone ? partyThrowerPhone : customerPhone) && (
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl font-bold text-xs gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={handleSendBill}
                >
                  <Share2 className="size-4" />
                  Send on WhatsApp
                </Button>
              )}
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

            {actionNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{actionNotice}</span>
              </div>
            )}

            {/* Billing Mode Tabs */}
            <Tabs value={billingTab} onValueChange={(v: any) => setBillingTab(v)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full h-9">
                <TabsTrigger value="standard" className="text-xs font-bold">
                  Full Bill
                </TabsTrigger>
                <TabsTrigger value="split" className="text-xs font-bold">
                  Split Bill ({splitCount} Guests)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standard" className="space-y-4 mt-3">
                {/* Customer Contact (Synced from Customer Digital Bill / Order / Profile) */}
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
                      <Phone className="size-3.5 text-emerald-500" />
                      Customer WhatsApp Details
                    </label>
                    <div className="flex items-center gap-1.5">
                      {isValidWhatsAppPhone(customerPhone) ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                        >
                          {formatPhoneForDisplay(customerPhone)}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          No number yet
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={loadBill}
                        className="size-6 rounded-md text-muted-foreground hover:text-foreground"
                        title="Refresh latest customer number"
                      >
                        <RefreshCw className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-8 text-xs bg-card flex-1"
                    />
                    <Input
                      ref={phoneInputRef}
                      type="tel"
                      inputMode="tel"
                      placeholder="WhatsApp Phone (+91 98XXXXXXXX)"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value)
                        if (error) setError(null)
                      }}
                      className="h-8 text-xs bg-card flex-1"
                    />
                    {customerPhone.trim() !== savedServerPhoneRef.current && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingContact}
                        onClick={() => handleSaveCustomerContact(false)}
                        className="h-8 px-2.5 text-xs font-bold shrink-0"
                      >
                        {savingContact ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Party Thrower Designation */}
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                      <Crown className="size-3.5 text-amber-500" />
                      Designate &quot;Party Thrower&quot; (Routes full bill to one guest)
                    </label>
                    <input
                      type="checkbox"
                      checked={isPartyThrowerEnabled}
                      onChange={(e) => {
                        setIsPartyThrowerEnabled(e.target.checked)
                        if (!e.target.checked) {
                          setPartyThrowerName('')
                          setPartyThrowerPhone('')
                        }
                      }}
                      className="size-4 rounded accent-primary cursor-pointer"
                    />
                  </div>
                  {isPartyThrowerEnabled && (
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Party Thrower Name"
                          value={partyThrowerName}
                          onChange={(e) => setPartyThrowerName(e.target.value)}
                          className="h-8 text-xs bg-card"
                        />
                        <Input
                          placeholder="Party Thrower Phone"
                          value={partyThrowerPhone}
                          onChange={(e) => setPartyThrowerPhone(e.target.value)}
                          className="h-8 text-xs bg-card"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPartyThrowerEnabled(false)
                            setPartyThrowerName('')
                            setPartyThrowerPhone('')
                          }}
                          className="text-[11px] text-destructive hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                          Delete Party Thrower
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Itemized Dishes List */}
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
                        <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs">
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

                {/* Cover Charges & Penalties & Tip Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Tip Input */}
                  <div className="p-2.5 rounded-xl border border-border bg-card space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                      <Heart className="size-3 text-rose-500 fill-rose-500" />
                      Waiter Tip (₹)
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={tipInput}
                        onChange={(e) => setTipInput(e.target.value)}
                        className="h-8 text-xs bg-muted/20"
                      />
                    </div>
                  </div>

                  {/* Cover Charges */}
                  <div className="p-2.5 rounded-xl border border-border bg-card space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                      <DollarSign className="size-3 text-primary" />
                      Cover Charges (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={coverChargeInput}
                      onChange={(e) => setCoverChargeInput(e.target.value)}
                      className="h-8 text-xs bg-muted/20"
                    />
                  </div>

                  {/* Non-Payment Penalty */}
                  <div className="p-2.5 rounded-xl border border-border bg-card space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[11px] font-bold text-destructive flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Penalty Fee (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={penaltyInput}
                      onChange={(e) => setPenaltyInput(e.target.value)}
                      className="h-8 text-xs bg-muted/20"
                    />
                  </div>
                </div>

                {/* Manager Discount */}
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-muted-foreground flex items-center gap-1">
                      <Percent className="size-3 text-primary" />
                      Manager Discount (₹)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Discount in ₹"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="h-8 text-xs bg-card"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={applyingDiscount}
                      onClick={handleApplyFeesAndDiscounts}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      {applyingDiscount ? <Loader2 className="size-3 animate-spin" /> : 'Save Adjustments'}
                    </Button>
                  </div>
                </div>

                {/* Customer Actions & Triggers */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendBill}
                    className="h-9 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5"
                  >
                    <Share2 className="size-3.5" />
                    Send Bill via WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyHighwayPayment}
                    className={cn(
                      'h-9 font-semibold border-border gap-1.5',
                      highwayPaymentVerified && 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                    )}
                  >
                    <Car className="size-3.5 text-amber-500" />
                    {highwayPaymentVerified ? 'Highway Paid Verified' : 'Verify Highway Payment'}
                  </Button>
                </div>
              </TabsContent>

              {/* Split Bill Tab */}
              <TabsContent value="split" className="space-y-4 mt-3">
                <div className="p-3 rounded-2xl bg-muted/30 border border-border text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Split Table Bill Between:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        disabled={splitCount <= 2}
                        onClick={() => setSplitCount(splitCount - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="font-mono font-black text-sm px-1.5">{splitCount} Guests</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        disabled={splitCount >= 10}
                        onClick={() => setSplitCount(splitCount + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Grand Total ₹{grandTotal.toFixed(2)} divided equally into ₹{(grandTotal / splitCount).toFixed(2)} per guest.
                  </p>
                </div>

                {/* Per Guest Settlement list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {guestSplits.map((gst, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-xl border flex items-center justify-between text-xs',
                        gst.isPaid ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border bg-card'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        <span className="font-bold text-foreground">{gst.name}</span>
                        {gst.isPaid && (
                          <Badge variant="outline" className="text-[9px] border-emerald-500 text-emerald-500 bg-emerald-500/10 font-bold">
                            Paid
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground">₹{gst.amount.toFixed(2)}</span>
                        <Button
                          size="sm"
                          variant={gst.isPaid ? 'ghost' : 'outline'}
                          className="h-7 text-[11px] font-bold"
                          onClick={() => {
                            setGuestSplits((prev) =>
                              prev.map((g, i) => (i === idx ? { ...g, isPaid: !g.isPaid } : g))
                            )
                          }}
                        >
                          {gst.isPaid ? 'Mark Unpaid' : 'Collect Share'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Bill Summary Footer Table */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST Tax (5%)</span>
                <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
              </div>
              {currentDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discount Applied</span>
                  <span className="font-mono">-₹{currentDiscount.toFixed(2)}</span>
                </div>
              )}
              {currentCover > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Cover Charges</span>
                  <span className="font-mono">+₹{currentCover.toFixed(2)}</span>
                </div>
              )}
              {currentPenalty > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Non-Payment Penalty Fee</span>
                  <span className="font-mono">+₹{currentPenalty.toFixed(2)}</span>
                </div>
              )}
              {currentTip > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Server Tip</span>
                  <span className="font-mono">+₹{currentTip.toFixed(2)}</span>
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
              Paid & Release Table
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={loading || payLoading}
                onClick={() => handleSettle('CASH')}
                className="h-11 rounded-2xl font-bold text-xs gap-1.5 border-border hover:bg-muted"
              >
                <Banknote className="size-4 text-emerald-500" />
                <span>Paid (Cash)</span>
              </Button>

              <Button
                variant="default"
                disabled={loading || payLoading}
                onClick={() => handleSettle('UPI')}
                className="h-11 rounded-2xl font-extrabold text-xs gap-1.5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              >
                <QrCode className="size-4" />
                <span>Paid (UPI / Card)</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
