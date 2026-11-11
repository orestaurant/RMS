'use client'

import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTables, type Table } from '@/hooks/useTables'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const statusStyle: Record<string, string> = {
  available: 'border-success/40 bg-success/10 text-success hover:bg-success/20',
  occupied: 'border-primary/40 bg-primary/15 text-primary hover:bg-primary/25',
  reserved: 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20',
  cleaning: 'border-border bg-muted/50 text-muted-foreground',
  maintenance: 'border-destructive/30 bg-destructive/5 text-destructive/60',
  out_of_service: 'border-destructive/30 bg-destructive/5 text-destructive/60',
}

const statusLabel: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  out_of_service: 'Out of Service',
}

interface TableOccupancyGridProps {
  branchId?: string | null
}

export function TableOccupancyGrid({ branchId }: TableOccupancyGridProps) {
  const { auth } = useAuthContext()
  const activeBranchId = branchId || auth?.branchId || '829b1e49-87b3-4cc9-a4a9-4e719bf4440c'
  const { data: tablesData, loading } = useTables(activeBranchId)

  const tables: Table[] = tablesData || []

  // Group tables by section dynamically
  const grouped = tables.reduce<Record<string, Table[]>>((acc, table) => {
    const sec = table.section || 'indoor'
    if (!acc[sec]) acc[sec] = []
    acc[sec].push(table)
    return acc
  }, {})

  const counts = {
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">Table Occupancy</CardTitle>
            <CardDescription className="text-xs">Live status across all sections</CardDescription>
          </div>
          <Link
            href="/tables"
            className="h-7 px-2.5 py-1 text-xs rounded-md border border-input bg-background hover:bg-muted font-medium inline-flex items-center transition-colors"
          >
            Manage Tables
          </Link>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          {Object.entries(counts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'size-2.5 rounded-sm border',
                  status === 'available' && 'border-success/50 bg-success/15',
                  status === 'occupied' && 'border-primary/50 bg-primary/20',
                  status === 'reserved' && 'border-warning/50 bg-warning/15',
                  status === 'cleaning' && 'border-border bg-muted'
                )}
              />
              <span className="text-xs text-muted-foreground capitalize">{status}</span>
              <span className="text-xs font-semibold text-foreground">{loading ? '-' : count}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
            Loading tables...
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Users className="size-8 stroke-1 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium">No tables found</p>
            <p className="text-xs text-muted-foreground/70">Create tables in Table Management</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(grouped).map(([section, sectionTables]) => (
              <div key={section}>
                <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
                  {section === 'vip'
                    ? 'VIP Rooms'
                    : `${section.charAt(0).toUpperCase() + section.slice(1)} Dining`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sectionTables.map((table) => (
                    <Tooltip key={table.id}>
                      <TooltipTrigger
                        render={
                          <button
                            className={cn(
                              'flex flex-col items-center justify-center rounded-xl border p-2 transition-all cursor-pointer',
                              'min-w-[60px] h-14',
                              statusStyle[table.status] || 'border-border bg-card'
                            )}
                          />
                        }
                      >
                        <span className="text-xs font-bold leading-none">{table.tableNumber}</span>
                        <div className="flex items-center gap-0.5 mt-1">
                          <Users className="size-2.5" />
                          <span className="text-[10px]">{table.capacity}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[160px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">Table {table.tableNumber}</span>
                          <span>{statusLabel[table.status] || table.status}</span>
                          <span>Capacity: {table.capacity} seats</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
