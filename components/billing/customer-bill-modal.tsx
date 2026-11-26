'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Users,
  Crown,
  BellRing,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPhoneForDisplay, isValidWhatsAppPhone } from '@/lib/phone'
import { CustomerSplitBillModal } from './customer-split-bill-modal'

interface CustomerBillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableNumber: string | number
  tableOrders: any[]
  selectedOrderId?: string | null
  defaultCustomerPhone?: string
  defaultCustomerName?: string
  onSuccess?: () => void
}

export function CustomerBillModal({
  open,
  onOpenChange,
  tableNumber,
  tableOrders,
  selectedOrderId,
  defaultCustomerPhone = '',
  defaultCustomerName = '',
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
  const [phoneSaveStatus, setPhoneSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const customerNameRef = React.useRef('')
  const customerPhoneRef = React.useRef('')
  const lastSavedPhoneRef = React.useRef('')
  const phoneSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Split bill modal state
  const [showSplitModal, setShowSplitModal] = useState(false)

  // Party Thrower (Single Host Payer) state
  const [partyThrower, setPartyThrower] = useState<{ name: string; phone?: string } | null>(null)
  const [isAssigningHost, setIsAssigningHost] = useState(false)
  const [hostNameInput, setHostNameInput] = useState('')
  const [hostPhoneInput, setHostPhoneInput] = useState('')
  const [hostAssignLoading, setHostAssignLoading] = useState(false)

  // Ask for Pending Bill state
  const [pendingBillAlertDone, setPendingBillAlertDone] = useState(false)
  const [askBillLoading, setAskBillLoading] = useState(false)

  // Check if at least one order has been served to unlock tipping
  const hasServedOrder = tableOrders.some((ord) => {
    const s = String(ord.status || '').toLowerCase()
    return s === 'served' || s === 'ready' || s === 'delivered' || s === 'completed'
  })

  const formattedTableSpot = useMemo(() => {
    const s = String(tableNumber || '').trim()
    if (!s) return 'Spot Unset'
    if (s.startsWith('🚗') || s.toLowerCase().startsWith('car')) return s
    if (s.toLowerCase().startsWith('table')) return s
    return `Table ${s}`
  }, [tableNumber])

  // ⚡ INSTANT Zero-Latency Client Breakdown from tableOrders (Renders in 0.00ms)
  const clientBreakdown = useMemo(() => {
    if (!Array.isArray(tableOrders) || tableOrders.length === 0) {
      return { items: [], subtotal: 0, taxAmount: 0, grandTotal: 0 }
    }
    const filteredOrders = selectedOrderId
      ? tableOrders.filter(
          (ord) =>
            ord.id === selectedOrderId ||
            ord.fullId === selectedOrderId ||
            ord.orderNumber === selectedOrderId
        )
      : tableOrders

    const itemMap = new Map<string, { name: string; quantity: number; price: number; total: number }>()
    for (const ord of filteredOrders) {
      const ordStatus = String(ord.status || '').toLowerCase()
      if (ordStatus === 'cancelled' || ordStatus === 'refunded') continue
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const name = it.name || it.itemName || it.menuItem?.name || 'Dish'
          const qty = it.quantity || 1
          const price = Number(it.price || it.basePrice || 0)
          const total = Number(it.total || it.itemTotal || price * qty)
          const key = `${name}-${price}`
          if (itemMap.has(key)) {
            const existing = itemMap.get(key)!
            existing.quantity += qty
            existing.total += total
          } else {
            itemMap.set(key, { name, quantity: qty, price, total })
          }
        }
      }
    }
    const items = Array.from(itemMap.values())
    const subtotal = items.reduce((sum, i) => sum + i.total, 0)
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100
    return { items, subtotal, taxAmount, grandTotal }
  }, [tableOrders, selectedOrderId])

  const pendingTipRef = React.useRef<number | null>(null)

  const syncCustomerPhoneToBill = useCallback(
    async (phoneVal: string, targetBillId?: string) => {
      const clean = phoneVal.trim()
      const activeBillId = targetBillId || bill?.id
      if (!activeBillId || clean === lastSavedPhoneRef.current) return

      try {
        setPhoneSaveStatus('saving')
        const res = await fetch(`/api/bills/${activeBillId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerPhone: clean,
            ...(customerNameRef.current.trim() ? { customerName: customerNameRef.current.trim() } : {}),
          }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Could not save WhatsApp number')
        }
        lastSavedPhoneRef.current = clean
        setBill((prev: any) => (prev ? { ...prev, customerPhone: clean || null } : prev))
        setPhoneSaveStatus(clean ? 'saved' : 'idle')
      } catch {
        setPhoneSaveStatus('error')
      }
    },
    [bill?.id]
  )

  // Fetch or generate active bill for this table session
  const loadBill = useCallback(
    async (asCustomerRequest = false) => {
      if (!tableNumber && !selectedOrderId) return
      try {
        if (!tableOrders || tableOrders.length === 0) {
          setLoading(true)
        }
        setError(null)
        const currentName = customerNameRef.current.trim()
        const currentPhone = customerPhoneRef.current.trim()
        const res = await fetch('/api/bills/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: selectedOrderId || undefined,
            tableNumber: String(tableNumber || ''),
            source: asCustomerRequest ? 'customer' : 'waiter',
            customerName: currentName || undefined,
            customerPhone: currentPhone || undefined,
          }),
        })

        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to generate bill')
        }

        setBill(json.data)
        setPartyThrower(json.data.partyThrower || json.data.metadata?.partyThrower || null)

        const serverPhone = String(json.data.customerPhone || '').trim()
        if (serverPhone) {
          lastSavedPhoneRef.current = serverPhone
          if (!customerPhoneRef.current.trim()) {
            customerPhoneRef.current = serverPhone
            setCustomerPhone(serverPhone)
            setPhoneSaveStatus('saved')
          } else if (customerPhoneRef.current.trim() !== serverPhone) {
            await syncCustomerPhoneToBill(customerPhoneRef.current.trim(), json.data.id)
          }
        } else if (customerPhoneRef.current.trim()) {
          await syncCustomerPhoneToBill(customerPhoneRef.current.trim(), json.data.id)
        }

        // If user already tapped a tip optimistically, sync with server immediately
        if (pendingTipRef.current !== null && pendingTipRef.current !== json.data.tipAmount) {
          applyTipToServer(pendingTipRef.current, json.data.id)
        } else if (json.data.tipAmount > 0) {
          setSelectedTip((prev) => (prev === 0 ? json.data.tipAmount : prev))
        }

        if (asCustomerRequest) {
          setPhysicalRequested(true)
        }
      } catch (err: any) {
        console.error('Error loading bill:', err)
        if (!tableOrders || tableOrders.length === 0) {
          setError(err.message || 'Unable to retrieve bill for this table.')
        }
      } finally {
        setLoading(false)
      }
    },
    [tableNumber, selectedOrderId, tableOrders?.length, syncCustomerPhoneToBill]
  )

  useEffect(() => {
    if (open) {
      setPaySuccess(false)
      setPhysicalRequested(false)
      setShowUpiQr(false)
      setPhoneSaveStatus('idle')

      const storedPhone =
        defaultCustomerPhone.trim() ||
        (typeof window !== 'undefined' ? localStorage.getItem('rms_customer_phone') || '' : '').trim()
      const storedName =
        defaultCustomerName.trim() ||
        (typeof window !== 'undefined' ? localStorage.getItem('rms_customer_name') || '' : '').trim()

      customerPhoneRef.current = storedPhone
      customerNameRef.current = storedName
      lastSavedPhoneRef.current = ''
      setCustomerPhone(storedPhone)
      setCustomerName(storedName)

      loadBill(false)
    }

    return () => {
      if (phoneSaveTimerRef.current) {
        clearTimeout(phoneSaveTimerRef.current)
      }
    }
  }, [open, defaultCustomerPhone, defaultCustomerName, loadBill])

  const handleCustomerPhoneChange = (val: string) => {
    setCustomerPhone(val)
    customerPhoneRef.current = val
    setPhoneSaveStatus('idle')

    try {
      if (val.trim()) {
        localStorage.setItem('rms_customer_phone', val.trim())
      } else {
        localStorage.removeItem('rms_customer_phone')
      }
    } catch {}

    if (phoneSaveTimerRef.current) {
      clearTimeout(phoneSaveTimerRef.current)
    }
    if (bill?.id) {
      phoneSaveTimerRef.current = setTimeout(() => {
        syncCustomerPhoneToBill(val, bill.id)
      }, 450)
    }
  }

  // Low-latency server sync for tip
  const applyTipToServer = async (amount: number, billId: string) => {
    try {
      setTipLoading(true)
      const res = await fetch(`/api/bills/${billId}/tip`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipAmount: amount }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update tip')
      }
      if (json.data?.bill) {
        setBill((prev: any) => ({
          ...prev,
          grandTotal: json.data.bill.grandTotal,
        }))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('waiter-tip-updated'))
        }
      }
    } catch (err: any) {
      console.error('Tip server sync error:', err)
      setError(err.message || 'Failed to sync tip with server')
    } finally {
      setTipLoading(false)
    }
  }

  // ⚡ Optimistic Instant Tipping (0ms response time)
  const handleApplyTip = async (amount: number) => {
    if (!hasServedOrder) {
      setError('Tipping is available once your food has been served.')
      return
    }

    const previousTip = selectedTip
    setSelectedTip(amount)
    pendingTipRef.current = amount
    setBill((prev: any) => (prev ? { ...prev, tipAmount: amount } : prev))
    setTipSuccessMessage(amount > 0 ? `₹${amount} tip added for your waiter! ❤️` : 'Tip removed.')
    setTimeout(() => setTipSuccessMessage(null), 3000)

    if (bill?.id) {
      await applyTipToServer(amount, bill.id)
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

  // Handle Assigning Party Thrower (Single Host Payer)
  const handleAssignPartyThrower = async () => {
    if (!hostNameInput.trim()) return
    try {
      setHostAssignLoading(true)
      const hostPayload = {
        name: hostNameInput.trim(),
        phone: hostPhoneInput.trim() || undefined,
        assignedAt: new Date().toISOString(),
      }

      if (bill?.id) {
        await fetch(`/api/bills/${bill.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partyThrower: hostPayload }),
        })
      }

      setPartyThrower(hostPayload)
      setBill((prev: any) =>
        prev
          ? {
              ...prev,
              partyThrower: hostPayload,
              metadata: { ...(prev.metadata || {}), partyThrower: hostPayload },
            }
          : prev
      )
      setIsAssigningHost(false)

      // Alert waiter about Party Thrower
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'party_thrower_assigned',
            type: 'alert',
            title: `🎉 Party Thrower Assigned — ${formattedTableSpot}`,
            body: `${hostPayload.name} (${hostPayload.phone || 'Host'}) is designated as sole payer for ${formattedTableSpot}.`,
            metadata: {
              tableNumber: formattedTableSpot,
              hostName: hostPayload.name,
              hostPhone: hostPayload.phone,
            },
          }),
        })
      } catch {}
    } catch (err: any) {
      console.error('Failed to assign party thrower:', err)
      setError('Failed to assign party thrower.')
    } finally {
      setHostAssignLoading(false)
    }
  }

  // Handle Removing/Deleting Party Thrower
  const handleRemovePartyThrower = async () => {
    try {
      setHostAssignLoading(true)
      if (bill?.id) {
        await fetch(`/api/bills/${bill.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partyThrower: null }),
        })
      }

      setPartyThrower(null)
      setHostNameInput('')
      setHostPhoneInput('')
      setIsAssigningHost(false)
      setBill((prev: any) =>
        prev
          ? {
              ...prev,
              partyThrower: null,
              metadata: { ...(prev.metadata || {}), partyThrower: null },
            }
          : prev
      )

      // Alert waiter about Party Thrower Removal
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'party_thrower_removed',
            type: 'alert',
            title: `ℹ️ Party Thrower Removed — ${formattedTableSpot}`,
            body: `Party thrower designation removed for ${formattedTableSpot}. Billing restored to standard table settlement.`,
            metadata: {
              tableNumber: formattedTableSpot,
            },
          }),
        })
      } catch {}
    } catch (err: any) {
      console.error('Failed to remove party thrower:', err)
      setError('Failed to remove party thrower.')
    } finally {
      setHostAssignLoading(false)
    }
  }

  // Handle Ask for Pending Bill
  const handleAskPendingBill = async () => {
    try {
      setAskBillLoading(true)
      await loadBill(true)
      setPendingBillAlertDone(true)

      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'pending_bill_request',
            type: 'alert',
            title: `🔔 Pending Bill Requested — ${formattedTableSpot}`,
            body: `Guest requested unpaid balance breakdown (₹${grandTotal.toFixed(2)}) at ${formattedTableSpot}.`,
            metadata: {
              tableNumber: formattedTableSpot,
              amount: grandTotal,
            },
          }),
        })
      } catch {}
    } catch (err: any) {
      console.error('Error asking for pending bill:', err)
    } finally {
      setAskBillLoading(false)
    }
  }

  const waiterName =
    bill?.waiter?.name ||
    (bill?.waiter?.firstName ? `${bill.waiter.firstName} ${bill.waiter.lastName || ''}`.trim() : null) ||
    'Your Server'

  const displayItems = bill?.items && bill.items.length > 0 ? bill.items : clientBreakdown.items
  const subtotal = Number(bill?.subtotal ?? clientBreakdown.subtotal ?? 0)
  const taxAmount = Number(bill?.taxAmount ?? clientBreakdown.taxAmount ?? 0)
  const tipAmount = Number(selectedTip || bill?.tipAmount || 0)
  const discountAmount = Number(bill?.discountAmount || 0)
  const grandTotal = Number(
    bill?.grandTotal !== undefined && selectedTip === Number(bill?.tipAmount || 0)
      ? bill.grandTotal
      : subtotal + taxAmount - discountAmount + tipAmount
  )

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
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>{formattedTableSpot} · {bill?.billNumber || 'Calculating Total...'}</span>
                  {loading && <Loader2 className="size-3 animate-spin text-primary inline shrink-0" />}
                </DialogDescription>
              </div>
            </div>
            {(bill?.status || displayItems.length > 0) && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-extrabold capitalize px-2 py-0.5',
                  bill?.status === 'PAID'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                    : bill?.status === 'REQUESTED'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 animate-pulse'
                    : 'border-primary/40 bg-primary/10 text-primary'
                )}
              >
                {bill?.status || 'Active'}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading && (!displayItems || displayItems.length === 0) ? (
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
                <span>Table / Spot</span>
                <span className="font-bold text-foreground">{formattedTableSpot}</span>
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

            {pendingBillAlertDone && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <BellRing className="size-4 shrink-0 text-emerald-500" />
                <span>Waiter notified to bring & settle your pending bill (₹{grandTotal.toFixed(2)}) at {formattedTableSpot}!</span>
              </div>
            )}

            {/* ── 1. Party Thrower (Single Host Payer) Section ── */}
            {partyThrower && !isAssigningHost ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <Crown className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-foreground">🎉 Party Thrower:</span>
                      <span className="font-black text-amber-600 dark:text-amber-400 truncate">
                        {partyThrower.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Sole host payer · Waiter collection routed to {partyThrower.name} {partyThrower.phone ? `(${partyThrower.phone})` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setHostNameInput(partyThrower.name)
                      setHostPhoneInput(partyThrower.phone || '')
                      setIsAssigningHost(true)
                    }}
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={hostAssignLoading}
                    className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={handleRemovePartyThrower}
                    title="Remove Party Thrower"
                  >
                    {hostAssignLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <Trash2 className="size-3.5 mr-1" />}
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            ) : isAssigningHost ? (
              <div className="p-4 rounded-2xl bg-muted/40 border border-amber-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Crown className="size-3.5 text-amber-500" />
                    {partyThrower ? 'Edit Party Thrower (Host Payer)' : 'Assign Party Thrower (Host Payer)'}
                  </span>
                  <div className="flex items-center gap-2">
                    {partyThrower && (
                      <button
                        type="button"
                        disabled={hostAssignLoading}
                        onClick={handleRemovePartyThrower}
                        className="text-[11px] text-destructive hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                        Remove Host
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAssigningHost(false)
                        setHostNameInput('')
                        setHostPhoneInput('')
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Designate one person to cover the entire table bill. Waiter and digital payment collection will route to this host.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Host Name (e.g. Rahul)"
                    value={hostNameInput}
                    onChange={(e) => setHostNameInput(e.target.value)}
                    className="h-8.5 text-xs bg-background"
                  />
                  <Input
                    placeholder="Host Phone (optional)"
                    value={hostPhoneInput}
                    onChange={(e) => setHostPhoneInput(e.target.value)}
                    className="h-8.5 text-xs bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={hostAssignLoading || !hostNameInput.trim()}
                    onClick={handleAssignPartyThrower}
                    className="flex-1 h-8.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black cursor-pointer"
                  >
                    {hostAssignLoading ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
                    Confirm Party Thrower
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/20 border border-border/60 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Crown className="size-3.5 text-amber-500/80" />
                  <span className="text-[11px]">Dining with a group or host?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHostNameInput('')
                    setHostPhoneInput('')
                    setIsAssigningHost(true)
                  }}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  + Assign Party Thrower
                </button>
              </div>
            )}

            {/* ── 2. Quick Action Bar: Split Bill & Ask for Pending Bill ── */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSplitModal(true)}
                className="h-11 min-h-[44px] text-xs sm:text-sm font-bold gap-2 rounded-xl border-border/80 hover:border-primary/40 cursor-pointer transition-all active:scale-[0.99]"
              >
                <Users className="size-4 text-primary shrink-0" />
                <span>Split Bill</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={askBillLoading || pendingBillAlertDone}
                onClick={handleAskPendingBill}
                className="h-11 min-h-[44px] text-xs sm:text-sm font-bold gap-2 rounded-xl border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 cursor-pointer transition-all active:scale-[0.99]"
              >
                <BellRing className={cn('size-4 text-amber-500 shrink-0', askBillLoading && 'animate-spin')} />
                <span>{pendingBillAlertDone ? 'Bill Alerted' : 'Ask for Pending Bill'}</span>
              </Button>
            </div>

            {/* Itemized Order Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Order Breakdown
              </h4>
              <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card overflow-hidden">
                {displayItems && displayItems.length > 0 ? (
                  displayItems.map((it: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-md bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px]">
                          {it.quantity}x
                        </span>
                        <span className="font-semibold text-foreground">{it.name || it.itemName}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        ₹{Number(it.total || it.itemTotal || (Number(it.price || 0) * Number(it.quantity || 1))).toFixed(2)}
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
                        onClick={() => {
                          setIsCustomTip(false)
                          setCustomTip('')
                          handleApplyTip(opt.val)
                        }}
                        className={cn(
                          'h-9 rounded-xl font-extrabold text-xs transition-all cursor-pointer',
                          selectedTip === opt.val && !isCustomTip
                            ? 'shadow-xs scale-[1.02]'
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
                      disabled={!customTip || Number(customTip) < 0}
                      onClick={() => handleApplyTip(Number(customTip))}
                      className="h-9 px-3 rounded-xl text-xs font-bold cursor-pointer"
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <Send className="size-3 text-primary" />
                  WhatsApp E-Invoice (Optional)
                </label>
                {phoneSaveStatus === 'saving' && (
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Loader2 className="size-2.5 animate-spin" />
                    Saving...
                  </span>
                )}
                {phoneSaveStatus === 'saved' && isValidWhatsAppPhone(customerPhone) && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ Saved ({formatPhoneForDisplay(customerPhone)})
                  </span>
                )}
                {phoneSaveStatus === 'error' && (
                  <span className="text-[10px] font-semibold text-destructive">
                    Save failed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="+91 98XXXXXXXX for WhatsApp bill"
                  value={customerPhone}
                  onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                  onBlur={() => {
                    if (bill?.id && customerPhone.trim() !== lastSavedPhoneRef.current) {
                      syncCustomerPhoneToBill(customerPhone, bill.id)
                    }
                  }}
                  className="h-9 text-xs rounded-xl bg-card flex-1"
                />
                {bill?.id && customerPhone.trim() !== lastSavedPhoneRef.current && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={phoneSaveStatus === 'saving'}
                    onClick={() => syncCustomerPhoneToBill(customerPhone, bill.id)}
                    className="h-9 px-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Save
                  </Button>
                )}
              </div>
              {customerPhone.trim() && !isValidWhatsAppPhone(customerPhone) ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Enter a valid 10-digit mobile number (or include country code like +91).
                </p>
              ) : isValidWhatsAppPhone(customerPhone) ? (
                <p className="text-[10px] text-muted-foreground">
                  Waiter &amp; Admin can send your bill directly to this WhatsApp number.
                </p>
              ) : null}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                disabled={loading || payLoading || physicalRequested}
                onClick={handleRequestPhysicalBill}
                className="w-full h-12 min-h-[48px] rounded-2xl font-bold text-xs sm:text-sm gap-2 border-border hover:bg-muted cursor-pointer shrink-0"
              >
                <Banknote className="size-4.5 text-muted-foreground shrink-0" />
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
                className="w-full h-12 min-h-[48px] rounded-2xl font-extrabold text-xs sm:text-sm gap-2 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 cursor-pointer shrink-0"
              >
                <QrCode className="size-4.5 shrink-0" />
                <span>{showUpiQr ? 'Confirm UPI Payment' : 'Pay Online / UPI QR'}</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Split Bill Modal */}
      <CustomerSplitBillModal
        open={showSplitModal}
        onOpenChange={setShowSplitModal}
        tableNumber={tableNumber}
        billId={bill?.id}
        subtotal={subtotal}
        taxAmount={taxAmount}
        grandTotal={grandTotal}
        items={displayItems}
        waiterName={waiterName}
        onSuccess={() => {
          onSuccess?.()
        }}
      />
    </Dialog>
  )
}

