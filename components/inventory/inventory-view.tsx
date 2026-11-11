'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  PlusCircle,
  MinusCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useInventoryItems, InventoryItem } from '@/hooks/useInventoryItems'

export function InventoryView() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const {
    items,
    stats,
    loading,
    error,
    refetch,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
  } = useInventoryItems(searchTerm, categoryFilter, statusFilter)

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current))
    }, 4000)
  }

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)

  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Kitchen Supplies',
    quantity: '0',
    unit: 'kg',
    minStock: '10',
    criticalStock: '5',
    unitPrice: '0',
  })

  const [adjustAmount, setAdjustAmount] = useState<string>('1')
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')

  // Get distinct categories from items
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    items.forEach((i) => {
      if (i.category) cats.add(i.category)
    })
    return Array.from(cats).sort()
  }, [items])

  // Helper to open Add dialog
  const handleOpenAdd = () => {
    const randomSku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`
    setFormData({
      name: '',
      sku: randomSku,
      category: 'Kitchen Supplies',
      quantity: '10',
      unit: 'kg',
      minStock: '10',
      criticalStock: '5',
      unitPrice: '100',
    })
    setFormError(null)
    setIsAddOpen(true)
  }

  // Helper to open Edit dialog
  const handleOpenEdit = (item: InventoryItem) => {
    setActiveItem(item)
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      minStock: String(item.minStock),
      criticalStock: String(item.criticalStock),
      unitPrice: String(item.unitPrice),
    })
    setFormError(null)
    setIsEditOpen(true)
  }

  // Helper to open Delete dialog
  const handleOpenDelete = (item: InventoryItem) => {
    setActiveItem(item)
    setIsDeleteOpen(true)
  }

  // Helper to open Adjust Stock dialog
  const handleOpenAdjust = (item: InventoryItem, defaultType: 'add' | 'subtract' = 'add') => {
    setActiveItem(item)
    setAdjustType(defaultType)
    setAdjustAmount('5')
    setFormError(null)
    setIsAdjustOpen(true)
  }

  // Handle Create submission
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError('Item name is required')
      return
    }
    if (!formData.sku.trim()) {
      setFormError('SKU is required')
      return
    }

    setIsSubmitting(true)
    const result = await createItem({
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category.trim() || 'General',
      quantity: parseFloat(formData.quantity) || 0,
      unit: formData.unit.trim() || 'units',
      minStock: parseFloat(formData.minStock) || 10,
      criticalStock: parseFloat(formData.criticalStock) || 5,
      unitPrice: parseFloat(formData.unitPrice) || 0,
    })
    setIsSubmitting(false)

    if (result.success) {
      setIsAddOpen(false)
      showFeedback('success', `Item "${formData.name}" added successfully!`)
    } else {
      setFormError(result.error || 'Failed to create item')
    }
  }

  // Handle Update submission
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeItem) return
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError('Item name is required')
      return
    }

    setIsSubmitting(true)
    const result = await updateItem(activeItem.id, {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category.trim() || 'General',
      quantity: parseFloat(formData.quantity) || 0,
      unit: formData.unit.trim() || 'units',
      minStock: parseFloat(formData.minStock) || 10,
      criticalStock: parseFloat(formData.criticalStock) || 5,
      unitPrice: parseFloat(formData.unitPrice) || 0,
    })
    setIsSubmitting(false)

    if (result.success) {
      setIsEditOpen(false)
      showFeedback('success', `Item "${formData.name}" updated successfully!`)
    } else {
      setFormError(result.error || 'Failed to update item')
    }
  }

  // Handle Delete submission
  const handleDelete = async () => {
    if (!activeItem) return
    setIsSubmitting(true)
    const result = await deleteItem(activeItem.id)
    setIsSubmitting(false)

    if (result.success) {
      setIsDeleteOpen(false)
      showFeedback('success', `Item "${activeItem.name}" deleted successfully!`)
      setActiveItem(null)
    } else {
      showFeedback('error', result.error || 'Failed to delete item')
    }
  }

  // Handle Stock adjustment submission
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeItem) return

    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid amount greater than 0')
      return
    }

    const delta = adjustType === 'add' ? amount : -amount
    setIsSubmitting(true)
    const result = await adjustStock(activeItem.id, delta)
    setIsSubmitting(false)

    if (result.success) {
      setIsAdjustOpen(false)
      showFeedback(
        'success',
        `Stock for "${activeItem.name}" ${adjustType === 'add' ? 'increased' : 'decreased'} by ${amount} ${activeItem.unit}.`
      )
    } else {
      setFormError(result.error || 'Failed to adjust stock')
    }
  }

  const getStatusBadge = (status: 'in-stock' | 'low-stock' | 'critical') => {
    switch (status) {
      case 'in-stock':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 dark:text-emerald-400">
            In Stock
          </Badge>
        )
      case 'low-stock':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 dark:text-amber-400"
          >
            Low Stock
          </Badge>
        )
      case 'critical':
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
          >
            Critical
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6 pb-20">
      {/* Toast Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg p-3 text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-2',
            feedback.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-destructive/15 text-destructive border border-destructive/30'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Error Banner if initial fetch fails */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-3">
            <XCircle className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">Database Connection Error</p>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-destructive/30 hover:bg-destructive/20 text-destructive"
          >
            <RefreshCw className="mr-1.5 size-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Stats Cards - Connected directly to PostgreSQL via Prisma */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Items */}
        <Card className="p-4 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Items</p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats.total}</p>
              )}
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Package className="size-5" />
            </div>
          </div>
        </Card>

        {/* Total Inventory Value */}
        <Card className="p-4 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Inventory Value</p>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">
                  ₹{stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-5" />
            </div>
          </div>
        </Card>

        {/* Low Stock Items */}
        <Card
          className={cn(
            'p-4 transition-all hover:shadow-sm',
            stats.lowStockCount > 0 && 'border-amber-500/40 bg-amber-500/5'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Low Stock Items</p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p
                  className={cn(
                    'text-2xl font-bold',
                    stats.lowStockCount > 0 && 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {stats.lowStockCount}
                </p>
              )}
            </div>
            <div
              className={cn(
                'rounded-lg p-2.5',
                stats.lowStockCount > 0
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertTriangle className="size-5" />
            </div>
          </div>
        </Card>

        {/* Critical Items */}
        <Card
          className={cn(
            'p-4 transition-all hover:shadow-sm',
            stats.criticalCount > 0 && 'border-destructive/40 bg-destructive/5'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Critical Items</p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p
                  className={cn(
                    'text-2xl font-bold',
                    stats.criticalCount > 0 && 'text-destructive'
                  )}
                >
                  {stats.criticalCount}
                </p>
              )}
            </div>
            <div
              className={cn(
                'rounded-lg p-2.5',
                stats.criticalCount > 0
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertTriangle className="size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="critical">Critical</option>
          </select>

          {/* Clear Filters button if filtered */}
          {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('all')
                setStatusFilter('all')
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            title="Refresh database"
            className="h-9 gap-1.5"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button onClick={handleOpenAdd} className="h-9 gap-1.5">
            <Plus className="size-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[220px]">Item Name</TableHead>
                <TableHead className="w-[120px]">SKU</TableHead>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead className="text-right w-[150px]">Quantity</TableHead>
                <TableHead className="text-right w-[120px]">Unit Price</TableHead>
                <TableHead className="text-right w-[130px]">Total Value</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="text-right w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && items.length === 0 ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-14 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length > 0 ? (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/40 transition-colors group"
                  >
                    {/* Name */}
                    <TableCell className="font-medium text-foreground">
                      {item.name}
                    </TableCell>

                    {/* SKU */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.sku}
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {item.category}
                      </span>
                    </TableCell>

                    {/* Quantity + Warning */}
                    <TableCell className="text-right">
                      <div className="font-semibold text-foreground">
                        {item.quantity}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          {item.unit}
                        </span>
                      </div>
                      {item.quantity <= item.criticalStock ? (
                        <p className="text-[11px] font-medium text-destructive">
                          Critical (≤ {item.criticalStock})
                        </p>
                      ) : item.quantity <= item.minStock ? (
                        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          Low Stock (≤ {item.minStock})
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/70">
                          Min: {item.minStock} {item.unit}
                        </p>
                      )}
                    </TableCell>

                    {/* Unit Price */}
                    <TableCell className="text-right text-sm">
                      ₹{item.unitPrice.toLocaleString('en-IN')}
                    </TableCell>

                    {/* Total Value */}
                    <TableCell className="text-right font-medium text-foreground">
                      ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN', {
                        maximumFractionDigits: 1,
                      })}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>{getStatusBadge(item.status)}</TableCell>

                    {/* Dynamic Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick adjust stock button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Adjust Stock"
                          onClick={() => handleOpenAdjust(item, 'add')}
                          className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <SlidersHorizontal className="size-3.5" />
                        </Button>

                        {/* Edit Item */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Item"
                          onClick={() => handleOpenEdit(item)}
                          className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        {/* Delete Item */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Item"
                          onClick={() => handleOpenDelete(item)}
                          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Package className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No inventory items found</p>
                      {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' ? (
                        <p className="text-xs text-muted-foreground">
                          Try adjusting your search query or filters.
                        </p>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenAdd}
                          className="mt-2 text-xs"
                        >
                          <Plus className="mr-1.5 size-3.5" /> Add your first item
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 1. ADD ITEM DIALOG (CREATE)                                               */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>
              Create a new stock item stored directly in PostgreSQL via Prisma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            {formError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Item Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Kashmiri Saffron"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  SKU <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. SF-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Category</label>
                <Input
                  placeholder="e.g. Spices, Dairy"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Quantity
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Unit
                </label>
                <Input
                  placeholder="e.g. kg, grams, liters"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Unit Price (₹)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Cost per unit"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Low Stock Threshold
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Default 10"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Critical Threshold
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Default 5"
                  value={formData.criticalStock}
                  onChange={(e) =>
                    setFormData({ ...formData, criticalStock: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 2. EDIT ITEM DIALOG (UPDATE)                                              */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update item details and stock levels in PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            {formError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Item Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  SKU <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Category</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Current Quantity
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Unit
                </label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Unit Price (₹)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Low Stock Threshold
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Critical Threshold
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.criticalStock}
                  onChange={(e) =>
                    setFormData({ ...formData, criticalStock: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 3. QUICK ADJUST STOCK DIALOG                                              */}
      {/* ========================================================================= */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Quick Stock Adjustment</DialogTitle>
            <DialogDescription>
              {activeItem?.name} (Current: {activeItem?.quantity} {activeItem?.unit})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustStock} className="space-y-4 py-2">
            {formError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustType === 'add' ? 'default' : 'outline'}
                onClick={() => setAdjustType('add')}
                className="flex-1 gap-1.5"
                size="sm"
              >
                <PlusCircle className="size-4" /> Add Stock
              </Button>
              <Button
                type="button"
                variant={adjustType === 'subtract' ? 'destructive' : 'outline'}
                onClick={() => setAdjustType('subtract')}
                className="flex-1 gap-1.5"
                size="sm"
              >
                <MinusCircle className="size-4" /> Consume
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Amount ({activeItem?.unit})
              </label>
              <Input
                type="number"
                step="any"
                min="0.1"
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-center text-lg font-bold"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 4. DELETE CONFIRMATION DIALOG (DELETE)                                    */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" /> Delete Inventory Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong className="text-foreground">{activeItem?.name}</strong> (SKU:{' '}
              {activeItem?.sku})? This item will be permanently removed from PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
