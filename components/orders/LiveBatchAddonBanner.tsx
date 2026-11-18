'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Flame,
  Clock,
  Sparkles,
  Plus,
  CheckCircle2,
  Lock,
  AlertCircle,
  ChefHat,
  UtensilsCrossed,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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

interface LiveBatchAddonBannerProps {
  currentTableNumber?: string | number
  customerName?: string
  onOrderPlaced?: () => void
  className?: string
  variant?: 'banner' | 'card' | 'inline'
}

export function LiveBatchAddonBanner({
  currentTableNumber = 'Table 1',
  customerName = 'Guest',
  onOrderPlaced,
  className,
  variant = 'banner',
}: LiveBatchAddonBannerProps) {
  const [batches, setBatches] = useState<LiveBatch[]>([])
  const [serverDelta, setServerDelta] = useState<number>(0)
  const [now, setNow] = useState<number>(Date.now())
  const [addingId, setAddingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    batchId: string
    type: 'success' | 'locked' | 'error'
    message: string
  } | null>(null)

  // Fetch active batches from server
  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/kds/batches', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.success && Array.isArray(data.batches)) {
        if (typeof data.serverTime === 'number') {
          // Track exact server-client time difference to eliminate clock drift
          setServerDelta(data.serverTime - Date.now())
        }
        setBatches(data.batches)
      }
    } catch (e) {
      // Non-blocking background sync
    }
  }, [])

  // Fast polling every 2.5s for real-time synchronization
  useEffect(() => {
    fetchBatches()
    const pollInterval = setInterval(fetchBatches, 2500)
    return () => clearInterval(pollInterval)
  }, [fetchBatches])

  // High-frequency 100ms local tick for smooth countdown ring without server load
  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now())
    }, 100)
    return () => clearInterval(tick)
  }, [])

  // Filter for active batches in 20s lock window OR recently locked
  const activeBatches = batches.filter((b) => {
    const serverCurrentTime = now + serverDelta
    const remainingMs = b.timerExpiresAt - serverCurrentTime
    // Show while in 20s lock window OR for 10s after locking so customers see the locked notice
    return (
      (b.status === 'PREPARING_LOCK_WINDOW' && remainingMs > -8000) ||
      (b.status === 'READY' && Date.now() - (b.startedAt || 0) < 60000)
    )
  })

  // Handle One-Tap +1 Live Add-on (with optional bypass lock)
  const handleAddOne = async (batch: LiveBatch, bypass = false) => {
    setAddingId(batch.id)
    setFeedback(null)

    try {
      const res = await fetch('/api/kds/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addon',
          batchId: batch.id,
          dishName: batch.dishName,
          tableNumber: currentTableNumber,
          customerName,
          quantity: 1,
          bypassLock: bypass,
        }),
      })

      const data = await res.json()

      if (res.status === 409 || data.reason === 'LOCKED') {
        setFeedback({
          batchId: batch.id,
          type: 'locked',
          message: 'The 20s window closed! Item routed to standard cooking queue.',
        })
        fetchBatches()
      } else if (!res.ok || !data.success) {
        setFeedback({
          batchId: batch.id,
          type: 'error',
          message: data.message || 'Could not add to batch. Please try again.',
        })
      } else {
        setFeedback({
          batchId: batch.id,
          type: 'success',
          message: `+1 ${batch.dishName} added on live order! ${bypass ? '(Bypassed lock restriction)' : ''} (Order #${data.newOrderNumber})`,
        })
        fetchBatches()
        if (onOrderPlaced) onOrderPlaced()
      }
    } catch (err: any) {
      setFeedback({
        batchId: batch.id,
        type: 'error',
        message: 'Network error. Please try again.',
      })
    } finally {
      setAddingId(null)
    }
  }

  if (activeBatches.length === 0) return null

  return (
    <div className={cn('space-y-3 w-full', className)}>
      {activeBatches.map((batch) => {
        const serverCurrentTime = now + serverDelta
        const remainingMs = Math.max(0, batch.timerExpiresAt - serverCurrentTime)
        const remainingSeconds = Math.ceil(remainingMs / 1000)
        const isLocked = remainingSeconds <= 0 || batch.status !== 'PREPARING_LOCK_WINDOW'
        const progressPercent = Math.min(100, Math.max(0, (remainingMs / 20000) * 100))

        const isAdding = addingId === batch.id
        const hasFeedback = feedback?.batchId === batch.id

        return (
          <div
            key={batch.id}
            className={cn(
              'relative overflow-hidden rounded-xl border p-4 transition-all duration-300 shadow-md',
              !isLocked
                ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-card border-amber-500/40 ring-1 ring-amber-500/20'
                : 'bg-card/95 border-border/70 text-muted-foreground'
            )}
          >
            {/* Top progress indicator bar */}
            {!isLocked && (
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left Column: Dish & Countdown description */}
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    'size-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5',
                    !isLocked
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Flame className="size-6" />
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground truncate">
                      {batch.dishName}
                    </span>
                    {!isLocked ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] animate-pulse px-2 py-0.5"
                      >
                        ⚡ 20s LIVE ADD-ON WINDOW
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground border-border text-[11px] px-2 py-0.5"
                      >
                        <Lock className="size-3 mr-1" />
                        In-Kitchen Cooking
                      </Badge>
                    )}
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      Batch #{batch.totalQuantity} portions
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {!isLocked ? (
                      <>
                        Chef is firing up <strong>{batch.dishName}</strong> right now! Tap{' '}
                        <span className="text-amber-500 font-bold">+1</span> to attach your portion
                        to this active cooking batch.
                      </>
                    ) : (
                      <>The 20-second grace window has locked. Chef is actively cooking this batch.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Right Column: Countdown Clock & One-Tap +1 Button */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {/* Countdown Dial */}
                <div
                  className={cn(
                    'flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border font-mono font-bold',
                    !isLocked
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                      : 'bg-muted/40 border-border text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="size-3.5" />
                    <span>00:{remainingSeconds.toString().padStart(2, '0')}</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
                    {!isLocked ? 'Remaining' : 'Locked'}
                  </span>
                </div>

                {/* One-Tap +1 Add-on Action */}
                {!isLocked ? (
                  <Button
                    size="sm"
                    disabled={isAdding}
                    onClick={() => handleAddOne(batch)}
                    className="h-10 px-4 font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    {isAdding ? (
                      <span className="flex items-center gap-1.5">
                        <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Plus className="size-4" />
                        <span>Add to Batch (+1)</span>
                      </span>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isAdding}
                      onClick={() => handleAddOne(batch, true)}
                      className="h-10 px-3 text-xs font-bold border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1 cursor-pointer"
                      title="Bypass 20s lock restriction and add directly to chef's batch"
                    >
                      <Plus className="size-3.5" />
                      <span>Bypass & Add (+1)</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* In-Card Toast Feedback */}
            {hasFeedback && (
              <div
                className={cn(
                  'mt-3 text-xs p-2.5 rounded-lg flex items-center gap-2 border font-medium',
                  feedback.type === 'success' && 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                  feedback.type === 'locked' && 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
                  feedback.type === 'error' && 'bg-destructive/15 border-destructive/30 text-destructive'
                )}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
