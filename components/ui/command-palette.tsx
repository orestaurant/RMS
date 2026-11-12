'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, TableProperties, CalendarDays,
  ChefHat, UtensilsCrossed, Package, Users, Zap,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'

const pages = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, shortcut: 'D' },
  { label: 'POS Terminal', href: '/pos', icon: ShoppingCart, shortcut: 'P' },
  { label: 'Tables', href: '/tables', icon: TableProperties, shortcut: 'T' },
  { label: 'Reservations', href: '/reservations', icon: CalendarDays },
  { label: 'Live Orders', href: '/orders', icon: Zap },
  { label: 'Kitchen Display', href: '/kitchen', icon: ChefHat, shortcut: 'K' },
  { label: 'Menu Management', href: '/admin-menu', icon: UtensilsCrossed },
  { label: 'Customer Menu (QR Preview)', href: '/menu?table=1', icon: UtensilsCrossed },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Staff', href: '/staff', icon: Users },
]

const quickActions = [
  { label: 'New Reservation', action: 'new-reservation' },
  { label: 'New Order', action: 'new-order' },
  { label: 'View Live Orders', action: 'live-orders' },
  { label: 'Generate Report', action: 'report' },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onOpenChange])

  const navigate = (href: string) => {
    router.push(href)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, orders, tables..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              value={page.label}
              onSelect={() => navigate(page.href)}
            >
              <page.icon className="size-4 mr-2" />
              <span>{page.label}</span>
              {page.shortcut && (
                <CommandShortcut>⌘{page.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.action}
              value={action.label}
              onSelect={() => onOpenChange(false)}
            >
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
