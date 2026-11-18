'use client'

import React, { useState } from 'react'
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
import {
  QrCode,
  Search,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  Clock,
  Camera,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TakeawayQRScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderLoaded?: (order: any) => void
}

export function TakeawayQRScannerModal({
  open,
  onOpenChange,
  onOrderLoaded,
}: TakeawayQRScannerModalProps) {
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadedOrder, setLoadedOrder] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const handleLookup = async (token: string) => {
    const clean = token.trim()
    if (!clean) return

    try {
      setLoading(true)
      setError(null)
      setLoadedOrder(null)

      // Query order by number or id
      const res = await fetch(`/api/orders?tableNumber=${encodeURIComponent(clean)}&limit=1`)
      const json = await res.json()

      if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
        setLoadedOrder(json.data[0])
        onOrderLoaded?.(json.data[0])
      } else {
        // Fallback: search live orders
        const liveRes = await fetch('/api/orders/live')
        const liveJson = await liveRes.json()
        if (liveRes.ok && liveJson.success && Array.isArray(liveJson.data)) {
          const found = liveJson.data.find(
            (o: any) =>
              String(o.id).toLowerCase() === clean.toLowerCase() ||
              String(o.orderNumber || '').toLowerCase() === clean.toLowerCase() ||
              String(o.tableNumber || '').toLowerCase().includes(clean.toLowerCase())
          )
          if (found) {
            setLoadedOrder(found)
            onOrderLoaded?.(found)
            return
          }
        }
        setError(`No takeaway order found matching code "${clean}".`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to lookup takeaway QR')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateScan = (sampleCode: string) => {
    setTokenInput(sampleCode)
    handleLookup(sampleCode)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <QrCode className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Scan Takeaway QR Code
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Scan customer takeaway receipt QR or enter pickup order token.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Simulated Scanner Viewfinder */}
          <div className="relative rounded-2xl border-2 border-dashed border-primary/40 bg-muted/20 p-6 flex flex-col items-center justify-center text-center space-y-2 overflow-hidden">
            <div className="relative size-32 rounded-xl border-2 border-primary/60 flex items-center justify-center bg-card shadow-inner">
              <QrCode className="size-16 text-primary/70 animate-pulse" />
              {/* Scan laser line */}
              <div className="absolute inset-x-0 h-0.5 bg-primary/80 animate-bounce" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium pt-1">
              Position takeaway QR code in camera view
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSimulateScan('TK-101')}
                className="h-7 text-[10px] font-bold"
              >
                Simulate TK-101
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSimulateScan('Takeaway')}
                className="h-7 text-[10px] font-bold"
              >
                Simulate Takeaway
              </Button>
            </div>
          </div>

          {/* Manual Input Search */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Or Enter Pickup Token / Order ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. TK-101, ORD-920, Takeaway"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="h-9 text-xs rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLookup(tokenInput)
                }}
              />
              <Button
                disabled={loading || !tokenInput.trim()}
                onClick={() => handleLookup(tokenInput)}
                className="h-9 px-4 text-xs font-bold rounded-xl"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Lookup'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loaded Takeaway Order Card */}
          {loadedOrder && (
            <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500 text-emerald-500 bg-emerald-500/10 font-bold text-xs">
                    Takeaway Order #{loadedOrder.orderNumber || loadedOrder.id}
                  </Badge>
                  <span className="font-bold text-foreground">
                    {loadedOrder.customerName || 'Takeaway Customer'}
                  </span>
                </div>
                <span className="font-mono font-black text-primary text-sm">
                  ₹{Number(loadedOrder.total || loadedOrder.totalAmount || 0).toFixed(2)}
                </span>
              </div>

              <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2 space-y-1">
                {(loadedOrder.items || []).map((it: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.quantity}x {it.name || it.itemName}</span>
                    <span className="font-mono">₹{Number(it.total || (it.price * it.quantity) || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  className="h-8 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Confirm Takeaway Order & Handover
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
