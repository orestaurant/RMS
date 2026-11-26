'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Receipt,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Clock,
  CreditCard,
  Banknote,
  QrCode,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReceiptLineItem {
  id?: string
  name: string
  quantity: number
  price: number
  total: number
}

export interface OrderReceiptData {
  receiptNumber: string
  billId?: string | null
  orderNumber: string
  isPaid: boolean
  isCombinedBill?: boolean
  paymentStatus: string
  paymentMethod?: string | null
  transactionId?: string | null
  referenceNumber?: string | null
  paidAt?: string | null
  issuedAt?: string | null
  restaurantName: string
  restaurantAddress?: string
  restaurantPhone?: string
  branchName?: string
  gstNumber?: string | null
  fssaiNumber?: string | null
  customerName?: string
  customerPhone?: string
  tableNumber?: string | null
  vehicleNumber?: string | null
  orderType?: string
  source?: string
  waiterName?: string | null
  subtotal: number
  discountAmount: number
  discountPercentage?: number
  discountReason?: string | null
  taxAmount: number
  serviceCharge?: number
  coverCharges?: number
  nonPaymentPenalty?: number
  tipAmount?: number
  grandTotal: number
  billGrandTotal?: number
  items: ReceiptLineItem[]
}

export interface ReceiptOrderInput {
  id: string
  orderNumber: string
  status: string
  total: number
  totalAmount?: number
  subtotal?: number
  discountAmount?: number
  discountPercentage?: number
  discountReason?: string | null
  taxAmount?: number
  serviceCharge?: number
  source?: string
  orderType?: string
  paymentStatus?: string
  isPaid?: boolean
  billId?: string | null
  billNumber?: string | null
  tableNumber?: string | null
  branchName?: string
  createdAt: string
  updatedAt?: string
  items: ReceiptLineItem[]
  receipt?: OrderReceiptData
}

interface CustomerReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ReceiptOrderInput | null
}

function formatPaymentMethodLabel(method?: string | null) {
  if (!method) return 'Online / Verified'
  const m = method.toUpperCase()
  if (m === 'UPI' || m === 'WHATSAPP_LINK') return 'UPI Instant Pay'
  if (m === 'CARD') return 'Card Payment'
  if (m === 'CASH') return 'Cash'
  if (m === 'WALLET') return 'Digital Wallet'
  if (m === 'ONLINE_PAYMENT') return 'Online Payment'
  return method.replace(/_/g, ' ')
}

function getPaymentMethodIcon(method?: string | null) {
  const m = String(method || '').toUpperCase()
  if (m === 'UPI' || m === 'WHATSAPP_LINK') return QrCode
  if (m === 'CARD') return CreditCard
  if (m === 'CASH') return Banknote
  return ShieldCheck
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function CustomerReceiptModal({
  open,
  onOpenChange,
  order,
}: CustomerReceiptModalProps) {
  const [liveBill, setLiveBill] = useState<any | null>(null)
  const [loadingLiveBill, setLoadingLiveBill] = useState(false)
  const [copied, setCopied] = useState(false)

  // Optionally refresh from /api/bills/[billId] when modal opens so any late tip/settlement updates show immediately
  useEffect(() => {
    if (!open || !order) {
      setLiveBill(null)
      return
    }
    const targetBillId = order.receipt?.billId || order.billId
    if (!targetBillId) return

    let active = true
    setLoadingLiveBill(true)
    fetch(`/api/bills/${encodeURIComponent(targetBillId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.success && json.data) {
          setLiveBill(json.data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingLiveBill(false)
      })

    return () => {
      active = false
    }
  }, [open, order])

  if (!order) return null

  const baseReceipt: OrderReceiptData = order.receipt || {
    receiptNumber: order.billNumber || `RCPT-${order.orderNumber}`,
    billId: order.billId,
    orderNumber: order.orderNumber,
    isPaid: Boolean(order.isPaid),
    paymentStatus: order.paymentStatus || 'completed',
    restaurantName: 'RestoSphere',
    branchName: order.branchName || 'Main Branch',
    tableNumber: order.tableNumber,
    orderType: order.orderType,
    source: order.source,
    subtotal: Number(
      order.subtotal ||
        order.items.reduce((s, i) => s + Number(i.total || i.price * i.quantity || 0), 0)
    ),
    discountAmount: Number(order.discountAmount || 0),
    discountPercentage: Number(order.discountPercentage || 0),
    discountReason: order.discountReason || null,
    taxAmount: Number(order.taxAmount || 0),
    serviceCharge: Number(order.serviceCharge || 0),
    tipAmount: 0,
    grandTotal: Number(order.total || order.totalAmount || 0),
    items: order.items || [],
    issuedAt: order.createdAt,
    paidAt: order.updatedAt || order.createdAt,
  }

  // Merge live bill details if fetched (unless it's a combined multi-order table bill where per-order breakdown is clearer)
  const isCombinedBill = Boolean(baseReceipt.isCombinedBill)
  const receipt: OrderReceiptData =
    liveBill && !isCombinedBill
      ? {
          ...baseReceipt,
          receiptNumber: liveBill.billNumber || baseReceipt.receiptNumber,
          paymentMethod: liveBill.paymentMethod || baseReceipt.paymentMethod,
          paidAt: liveBill.paidAt || baseReceipt.paidAt,
          customerName: liveBill.customerName || baseReceipt.customerName,
          customerPhone: liveBill.customerPhone || baseReceipt.customerPhone,
          waiterName: liveBill.waiter?.name || baseReceipt.waiterName,
          subtotal: Number(liveBill.subtotal ?? baseReceipt.subtotal),
          discountAmount: Number(liveBill.discountAmount ?? baseReceipt.discountAmount),
          taxAmount: Number(liveBill.taxAmount ?? baseReceipt.taxAmount),
          tipAmount: Number(liveBill.tipAmount ?? baseReceipt.tipAmount ?? 0),
          coverCharges: Number(liveBill.coverCharges ?? baseReceipt.coverCharges ?? 0),
          nonPaymentPenalty: Number(liveBill.nonPaymentPenalty ?? baseReceipt.nonPaymentPenalty ?? 0),
          grandTotal: Number(liveBill.grandTotal ?? baseReceipt.grandTotal),
          items:
            Array.isArray(liveBill.items) && liveBill.items.length > 0
              ? liveBill.items
              : baseReceipt.items,
        }
      : baseReceipt

  const paidTimestamp = receipt.paidAt || receipt.issuedAt || order.createdAt
  const formattedPaidDate = new Date(paidTimestamp).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const PaymentIcon = getPaymentMethodIcon(receipt.paymentMethod)

  const handlePrint = () => {
    if (typeof window === 'undefined') return
    const itemsRows = receipt.items
      .map(
        (it) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px dashed #e5e7eb;">
            <div style="font-weight:600;color:#111827;">${escapeHtml(it.name)}</div>
            <div style="font-size:11px;color:#6b7280;">${it.quantity} × ₹${Number(it.price || 0).toFixed(2)}</div>
          </td>
          <td style="padding:8px 0;border-bottom:1px dashed #e5e7eb;text-align:right;font-weight:600;font-family:monospace;color:#111827;">
            ₹${Number(it.total || it.price * it.quantity || 0).toFixed(2)}
          </td>
        </tr>`
      )
      .join('')

    const printWindow = window.open('', '_blank', 'width=460,height=720')
    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; background: #fff; color: #111827; }
            .receipt { max-width: 380px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
            .center { text-align: center; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 6px; }
            .divider { border-top: 1px dashed #d1d5db; margin: 14px 0; }
            .meta { width: 100%; font-size: 12px; border-collapse: collapse; }
            .meta td { padding: 3px 0; color: #4b5563; }
            .meta td:last-child { text-align: right; font-weight: 600; color: #111827; }
            .items { width: 100%; font-size: 13px; border-collapse: collapse; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; color: #4b5563; margin: 5px 0; }
            .grand { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #111827; margin-top: 8px; padding-top: 8px; border-top: 1.5px solid #111827; }
            @media print { body { padding: 0; } .receipt { border: none; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div style="font-size:18px;font-weight:800;">RestoSphere</div>
              <div class="badge">PAID • OFFICIAL RECEIPT</div>
            </div>
            <div class="divider"></div>
            <table class="meta">
              <tr><td>Receipt No.</td><td>${escapeHtml(receipt.receiptNumber)}</td></tr>
              <tr><td>Order No.</td><td>#${escapeHtml(receipt.orderNumber)}</td></tr>
              <tr><td>Paid On</td><td>${escapeHtml(formattedPaidDate)}</td></tr>
              <tr><td>Customer</td><td>${escapeHtml(receipt.customerName || 'Guest')}</td></tr>
              <tr><td>Payment Mode</td><td>${escapeHtml(formatPaymentMethodLabel(receipt.paymentMethod))}</td></tr>
              ${receipt.transactionId ? `<tr><td>Transaction ID</td><td>${escapeHtml(receipt.transactionId)}</td></tr>` : ''}
            </table>
            <div class="divider"></div>
            <table class="items">${itemsRows}</table>
            <div style="margin-top:12px;">
              <div class="total-row"><span>Item Subtotal</span><span>₹${receipt.subtotal.toFixed(2)}</span></div>
              ${receipt.discountAmount > 0 ? `<div class="total-row" style="color:#047857;"><span>Discount</span><span>-₹${receipt.discountAmount.toFixed(2)}</span></div>` : ''}
              ${receipt.taxAmount > 0 ? `<div class="total-row"><span>GST / Taxes</span><span>₹${receipt.taxAmount.toFixed(2)}</span></div>` : ''}
              ${(receipt.serviceCharge || 0) > 0 ? `<div class="total-row"><span>Service Charge</span><span>₹${Number(receipt.serviceCharge).toFixed(2)}</span></div>` : ''}
              ${(receipt.tipAmount || 0) > 0 ? `<div class="total-row"><span>Waiter Tip</span><span>₹${Number(receipt.tipAmount).toFixed(2)}</span></div>` : ''}
              <div class="grand"><span>Total Paid</span><span>₹${receipt.grandTotal.toFixed(2)}</span></div>
            </div>
            <div class="divider"></div>
            <div class="center" style="font-size:11px;color:#6b7280;">Thank you for dining with us!</div>
          </div>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownloadTxt = () => {
    const lines = [
      `========================================`,
      `               RESTOSPHERE`,
      `========================================`,
      `OFFICIAL PAYMENT RECEIPT (PAID)`,
      `Receipt #  : ${receipt.receiptNumber}`,
      `Order #    : #${receipt.orderNumber}`,
      `Paid Date  : ${formattedPaidDate}`,
      `Guest      : ${receipt.customerName || 'Guest'}`,
      `Method     : ${formatPaymentMethodLabel(receipt.paymentMethod)}`,
      receipt.transactionId ? `Txn ID     : ${receipt.transactionId}` : '',
      `----------------------------------------`,
      `ITEMS:`,
      ...receipt.items.map(
        (it) =>
          `${it.quantity}x ${it.name}  @ ₹${Number(it.price || 0).toFixed(2)} = ₹${Number(
            it.total || it.price * it.quantity || 0
          ).toFixed(2)}`
      ),
      `----------------------------------------`,
      `Subtotal   : ₹${receipt.subtotal.toFixed(2)}`,
      receipt.discountAmount > 0 ? `Discount   : -₹${receipt.discountAmount.toFixed(2)}` : '',
      receipt.taxAmount > 0 ? `Taxes/GST  : ₹${receipt.taxAmount.toFixed(2)}` : '',
      (receipt.serviceCharge || 0) > 0 ? `Service    : ₹${Number(receipt.serviceCharge).toFixed(2)}` : '',
      (receipt.tipAmount || 0) > 0 ? `Waiter Tip : ₹${Number(receipt.tipAmount).toFixed(2)}` : '',
      `TOTAL PAID : ₹${receipt.grandTotal.toFixed(2)}`,
      `========================================`,
      `Thank you for dining with us!`,
    ].filter(Boolean)

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Receipt-${receipt.receiptNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopySummary = async () => {
    const summary = `RestoSphere Receipt (${receipt.receiptNumber}) | Order #${receipt.orderNumber} | Paid ₹${receipt.grandTotal.toFixed(2)} via ${formatPaymentMethodLabel(receipt.paymentMethod)} on ${formattedPaidDate}`
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        {/* Top Paid Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-gradient-to-br from-emerald-600/15 via-card to-rose-500/[0.05] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-2xl bg-[#24963F] text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/25">
                <Receipt className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <span>Payment Receipt</span>
                  {loadingLiveBill && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-mono truncate">
                  {receipt.receiptNumber} · #{receipt.orderNumber}
                </DialogDescription>
              </div>
            </div>

            <Badge className="shrink-0 rounded-full bg-[#24963F] text-white border-0 px-2.5 py-0.5 text-[11px] font-extrabold gap-1">
              <CheckCircle2 className="size-3" />
              PAID
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Order & Payment Metadata */}
          <div className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Paid On
              </span>
              <span className="font-semibold text-foreground">{formattedPaidDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-semibold text-foreground">{receipt.customerName || 'Guest'}</span>
            </div>
            {(receipt.tableNumber || receipt.vehicleNumber || receipt.source) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dining Spot / Mode</span>
                <span className="font-semibold text-foreground">
                  {receipt.tableNumber
                    ? String(receipt.tableNumber).toLowerCase().startsWith('table')
                      ? receipt.tableNumber
                      : `Table ${receipt.tableNumber}`
                    : receipt.vehicleNumber
                      ? `Drive-In (${receipt.vehicleNumber})`
                      : (receipt.source || receipt.orderType || 'Dine-In').replace(/_/g, ' ')}
                </span>
              </div>
            )}
            {receipt.waiterName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Served By</span>
                <span className="font-semibold text-foreground">{receipt.waiterName}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment Mode</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#24963F] dark:text-emerald-400">
                <PaymentIcon className="size-3.5" />
                {formatPaymentMethodLabel(receipt.paymentMethod)}
              </span>
            </div>
            {(receipt.transactionId || receipt.referenceNumber) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transaction / Ref</span>
                <span className="font-mono text-[11px] font-semibold text-foreground">
                  {receipt.transactionId || receipt.referenceNumber}
                </span>
              </div>
            )}
          </div>

          {isCombinedBill && receipt.billGrandTotal && (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-700 dark:text-sky-300">
              Settled under combined table invoice <span className="font-mono font-bold">{receipt.receiptNumber}</span> (Total Bill: ₹{Number(receipt.billGrandTotal).toFixed(2)}). Below is this order&apos;s itemized summary.
            </div>
          )}

          {/* Itemized Bill */}
          <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Itemized Dishes ({receipt.items.length})</span>
              <span>Amount</span>
            </div>

            <div className="divide-y divide-dashed divide-border/70">
              {receipt.items.map((item, idx) => {
                const lineTotal = Number(item.total || item.price * item.quantity || 0)
                return (
                  <div key={`${item.id || item.name}-${idx}`} className="py-2 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">
                        <span className="font-mono text-[#E23744] dark:text-rose-400 mr-1.5">
                          {item.quantity}×
                        </span>
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        ₹{Number(item.price || 0).toFixed(2)} each
                      </p>
                    </div>
                    <span className="font-mono font-bold text-foreground shrink-0">
                      ₹{lineTotal.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>

            <Separator className="border-dashed" />

            {/* Financial Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Item Subtotal</span>
                <span className="font-mono font-medium text-foreground">₹{receipt.subtotal.toFixed(2)}</span>
              </div>

              {receipt.discountAmount > 0 && (
                <div className="flex justify-between text-[#24963F] dark:text-emerald-400 font-semibold">
                  <span>
                    Discount
                    {receipt.discountPercentage ? ` (${receipt.discountPercentage}%)` : ''}
                    {receipt.discountReason ? ` · ${receipt.discountReason}` : ''}
                  </span>
                  <span className="font-mono">-₹{receipt.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {receipt.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST / Taxes</span>
                  <span className="font-mono font-medium text-foreground">₹{receipt.taxAmount.toFixed(2)}</span>
                </div>
              )}

              {(receipt.serviceCharge || 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge</span>
                  <span className="font-mono font-medium text-foreground">
                    ₹{Number(receipt.serviceCharge).toFixed(2)}
                  </span>
                </div>
              )}

              {(receipt.coverCharges || 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Cover Charges</span>
                  <span className="font-mono font-medium text-foreground">
                    ₹{Number(receipt.coverCharges).toFixed(2)}
                  </span>
                </div>
              )}

              {(receipt.tipAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Waiter Tip</span>
                  <span className="font-mono">₹{Number(receipt.tipAmount).toFixed(2)}</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex items-center justify-between text-sm font-extrabold text-foreground">
                <span>Total Amount Paid</span>
                <span className="font-mono text-lg text-[#24963F] dark:text-emerald-400">
                  ₹{receipt.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Verified Footer */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Thank you for dining with us!</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-border/70 bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-[#24963F]" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTxt}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Save</span>
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="h-9 rounded-xl bg-[#E23744] hover:bg-[#CB202D] text-white text-xs font-bold px-4 gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="size-3.5" />
            <span>Print / PDF Receipt</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
