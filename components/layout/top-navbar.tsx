'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useAuthContext } from '@/hooks/useAuthContext'
import { triggerNotificationFeedback } from '@/lib/sound-vibrate'
import {
  Bell,
  Moon,
  Sun,
  Flame,
  Receipt,
  AlertTriangle,
  Check,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { CommandPalette } from '@/components/ui/command-palette'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
}

const NEW_ORDER_ROLES = new Set(['WAITER', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'MANAGER'])

export function TopNavbar({ title, subtitle, children }: TopNavbarProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { auth, loading: authLoading } = useAuthContext()
  const roleUpper = String(auth?.role || '').toUpperCase()
  const isCustomerPortalPage =
    Boolean(pathname?.startsWith('/customer')) || title === 'Customer Portal'
  const isCustomer = roleUpper === 'CUSTOMER' || isCustomerPortalPage
  const canSeeNewOrder = !isCustomer && NEW_ORDER_ROLES.has(roleUpper)
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const hasInitializedNotifsRef = useRef(false)
  const seenUnreadReadyIdsRef = useRef<Set<string>>(new Set())

  const fetchLiveNotifications = useCallback(async () => {
    if (authLoading) return
    try {
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
  }, [authLoading, isCustomer, canSeeNewOrder, roleUpper, auth?.id])

  useEffect(() => {
    if (authLoading) return
    fetchLiveNotifications()

    // Visibility-aware polling every 5 seconds for near-real-time Waiter/Kitchen alerts
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
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }

    return () => {
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }
  }, [authLoading, fetchLiveNotifications])

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLiveNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: 'all' }),
      })
    } catch (e) {
      console.warn(e)
    }
  }

  const handleNotificationClick = async (notifId: string | number) => {
    setLiveNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: notifId }),
      })
    } catch (e) {
      console.warn(e)
    }
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="relative size-8" />
            }
          >
            <Bell className={cn('size-4', unreadCount > 0 && 'text-primary animate-pulse')} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in">
                {unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 overflow-hidden shadow-2xl">
            <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <span className="text-xs font-bold">
                  {isCustomer ? 'Dining & Order Updates' : 'Live Kitchen & Table Alerts'}
                </span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
                >
                  <CheckCheck className="size-3 text-primary" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {liveNotifications.length > 0 ? (
                liveNotifications.map((n) => {
                  const isFoodPrepared = n.type === 'order_prepared' || n.title.toLowerCase().includes('prepared')
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n.id)}
                      className={cn(
                        'flex items-start gap-3 p-3 transition-colors cursor-pointer hover:bg-muted/50',
                        !n.read && 'bg-primary/5',
                        isFoodPrepared && !n.read && 'bg-success/10 border-l-2 border-l-success'
                      )}
                    >
                      <div
                        className={cn(
                          'size-8 rounded-lg flex items-center justify-center shrink-0 text-xs mt-0.5',
                          isFoodPrepared
                            ? 'bg-success/20 text-success'
                            : n.type === 'new_order'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isFoodPrepared ? <Flame className="size-4" /> : <Receipt className="size-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              'text-xs leading-tight truncate',
                              !n.read ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                            )}
                          >
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      </div>

                      {!n.read && <span className="size-1.5 rounded-full bg-primary shrink-0 mt-2" />}
                    </div>
                  )
                })
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {isCustomer
                    ? 'No notifications yet. Updates about your food preparation and dining orders will appear here.'
                    : 'No notifications yet. Food prepared and new order alerts will appear here.'}
                </div>
              )}
            </div>

            <DropdownMenuSeparator className="m-0" />
            <div className="p-2 bg-muted/20 text-center">
              <span className="text-[10px] text-muted-foreground font-mono">
                {isCustomer
                  ? 'Real-Time Dining Updates Active'
                  : 'Real-Time RestoSphere Dispatcher Active'}
              </span>
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
