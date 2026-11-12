'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Bell,
  Moon,
  Sun,
  Command,
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

export function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchLiveNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=15')
      const json = await res.json()
      if (json.success && json.data) {
        setLiveNotifications(json.data.notifications || [])
        setUnreadCount(json.data.unreadCount || 0)
      }
    } catch (err) {
      console.warn('Could not sync notifications:', err)
    }
  }, [])

  useEffect(() => {
    fetchLiveNotifications()
    // Poll every 8 seconds for real-time kitchen preparation alerts
    const interval = setInterval(fetchLiveNotifications, 8000)
    return () => clearInterval(interval)
  }, [fetchLiveNotifications])

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

  const toggleTheme = () => {
    setDarkMode((d) => !d)
    document.documentElement.classList.toggle('dark')
    document.documentElement.classList.toggle('light')
  }

  return (
    <>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />

        {/* Page Title & Subtitle */}
        {title && (
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Search Bar with ⌘K */}
        <button
          className="hidden md:flex items-center gap-2 text-muted-foreground h-8 px-3 w-44 lg:w-52 justify-start rounded-lg border border-border bg-background text-sm hover:bg-muted/50 transition-colors"
          onClick={() => setCommandOpen(true)}
          aria-label="Search dashboard"
        >
          <Search className="size-3.5" />
          <span className="text-xs flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="size-2.5" />K
          </kbd>
        </button>

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
                <span className="text-xs font-bold">Live Kitchen & Table Alerts</span>
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
                  No notifications yet. Food prepared and new order alerts will appear here.
                </div>
              )}
            </div>

            <DropdownMenuSeparator className="m-0" />
            <div className="p-2 bg-muted/20 text-center">
              <span className="text-[10px] text-muted-foreground font-mono">
                Real-Time RestoSphere Dispatcher Active
              </span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle Icon */}
        <Button variant="ghost" size="icon" className="size-8" onClick={toggleTheme} aria-label="Toggle theme">
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>
    </>
  )
}
