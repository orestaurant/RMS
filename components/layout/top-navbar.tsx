'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useAuthContext } from '@/hooks/useAuthContext'
import { triggerNotificationFeedback } from '@/lib/sound-vibrate'
import {
  resolveNotificationTarget,
  type NotificationCategory,
  type NotificationTarget,
} from '@/lib/notification-links'
import {
  Bell,
  Moon,
  Sun,
  Flame,
  Receipt,
  AlertTriangle,
  CheckCheck,
  UtensilsCrossed,
  Music,
  CheckCircle2,
  CalendarDays,
  ChefHat,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { CommandPalette } from '@/components/ui/command-palette'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface TopNavbarProps {
  title?: string
  subtitle?: string
  children?: React.ReactNode
}

interface NotificationItem {
  id: string | number
  type: string
  title: string
  body: string
  time: string
  read: boolean
  createdAt?: string
  metadata?: {
    orderId?: string
    orderNumber?: string
    tableNumber?: string
    billNumber?: string
    billId?: string
    amount?: number
    customerId?: string | null
    itemsSummary?: string | null
    materialName?: string
    sku?: string
    actionUrl?: string
  }
}

const NEW_ORDER_ROLES = new Set(['WAITER', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'MANAGER'])

const categoryStyleMap: Record<
  NotificationCategory,
  {
    Icon: React.ElementType
    iconWrap: string
    badge: string
    unreadRow: string
  }
> = {
  ready: {
    Icon: Flame,
    iconWrap: 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    unreadRow: 'bg-emerald-500/[0.06] border-l-2 border-l-emerald-500',
  },
  order: {
    Icon: UtensilsCrossed,
    iconWrap: 'bg-[#E23744]/15 text-[#E23744] dark:text-rose-400 ring-1 ring-[#E23744]/25',
    badge: 'bg-[#E23744]/15 text-[#E23744] dark:text-rose-400 border-[#E23744]/30',
    unreadRow: 'bg-[#E23744]/[0.06] border-l-2 border-l-[#E23744]',
  },
  bill: {
    Icon: Receipt,
    iconWrap: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    unreadRow: 'bg-amber-500/[0.06] border-l-2 border-l-amber-500',
  },
  payment: {
    Icon: CheckCircle2,
    iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    unreadRow: 'bg-emerald-500/[0.06] border-l-2 border-l-emerald-500',
  },
  kitchen: {
    Icon: ChefHat,
    iconWrap: 'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/25',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    unreadRow: 'bg-orange-500/[0.06] border-l-2 border-l-orange-500',
  },
  dj: {
    Icon: Music,
    iconWrap: 'bg-pink-500/15 text-pink-500 ring-1 ring-pink-500/25',
    badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    unreadRow: 'bg-pink-500/[0.06] border-l-2 border-l-pink-500',
  },
  inventory: {
    Icon: AlertTriangle,
    iconWrap: 'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/25',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    unreadRow: 'bg-orange-500/[0.06] border-l-2 border-l-orange-500',
  },
  reservation: {
    Icon: CalendarDays,
    iconWrap: 'bg-sky-500/15 text-sky-500 ring-1 ring-sky-500/25',
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    unreadRow: 'bg-sky-500/[0.06] border-l-2 border-l-sky-500',
  },
  alert: {
    Icon: Sparkles,
    iconWrap: 'bg-primary/15 text-primary ring-1 ring-primary/25',
    badge: 'bg-primary/15 text-primary border-primary/30',
    unreadRow: 'bg-primary/[0.06] border-l-2 border-l-primary',
  },
}

export function TopNavbar({ title, subtitle, children }: TopNavbarProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { auth, loading: authLoading } = useAuthContext()
  const roleUpper = String(auth?.role || '').toUpperCase()
  const isCustomerPortalPage =
    Boolean(pathname?.startsWith('/customer')) || title === 'Customer Portal'
  const isCustomer = roleUpper === 'CUSTOMER' || isCustomerPortalPage
  const isVendor = !isCustomer && roleUpper === 'VENDOR'
  const canSeeNewOrder = !isCustomer && !isVendor && NEW_ORDER_ROLES.has(roleUpper)
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const hasInitializedNotifsRef = useRef(false)
  const seenUnreadReadyIdsRef = useRef<Set<string>>(new Set())

  const fetchLiveNotifications = useCallback(async () => {
    if (authLoading) return
    try {
      if (isVendor) {
        const qs = auth?.id ? `&recipientId=${encodeURIComponent(auth.id)}` : ''
        const res = await fetch(`/api/dashboard-notifications?role=VENDOR${qs}&limit=20`, {
          cache: 'no-store',
        })
        const json = await res.json()
        if (json.success && json.data) {
          const rawNotifs: any[] = json.data.notifications || []
          const mapped: NotificationItem[] = rawNotifs.map((n) => {
            const diffMins = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 60000)
            const timeLabel =
              diffMins < 1
                ? 'Just now'
                : diffMins < 60
                ? `${diffMins}m ago`
                : diffMins < 1440
                ? `${Math.floor(diffMins / 60)}h ago`
                : `${Math.floor(diffMins / 1440)}d ago`

            return {
              id: n.id,
              type: n.type || 'LOW_STOCK_ALERT',
              title: n.title || 'Restock Alert',
              body: n.message || '',
              time: timeLabel,
              read: Boolean(n.isRead),
              createdAt: n.createdAt,
              metadata: {
                materialName: n.rawMaterial?.name || n.metadata?.materialName,
                sku: n.rawMaterial?.sku || n.metadata?.sku,
              },
            }
          })
          setLiveNotifications(mapped)
          setUnreadCount(json.data.unreadCount ?? mapped.filter((m) => !m.read).length)
        }
        return
      }

      const custParam = isCustomer
        ? `&role=CUSTOMER${auth?.id ? `&customerId=${encodeURIComponent(auth.id)}` : ''}`
        : roleUpper
        ? `&role=${encodeURIComponent(roleUpper)}`
        : ''
      const res = await fetch(`/api/notifications?limit=20${custParam}`, { cache: 'no-store' })
      const json = await res.json()
      if (json.success && json.data) {
        let notifs: NotificationItem[] = json.data.notifications || []
        if (isCustomer) {
          // Strictly exclude new_order & staff invoice/bill/table notifications from Customer Portal
          notifs = notifs.filter((n) => {
            if (n.type === 'new_order' || n.type === 'bill_generated' || n.type === 'payment_received') {
              return false
            }
            const body = (n.body || '').toLowerCase()
            const notifTitle = (n.title || '').toLowerCase()
            if (
              notifTitle.includes('new order #') ||
              body.includes('table is now available') ||
              body.includes('ready for customer settlement') ||
              notifTitle.includes('invoice #') ||
              notifTitle.includes('bill #')
            ) {
              return false
            }
            return true
          })
        } else if (!canSeeNewOrder) {
          notifs = notifs.filter((n) => n.type !== 'new_order')
        }

        // Trigger audible/haptic chime for staff/waiter when a brand-new food-ready alert arrives
        const unreadReady = notifs.filter(
          (n) =>
            !n.read &&
            (n.type === 'order_prepared' || (n.title || '').toLowerCase().includes('prepared'))
        )
        if (hasInitializedNotifsRef.current && !isCustomer) {
          const hasNewReadyAlert = unreadReady.some(
            (n) => !seenUnreadReadyIdsRef.current.has(String(n.id))
          )
          if (hasNewReadyAlert) {
            triggerNotificationFeedback('order')
          }
        }
        hasInitializedNotifsRef.current = true
        for (const n of unreadReady) {
          seenUnreadReadyIdsRef.current.add(String(n.id))
        }

        setLiveNotifications(notifs)
        setUnreadCount(notifs.filter((n) => !n.read).length)
      }
    } catch (err) {
      console.warn('Could not sync notifications:', err)
    }
  }, [authLoading, isCustomer, isVendor, canSeeNewOrder, roleUpper, auth?.id])

  useEffect(() => {
    if (authLoading) return
    fetchLiveNotifications()

    // Visibility-aware polling every 5 seconds for near-real-time Waiter/Kitchen/Vendor alerts
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchLiveNotifications()
      }
    }, 5000)

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLiveNotifications()
      }
    }
    const handleVendorSync = () => {
      if (isVendor) fetchLiveNotifications()
    }
    const handleOrderDeleted = (e: Event) => {
      const detail = (e as CustomEvent<{ orderId?: string; fullId?: string }>).detail
      const keys = [detail?.orderId, detail?.fullId]
        .map((v) => (v ? String(v).trim().toLowerCase() : ''))
        .filter(Boolean)

      if (keys.length > 0) {
        const keySet = new Set(keys)
        setLiveNotifications((prev) => {
          const filtered = prev.filter((n) => {
            const ordId = n.metadata?.orderId ? String(n.metadata.orderId).toLowerCase() : ''
            const ordNum = n.metadata?.orderNumber ? String(n.metadata.orderNumber).toLowerCase() : ''
            const titleLower = (n.title || '').toLowerCase()
            const bodyLower = (n.body || '').toLowerCase()
            if (ordId && keySet.has(ordId)) return false
            if (ordNum && keySet.has(ordNum)) return false
            for (const k of keySet) {
              if (titleLower.includes(`#${k}`) || bodyLower.includes(`#${k}`)) return false
            }
            return true
          })
          setUnreadCount(filtered.filter((n) => !n.read).length)
          return filtered
        })
      }
      fetchLiveNotifications()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('rms:order-deleted', handleOrderDeleted)
      window.addEventListener('rms:vendor-notifications-updated', handleVendorSync)
    }

    return () => {
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('rms:order-deleted', handleOrderDeleted)
        window.removeEventListener('rms:vendor-notifications-updated', handleVendorSync)
      }
    }
  }, [authLoading, isVendor, fetchLiveNotifications])

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLiveNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      if (isVendor) {
        await fetch('/api/dashboard-notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_read',
            id: 'all',
            role: 'VENDOR',
            recipientId: auth?.id || undefined,
          }),
        })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rms:vendor-notifications-updated'))
        }
        return
      }
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: 'all' }),
      })
    } catch (err) {
      console.warn(err)
    }
  }

  const handleNotificationClick = (notif: NotificationItem, target: NotificationTarget) => {
    // 1. Optimistic instant UI state update (0ms)
    if (!notif.read) {
      setLiveNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))

      // Non-blocking mark-read call that survives route transitions
      fetch(isVendor ? '/api/dashboard-notifications' : '/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: notif.id }),
        keepalive: true,
      })
        .then(() => {
          if (isVendor && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rms:vendor-notifications-updated'))
          }
        })
        .catch(() => {})
    }

    // 2. Close popover cleanly
    setNotifOpen(false)

    // 3. Dispatch instant in-page event (0ms if user is already on target route) + navigate
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rms:notification-navigate', { detail: target }))
    }
    router.push(target.href)
  }

  return (
    <>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 sm:gap-3 border-b border-border bg-background/80 backdrop-blur-md px-3 sm:px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="h-5 shrink-0" />

        {/* Page Title & Subtitle */}
        {title && (
          <div className="flex flex-col min-w-0 shrink-0">
            <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Optional Custom Header Slot / Search Bar */}
        {children ? (
          <div className="flex-1 flex items-center justify-start min-w-0 ml-1 sm:ml-4">
            {children}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Live Notifications Bell */}
        <DropdownMenu
          open={notifOpen}
          onOpenChange={(open) => {
            setNotifOpen(open)
            if (open) {
              fetchLiveNotifications()
            }
          }}
        >
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative size-8.5 rounded-full transition-colors cursor-pointer',
                  unreadCount > 0 ? 'bg-[#E23744]/10 hover:bg-[#E23744]/15' : 'hover:bg-muted'
                )}
                aria-label="Open notifications"
              />
            }
          >
            <Bell
              className={cn(
                'size-4 transition-transform',
                unreadCount > 0 ? 'text-[#E23744] dark:text-rose-400' : 'text-muted-foreground'
              )}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#E23744] text-[10px] font-extrabold text-white shadow-sm ring-2 ring-background animate-in zoom-in">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[340px] sm:w-[410px] p-0 overflow-hidden rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#E23744]/[0.08] via-muted/40 to-amber-500/[0.06] border-b border-border/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-xl bg-[#E23744]/15 text-[#E23744] dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Bell className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold tracking-tight text-foreground truncate">
                      {isCustomer
                        ? 'Dining & Order Updates'
                        : isVendor
                        ? 'Vendor Restock Alerts'
                        : 'Live Kitchen & Table Alerts'}
                    </span>
                    {unreadCount > 0 && (
                      <Badge className="text-[10px] h-4.5 px-1.5 bg-[#E23744] text-white border-0 font-bold">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Click any alert to open it directly
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-background/70 transition-colors cursor-pointer shrink-0"
                >
                  <CheckCheck className="size-3 text-[#24963F] dark:text-emerald-400" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
              {liveNotifications.length > 0 ? (
                liveNotifications.map((n) => {
                  const target = resolveNotificationTarget(n, { isCustomer, roleUpper })
                  const style = categoryStyleMap[target.category] || categoryStyleMap.alert
                  const CatIcon = style.Icon

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n, target)}
                      className={cn(
                        'group w-full text-left flex items-start gap-3 px-4 py-3 transition-all cursor-pointer hover:bg-muted/60',
                        !n.read ? style.unreadRow : 'opacity-85 hover:opacity-100'
                      )}
                    >
                      <div
                        className={cn(
                          'size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-150 group-hover:scale-105',
                          style.iconWrap
                        )}
                      >
                        <CatIcon className="size-4" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              'text-xs leading-snug line-clamp-1',
                              !n.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'
                            )}
                          >
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono pt-0.5">
                            {n.time}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>

                        <div className="flex items-center justify-between pt-0.5">
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider', style.badge)}
                          >
                            {target.badgeText}
                          </Badge>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#E23744] dark:text-rose-400 opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                            <span>{target.label}</span>
                            <ArrowUpRight className="size-3" />
                          </span>
                        </div>
                      </div>

                      {!n.read && (
                        <span className="size-2 rounded-full bg-[#E23744] shrink-0 mt-1.5 ring-2 ring-[#E23744]/20" />
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="py-10 px-6 text-center space-y-2">
                  <div className="size-10 rounded-2xl bg-muted/70 text-muted-foreground mx-auto flex items-center justify-center">
                    <Bell className="size-4.5 opacity-60" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">All caught up!</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isCustomer
                      ? 'Updates about your food preparation and dining orders will appear here.'
                      : isVendor
                      ? 'Low stock restock alerts from warehouse managers will appear here.'
                      : 'Food prepared, pending bill requests, and new order alerts will appear here.'}
                  </p>
                </div>
              )}
            </div>

            <DropdownMenuSeparator className="m-0" />
            <div className="px-4 py-2 bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isCustomer
                  ? 'Real-Time Dining Updates'
                  : 'Real-Time RestoSphere Dispatcher'}
              </span>
              <span>Live 5s Sync</span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground relative flex items-center justify-center cursor-pointer transition-colors"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
          title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
        >
          <div className="relative size-4 flex items-center justify-center shrink-0">
            <Sun className="size-4 text-amber-500 transition-all duration-300 transform rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-0 dark:opacity-0" />
            <Moon className="size-4 text-orange-400 absolute transition-all duration-300 transform rotate-90 scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100" />
          </div>
        </Button>
      </header>
    </>
  )
}
