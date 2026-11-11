'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  UtensilsCrossed,
  TableProperties,
  CalendarDays,
  ChefHat,
  ShoppingCart,
  BarChart3,
  Package,
  Settings,
  Zap,
  ChevronDown,
  Building2,
  LogOut,
  Loader2,
  Receipt,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useAuthContext } from '@/hooks/useAuthContext'
import { useSidebarCounts } from '@/hooks/useSidebarCounts'

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { auth } = useAuthContext()
  const [loggingOut, setLoggingOut] = useState(false)

  // Real-time badge counts from PostgreSQL via Prisma
  const { data: counts } = useSidebarCounts(auth?.branchId || null)

  const isCustomer = auth?.role?.toUpperCase() === 'CUSTOMER'

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      if (isCustomer) {
        await Promise.allSettled([
          fetch('/api/customer/auth/logout', { method: 'POST' }),
          fetch('/api/auth/logout', { method: 'POST' }),
        ])
        router.refresh()
        window.location.href = '/customer/login'
      } else {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.refresh()
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = isCustomer ? '/customer/login' : '/login'
    } finally {
      setLoggingOut(false)
    }
  }

  // Dynamic user data
  const userName = auth?.name || (isCustomer ? 'Customer' : 'Rajesh')
  const userEmail = auth?.email || (isCustomer ? 'customer@example.com' : 'hexerve@gmail.com')
  const userRole = auth?.role || (isCustomer ? 'CUSTOMER' : 'ADMIN')
  const initials =
    userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || (isCustomer ? 'C' : 'R')

  // Dynamic navigation groups:
  // For Customers: Settings and Analytics are EXCLUDED. All other options are included.
  const navGroups = [
    {
      label: 'OPERATIONS',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        {
          label: 'POS Terminal',
          href: '/pos',
          icon: ShoppingCart,
          badge: counts?.posLive ? 'Live' : undefined,
        },
        { label: 'Tables', href: '/tables', icon: TableProperties },
        {
          label: 'Reservations',
          href: '/reservations',
          icon: CalendarDays,
          badge: counts?.reservations !== undefined ? String(counts.reservations) : undefined,
        },
        {
          label: 'Live Orders',
          href: '/orders',
          icon: Zap,
          badge: counts?.liveOrders !== undefined ? String(counts.liveOrders) : undefined,
        },
        ...(isCustomer
          ? [
              {
                label: 'My Orders',
                href: '/customer/orders',
                icon: Receipt,
              },
            ]
          : []),
      ],
    },
    {
      label: 'KITCHEN',
      items: [
        {
          label: 'Kitchen Display',
          href: '/kitchen',
          icon: ChefHat,
          badge: counts?.kitchenLive ? 'Live' : undefined,
        },
        { label: 'Menu Management', href: '/menu', icon: UtensilsCrossed },
        {
          label: 'Inventory',
          href: '/inventory',
          icon: Package,
          badge: counts?.inventoryAlerts !== undefined ? String(counts.inventoryAlerts) : undefined,
        },
      ],
    },
    ...(!isCustomer
      ? [
          {
            label: 'BUSINESS',
            items: [
              { label: 'Analytics', href: '/analytics', icon: BarChart3 },
              { label: 'Staff & Roles', href: '/staff', icon: UserCheck },
              { label: 'Settings', href: '/dashboard/settings', icon: Settings },
            ],
          },
        ]
      : []),
  ]

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Header — Brand */}
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="RMS"
              render={<Link href={isCustomer ? '/customer' : '/dashboard'} />}
              className="hover:bg-sidebar-accent/50 w-full"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 shadow-sm">
                <Building2 className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0 text-left">
                <span className="font-bold text-sm tracking-tight">
                  RMS
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {isCustomer ? 'Customer Portal' : 'Restaurant Management'}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground/80 tracking-wider px-2 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard' || pathname === '/'
                    : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <Badge
                          variant={item.badge === 'Live' ? 'default' : 'secondary'}
                          className={cn(
                            'ml-auto h-5 min-w-5 px-1.5 text-[11px] font-medium shrink-0',
                            item.badge === 'Live' && 'bg-success text-success-foreground hover:bg-success'
                          )}
                        >
                          {item.badge === 'Live' ? (
                            <span className="flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-success-foreground animate-pulse" />
                              Live
                            </span>
                          ) : (
                            item.badge
                          )}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer — Interactive User Profile Dropdown & Sign Out Flow */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent hover:bg-sidebar-accent/50 w-full cursor-pointer"
                  />
                }
              >
                <Avatar className="size-8 shrink-0 ring-1 ring-primary/20">
                  <AvatarFallback className={cn(
                    "text-xs font-bold",
                    isCustomer ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/15 text-primary"
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none min-w-0 text-left">
                  <span className="font-semibold text-sm truncate text-foreground">
                    {userName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </span>
                </div>
                <ChevronDown className="ml-auto size-4 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-1.5" align="start" side="top" sideOffset={8}>
                {/* User details header */}
                <DropdownMenuLabel className="flex flex-col gap-1 pb-2 pt-1 px-2">
                  <div className="font-semibold text-sm text-foreground">{userName}</div>
                  <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase font-mono tracking-wider",
                        isCustomer
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          : "border-primary/30 text-primary bg-primary/5"
                      )}
                    >
                      {userRole}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                {/* Divider */}
                <DropdownMenuSeparator className="my-1" />
                {/* Account / Profile Action */}
                {isCustomer ? (
                  <DropdownMenuItem
                    render={<Link href="/customer/orders" />}
                    className="cursor-pointer gap-2 py-2 px-2"
                  >
                    <Receipt className="size-4 text-muted-foreground" />
                    <span>My Orders & History</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    render={<Link href="/dashboard/settings" />}
                    className="cursor-pointer gap-2 py-2 px-2"
                  >
                    <Settings className="size-4 text-muted-foreground" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                )}
                {/* Divider */}
                <DropdownMenuSeparator className="my-1" />
                {/* Sign Out */}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="cursor-pointer gap-2 py-2 px-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  {loggingOut ? (
                    <Loader2 className="size-4 animate-spin text-destructive" />
                  ) : (
                    <LogOut className="size-4 text-destructive" />
                  )}
                  <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
