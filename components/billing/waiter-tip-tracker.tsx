'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Heart,
  IndianRupee,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Receipt,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TipItem {
  id: string
  amount: number
  status: 'PENDING' | 'SETTLED'
  billNumber: string
  tableNumber: string
  time: string
}

interface WaiterTipsData {
  waiter: { id: string; name: string; phone: string } | null
  todayTipsTotal: number
  allTimeTipsTotal: number
  pendingTipsTotal: number
  tipsCount: number
  recentTips: TipItem[]
}

interface WaiterTipTrackerProps {
  waiterId?: string
  className?: string
}

export function WaiterTipTracker({ waiterId, className }: WaiterTipTrackerProps) {
  const [data, setData] = useState<WaiterTipsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const fetchTips = useCallback(async () => {
    try {
      setLoading(true)
      const url = waiterId ? `/api/waiter/tips?waiterId=${encodeURIComponent(waiterId)}` : '/api/waiter/tips'
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok && json.success) {
        setData(json.data)
      }
    } catch (err) {
      console.warn('Failed to load waiter tips:', err)
    } finally {
      setLoading(false)
    }
  }, [waiterId])

  useEffect(() => {
    fetchTips()
    const interval = setInterval(fetchTips, 15000)
    return () => clearInterval(interval)
  }, [fetchTips])

  const todayTips = data?.todayTipsTotal || 0
  const allTimeTips = data?.allTimeTipsTotal || 0
  const pendingTips = data?.pendingTipsTotal || 0
  const waiterName = data?.waiter?.name || 'Staff'
  const recentList = data?.recentTips || []

  return (
    <Card
      className={cn(
        'rounded-2xl border border-emerald-500/20 bg-linear-to-r from-emerald-500/10 via-card to-emerald-500/5 shadow-xs overflow-hidden transition-all',
        className
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Main Stat info */}
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Heart className="size-5 fill-emerald-500 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Waiter Tip Ledger · {waiterName}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                >
                  Live Tips
                </Badge>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-black text-foreground flex items-center font-mono">
                  ₹{todayTips.toFixed(2)}
                </h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Earned Today
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics pills & Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-3 text-xs pr-2 border-r border-border/80">
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">All-Time</span>
                <span className="font-mono font-bold text-foreground">₹{allTimeTips.toFixed(0)}</span>
              </div>
              {pendingTips > 0 && (
                <div>
                  <span className="text-[10px] text-amber-500 block font-medium">Pending Bill</span>
                  <span className="font-mono font-bold text-amber-500">₹{pendingTips.toFixed(0)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchTips}
                className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                title="Refresh tips"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              </Button>

              {recentList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <span>History ({recentList.length})</span>
                  {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable itemized tip history */}
        {expanded && recentList.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-border/70 space-y-2 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Recent Itemized Tips
            </h4>
            <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card overflow-hidden max-h-48 overflow-y-auto">
              {recentList.map((tip) => (
                <div key={tip.id} className="p-2.5 px-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{tip.tableNumber}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">#{tip.billNumber}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1.5 h-4 capitalize font-semibold',
                        tip.status === 'SETTLED'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                      )}
                    >
                      {tip.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(tip.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +₹{tip.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

