'use client'

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  positive?: boolean
  icon: LucideIcon
  iconColor?: string
  prefix?: string
  suffix?: string
  className?: string
  loading?: boolean
}

export function StatCard({
  title, value, change, positive, icon: Icon,
  iconColor = 'text-primary', prefix, suffix,
  className, loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-3.5 w-24 rounded shimmer" />
              <div className="h-8 w-32 rounded shimmer" />
              <div className="h-3 w-20 rounded shimmer" />
            </div>
            <div className="size-10 rounded-lg shimmer" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden group hover:shadow-md transition-shadow duration-200', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {prefix && <span className="text-lg font-semibold text-muted-foreground">{prefix}</span>}
              {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
              {suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
            </p>
            {change && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                positive ? 'text-success' : 'text-destructive'
              )}>
                {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                <span>{change}</span>
              </div>
            )}
          </div>
          <div className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15',
          )}>
            <Icon className={cn('size-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
