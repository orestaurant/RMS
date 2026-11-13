'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Minus,
  ChevronRight,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  X,
  Tag,
  RefreshCw,
  UtensilsCrossed,
  Package,
  QrCode,
  Car,
  MapPin,
  Lock,
  Unlock,
} from 'lucide-react'
import { QRCodeSVG } from '@/lib/qr-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePOSStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { CustomerLocationLock, CustomerLocationData, isValidCoord } from '@/components/orders/CustomerLocationLock'
import { useAuthContext } from '@/hooks/useAuthContext'

export type PaymentMethod = 'cash' | 'card' | 'upi'

export interface POSMenuItem {
  id: string
  name: string
  description?: string
  category: string
  categoryName?: string
  categoryId?: string
  price: number
  image?: string
  isVeg: boolean
  isAvailable: boolean
  prepTime: number
  stock?: number | null
  unit?: string | null
  tags?: string[]
  source?: 'menu' | 'inventory'
}

export interface POSTable {
  id: string
  number: string | number
  status: string
  capacity?: number
}

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'upi', label: 'UPI / QR', icon: QrCode },
]

function MenuItemCard({ item }: { item: POSMenuItem }) {
  const { addItem } = usePOSStore()

  const isOutOfStock = !item.isAvailable || (item.stock !== null && item.stock !== undefined && item.stock <= 0)

  return (
    <button
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card p-3 text-left',
        'touch-active transition-all duration-150 hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm',
        isOutOfStock && 'opacity-40 pointer-events-none'
      )}
      onClick={() =>
        addItem({
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          price: item.price,
        })
      }
    >
      {/* Veg / Non-veg indicator */}
      <div
        className={cn(
          'absolute top-2.5 right-2.5 size-3 rounded-sm border-2',
          item.isVeg ? 'border-success' : 'border-destructive'
        )}
      >
        <div
          className={cn(
            'size-1.5 rounded-full m-[1px]',
            item.isVeg ? 'bg-success' : 'bg-destructive'
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5 pr-5">
        <span className="text-xs font-semibold leading-tight line-clamp-1">{item.name}</span>
        <span className="text-lg font-bold text-primary">₹{item.price}</span>
        <div className="flex items-center gap-1 flex-wrap">
          {item.prepTime ? (
            <span className="text-[10px] text-muted-foreground">{item.prepTime}m</span>
          ) : null}
          {item.tags?.slice(0, 1).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[9px] h-3.5 px-1 py-0">
              {tag}
            </Badge>
          ))}
          {isOutOfStock && (
            <Badge variant="destructive" className="text-[9px] h-3.5 px-1 py-0">
              Out of stock
            </Badge>
          )}
        </div>
      </div>

      {/* Add button overlay */}
      {!isOutOfStock && (
        <div className="absolute bottom-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="size-3.5" />
        </div>
      )}
    </button>
  )
}

function PaymentDialog({
  open,
  onClose,
  tables,
  locationData,
  setLocationData,
}: {
  open: boolean
  onClose: () => void
  tables: POSTable[]
  locationData: CustomerLocationData
  setLocationData: (data: CustomerLocationData) => void
}) {
  const { auth } = useAuthContext()
  const activeBranchId = auth?.branchId
  const { cartItems, paymentMethod, setPaymentMethod, getTotal, clearCart, selectedTableId } = usePOSStore()
  const [paid, setPaid] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [upiMode, setUpiMode] = useState<'qr' | 'id'>('qr')
  const [upiIdInput, setUpiIdInput] = useState('')
  const [upiRequestSent, setUpiRequestSent] = useState(false)
  const total = getTotal()

  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      const tableObj = tables.find((t) => t.id === selectedTableId)
      const validCoords = isValidCoord(locationData.customerLat, locationData.customerLng)
      const isCarDelivery = Boolean(
        locationData.vehicleNumber || locationData.landmarkNote || validCoords
      )
      const tableNum = tableObj
        ? String(tableObj.number)
        : isCarDelivery && locationData.vehicleNumber
        ? `Car ${locationData.vehicleNumber}`
        : 'Takeaway'

      const customerName = locationData.vehicleNumber
        ? `Car Guest (${locationData.vehicleNumber})`
        : 'POS Guest'

      // 1. Submit real Order to backend with branchId for ultra-fast placement
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: activeBranchId || null,
          tableNumber: tableNum,
          tableId: tableObj?.id || null,
          isDineIn: !!selectedTableId,
          source: 'POS',
          customerName,
          status: 'pending',
          requestedStatus: 'pending',
          items: cartItems.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          isLocationLocked: Boolean(locationData.isLocationLocked),
          vehicleNumber: locationData.vehicleNumber ? locationData.vehicleNumber.trim().toUpperCase() : null,
          landmarkNote: locationData.landmarkNote ? locationData.landmarkNote.trim() : null,
          customerLat: validCoords ? locationData.customerLat : null,
          customerLng: validCoords ? locationData.customerLng : null,
          locationAccuracy: validCoords ? (locationData.locationAccuracy ?? null) : null,
          locationCapturedAt: validCoords ? (locationData.locationCapturedAt ?? null) : null,
        }),
      })

      // Fallback KDS ticket forward if needed
      if (!res.ok) {
        await fetch('/api/kds/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `ORD-POS-${Date.now().toString().slice(-4)}`,
            tableNumber: locationData.vehicleNumber ? `🚗 ${locationData.vehicleNumber}` : tableNum.startsWith('Table') ? tableNum : `Table ${tableNum}`,
            source: isCarDelivery ? 'delivery' : selectedTableId ? 'dine_in' : 'takeaway',
            waiter: 'POS Staff',
            customerName,
            status: 'pending',
            priority: 'normal',
            items: cartItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
            })),
          }),
        }).catch(() => null)
      }
    } catch (err) {
      console.warn('POS order forwarding error:', err)
    } finally {
      setSubmitting(false)
      setPaid(true)
      setTimeout(() => {
        clearCart()
        setLocationData({
          isLocationLocked: false,
          vehicleNumber: '',
          landmarkNote: '',
          customerLat: null,
          customerLng: null,
          locationAccuracy: null,
          locationCapturedAt: null,
        })
        setPaid(false)
        onClose()
      }, 600)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {paid ? 'Payment Successful' : 'Confirm Payment'}
          </DialogTitle>
        </DialogHeader>

        {paid ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">₹{total.toLocaleString('en-IN')}</p>
              <p className="text-sm text-muted-foreground mt-1">Payment received via {paymentMethod.toUpperCase()}</p>
              <p className="text-xs text-primary font-medium mt-2">Order sent to Kitchen Display System</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Order summary */}
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">ORDER SUMMARY</p>
                {locationData.vehicleNumber && (
                  <Badge variant="outline" className="text-[10px] font-mono gap-1 border-primary/30 text-primary">
                    <Car className="size-2.5" />
                    {locationData.vehicleNumber}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{item.quantity}× {item.name}</span>
                    <span className="font-medium shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2.5" />
              <div className="flex items-center justify-between font-bold">
                <span>Total Amount</span>
                <span className="text-lg text-primary">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment methods: Cash, Card, UPI */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2.5">PAYMENT METHOD</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all',
                      'touch-active',
                      paymentMethod === pm.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <pm.icon className="size-5" />
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* UPI QR Scanner & UPI ID section */}
            {paymentMethod === 'upi' && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col gap-3">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUpiMode('qr')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                      upiMode === 'qr'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <QrCode className="size-3.5" />
                    <span>Scan QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiMode('id')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                      upiMode === 'id'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Smartphone className="size-3.5" />
                    <span>Pay via UPI ID</span>
                  </button>
                </div>

                {/* Tab 1: QR Code Scanner */}
                {upiMode === 'qr' ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-1 text-center">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
                      <QRCodeSVG
                        value={`upi://pay?pa=restaurantos@upi&pn=RestaurantOS&am=${total}&cu=INR`}
                        size={140}
                        className="mx-auto"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Scan with GPay, PhonePe, Paytm, or BHIM
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        UPI: <span className="text-primary font-bold">restaurantos@upi</span> • ₹{total.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Tab 2: UPI ID */
                  <div className="flex flex-col gap-2 py-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Customer UPI ID
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={upiIdInput}
                        onChange={(e) => {
                          setUpiIdInput(e.target.value)
                          setUpiRequestSent(false)
                        }}
                        placeholder="e.g. 9876543210@upi or name@okhdfcbank"
                        className="h-9 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!upiIdInput.includes('@')}
                        onClick={() => setUpiRequestSent(true)}
                        className="h-9 text-xs shrink-0"
                      >
                        Request
                      </Button>
                    </div>
                    {upiRequestSent ? (
                      <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2.5 py-1.5 rounded-lg border border-success/30">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Payment collect request sent to {upiIdInput}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Customer will receive a collect request notification on their UPI app.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button
              size="lg"
              className="w-full h-12 text-base font-semibold"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting
                ? 'Processing Order...'
                : paymentMethod === 'upi'
                ? `Confirm UPI Payment ₹${total.toLocaleString('en-IN')}`
                : `Confirm ₹${total.toLocaleString('en-IN')}`}
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function POSTerminal() {
  const [menuItems, setMenuItems] = useState<POSMenuItem[]>([])
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([
    { id: 'all', label: 'All Items' },
  ])
  const [tables, setTables] = useState<POSTable[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [spotDialogOpen, setSpotDialogOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [locationData, setLocationData] = useState<CustomerLocationData>({
    isLocationLocked: false,
    vehicleNumber: '',
    landmarkNote: '',
    customerLat: null,
    customerLng: null,
    locationAccuracy: null,
    locationCapturedAt: null,
  })

  const {
    cartItems,
    selectedTableId,
    setSelectedTable,
    updateQuantity,
    removeItem,
    setDiscount,
    discount,
    getSubtotal,
    getTax,
    getTotal,
  } = usePOSStore()

  // Fetch real items from Menu & Inventory APIs
  const fetchPOSData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)

      const [menuRes, tablesRes] = await Promise.all([
        fetch('/api/pos/menu'),
        fetch('/api/tables'),
      ])

      const menuJson = await menuRes.json().catch(() => null)
      const tablesJson = await tablesRes.json().catch(() => null)

      if (menuJson && menuJson.success && menuJson.data) {
        setMenuItems(menuJson.data.items || [])
        if (menuJson.data.categories && menuJson.data.categories.length > 0) {
          setCategories(menuJson.data.categories)
        }
      }

      if (tablesJson && tablesJson.success && tablesJson.data) {
        const rawTables = Array.isArray(tablesJson.data)
          ? tablesJson.data
          : tablesJson.data.tables || []
        const mappedTables: POSTable[] = rawTables.map((t: any) => ({
          id: t.id,
          number: t.tableNumber || t.number || '1',
          status: (t.status || 'available').toLowerCase(),
          capacity: t.capacity,
        }))
        setTables(mappedTables)
      }
    } catch (err) {
      console.error('Failed to load real POS data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchPOSData()
  }, [fetchPOSData])

  const filtered = menuItems.filter((item) => {
    const matchCat =
      activeCategory === 'all' ||
      item.category === activeCategory ||
      item.categoryName === activeCategory
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const subtotal = getSubtotal()
  const tax = getTax()
  const total = getTotal()

  const selectedTableObj = tables.find((t) => t.id === selectedTableId)

  return (
    <>
      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        tables={tables}
        locationData={locationData}
        setLocationData={setLocationData}
      />

      {/* Dedicated Spot / Vehicle Details Dialog for POS */}
      <Dialog open={spotDialogOpen} onOpenChange={setSpotDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Car className="size-4 text-primary" /> Customer Vehicle & Delivery Spot
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <CustomerLocationLock
              data={locationData}
              onChange={setLocationData}
              showToggle={false}
              title="Drive-In / Car Delivery Spot"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button size="sm" onClick={() => setSpotDialogOpen(false)}>
              Save & Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* ── Left: Menu / Inventory browser ────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
          {/* Table selector + search bar + refresh */}
          <div className="flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Table:
              </span>
              <div className="flex flex-wrap gap-1.5 max-w-xs">
                {tables.length > 0 ? (
                  tables
                    .filter((t) => t.status === 'available' || t.status === 'occupied')
                    .slice(0, 8)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTable(selectedTableId === t.id ? null : t.id)}
                        className={cn(
                          'flex h-8 min-w-[36px] items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-all touch-active',
                          selectedTableId === t.id
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : t.status === 'occupied'
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground hover:border-primary/40'
                        )}
                      >
                        {t.number}
                      </button>
                    ))
                ) : (
                  <Badge variant="outline" className="text-xs py-1">
                    Takeaway Mode
                  </Badge>
                )}
              </div>
            </div>

            <div className="relative flex-1 max-w-sm ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search real menu / inventory..."
                className="pl-8 h-9 text-sm"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => fetchPOSData(true)}
              title="Refresh inventory & menu"
              disabled={refreshing}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-border no-scrollbar shrink-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Menu / Inventory grid */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="h-28 rounded-xl border border-border bg-card/60 p-3 flex flex-col justify-between">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-6 w-1/2 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center my-auto min-h-[350px]">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-3">
                  <UtensilsCrossed className="size-6 text-muted-foreground" />
                </div>
                <p className="text-base font-semibold">No Items in Menu or Inventory</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  {search
                    ? `No matching items found for "${search}".`
                    : 'Abhi tak koi items add nahi hue hain. Inventory ya Menu management se naye items add karein taaki yahan show ho sakein.'}
                </p>
                <div className="flex gap-2.5 mt-5">
                  <Link href="/inventory">
                    <Button size="sm" variant="default">
                      <Package className="size-4 mr-1.5" />
                      Add to Inventory
                    </Button>
                  </Link>
                  <Link href="/admin-menu">
                    <Button size="sm" variant="outline">
                      <Plus className="size-4 mr-1.5" />
                      Add Menu Item
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Right: Cart ───────────────────────────────── */}
        <div className="flex w-[340px] shrink-0 flex-col bg-card">
          {/* Cart header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Cart</span>
              {selectedTableObj ? (
                <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                  T{selectedTableObj.number}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Takeaway
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {cartItems.reduce((s, i) => s + i.quantity, 0)} items
            </Badge>
          </div>

          {/* Cart items */}
          <ScrollArea className="flex-1">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <span className="text-2xl">🛒</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tap dishes to add them to current order
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0 divide-y divide-border">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-[56px] justify-end">
                      <span className="text-sm font-semibold">₹{(item.price * item.quantity).toLocaleString()}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Bill summary */}
          {cartItems.length > 0 && (
            <div className="border-t border-border bg-background/50 p-4">
              <div className="flex flex-col gap-2 mb-4 text-sm">
                {/* Drive-in / Car Delivery location widget in cart */}
                <div className="mb-1">
                  {locationData.vehicleNumber || locationData.landmarkNote || isValidCoord(locationData.customerLat, locationData.customerLng) ? (
                    <div
                      onClick={() => setSpotDialogOpen(true)}
                      className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-all text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Car className="size-3.5 text-primary shrink-0" />
                        <span className="font-mono font-bold text-primary truncate">
                          {locationData.vehicleNumber || 'Car Delivery'}
                        </span>
                        {locationData.landmarkNote && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">
                            • {locationData.landmarkNote}
                          </span>
                        )}
                        {isValidCoord(locationData.customerLat, locationData.customerLng) && (
                          <span className="text-[9px] font-mono text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded">
                            GPS Pin
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] h-4 px-1 gap-0.5',
                          locationData.isLocationLocked
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'text-muted-foreground'
                        )}
                      >
                        {locationData.isLocationLocked ? <Lock className="size-2" /> : <Unlock className="size-2" />}
                        {locationData.isLocationLocked ? 'Locked' : 'Edit'}
                      </Badge>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs font-semibold gap-1.5 border-dashed border-primary/50 text-primary bg-primary/5 hover:bg-primary/10"
                      onClick={() => setSpotDialogOpen(true)}
                    >
                      <Car className="size-3.5" />
                      <span>🚗 Drive-In / Lock Car Spot & GPS</span>
                    </Button>
                  )}
                </div>

                {/* Discount input */}
                <div className="flex items-center gap-2">
                  <Tag className="size-3.5 text-muted-foreground shrink-0" />
                  <Input
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value)
                      setDiscount(Number(e.target.value) || 0)
                    }}
                    placeholder="Discount (₹)"
                    className="h-7 text-xs"
                    type="number"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-xs mt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (5%)</span>
                    <span>₹{tax.toLocaleString('en-IN')}</span>
                  </div>
                  <Separator className="my-0.5" />
                  <div className="flex justify-between font-bold text-base text-foreground">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                disabled={cartItems.length === 0}
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="size-5" />
                Charge ₹{total.toLocaleString('en-IN')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
