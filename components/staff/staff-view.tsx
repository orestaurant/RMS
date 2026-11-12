'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  Search,
  Plus,
  Users,
  Shield,
  ChefHat,
  ShoppingBag,
  Boxes,
  Truck,
  UserCheck,
  RefreshCw,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserX,
  Phone,
  Mail,
  Calendar,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'

export interface ManagedUser {
  id: string
  name: string
  email: string
  phone: string
  role: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  designation?: string | null
  department?: string | null
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  roles: {
    SUPER_ADMIN: number
    ADMIN: number
    WAITER: number
    COUNTER_MANAGER: number
    CHEF: number
    INVENTORY_MANAGER: number
    VENDOR: number
    CUSTOMER: number
  }
}

const SUPPORTED_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: Crown, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  { value: 'ADMIN', label: 'Admin', icon: Shield, color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  { value: 'WAITER', label: 'Waiter', icon: UserCheck, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { value: 'COUNTER_MANAGER', label: 'Counter Manager', icon: ShoppingBag, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'CHEF', label: 'Chef', icon: ChefHat, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'INVENTORY_MANAGER', label: 'Inventory Manager', icon: Boxes, color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'VENDOR', label: 'Vendor', icon: Truck, color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
] as const

export function StaffView() {
  const { auth } = useAuthContext()

  // Role permissions: Super Admin vs Admin
  const currentRoleUpper = String(auth?.role || '').toUpperCase()
  const isSuperAdmin =
    currentRoleUpper === 'SUPER_ADMIN' ||
    currentRoleUpper === 'SUPERADMIN' ||
    currentRoleUpper === 'super_admin' ||
    auth?.email === 'hexerve@gmail.com'

  // Roles available for assignment:
  // - Super Admin can assign ADMIN, SUPER_ADMIN, and all operational staff roles
  // - Operational Admin can assign all operational roles (WAITER, COUNTER_MANAGER, CHEF, INVENTORY_MANAGER, VENDOR)
  const assignableRoles = isSuperAdmin
    ? [
        { value: 'ADMIN', label: 'Admin' },
        { value: 'WAITER', label: 'Waiter' },
        { value: 'COUNTER_MANAGER', label: 'Counter Manager' },
        { value: 'CHEF', label: 'Chef' },
        { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
        { value: 'VENDOR', label: 'Vendor' },
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
      ]
    : [
        { value: 'WAITER', label: 'Waiter' },
        { value: 'COUNTER_MANAGER', label: 'Counter Manager' },
        { value: 'CHEF', label: 'Chef' },
        { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
        { value: 'VENDOR', label: 'Vendor' },
      ]

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Notification / Toast banner state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Edit / Role Assignment Modal state
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active')
  const [isUpdating, setIsUpdating] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Create Staff User Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: isSuperAdmin ? 'ADMIN' : 'WAITER',
    status: 'active' as 'active' | 'inactive',
  })

  // Update default creation role whenever isSuperAdmin resolves
  useEffect(() => {
    if (isSuperAdmin) {
      setCreateForm((prev) => ({ ...prev, role: prev.role === 'WAITER' ? 'ADMIN' : prev.role }))
    }
  }, [isSuperAdmin])

  // Show auto-dismissing feedback banner
  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev))
    }, 5000)
  }

  // Fetch users from PostgreSQL via Prisma API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '10')
      if (search.trim()) params.set('search', search.trim())
      if (selectedRole !== 'ALL') params.set('role', selectedRole)
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus)

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch users from database')
      }

      setUsers(data.users || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalCount(data.pagination?.total || 0)
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (err: any) {
      console.error('Fetch users error:', err)
      triggerFeedback('error', err.message || 'Error communicating with PostgreSQL server')
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedRole, selectedStatus])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handle Search Input Change (reset to page 1)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // Check if current user can modify target user
  // Super Admin can modify anyone. Regular Admin can only modify operational staff (cannot modify Super Admin or Admin).
  const canModifyUser = (user: ManagedUser) => {
    const targetRole = String(user.role).toUpperCase()
    if (isSuperAdmin) return true
    if (targetRole === 'SUPER_ADMIN' || targetRole === 'SUPERADMIN' || targetRole === 'ADMIN') {
      return false
    }
    return true
  }

  // Open Edit Role modal
  const handleOpenEdit = (user: ManagedUser) => {
    if (!canModifyUser(user)) {
      triggerFeedback('error', 'Permission Denied: Only Super Admin can edit or reassign Admin accounts.')
      return
    }
    setEditUser(user)
    // Standardize role to uppercase matching target roles
    const normalizedRole = user.role.toUpperCase()
    setEditRole(normalizedRole)
    setEditStatus(user.status)
    setEditError(null)
  }

  // Submit Role Assignment & Status update
  const handleSaveRole = async () => {
    if (!editUser) return
    try {
      setIsUpdating(true)
      setEditError(null)

      const res = await fetch(`/api/admin/users/${editUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update user role/status')
      }

      triggerFeedback('success', data.message || `Successfully updated role for ${editUser.name}`)
      setEditUser(null)
      fetchUsers()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user role')
    } finally {
      setIsUpdating(false)
    }
  }

  // Quick Status Toggle on table
  const handleQuickStatusToggle = async (user: ManagedUser) => {
    if (auth?.id === user.id && user.status === 'active') {
      triggerFeedback('error', 'Cannot deactivate your own active account (lockout prevention).')
      return
    }

    if (!canModifyUser(user)) {
      triggerFeedback('error', 'Permission Denied: Only Super Admin can change status of Admin accounts.')
      return
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to change status')
      }
      triggerFeedback('success', `Status updated to ${nextStatus} for ${user.name}`)
      fetchUsers()
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to update status')
    }
  }

  // Submit Create Staff User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsCreating(true)
      setCreateError(null)

      if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
        throw new Error('Please fill in all required fields (Name, Email, Password).')
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create staff user')
      }

      triggerFeedback('success', `Staff user ${data.user?.name || createForm.name} created successfully!`)
      setIsCreateOpen(false)
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'WAITER',
        status: 'active',
      })
      fetchUsers()
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create staff user')
    } finally {
      setIsCreating(false)
    }
  }

  // Format initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Render role badge with matching styling
  const renderRoleBadge = (role: string) => {
    const upperRole = role.toUpperCase()
    const config = SUPPORTED_ROLES.find((r) => r.value === upperRole)

    if (config) {
      const Icon = config.icon
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
            config.color
          )}
        >
          <Icon className="size-3" />
          {config.label}
        </span>
      )
    }

    if (upperRole === 'CUSTOMER') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-400 border-slate-500/20">
          <Users className="size-3" />
          Customer
        </span>
      )
    }

    return (
      <Badge variant="outline" className="font-mono text-xs">
        {role}
      </Badge>
    )
  }

  const isCurrentAdmin = (userId: string) => auth?.id === userId

  return (
    <div className="flex-1 space-y-6 p-6 pb-20 max-w-7xl mx-auto">
      {/* Dynamic Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between rounded-lg p-4 border text-sm transition-all shadow-sm animate-in fade-in',
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header and Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight">Staff & Role Management</h2>
            {isSuperAdmin ? (
              <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30 text-xs font-semibold gap-1.5 px-2.5 py-0.5">
                <Crown className="size-3.5 text-indigo-400" /> Super Admin Console
              </Badge>
            ) : (
              <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-xs font-semibold gap-1.5 px-2.5 py-0.5">
                <Shield className="size-3.5 text-rose-400" /> Admin Console
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin
              ? 'Super Admin Mode: Assign Admins, manage roles, and control all operational staff accounts.'
              : 'Admin Mode: Assign and manage operational roles (Waiter, Counter Manager, Chef, Inventory Manager, Vendor).'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers()}
            disabled={loading}
            className="gap-2 border-border/80 hover:bg-muted/60"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setIsCreateOpen(true)
              setCreateError(null)
            }}
            className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {isSuperAdmin ? 'Add Staff / Admin' : 'Add Staff User'}
          </Button>
        </div>
      </div>

      {/* Live Stats Overview */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold mt-1">{stats ? stats.total : totalCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-rose-500/30 bg-rose-500/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">
                {(stats?.roles?.ADMIN ?? 0) + (stats?.roles?.SUPER_ADMIN ?? 0)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Shield className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Waiters</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {stats?.roles?.WAITER ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserCheck className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-blue-500/30 bg-blue-500/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Counter Mgrs</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {stats?.roles?.COUNTER_MANAGER ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
              <ShoppingBag className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Chefs</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {stats?.roles?.CHEF ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ChefHat className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-purple-500/30 bg-purple-500/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Inventory</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {stats?.roles?.INVENTORY_MANAGER ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Boxes className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-orange-500/30 bg-orange-500/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Vendors</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">
                {stats?.roles?.VENDOR ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400">
              <Truck className="size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search staff by full name, email, or mobile..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-background/50 border-input/60 focus-visible:ring-1"
            />
          </div>

          {/* Role Filter Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="size-3.5" />
              <span>Role:</span>
            </div>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value)
                setPage(1)
              }}
              className="h-9 px-3 rounded-md bg-background/80 border border-input/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="WAITER">Waiter</option>
              <option value="COUNTER_MANAGER">Counter Manager</option>
              <option value="CHEF">Chef</option>
              <option value="INVENTORY_MANAGER">Inventory Manager</option>
              <option value="VENDOR">Vendor</option>
            </select>

            {/* Status Filter Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="h-9 px-3 rounded-md bg-background/80 border border-input/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {(search || selectedRole !== 'ALL' || selectedStatus !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setSelectedRole('ALL')
                  setSelectedStatus('ALL')
                  setPage(1)
                }}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-[280px]">Staff / User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Created / Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <RefreshCw className="size-6 animate-spin text-primary" />
                      <span className="text-sm">Querying PostgreSQL database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <UserX className="size-8 stroke-[1.5]" />
                      <p className="text-sm font-medium">No users found matching current filters</p>
                      <p className="text-xs text-muted-foreground/80">
                        Try clearing filters or add a new staff member with the button above.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isSelf = isCurrentAdmin(user.id)
                  return (
                    <TableRow
                      key={user.id}
                      className={cn(
                        'border-border/50 transition-colors hover:bg-muted/40',
                        isSelf && 'bg-primary/5 hover:bg-primary/10'
                      )}
                    >
                      {/* Name & Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-border">
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate text-foreground">
                                {user.name}
                              </span>
                              {isSelf && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">
                              ID: {user.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 text-foreground/90">
                            <Mail className="size-3 text-muted-foreground" />
                            {user.email}
                          </span>
                          {user.phone && user.phone !== 'N/A' && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="size-3 text-muted-foreground" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell>{renderRoleBadge(user.role)}</TableCell>

                      {/* Status Toggle & Badge */}
                      <TableCell>
                        <button
                          onClick={() => handleQuickStatusToggle(user)}
                          disabled={isSelf || !canModifyUser(user)}
                          title={
                            isSelf
                              ? 'Cannot deactivate logged-in account'
                              : !canModifyUser(user)
                              ? 'Only Super Admin can change status of Admin accounts'
                              : 'Click to toggle status'
                          }
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                            user.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
                            (isSelf || !canModifyUser(user)) && 'cursor-not-allowed opacity-60'
                          )}
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              user.status === 'active' ? 'bg-emerald-400' : 'bg-muted-foreground'
                            )}
                          />
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          <span>{new Date(user.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}</span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                          disabled={!canModifyUser(user)}
                          title={
                            !canModifyUser(user)
                              ? 'Only Super Admin can modify Admin accounts'
                              : 'Edit role & status'
                          }
                          className={cn(
                            'gap-1.5 text-xs h-8 border-border transition-all',
                            canModifyUser(user)
                              ? 'hover:bg-primary hover:text-primary-foreground'
                              : 'opacity-40 cursor-not-allowed'
                          )}
                        >
                          {!canModifyUser(user) ? <Lock className="size-3.5" /> : <Edit3 className="size-3.5" />}
                          Edit Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/60 gap-3 text-xs text-muted-foreground bg-muted/20">
          <div>
            Showing <span className="font-medium text-foreground">{users.length}</span> of{' '}
            <span className="font-medium text-foreground">{totalCount}</span> registered users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-8 gap-1 border-border/80"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-8 gap-1 border-border/80"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 1. EDIT ROLE & STATUS MODAL (ASSIGN ROLE)                                */}
      {/* ========================================================================= */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5 text-primary" />
              Assign Role & Status
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify operational role permissions and active status directly in PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          {editUser && (
            <div className="space-y-4 py-2">
              {/* User summary pill */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/70 flex items-center gap-3">
                <Avatar className="size-10 border border-border">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                    {getInitials(editUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm truncate">{editUser.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{editUser.email}</span>
                </div>
              </div>

              {/* Self-Protection Alert */}
              {isCurrentAdmin(editUser.id) && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2">
                  <Lock className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Active Admin Account</span>
                    Self-demotion or deactivation is prevented to preserve system accessibility and prevent admin lockout.
                  </div>
                </div>
              )}

              {editError && (
                <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  {editError}
                </div>
              )}

              {/* Role Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Operational Role</label>
                  {isSuperAdmin && (
                    <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/30 bg-indigo-500/10 gap-1">
                      <Crown className="size-2.5" /> Super Admin Access
                    </Badge>
                  )}
                </div>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={isCurrentAdmin(editUser.id)}
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  {assignableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                  {editUser.role.toUpperCase() === 'CUSTOMER' && (
                    <option value="CUSTOMER">Customer</option>
                  )}
                  {!assignableRoles.some((r) => r.value === editRole) && (
                    <option value={editRole}>{editRole}</option>
                  )}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {isSuperAdmin
                    ? 'Super Admin Privileges: You can assign Admin and all operational roles.'
                    : 'Admin Privileges: You can assign all operational staff roles (Waiter, Counter Manager, Chef, Inventory, Vendor).'}
                </p>
              </div>

              {/* Status Toggle */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-foreground">User Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={cn(
                      'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all',
                      editStatus === 'active'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 font-semibold'
                        : 'bg-background border-input text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('inactive')}
                    disabled={isCurrentAdmin(editUser.id)}
                    className={cn(
                      'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                      editStatus === 'inactive'
                        ? 'bg-destructive/15 border-destructive/50 text-destructive font-semibold'
                        : 'bg-background border-input text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <XCircle className="size-4" />
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditUser(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRole}
              disabled={isUpdating}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              {isUpdating && <RefreshCw className="size-3.5 animate-spin" />}
              {isUpdating ? 'Saving Changes...' : 'Save Role & Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 2. CREATE STAFF USER MODAL                                                */}
      {/* ========================================================================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="size-5 text-primary" />
              {isSuperAdmin ? 'Create Staff or Admin User' : 'Create Staff User'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isSuperAdmin
                ? 'Super Admin Mode: Add a new staff member or assign an Admin. Data is persisted directly to PostgreSQL.'
                : 'Admin Mode: Add a new staff member with an assigned operational role (Waiter, Counter Manager, Chef, Inventory, Vendor).'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            {createError && (
              <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {createError}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Ramesh Sharma"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="bg-background"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder="staff@restaurant.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Mobile Phone</label>
                <Input
                  type="tel"
                  placeholder="+91-9876543210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Account Password <span className="text-destructive">*</span>
              </label>
              <Input
                required
                type="password"
                placeholder="Minimum 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Password will be securely hashed with bcrypt before saving to PostgreSQL.
              </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Assigned Operational Role <span className="text-destructive">*</span>
                </label>
                {isSuperAdmin && (
                  <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/30 bg-indigo-500/10 gap-1">
                    <Crown className="size-2.5" /> Super Admin Privileges
                  </Badge>
                )}
              </div>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {assignableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {createForm.role === 'ADMIN' && (
                <p className="text-[11px] text-indigo-400 font-medium">
                  ★ Creating an Admin: User will have access to the admin dashboard and can assign operational staff roles.
                </p>
              )}
            </div>

            {/* Initial Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Initial Status</label>
              <select
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm({ ...createForm, status: e.target.value as 'active' | 'inactive' })
                }
                className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="active">Active (Permitted to log in)</option>
                <option value="inactive">Inactive (Suspended / Onboarding)</option>
              </select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                {isCreating && <RefreshCw className="size-3.5 animate-spin" />}
                {isCreating ? 'Creating Staff User...' : 'Create Staff User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
