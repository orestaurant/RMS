'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  UtensilsCrossed,
  Receipt,
  CheckCircle2,
  AlertCircle,
  TableProperties,
} from 'lucide-react'
import { TableData, TableStatus, formatTableDisplay } from '@/components/tables/tables-view'
import { cn } from '@/lib/utils'

interface KpiDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: TableStatus | null
  tables: TableData[]
  onSelectTableForOrder: (table: TableData) => void
  onSelectTableForBill: (table: TableData) => void
  onUpdateTableStatus: (tableId: string, status: TableStatus) => Promise<void>
}

export function KpiDetailDrawer({
  open,
  onOpenChange,
  status,
  tables,
  onSelectTableForOrder,
  onSelectTableForBill,
  onUpdateTableStatus,
}: KpiDetailDrawerProps) {
  if (!status) return null

  const matchingTables = tables.filter((t) => t.status === status)

  const statusTitleMap: Record<TableStatus, { title: string; desc: string; color: string }> = {
    available: {
      title: 'Available Tables',
      desc: 'Vacant tables ready for seating guests immediately.',
      color: 'text-success',
    },
    occupied: {
      title: 'Occupied Tables',
      desc: 'Tables with active dining guests and live orders.',
      color: 'text-primary',
    },
    reserved: {
      title: 'Reserved Tables',
      desc: 'Tables held for incoming bookings & customer reservations.',
      color: 'text-warning',
    },
    cleaning: {
      title: 'Cleaning & Bussing',
      desc: 'Tables being cleared and sanitized for the next party.',
      color: 'text-muted-foreground',
    },
    maintenance: {
      title: 'Maintenance',
      desc: 'Tables under service or maintenance.',
      color: 'text-destructive',
    },
    out_of_service: {
      title: 'Out of Service',
      desc: 'Tables temporarily out of service.',
      color: 'text-destructive',
    },
  }

  const cfg = statusTitleMap[status] || statusTitleMap.available

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        <DialogHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <TableProperties className="size-5" />
            </div>
            <div>
              <DialogTitle className={cn('text-base font-black', cfg.color)}>
                {cfg.title} ({matchingTables.length})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {cfg.desc}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto space-y-2.5 text-xs flex-1">
          {matchingTables.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tables currently in &quot;{status}&quot; state.
            </div>
          ) : (
            matchingTables.map((tbl) => {
              const isVip = tbl.section.toLowerCase().includes('vip')
              return (
                <div
                  key={tbl.id}
                  className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between gap-3 hover:border-primary/40 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {formatTableDisplay(tbl.tableNumber || tbl.number, isVip)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 h-4 capitalize">
                        {tbl.section}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="size-3" />
                        {tbl.capacity} seats
                      </span>
                    </div>

                    {tbl.guestCount ? (
                      <p className="text-[11px] text-primary font-medium">
                        {tbl.guestCount} active dining guests
                      </p>
                    ) : null}

                    {tbl.activeReservation ? (
                      <p className="text-[11px] text-warning font-medium">
                        Reserved for: {tbl.activeReservation.guestName}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status specific actions */}
                    {status === 'available' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false)
                            onSelectTableForOrder(tbl)
                          }}
                          className="h-7 text-xs font-bold gap-1 text-primary border-primary/30"
                        >
                          <UtensilsCrossed className="size-3" />
                          Take Order
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onUpdateTableStatus(tbl.id, 'occupied')}
                          className="h-7 text-xs font-bold"
                        >
                          Seat Guests
                        </Button>
                      </>
                    )}

                    {status === 'occupied' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false)
                            onSelectTableForOrder(tbl)
                          }}
                          className="h-7 text-xs font-bold gap-1 text-primary border-primary/30"
                        >
                          <UtensilsCrossed className="size-3" />
                          Add Items
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            onOpenChange(false)
                            onSelectTableForBill(tbl)
                          }}
                          className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Receipt className="size-3" />
                          Bill
                        </Button>
                      </>
                    )}

                    {status === 'cleaning' && (
                      <Button
                        size="sm"
                        onClick={() => onUpdateTableStatus(tbl.id, 'available')}
                        className="h-7 text-xs font-bold text-success border-success/40 bg-success/10 hover:bg-success/20"
                        variant="outline"
                      >
                        <CheckCircle2 className="size-3 mr-1" />
                        Mark Available
                      </Button>
                    )}

                    {status === 'reserved' && (
                      <Button
                        size="sm"
                        onClick={() => onUpdateTableStatus(tbl.id, 'occupied')}
                        className="h-7 text-xs font-bold"
                      >
                        Seat Party
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
