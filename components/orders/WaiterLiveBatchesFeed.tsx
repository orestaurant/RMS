'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  Clock,
  CheckCircle2,
  Lock,
  UtensilsCrossed,
  Layers,
  ChefHat,
  Bell,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface LiveBatch {
  id: string
  dishName: string
  menuItemId?: string
  station: string
  cuisine: string
  status: 'PREPARING_LOCK_WINDOW' | 'IN_KITCHEN_LOCKED' | 'READY' | 'SERVED'
  startedAt: number
  timerExpiresAt: number
  totalQuantity: number
  leadTicketId: string
  leadOrderNumber: string
  leadTableNumber: string | number
  allocations: Array<{
    id: string
    orderNumber: string
    tableNumber: string | number
    customerName?: string
    quantity: number
    isAddon: boolean
    createdAt: number
    status: 'cooking' | 'ready' | 'served'
  }>
  distributionHistory?: Array<{
    allocationId: string
    orderNumber: string
    tableNumber: string | number
    customerName: string
    quantityAllocated: number
    distributedAt: number
  }>
}

interface WaiterLiveBatchesFeedProps {
  onOrdersRefresh?: () => void
  className?: string
}

export function WaiterLiveBatchesFeed({
  onOrdersRefresh,
  className,
}: WaiterLiveBatchesFeedProps) {
  const [batches, setBatches] = useState<LiveBatch[]>([])
  const [serverDelta, setServerDelta] = useState<number>(0)
  const [now, setNow] = useState<number>(Date.now())
  const [servingId, setServingId] = useState<string | null>(null)

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/kds/batches', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.success && Array.isArray(data.batches)) {
        if (typeof data.serverTime === 'number') {
          setServerDelta(data.serverTime - Date.now())
        }
        setBatches(data.batches)
      }
    } catch (e) {
      // silent background sync
    }
  }, [])

  useEffect(() => {
    fetchBatches()
    const timer = setInterval(fetchBatches, 2500)
    return () => clearInterval(timer)
  }, [fetchBatches])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 150)
    return () => clearInterval(tick)
  }, [])

  // Relevant batches for Waiter: Active cooking/lock windows AND Ready to serve batches
  const activeBatches = batches.filter(
    (b) =>
      b.status === 'PREPARING_LOCK_WINDOW' ||
      b.status === 'IN_KITCHEN_LOCKED' ||
      b.status === 'READY'
  )

  const handleMarkServed = async (batchId: string) => {
    setServingId(batchId)
    try {
      const res = await fetch('/api/kds/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'served', batchId }),
      })
      if (res.ok) {
        await fetchBatches()
        if (onOrdersRefresh) onOrdersRefresh()
      }
    } catch (e) {
      console.warn('Failed to mark batch served:', e)
    } finally {
      setServingId(null)
    }
  }

  if (activeBatches.length === 0) return null

  return (
    <div className={cn('space-y-4 w-full', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-amber-500 animate-ping" />
          <h3 className="text-sm font-black tracking-tight text-foreground flex items-center gap-2">
            <ChefHat className="size-4 text-amber-500" />
            Kitchen Live Batches & Fair Table Distribution
          </h3>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-xs font-mono">
          {activeBatches.length} Live Batch{activeBatches.length > 1 ? 'es' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeBatches.map((batch) => {
          const serverCurrentTime = now + serverDelta
          const remainingMs = Math.max(0, batch.timerExpiresAt - serverCurrentTime)
          const remainingSeconds = Math.ceil(remainingMs / 1000)
          const isLockWindow = batch.status === 'PREPARING_LOCK_WINDOW' && remainingSeconds > 0
          const isReady = batch.status === 'READY'
          const isServing = servingId === batch.id

          return (
            <Card
              key={batch.id}
              className={cn(
                'relative overflow-hidden border transition-all shadow-sm',
                isReady
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : isLockWindow
                  ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-border/70 bg-card'
              )}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'size-10 rounded-xl flex items-center justify-center font-bold shrink-0',
                        isReady
                          ? 'bg-emerald-500 text-white'
                          : isLockWindow
                          ? 'bg-amber-500 text-black animate-pulse'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isReady ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Flame className="size-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {batch.dishName}
                        </span>
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                          {batch.totalQuantity}x Total
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Lead: {typeof batch.leadTableNumber === 'number' || !isNaN(Number(batch.leadTableNumber)) ? `Table ${batch.leadTableNumber}` : batch.leadTableNumber} (#{batch.leadOrderNumber})
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isReady ? (
                      <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5">
                        🍱 READY TO SERVE
                      </Badge>
                    ) : isLockWindow ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 text-xs font-mono font-bold animate-pulse">
                        <Clock className="size-3.5" />
                        <span>00:{remainingSeconds.toString().padStart(2, '0')}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                        <Lock className="size-3 mr-1" /> Cooking Locked
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Table Allocations & Fair Distribution Split */}
                <div className="space-y-1.5 rounded-xl border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>{isReady ? 'Serving Split (Fair FIFO)' : 'Batch Table Allocations'}</span>
                    <span>Qty</span>
                  </div>

                  <div className="divide-y divide-border/40">
                    {batch.allocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className={cn(
                          'flex items-center justify-between py-1.5 text-xs font-medium',
                          alloc.isAddon && 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {typeof alloc.tableNumber === 'number' || !isNaN(Number(alloc.tableNumber))
                              ? `Table ${alloc.tableNumber}`
                              : alloc.tableNumber}
                          </span>
                          {alloc.isAddon && (
                            <Badge variant="outline" className="text-[9px] border-amber-500/40 bg-amber-500/10 text-amber-500 font-extrabold px-1.5 py-0">
                              +1 LIVE ADD-ON
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                            ({alloc.customerName || 'Guest'})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {alloc.quantity}x
                          </span>
                          {isReady && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Prepared
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action for Waiter if ready */}
                {isReady && (
                  <Button
                    size="sm"
                    disabled={isServing}
                    onClick={() => handleMarkServed(batch.id)}
                    className="w-full h-9 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    {isServing ? (
                      'Marking Served...'
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Check className="size-4" />
                        <span>Confirm All Tables Served ({batch.totalQuantity}x {batch.dishName})</span>
                      </span>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
