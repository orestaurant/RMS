'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Package,
  AlertTriangle,
  Boxes,
  Plus,
  Search,
  RefreshCw,
  QrCode,
  MapPin,
  Scale,
  MinusCircle,
  PlusCircle,
  Edit2,
  Trash2,
  Building,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Truck,
  Timer,
  PackageCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { RawMaterialQRModal } from '@/components/inventory/raw-material-qr-modal'
import { cn } from '@/lib/utils'

export interface RawMaterialItem {
  id: string
  name: string
  sku: string
  quantity: number
  weight: number
  weightUnit: string
  location: string
  minThreshold: number
  qrCodeData?: string | null
  vendorId?: string | null
  vendorName?: string
  status: 'in-stock' | 'low-stock' | 'critical'
  vendor?: {
    id: string
    name: string
    email: string
  } | null
  latestRestockStatus?: string | null
  latestRestockMeta?: any
  createdAt?: string
  updatedAt?: string
}

export interface VendorOption {
  id: string
  name: string
  email: string
  phone?: string
}

export function RawMaterialsView() {
  const [materials, setMaterials] = useState<RawMaterialItem[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'critical'>('all')
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all')

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error' | 'warning', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current))
    }, 4500)
  }

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [activeMaterial, setActiveMaterial] = useState<RawMaterialItem | null>(null)
  const [qrModalItem, setQrModalItem] = useState<RawMaterialItem | null>(null)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  // Add / Edit Form State
  const [formName, setFormName] = useState('')
  const [formSku, setFormSku] = useState('')
  const [formQuantity, setFormQuantity] = useState<string>('50')
  const [formWeight, setFormWeight] = useState<string>('1')
  const [formWeightUnit, setFormWeightUnit] = useState<string>('kg')
  const [formLocation, setFormLocation] = useState('')
  const [formMinThreshold, setFormMinThreshold] = useState<string>('15')
  const [formVendorId, setFormVendorId] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch Vendors
  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/vendors')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setVendors(json.data)
      }
    } catch (err) {
      console.warn('Could not load vendors:', err)
    }
  }, [])

  // Fetch Materials
  const fetchMaterials = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (selectedVendorFilter !== 'all') params.set('vendorId', selectedVendorFilter)

      const res = await fetch(`/api/inventory/raw-materials?${params.toString()}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setMaterials(json.data)
        if (json.stats) {
          setStats(json.stats)
        }
      }
    } catch (err) {
      console.error('Failed to fetch raw materials:', err)
      showFeedback('error', 'Failed to load raw material inventory')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, statusFilter, selectedVendorFilter])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formName.trim()) errors.name = 'Raw material name is required'
    if (formQuantity === '' || isNaN(Number(formQuantity)) || Number(formQuantity) < 0) {
      errors.quantity = 'Quantity must be a non-negative number'
    }
    if (formWeight === '' || isNaN(Number(formWeight)) || Number(formWeight) <= 0) {
      errors.weight = 'Weight must be greater than 0'
    }
    if (!formLocation.trim()) errors.location = 'Warehouse / Rack location is required'
    if (formMinThreshold === '' || isNaN(Number(formMinThreshold)) || Number(formMinThreshold) < 0) {
      errors.minThreshold = 'Minimum threshold must be a valid number'
    }
    if (!formVendorId) {
      errors.vendorId = 'Assigned Vendor is required to enable automated restock alerts'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Open Add Dialog
  const handleOpenAdd = () => {
    setFormName('')
    setFormSku(`RM-${Date.now().toString().slice(-5)}`)
    setFormQuantity('20')
    setFormWeight('5')
    setFormWeightUnit('kg')
    setFormLocation('Warehouse A - Rack 2 - Bin 1')
    setFormMinThreshold('10')
    setFormVendorId(vendors[0]?.id || '')
    setFormErrors({})
    setIsAddOpen(true)
  }

  // Submit Add Material
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          sku: formSku.trim() || undefined,
          quantity: Number(formQuantity),
          weight: Number(formWeight),
          weightUnit: formWeightUnit,
          location: formLocation.trim(),
          minThreshold: Number(formMinThreshold),
          vendorId: formVendorId,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        showFeedback('error', json.message || 'Failed to create raw material')
        return
      }

      setIsAddOpen(false)
      const isLowStock = Number(formQuantity) < Number(formMinThreshold)
      if (isLowStock) {
        showFeedback(
          'warning',
          `Created "${json.data.name}". Automated Low Stock & Vendor Restock alerts dispatched!`
        )
      } else {
        showFeedback('success', `Raw material "${json.data.name}" added successfully with unique QR code.`)
      }
      fetchMaterials()
    } catch (err: any) {
      showFeedback('error', err?.message || 'Network error creating material')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Dialog
  const handleOpenEdit = (material: RawMaterialItem) => {
    setActiveMaterial(material)
    setFormName(material.name)
    setFormSku(material.sku)
    setFormQuantity(String(material.quantity))
    setFormWeight(String(material.weight))
    setFormWeightUnit(material.weightUnit || 'kg')
    setFormLocation(material.location)
    setFormMinThreshold(String(material.minThreshold))
    setFormVendorId(material.vendorId || (vendors[0]?.id || ''))
    setFormErrors({})
    setIsEditOpen(true)
  }

  // Submit Edit Material
  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeMaterial || !validateForm()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/inventory/raw-materials/${activeMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          quantity: Number(formQuantity),
          weight: Number(formWeight),
          weightUnit: formWeightUnit,
          location: formLocation.trim(),
          minThreshold: Number(formMinThreshold),
          vendorId: formVendorId,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        showFeedback('error', json.message || 'Failed to update material')
        return
      }

      setIsEditOpen(false)
      if (json.alertResult?.triggered) {
        showFeedback(
          'warning',
          `Stock dropped below threshold! Automated low-inventory notification sent to Vendor.`
        )
      } else {
        showFeedback('success', `Updated "${json.data.name}" successfully.`)
      }
      fetchMaterials()
    } catch (err: any) {
      showFeedback('error', err?.message || 'Network error updating material')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick Stock Adjust (+1 or -1)
  const handleQuickAdjust = async (material: RawMaterialItem, delta: number) => {
    const newQty = Math.max(0, material.quantity + delta)
    if (newQty === material.quantity) return

    setAdjustingId(material.id)
    try {
      // Optimistic update
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === material.id
            ? {
                ...m,
                quantity: newQty,
                status:
                  newQty === 0
                    ? 'critical'
                    : newQty <= m.minThreshold
                    ? 'low-stock'
                    : 'in-stock',
              }
            : m
        )
      )

      const res = await fetch(`/api/inventory/raw-materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustDelta: delta }),
      })

      const json = await res.json()
      if (json.success) {
        if (json.alertResult?.triggered) {
          showFeedback(
            'warning',
            `⚠️ Low Stock Triggered! "${material.name}" is now at ${newQty}. Vendor alerted automatically.`
          )
        }
        fetchMaterials()
      } else {
        showFeedback('error', json.message || 'Failed to adjust stock')
        fetchMaterials()
      }
    } catch (err) {
      showFeedback('error', 'Failed to adjust stock')
      fetchMaterials()
    } finally {
      setAdjustingId(null)
    }
  }

  // Delete Material
  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete raw material "${name}"?`)) return
    try {
      const res = await fetch(`/api/inventory/raw-materials/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        showFeedback('success', `Deleted "${name}".`)
        fetchMaterials()
      } else {
        showFeedback('error', json.message || 'Failed to delete')
      }
    } catch (err) {
      showFeedback('error', 'Error deleting raw material')
    }
  }

  // Open QR modal
  const handleOpenQR = (material: RawMaterialItem) => {
    setQrModalItem(material)
    setIsQrOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Feedback Alert Toast / Banner */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between p-3.5 rounded-xl border text-sm shadow-sm transition-all animate-in fade-in slide-in-from-top-2',
            feedback.type === 'success' &&
              'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
            feedback.type === 'warning' &&
              'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium',
            feedback.type === 'error' &&
              'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' && <CheckCircle2 className="size-4 shrink-0" />}
            {feedback.type === 'warning' && <AlertTriangle className="size-4 shrink-0 text-amber-600 animate-pulse" />}
            {feedback.type === 'error' && <XCircle className="size-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Raw Material Inventory</h1>
            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
              Live Auto-Alerts
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage raw ingredient stocks, automated low-inventory vendor notifications, and QR labels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              fetchMaterials()
            }}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm"
          >
            <Plus className="size-4" />
            Add Raw Material
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Raw Materials */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Raw Materials
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Boxes className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active warehouse SKUs tracked in real-time
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Items (highlighted in red/amber) */}
        <Card
          className={cn(
            'border shadow-xs transition-colors',
            stats.lowStockCount > 0
              ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20'
              : 'border-border/70'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Low Stock Items
            </CardTitle>
            <div
              className={cn(
                'p-2 rounded-lg',
                stats.lowStockCount > 0
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 animate-pulse'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items at or below minimum threshold — Vendor alerted
            </p>
          </CardContent>
        </Card>

        {/* Out of Stock Items */}
        <Card
          className={cn(
            'border shadow-xs transition-colors',
            stats.outOfStockCount > 0
              ? 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20'
              : 'border-border/70'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Out of Stock (Critical)
            </CardTitle>
            <div
              className={cn(
                'p-2 rounded-lg',
                stats.outOfStockCount > 0
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertOctagon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.outOfStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zero quantity in warehouse — Urgent restock required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-border/70">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search raw material name, SKU code, location, or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="h-8 text-xs px-2.5"
              >
                All ({stats.total})
              </Button>
              <Button
                variant={statusFilter === 'in-stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('in-stock')}
                className="h-8 text-xs px-2.5 text-emerald-600 dark:text-emerald-400"
              >
                In Stock ({stats.inStockCount})
              </Button>
              <Button
                variant={statusFilter === 'low-stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('low-stock')}
                className="h-8 text-xs px-2.5 text-amber-600 dark:text-amber-400"
              >
                Low Stock ({stats.lowStockCount})
              </Button>
              <Button
                variant={statusFilter === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('critical')}
                className="h-8 text-xs px-2.5 text-rose-600 dark:text-rose-400"
              >
                Critical ({stats.outOfStockCount})
              </Button>
            </div>

            {/* Vendor Filter Dropdown */}
            {vendors.length > 0 && (
              <select
                value={selectedVendorFilter}
                onChange={(e) => setSelectedVendorFilter(e.target.value)}
                aria-label="Filter by Assigned Vendor"
                className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Raw Materials Table */}
      <Card className="border border-border/70 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold text-xs">Material / SKU</TableHead>
                <TableHead className="font-semibold text-xs">Stock Status</TableHead>
                <TableHead className="font-semibold text-xs">Quantity</TableHead>
                <TableHead className="font-semibold text-xs">Specification</TableHead>
                <TableHead className="font-semibold text-xs">Location</TableHead>
                <TableHead className="font-semibold text-xs">Min Threshold</TableHead>
                <TableHead className="font-semibold text-xs">Assigned Vendor</TableHead>
                <TableHead className="font-semibold text-xs text-center">Quick Adjust</TableHead>
                <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9} className="py-4">
                      <div className="h-6 rounded bg-muted/60 shimmer w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <Package className="size-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium text-sm">No raw materials found</p>
                    <p className="text-xs mt-1">
                      {search || statusFilter !== 'all'
                        ? 'Try clearing your search or status filters'
                        : 'Click "Add Raw Material" above to track warehouse inventory.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((item) => {
                  const isLow = item.status === 'low-stock'
                  const isCritical = item.status === 'critical'
                  const isAdjusting = adjustingId === item.id

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'hover:bg-muted/30 transition-colors',
                        isCritical && 'bg-rose-500/5',
                        isLow && 'bg-amber-500/5'
                      )}
                    >
                      {/* Name & SKU */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">{item.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                        </div>
                      </TableCell>

                      {/* Visual Status Badge & Restock Lifecycle */}
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {isCritical ? (
                            <Badge variant="destructive" className="text-[11px] gap-1 px-2 py-0.5">
                              <AlertOctagon className="size-3" />
                              Critical / Out
                            </Badge>
                          ) : isLow ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium"
                            >
                              <AlertTriangle className="size-3" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[11px] gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            >
                              <CheckCircle2 className="size-3" />
                              In Stock
                            </Badge>
                          )}

                          {/* Restock Lifecycle indicator if active notification */}
                          {item.latestRestockStatus === 'RESTOCK_DELIVERED' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 px-1.5 py-0 bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 font-semibold"
                            >
                              <PackageCheck className="size-2.5" />
                              Restock Delivered
                            </Badge>
                          )}
                          {item.latestRestockStatus === 'RESTOCK_IN_TRANSIT' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 px-1.5 py-0 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-semibold"
                            >
                              <Truck className="size-2.5" />
                              In Transit
                            </Badge>
                          )}
                          {(item.latestRestockStatus === 'RESTOCK_IN_PROGRESS' ||
                            item.latestRestockStatus === 'RESTOCK_INITIATED') && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 px-1.5 py-0 bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 font-semibold"
                            >
                              <Timer className="size-2.5" />
                              In Progress
                            </Badge>
                          )}
                          {item.latestRestockStatus === 'RESTOCK_COMPLETED' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium"
                            >
                              <CheckCircle2 className="size-2.5" />
                              Restocked
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Quantity */}
                      <TableCell>
                        <span
                          className={cn(
                            'font-bold text-sm',
                            isCritical && 'text-rose-600',
                            isLow && 'text-amber-600'
                          )}
                        >
                          {item.quantity}
                        </span>
                      </TableCell>

                      {/* Weight / Spec */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-medium">
                          {item.weight} {item.weightUnit}
                        </span>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[150px]">{item.location}</span>
                        </div>
                      </TableCell>

                      {/* Min Threshold */}
                      <TableCell>
                        <span className="text-xs font-mono font-medium">{item.minThreshold}</span>
                      </TableCell>

                      {/* Assigned Vendor */}
                      <TableCell>
                        <span className="text-xs font-medium text-foreground truncate max-w-[140px] block">
                          {item.vendorName || item.vendor?.name || 'Unassigned'}
                        </span>
                      </TableCell>

                      {/* Quick Stock Adjust (+ / -) */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuickAdjust(item, -1)}
                            disabled={isAdjusting || item.quantity <= 0}
                            title="Decrement stock (-1)"
                            className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <MinusCircle className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuickAdjust(item, 1)}
                            disabled={isAdjusting}
                            title="Increment stock (+1)"
                            className="size-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <PlusCircle className="size-4" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Actions: View/Print QR Code & Edit */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenQR(item)}
                            className="h-8 gap-1 text-xs px-2.5 font-medium border-orange-500/30 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
                            title="View & Print QR Code Label"
                          >
                            <QrCode className="size-3.5" />
                            QR Label
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="size-8 text-muted-foreground hover:text-foreground"
                            title="Edit raw material"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMaterial(item.id, item.name)}
                            className="size-8 text-muted-foreground hover:text-rose-600"
                            title="Delete raw material"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ADD RAW MATERIAL MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg p-6 bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 shrink-0">
                <Package className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Add Raw Material</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Register new warehouse inventory. QR code and automated vendor alert thresholds are generated automatically.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateMaterial} className="space-y-4 my-2">
            {/* Name */}
            <div className="space-y-1.5">
              <div className="h-5 flex items-center">
                <Label className="text-xs font-semibold">
                  Material Name <span className="text-rose-500">*</span>
                </Label>
              </div>
              <Input
                placeholder="e.g. Refined Cooking Oil, Basmati Rice, Whole Milk"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={cn('h-9 text-sm', formErrors.name && 'border-rose-500')}
              />
              {formErrors.name && <p className="text-[11px] text-rose-500">{formErrors.name}</p>}
            </div>

            {/* SKU and Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">SKU / Item Code</Label>
                </div>
                <Input
                  placeholder="Auto-generated if blank"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Location <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  placeholder="e.g. Warehouse A - Rack 4 - Bin 2"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className={cn('h-9 text-sm', formErrors.location && 'border-rose-500')}
                />
                {formErrors.location && <p className="text-[11px] text-rose-500">{formErrors.location}</p>}
              </div>
            </div>

            {/* Quantity, Weight and Unit */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5 space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Current Quantity <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Count"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  className={cn('h-9 text-sm', formErrors.quantity && 'border-rose-500')}
                />
                {formErrors.quantity && <p className="text-[11px] text-rose-500">{formErrors.quantity}</p>}
              </div>

              <div className="col-span-4 space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Unit Weight <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Value"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  className={cn('h-9 text-sm', formErrors.weight && 'border-rose-500')}
                />
                {formErrors.weight && <p className="text-[11px] text-rose-500">{formErrors.weight}</p>}
              </div>

              <div className="col-span-3 space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">Unit</Label>
                </div>
                <div className="relative">
                  <select
                    value={formWeightUnit}
                    onChange={(e) => setFormWeightUnit(e.target.value)}
                    aria-label="Unit of measure"
                    className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-7 text-sm font-medium shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Min Threshold & Vendor Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Low-Stock Threshold <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 10"
                  value={formMinThreshold}
                  onChange={(e) => setFormMinThreshold(e.target.value)}
                  className={cn('h-9 text-sm', formErrors.minThreshold && 'border-rose-500')}
                />
                <p className="text-[11px] text-muted-foreground">
                  Alerts vendor when stock drops below this
                </p>
                {formErrors.minThreshold && <p className="text-[11px] text-rose-500">{formErrors.minThreshold}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Assigned Vendor <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <div className="relative">
                  <select
                    value={formVendorId}
                    onChange={(e) => setFormVendorId(e.target.value)}
                    aria-label="Assigned Vendor"
                    className={cn(
                      'h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm font-normal shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      formErrors.vendorId && 'border-rose-500'
                    )}
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.email ? `(${v.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Receives in-app restock request alert
                </p>
                {formErrors.vendorId && <p className="text-[11px] text-rose-500">{formErrors.vendorId}</p>}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm"
              >
                {submitting ? 'Creating & Generating QR...' : 'Add Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT RAW MATERIAL MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg p-6 bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 shrink-0">
                <Package className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Edit Raw Material</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Update inventory counts, warehouse rack location, or assigned vendor.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleUpdateMaterial} className="space-y-4 my-2">
            {/* Name */}
            <div className="space-y-1.5">
              <div className="h-5 flex items-center">
                <Label className="text-xs font-semibold">
                  Material Name <span className="text-rose-500">*</span>
                </Label>
              </div>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* SKU and Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">SKU</Label>
                </div>
                <Input value={formSku} disabled className="h-9 text-sm font-mono bg-muted" />
              </div>
              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Location <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Quantity, Weight and Unit */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5 space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Quantity <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-4 space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Unit Weight <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-3 space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">Unit</Label>
                </div>
                <div className="relative">
                  <select
                    value={formWeightUnit}
                    onChange={(e) => setFormWeightUnit(e.target.value)}
                    aria-label="Unit of measure"
                    className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-7 text-sm font-medium shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Min Threshold & Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Low-Stock Threshold <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={formMinThreshold}
                  onChange={(e) => setFormMinThreshold(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <div className="h-5 flex items-center">
                  <Label className="text-xs font-semibold">
                    Assigned Vendor <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <div className="relative">
                  <select
                    value={formVendorId}
                    onChange={(e) => setFormVendorId(e.target.value)}
                    aria-label="Assigned Vendor"
                    className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm font-normal shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.email ? `(${v.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR CODE PREVIEW & PRINT MODAL */}
      <RawMaterialQRModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        material={qrModalItem}
      />
    </div>
  )
}
