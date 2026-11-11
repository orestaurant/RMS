'use client'

import { useState, useEffect } from 'react'
import { Clock, AlertTriangle, Flame, CheckCircle2, ChefHat, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { liveOrders, type Order, type OrderStatus } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type KanbanStatus = 'pending' | 'accepted' | 'cooking' | 'ready'

const columns: { id: KanbanStatus; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'pending', label: 'Incoming', icon: AlertTriangle, color: 'text-warning', bg: 'border-warning/30 bg-warning/5' },
  { id: 'accepted', label: 'Accepted', icon: ChefHat, color: 'text-primary', bg: 'border-primary/30 bg-primary/5' },
  { id: 'cooking', label: 'Cooking', icon: Flame, color: 'text-chart-4', bg: 'border-chart-4/30 bg-chart-4/5' },
  { id: 'ready', label: 'Ready', icon: CheckCircle2, color: 'text-success', bg: 'border-success/30 bg-success/5' },
]

const transitions: Record<KanbanStatus, KanbanStatus | null> = {
  pending: 'accepted',
  accepted: 'cooking',
  cooking: 'ready',
  ready: null,
}

const transitionLabel: Record<KanbanStatus, string> = {
  pending: 'Accept',
  accepted: 'Start Cooking',
  cooking: 'Mark Ready',
  ready: 'Serve',
}

function OrderTimer({ startTime, urgent }: { startTime: string; urgent?: boolean }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startTime).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 60000))
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [startTime])

  const mins = elapsed
  const isOverdue = mins > 20

  return (
    <div className={cn(
      'flex items-center gap-1 text-xs font-mono font-bold',
      isOverdue ? 'text-destructive' : urgent ? 'text-warning' : 'text-muted-foreground'
    )}>
      <Clock className="size-3.5" />
      <span>{mins}:{String(0).padStart(2, '0')} min</span>
      {isOverdue && <AlertTriangle className="size-3 text-destructive" />}
    </div>
  )
}

function KitchenOrderCard({
  order,
  onAdvance,
}: {
  order: Order
  onAdvance: (id: string, next: KanbanStatus) => void
}) {
  const status = order.status as KanbanStatus
  const next = transitions[status]

  const priorityRing: Record<string, string> = {
    normal: 'ring-border',
    high: 'ring-warning/50',
    urgent: 'ring-destructive/60',
  }

  return (
    <div className={cn(
      'flex flex-col rounded-2xl border bg-card p-4 gap-3 ring-1 ring-inset',
      priorityRing[order.priority],
      order.priority === 'urgent' && 'ring-destructive/40',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {order.priority === 'urgent' && (
              <span className="flex size-2 shrink-0 rounded-full bg-destructive animate-ping" />
            )}
            <span className="text-base font-bold">{order.id}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Table {order.tableNumber}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs text-muted-foreground">{order.waiter}</span>
          </div>
        </div>
        <OrderTimer startTime={order.createdAt} urgent={order.priority !== 'normal'} />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            <span className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
              'bg-muted text-foreground'
            )}>
              {item.quantity}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              {item.notes && (
                <p className="text-xs mt-0.5 text-warning flex items-center gap-1">
                  <span>⚠</span>
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Special notes */}
      {order.specialNotes && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning">
          {order.specialNotes}
        </div>
      )}

      {/* Action */}
      {next ? (
        <Button
          size="sm"
          className={cn(
            'w-full h-10 text-sm font-semibold touch-active',
            next === 'cooking' && 'bg-chart-4 hover:bg-chart-4/90 text-white',
            next === 'ready' && 'bg-success hover:bg-success/90 text-success-foreground',
          )}
          onClick={() => onAdvance(order.id, next)}
        >
          {transitionLabel[status]}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-10 text-sm font-semibold border-success/50 text-success hover:bg-success/10"
          onClick={() => onAdvance(order.id, 'served' as KanbanStatus)}
        >
          Mark Served
        </Button>
      )}
    </div>
  )
}

export function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>(liveOrders)

  const advance = (id: string, next: KanbanStatus | 'served') => {
    if (next === 'served') {
      setOrders((prev) => prev.filter((o) => o.id !== id))
      return
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next } : o))
    )
  }

  return (
    <main className="flex h-[calc(100vh-56px)] flex-col gap-0">
      {/* Summary bar */}
      <div className="flex items-center gap-6 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-3">
        {columns.map((col) => {
          const count = orders.filter((o) => o.status === col.id).length
          return (
            <div key={col.id} className="flex items-center gap-2">
              <col.icon className={cn('size-4', col.color)} />
              <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
              <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">
                {count}
              </Badge>
            </div>
          )
        })}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-success font-medium">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          Live Kitchen
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-1 gap-0 overflow-hidden divide-x divide-border">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id)
          return (
            <div key={col.id} className={cn('flex flex-1 flex-col min-w-0', col.bg.split(' ')[1])}>
              {/* Column header */}
              <div className={cn(
                'flex items-center gap-2 px-4 py-3 border-b',
                col.bg
              )}>
                <col.icon className={cn('size-4 shrink-0', col.color)} />
                <span className={cn('text-sm font-semibold', col.color)}>{col.label}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-auto h-6 min-w-6 px-1.5 text-xs font-bold',
                    colOrders.length > 0 && col.color
                  )}
                >
                  {colOrders.length}
                </Badge>
              </div>

              {/* Column cards */}
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-3 p-4">
                  {colOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                        <col.icon className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">No orders</p>
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        onAdvance={advance}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </main>
  )
}
