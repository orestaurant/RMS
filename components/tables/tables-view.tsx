'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Clock,
  ChefHat,
  MoreVertical,
  Plus,
  Filter,
  QrCode,
  RefreshCw,
  Loader2,
  Calendar,
  AlertCircle,
  Search,
  Trash2,
  Receipt,
} from 'lucide-react'
import { BillSettlementModal } from '@/components/billing/bill-settlement-modal'
import { WaiterTipTracker } from '@/components/billing/waiter-tip-tracker'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { TableQRGenerator } from '@/components/tables/table-qr-generator'
import { useAuthContext } from '@/hooks/useAuthContext'

export function formatTableDisplay(tableNumber: string | number, isVip?: boolean) {
  let s = String(tableNumber || '').trim()
  if (!s) return isVip ? 'VIP Table' : 'Table'

  // If accidentally stored with double TT (e.g. TT11, TT12), normalize to T11, T12
  if (/^tt\d+/i.test(s)) {
    s = s.replace(/^tt(\d+)/i, 'T$1')
  }

  const prefix = isVip && !s.toLowerCase().includes('vip') ? 'VIP ' : ''

  // If already starts with T/t followed by numbers (e.g. T1, T12, t12)
  if (/^t\d+/i.test(s)) {
    return `${prefix}${s.toUpperCase()}`
  }

  // If purely digits (e.g. 1, 2, 12), show as T1, T2, T12
  if (/^\d+$/.test(s)) {
    return `${prefix}T${s}`
  }

  // If string already has a custom name like "Takeaway", "VIP-1", "Outdoor 5"
  return `${prefix}${s}`
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service' | 'maintenance'

export interface TableData {
  id: string
  number: number | string
  tableNumber: string
  section: string
  rawSection?: string
  capacity: number
  status: TableStatus
  waiter?: string
  occupiedSince?: string
  guestCount?: number
  order?: { id: string; status: string }
  activeReservation?: { guestName: string; guestCount: number; time?: string }
  billRequested?: boolean
  activeBillId?: string
  x?: number
  y?: number
}

const statusConfig: Record<
  TableStatus,
  {
    label: string
    dot: string
    card: string
    badge: string
  }
> = {
  available: {
    label: 'Available',
    dot: 'bg-success',
    card: 'border-success/25 bg-success/5 hover:border-success/50 hover:bg-success/10',
    badge: 'border-success/40 bg-success/10 text-success',
  },
  occupied: {
    label: 'Occupied',
    dot: 'bg-primary',
    card: 'border-primary/30 bg-primary/8 hover:border-primary/50 hover:bg-primary/12',
    badge: 'border-primary/40 bg-primary/15 text-primary',
  },
  reserved: {
    label: 'Reserved',
    dot: 'bg-warning',
    card: 'border-warning/30 bg-warning/5 hover:border-warning/50 hover:bg-warning/10',
    badge: 'border-warning/40 bg-warning/10 text-warning',
  },
  cleaning: {
    label: 'Cleaning',
    dot: 'bg-muted-foreground',
    card: 'border-border bg-muted/30',
    badge: 'border-border bg-muted text-muted-foreground',
  },
  maintenance: {
    label: 'Maintenance',
    dot: 'bg-destructive/50',
    card: 'border-destructive/20 bg-destructive/5 opacity-70',
    badge: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  out_of_service: {
    label: 'Out of Service',
    dot: 'bg-destructive/50',
    card: 'border-destructive/20 bg-destructive/3 opacity-60',
    badge: 'border-destructive/30 bg-destructive/5 text-destructive/70',
  },
}

function TableCard({
  table,
  onGenerateQR,
  onUpdateStatus,
  onDelete,
  onGenerateBill,
}: {
  table: TableData
  onGenerateQR?: (tableNum: string | number) => void
  onUpdateStatus?: (tableId: string, status: TableStatus) => Promise<void>
  onDelete?: (table: TableData) => void
  onGenerateBill?: (table: TableData) => void
}) {
  const normStatus: TableStatus = statusConfig[table.status] ? table.status : 'available'
  const cfg = statusConfig[normStatus]
  const occupancyPct = table.guestCount ? Math.round((table.guestCount / table.capacity) * 100) : 0
  const isVip = table.section.toLowerCase().includes('vip')

  return (
    <div
      className={cn(
        'group relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer select-none flex flex-col justify-between',
        table.billRequested && 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30',
        cfg.card
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} />
            <span className="font-bold text-base leading-none">
              {formatTableDisplay(table.tableNumber || table.number, isVip)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {table.billRequested && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 font-black border-amber-500/50 bg-amber-500/20 text-amber-500 animate-pulse shadow-xs"
              >
                🔔 Bill Requested
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 font-medium', cfg.badge)}>
              {cfg.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                  />
                }
              >
                <MoreVertical className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onGenerateQR?.(table.tableNumber || table.number)}
                  className="gap-2 font-medium text-primary"
                >
                  <QrCode className="size-3.5" />
                  Print QR Sticker
                </DropdownMenuItem>

                {normStatus === 'available' && (
                  <>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'occupied')}>
                      Seat Guests
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'reserved')}>
                      Mark Reserved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'cleaning')}>
                      Mark Cleaning
                    </DropdownMenuItem>
                  </>
                )}

                {normStatus === 'occupied' && (
                  <>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'cleaning')}>
                      Mark Cleaning
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'available')}>
                      Free Table (Available)
                    </DropdownMenuItem>
                  </>
                )}

                {normStatus === 'cleaning' && (
                  <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'available')}>
                    Mark Available
                  </DropdownMenuItem>
                )}

                {normStatus === 'reserved' && (
                  <>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'occupied')}>
                      Seat Guests
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'available')}>
                      Release Reservation
                    </DropdownMenuItem>
                  </>
                )}

                {normStatus === 'maintenance' && (
                  <DropdownMenuItem onClick={() => onUpdateStatus?.(table.id, 'available')}>
                    Mark Available
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(table)
                  }}
                  className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Delete Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Capacity row */}
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="size-3.5 text-muted-foreground" />
          {normStatus === 'occupied' && table.guestCount ? (
            <span className="text-xs text-foreground font-medium">
              {table.guestCount}/{table.capacity} guests
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Seats {table.capacity}</span>
          )}
        </div>

        {/* Occupancy bar (only for occupied with known guest count) */}
        {normStatus === 'occupied' && Boolean(table.guestCount) && (
          <div className="mb-3">
            <div className="h-1 w-full rounded-full bg-primary/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all"
                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Waiter & time */}
        {table.waiter && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
              {table.waiter.split(' ').map((w) => w[0]).join('')}
            </div>
            <span className="text-xs text-muted-foreground">{table.waiter}</span>
          </div>
        )}

        {table.occupiedSince && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
            <Clock className="size-3" />
            <span>Since {table.occupiedSince}</span>
          </div>
        )}

        {/* Active reservation indicator */}
        {table.activeReservation && normStatus === 'reserved' && (
          <div className="flex items-center gap-1 text-xs text-warning/90 mt-1 mb-1.5">
            <Calendar className="size-3" />
            <span className="truncate">{table.activeReservation.guestName}</span>
          </div>
        )}

        {/* Order indicator */}
        {table.order && (
          <>
            <Separator className="my-2.5" />
            <div className="flex items-center gap-1.5">
              <ChefHat className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{table.order.id}</span>
              <Badge
                variant="outline"
                className={cn(
                  'ml-auto text-[9px] h-4 px-1 capitalize',
                  (table.order.status === 'cooking' || table.order.status === 'preparing') && 'border-chart-4/50 text-chart-4',
                  table.order.status === 'ready' && 'border-success/50 text-success',
                  table.order.status === 'pending' && 'border-warning/50 text-warning',
                  (table.order.status === 'accepted' || table.order.status === 'confirmed') && 'border-primary/50 text-primary',
                  table.order.status === 'served' && 'border-primary/40 text-primary'
                )}
              >
                {table.order.status}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Available CTA */}
      {normStatus === 'available' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUpdateStatus?.(table.id, 'occupied')}
          className="w-full mt-2 h-7 text-xs text-success hover:bg-success/10 hover:text-success"
        >
          Seat Guests
        </Button>
      )}

      {/* Occupied / Active / Bill Requested CTA */}
      {(normStatus === 'occupied' || table.order || table.billRequested) && (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onGenerateBill?.(table)
          }}
          className={cn(
            'w-full mt-2 h-7 text-xs font-bold gap-1 shadow-xs cursor-pointer',
            table.billRequested
              ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          )}
        >
          <Receipt className="size-3.5" />
          <span>{table.billRequested ? 'Bill Requested — Settle' : 'Generate Bill'}</span>
        </Button>
      )}
    </div>
  )
}

const statsItems: { key: TableStatus; label: string }[] = [
  { key: 'available', label: 'Available' },
  { key: 'occupied', label: 'Occupied' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'cleaning', label: 'Cleaning' },
]

export function TablesView() {
  const { auth } = useAuthContext()
  const branchId = auth?.branchId
  const restaurantName = auth?.restaurantName || 'RestoSphere'

  const [tables, setTables] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [section, setSection] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all')

  const [qrOpen, setQrOpen] = useState(false)
  const [qrTable, setQrTable] = useState<string | number>('1')

  // Add Table Modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTableNum, setNewTableNum] = useState('')
  const [newCapacity, setNewCapacity] = useState('4')
  const [newSection, setNewSection] = useState('Indoor')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Delete Table Modal state
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Bill Settlement Modal state
  const [settlementTarget, setSettlementTarget] = useState<TableData | null>(null)

  // Fetch real tables from dynamic database API + check for active bill requests
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = branchId ? `/api/tables?branchId=${encodeURIComponent(branchId)}` : '/api/tables'
      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch tables')
      }

      // Check for any active requested bills
      let requestedTableNumbers: Set<string> = new Set()
      try {
        const billsRes = await fetch('/api/bills?status=REQUESTED')
        if (billsRes.ok) {
          const billsJson = await billsRes.json()
          if (billsJson.success && Array.isArray(billsJson.data?.bills)) {
            requestedTableNumbers = new Set(
              billsJson.data.bills.map((b: any) =>
                String(b.tableNumber || '').toLowerCase().trim().replace(/[^0-9]/g, '')
              )
            )
          }
        }
      } catch (bErr) {
        console.warn('Could not query active requested bills:', bErr)
      }

      const rawTables = json.data || []
      const mappedTables: TableData[] = rawTables.map((t: any) => {
        const cleanNum = String(t.tableNumber || t.number || '').toLowerCase().trim().replace(/[^0-9]/g, '')
        const isReq = requestedTableNumbers.has(cleanNum)
        return {
          ...t,
          billRequested: isReq,
        }
      })

      setTables(mappedTables)
    } catch (err: any) {
      console.error('Failed to load tables:', err)
      setError(err.message || 'Unable to load live tables')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 10000)
    return () => clearInterval(interval)
  }, [fetchTables])

  // Update table status in database
  const handleUpdateStatus = async (tableId: string, newStatus: TableStatus) => {
    try {
      // Optimistic update
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
      )

      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId, status: newStatus }),
      })

      if (!res.ok) {
        // Rollback on failure
        fetchTables()
      }
    } catch (err) {
      console.error('Error updating table:', err)
      fetchTables()
    }
  }

  // Handle Add Table form submit
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTableNum.trim()
    if (!trimmed) {
      setAddError('Table number is required')
      return
    }

    // Normalize if user accidentally typed TT12 or similar
    const cleanTableNum = /^tt\d+/i.test(trimmed) ? trimmed.replace(/^tt(\d+)/i, 'T$1') : trimmed

    try {
      setAddLoading(true)
      setAddError(null)

      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: cleanTableNum,
          capacity: parseInt(newCapacity) || 4,
          section: newSection,
          branchId: branchId || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create table')
      }

      setIsAddOpen(false)
      setNewTableNum('')
      setNewCapacity('4')
      fetchTables()
    } catch (err: any) {
      setAddError(err.message || 'Failed to create table')
    } finally {
      setAddLoading(false)
    }
  }

  // Delete Table from database
  const handleConfirmDeleteTable = async () => {
    if (!deleteTableTarget) return
    try {
      setDeleteLoading(true)
      setDeleteError(null)

      const res = await fetch(`/api/tables?id=${encodeURIComponent(deleteTableTarget.id)}`, {
        method: 'DELETE',
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete table')
      }

      setDeleteTableTarget(null)
      fetchTables()
    } catch (err: any) {
      console.error('Delete table error:', err)
      setDeleteError(err.message || 'Failed to delete table')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenQR = (tableNum: string | number) => {
    setQrTable(tableNum)
    setQrOpen(true)
  }

  // Collect distinct dynamic sections
  const dynamicSections = Array.from(
    new Set(tables.map((t) => t.section.toLowerCase()).filter(Boolean))
  )

  // Filter tables
  const filtered = tables.filter((t) => {
    const matchSection = section === 'all' || t.section.toLowerCase() === section.toLowerCase()
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchSearch =
      !search ||
      String(t.tableNumber || t.number).toLowerCase().includes(search.toLowerCase()) ||
      formatTableDisplay(t.tableNumber || t.number).toLowerCase().includes(search.toLowerCase()) ||
      t.section.toLowerCase().includes(search.toLowerCase())
    return matchSection && matchStatus && matchSearch
  })

  // Dynamic live counts from database
  const counts = {
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Waiter Tip Tracker Widget */}
      <WaiterTipTracker />
      {/* QR Code Generator Modal */}
      <TableQRGenerator
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        initialTable={qrTable}
        restaurantName={restaurantName}
      />

      {/* Add Table Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>
              Create a new dining table backed directly by the PostgreSQL database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTable} className="space-y-4 py-2">
            {addError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                {addError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tableNumber">Table Number / Label</Label>
              <Input
                id="tableNumber"
                placeholder="e.g. 11, 12, VIP-1"
                value={newTableNum}
                onChange={(e) => setNewTableNum(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="50"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="section">Floor / Section</Label>
              <Input
                id="section"
                placeholder="e.g. Indoor, Outdoor, VIP, Terrace"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Create Table
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats row (interactive filters) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsItems.map((s) => {
          const isSelected = statusFilter === s.key
          return (
            <Card
              key={s.key}
              onClick={() => setStatusFilter(isSelected ? 'all' : s.key)}
              className={cn(
                'cursor-pointer transition-all hover:scale-[1.01]',
                isSelected
                  ? 'ring-2 ring-primary border-primary bg-primary/10'
                  : s.key === 'occupied'
                  ? 'border-primary/30 bg-primary/5'
                  : ''
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold mt-0.5">
                      {loading ? (
                        <span className="inline-block size-6 animate-pulse bg-muted rounded" />
                      ) : (
                        counts[s.key as keyof typeof counts] ?? 0
                      )}
                    </p>
                  </div>
                  <span className={cn('size-3 rounded-full', statusConfig[s.key].dot)} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Section tabs + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={section} onValueChange={(v) => setSection(v)}>
          <TabsList>
            <TabsTrigger value="all">All ({tables.length})</TabsTrigger>
            {dynamicSections.map((sec) => (
              <TabsTrigger key={sec} value={sec} className="capitalize">
                {sec}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Search */}
          <div className="relative w-36 sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenQR(tables[0]?.tableNumber || 1)}
            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-sm"
          >
            <QrCode className="size-3.5" />
            Table QR Codes
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTables()}
            disabled={loading}
            className="h-8 gap-1.5"
            title="Refresh tables"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchTables()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && tables.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-border bg-card/50 p-4 animate-pulse flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-12 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-6 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Users className="size-8 text-muted-foreground mb-2" />
          <p className="text-base font-semibold">No tables found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {search || section !== 'all' || statusFilter !== 'all'
              ? 'Try resetting the section or status filters above.'
              : 'Add your first table to start managing floor map occupancy.'}
          </p>
          {(search || section !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSection('all')
                setStatusFilter('all')
                setSearch('')
              }}
              className="mt-4 text-xs h-8"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        /* Tables grid */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filtered.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onGenerateQR={handleOpenQR}
              onUpdateStatus={handleUpdateStatus}
              onGenerateBill={(tbl) => setSettlementTarget(tbl)}
              onDelete={(tbl) => {
                setDeleteError(null)
                setDeleteTableTarget(tbl)
              }}
            />
          ))}
        </div>
      )}

      {/* Delete Table Confirmation Dialog */}
      <Dialog
        open={!!deleteTableTarget}
        onOpenChange={(open) => !open && !deleteLoading && setDeleteTableTarget(null)}
      >
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="size-5" />
              Delete Table
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove this table from the floor layout?
            </DialogDescription>
          </DialogHeader>

          {deleteTableTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-destructive/15 text-destructive font-bold text-sm flex items-center justify-center">
                    {formatTableDisplay(deleteTableTarget.tableNumber || deleteTableTarget.number)}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">
                      Table {formatTableDisplay(deleteTableTarget.tableNumber || deleteTableTarget.number)}
                    </div>
                    <div className="text-muted-foreground">
                      Section: <span className="capitalize text-foreground font-medium">{deleteTableTarget.section}</span> • Capacity: {deleteTableTarget.capacity} seats
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {deleteTableTarget.status}
                </Badge>
              </div>

              {deleteTableTarget.status === 'occupied' && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> This table currently has active guests or an order. Deleting it will release the table spot.
                  </span>
                </div>
              )}

              {deleteError && (
                <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  {deleteError}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTableTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteTable}
              disabled={deleteLoading}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
              {deleteLoading ? 'Deleting...' : 'Yes, Delete Table'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Settlement Modal */}
      {settlementTarget && (
        <BillSettlementModal
          open={!!settlementTarget}
          onOpenChange={(open) => {
            if (!open) setSettlementTarget(null)
          }}
          tableId={settlementTarget.id}
          tableNumber={settlementTarget.tableNumber || settlementTarget.number}
          waiterName={settlementTarget.waiter}
          onSuccess={() => {
            fetchTables()
          }}
        />
      )}
    </main>
  )
}
