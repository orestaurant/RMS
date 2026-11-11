'use client'

import { useState } from 'react'
import {
  Search,
  Bell,
  Moon,
  Sun,
  Command,
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

const notifications = [
  { id: 1, type: 'order', title: 'New order at Table 7', body: '3 items — ₹2,121', time: '1m ago', read: false },
  { id: 2, type: 'alert', title: 'Low stock alert', body: 'Saffron below threshold (12g)', time: '5m ago', read: false },
  { id: 3, type: 'reservation', title: 'Reservation confirmed', body: 'Rahul Gupta — Table 3, 9PM', time: '12m ago', read: false },
  { id: 4, type: 'order', title: 'Order ORD-0290 served', body: 'Table 2 — ₹1,240', time: '18m ago', read: true },
]

interface TopNavbarProps {
  title?: string
  subtitle?: string
}

export function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const unreadCount = notifications.filter((n) => !n.read).length

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

        {/* Notifications Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="relative size-8" />
            }
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} className={cn('flex flex-col items-start gap-0.5 py-3', !n.read && 'bg-primary/5')}>
                <div className="flex items-center justify-between w-full">
                  <span className={cn('text-sm font-medium', !n.read && 'text-foreground')}>{n.title}</span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">{n.time}</span>
                </div>
                <span className="text-xs text-muted-foreground">{n.body}</span>
                {!n.read && <span className="absolute right-3 top-3 size-1.5 rounded-full bg-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-xs text-muted-foreground">
              View all notifications
            </DropdownMenuItem>
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
