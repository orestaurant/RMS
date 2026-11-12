'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  UtensilsCrossed,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  Lock,
  QrCode,
  CheckCircle2,
  Clock,
  ChefHat,
  ArrowRight,
  Flame,
  Leaf,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface CustomerMenuItem {
  id: string
  name: string
  description?: string
  categoryId: string
  category: string
  price: number
  image?: string
  isVeg?: boolean
  isVegan?: boolean
  isSpicy?: boolean
  spiceLevel?: number
  isAvailable: boolean
  prepTime?: number
  rating?: number
}

interface CartItem {
  menuItem: CustomerMenuItem
  quantity: number
  specialInstructions?: string
}

interface OrderConfirmationData {
  id: string
  orderNumber: string
  tableNumber: string
  status: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  itemsCount: number
  createdAt: string
  items?: Array<{ name: string; quantity: number; price: number }>
}

export function CustomerMenu() {
  const searchParams = useSearchParams()

  // 1. Table Number State & Persistence
  const [tableNumber, setTableNumber] = useState<string>('')
  const [isTableLocked, setIsTableLocked] = useState<boolean>(false)
  const [showTableModal, setShowTableModal] = useState<boolean>(false)
  const [manualTableInput, setManualTableInput] = useState<string>('')

  // 2. Data State
  const [menuItems, setMenuItems] = useState<CustomerMenuItem[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // 3. Table Orders & Live Queue State
  const [tableOrders, setTableOrders] = useState<any[]>([])
  const [showOrdersModal, setShowOrdersModal] = useState<boolean>(false)

  // 4. Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [vegOnly, setVegOnly] = useState<boolean>(false)

  // 5. Cart & Drawer State
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({})
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [orderNotes, setOrderNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  // 6. Order Confirmation State
  const [confirmedOrder, setConfirmedOrder] = useState<OrderConfirmationData | null>(null)
  const [liveStatus, setLiveStatus] = useState<string>('pending')

  // Initialize and persist table number from searchParams or localStorage
  useEffect(() => {
    const urlTable = searchParams?.get('table') || searchParams?.get('tableNumber')
    const savedTable = typeof window !== 'undefined' ? localStorage.getItem('rms_customer_table') : null

    if (urlTable && urlTable.trim()) {
      const clean = urlTable.trim()
      setTableNumber(clean)
      setIsTableLocked(true)
      localStorage.setItem('rms_customer_table', clean)
    } else if (savedTable && savedTable.trim()) {
      setTableNumber(savedTable.trim())
      setIsTableLocked(true)
    } else {
      setShowTableModal(true)
    }
  }, [searchParams])

  // Fetch Menu Items & Categories
  const loadMenu = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError(null)

      const [itemsRes, catRes] = await Promise.all([
        fetch('/api/menu/items', { cache: 'no-store' }),
        fetch('/api/menu/categories', { cache: 'no-store' }),
      ])

      const itemsJson = await itemsRes.json()
      const catJson = await catRes.json()

      if (itemsJson.success && Array.isArray(itemsJson.data)) {
        // Display all available menu items (isAvailable !== false)
        const availableOnly = itemsJson.data.filter(
          (item: CustomerMenuItem) => item.isAvailable !== false
        )
        setMenuItems(availableOnly)
      } else {
        throw new Error(itemsJson.message || 'Failed to load menu items')
      }

      if (catJson.success && Array.isArray(catJson.data)) {
        setCategories(catJson.data)
      }
    } catch (err: any) {
      console.error('Error loading menu:', err)
      setFetchError(err.message || 'Failed to connect to menu server')
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll active table orders so customer sees live queue & cooking updates in real time
  const fetchTableOrders = useCallback(async () => {
    if (!tableNumber) return
    try {
      const res = await fetch(`/api/orders?table=${encodeURIComponent(tableNumber)}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setTableOrders(json.data)
        }
      }
    } catch (err) {
      console.warn('Error fetching live table orders:', err)
    }
  }, [tableNumber])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  useEffect(() => {
    fetchTableOrders()
    const timer = setInterval(fetchTableOrders, 4000)
    return () => clearInterval(timer)
  }, [fetchTableOrders])

  // Handle manual table entry submission
  const handleSetTable = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTableInput.trim()) return
    const clean = manualTableInput.trim()
    setTableNumber(clean)
    setIsTableLocked(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('rms_customer_table', clean)
    }
    setShowTableModal(false)
  }

  // Cart operations
  const addToCart = (item: CustomerMenuItem) => {
    setCart((prev) => {
      const currentQty = prev[item.id]?.quantity || 0
      return {
        ...prev,
        [item.id]: {
          menuItem: item,
          quantity: currentQty + 1,
        },
      }
    })
  }

  const decrementCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      }
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const copy = { ...prev }
      delete copy[itemId]
      return copy
    })
  }

  // Calculate cart totals
  const cartItemList = useMemo(() => Object.values(cart), [cart])
  const cartItemCount = useMemo(
    () => cartItemList.reduce((sum, item) => sum + item.quantity, 0),
    [cartItemList]
  )
  const cartSubtotal = useMemo(
    () => cartItemList.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
    [cartItemList]
  )
  const cartTax = Math.round(cartSubtotal * 0.05 * 100) / 100
  const cartGrandTotal = Math.round((cartSubtotal + cartTax) * 100) / 100

  // Derived Table Orders for Live Queue and Preparation
  const queueOrders = useMemo(
    () =>
      tableOrders.filter(
        (o) =>
          o.status === 'pending' ||
          o.status === 'confirmed' ||
          o.status === 'PENDING' ||
          o.status === 'CONFIRMED'
      ),
    [tableOrders]
  )

  const prepOrders = useMemo(
    () =>
      tableOrders.filter(
        (o) =>
          o.status === 'preparing' ||
          o.status === 'cooking' ||
          o.status === 'PREPARING'
      ),
    [tableOrders]
  )

  const readyOrServedOrders = useMemo(
    () =>
      tableOrders.filter(
        (o) =>
          o.status === 'ready' ||
          o.status === 'served' ||
          o.status === 'completed' ||
          o.status === 'READY' ||
          o.status === 'SERVED' ||
          o.status === 'COMPLETED'
      ),
    [tableOrders]
  )

  const totalActiveOrders = queueOrders.length + prepOrders.length

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Must be available
      if (item.isAvailable === false) return false

      // Category match
      if (selectedCategory !== 'all') {
        const matchesCat =
          item.categoryId === selectedCategory ||
          (item.category || '').toLowerCase() === selectedCategory.toLowerCase()
        if (!matchesCat) return false
      }

      // Veg only match
      if (vegOnly && !item.isVeg) return false

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = item.name.toLowerCase().includes(q)
        const matchDesc = item.description?.toLowerCase().includes(q)
        const matchCat = item.category?.toLowerCase().includes(q)
        if (!matchName && !matchDesc && !matchCat) return false
      }

      return true
    })
  }, [menuItems, selectedCategory, vegOnly, searchQuery])

  // Group items by category for structured browsing
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CustomerMenuItem[]>()
    for (const item of filteredItems) {
      const cat = item.category || 'Specialties'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [filteredItems])

  // Place Order handler
  const handlePlaceOrder = async () => {
    if (cartItemCount === 0) {
      setOrderError('Your cart is empty. Please add items before placing order.')
      return
    }

    if (!tableNumber) {
      setShowTableModal(true)
      return
    }

    try {
      setSubmitting(true)
      setOrderError(null)

      const payload = {
        tableNumber,
        orderType: 'dine_in',
        status: 'pending',
        notes: orderNotes.trim() || undefined,
        totalAmount: cartGrandTotal,
        items: cartItemList.map((ci) => ({
          menuItemId: ci.menuItem.id,
          name: ci.menuItem.name,
          price: ci.menuItem.price,
          quantity: ci.quantity,
          specialInstructions: ci.specialInstructions,
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to place order. Please try again.')
      }

      // Order created successfully
      const confirmed: OrderConfirmationData = {
        ...json.data,
        items: cartItemList.map((ci) => ({
          name: ci.menuItem.name,
          quantity: ci.quantity,
          price: ci.menuItem.price,
        })),
      }

      setConfirmedOrder(confirmed)
      setLiveStatus(confirmed.status || 'pending')
      setCart({})
      setIsCartOpen(false)
      setOrderNotes('')
    } catch (err: any) {
      console.error('Order creation failed:', err)
      setOrderError(err.message || 'Network error occurred while sending order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Polling for live status of placed order
  useEffect(() => {
    if (!confirmedOrder?.id) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${confirmedOrder.id}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setLiveStatus(json.data.status)
          }
        }
      } catch (e) {
        // silent retry
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [confirmedOrder?.id])

  // Clean description helper to remove internal warehouse/SKU text
  const getCleanDescription = (desc?: string) => {
    if (!desc) return ''
    if (/sku:/i.test(desc) || /in stock:/i.test(desc)) {
      const stripped = desc
        .replace(/sku:\s*[^\s|]+\s*\|?\s*/gi, '')
        .replace(/in\s*stock:\s*[^|]+\s*\|?\s*/gi, '')
        .trim()
      return stripped
    }
    return desc
  }

  // Helper format table badge (e.g. T12, Table 01)
  const displayTableBadge = useMemo(() => {
    if (!tableNumber) return 'No Table'
    let s = String(tableNumber).trim()
    if (/^tt\d+/i.test(s)) s = s.replace(/^tt(\d+)/i, 'T$1')
    if (/^t\d+/i.test(s)) return s.toUpperCase()
    if (/^\d+$/.test(s)) return `Table ${s.padStart(2, '0')}`
    return s
  }, [tableNumber])

  // Active categories with available items only (hides empty 0-item categories)
  const activeCategories = useMemo(() => {
    return categories.filter((cat) => {
      const count = menuItems.filter(
        (i) => i.categoryId === cat.id || (i.category || '').toLowerCase() === cat.name.toLowerCase()
      ).length
      return count > 0
    })
  }, [categories, menuItems])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary/20 transition-colors duration-200">
      {/* 1. TOP CUSTOMER HEADER */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/70 px-4 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center font-bold shadow-md shadow-primary/25">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight leading-none text-foreground">
                  Spice Garden
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  Dine-in
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Table Self-Ordering Menu
              </p>
            </div>
          </div>

          {/* Right Header Actions: Table Badge + Live Orders + Cart */}
          <div className="flex items-center gap-2">
            {/* Locked Table Number Badge */}
            {tableNumber ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-black shadow-xs select-none"
                title="Table locked for dine-in delivery"
              >
                <Lock className="size-3" />
                <span>{displayTableBadge}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTableModal(true)}
                className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
              >
                <QrCode className="size-3.5" />
                Select Table
              </Button>
            )}

            {/* Live Orders & Queue Tracker Button */}
            {tableOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOrdersModal(true)}
                className="h-9 px-3 rounded-xl font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-xs"
              >
                <Clock className="size-3.5 text-primary" />
                <span className="hidden sm:inline">Orders</span>
                {totalActiveOrders > 0 ? (
                  <span className="flex items-center gap-1 text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                    {queueOrders.length > 0 && `Queue (${queueOrders.length})`}
                    {queueOrders.length > 0 && prepOrders.length > 0 && ' · '}
                    {prepOrders.length > 0 && `Prep (${prepOrders.length})`}
                  </span>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                    {tableOrders.length}
                  </Badge>
                )}
              </Button>
            )}

            {/* Cart Icon Button with Counter */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="relative h-9 px-3.5 rounded-xl font-extrabold gap-2 shadow-md shadow-primary/25 cursor-pointer"
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-white text-primary text-[11px] font-black shadow-sm">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 2. LIVE ORDER CONFIRMATION MODAL / SCREEN */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl overflow-hidden p-6 text-center space-y-5">
            {/* Success icon */}
            <div className="mx-auto size-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border-2 border-emerald-500/30">
              <CheckCircle2 className="size-9 animate-bounce" />
            </div>

            <div>
              <Badge className="mb-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs px-3 py-1">
                Order Received by Kitchen
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight">Order Confirmed!</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Your order has been sent to the kitchen display screen.
              </p>
            </div>

            {/* Reference Number & Table Details Card */}
            <div className="bg-muted/40 p-4 rounded-2xl border border-border/80 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Order Reference</span>
                <span className="font-mono font-bold text-sm text-primary">
                  {confirmedOrder.orderNumber}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Dining Table</span>
                <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                  <Lock className="size-3 text-muted-foreground" />
                  {displayTableBadge}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Live Status</span>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize font-bold px-2.5 py-0.5 ${
                    liveStatus === 'confirmed' || liveStatus === 'accepted'
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-600'
                      : liveStatus === 'preparing' || liveStatus === 'cooking'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 animate-pulse'
                      : liveStatus === 'ready' || liveStatus === 'served'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                      : 'border-neutral-400 bg-neutral-100 dark:bg-neutral-800 text-foreground'
                  }`}
                >
                  <ChefHat className="size-3 mr-1" />
                  {liveStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between font-bold pt-1">
                <span className="text-sm">Total Amount</span>
                <span className="text-base text-primary">₹{confirmedOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Items Summary */}
            {confirmedOrder.items && confirmedOrder.items.length > 0 && (
              <div className="text-left text-xs bg-muted/20 p-3 rounded-xl border border-border/60 max-h-36 overflow-y-auto space-y-1.5">
                <p className="font-semibold text-muted-foreground mb-1">Ordered Items:</p>
                {confirmedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-foreground">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span className="text-muted-foreground">₹{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Status Timeline */}
            <div className="py-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-2">
                <span className={liveStatus ? 'text-primary font-bold' : ''}>1. Received</span>
                <span className={liveStatus === 'preparing' || liveStatus === 'served' ? 'text-primary font-bold' : ''}>2. Preparing</span>
                <span className={liveStatus === 'served' || liveStatus === 'completed' ? 'text-emerald-600 font-bold' : ''}>3. Served</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{
                    width:
                      liveStatus === 'completed' || liveStatus === 'served'
                        ? '100%'
                        : liveStatus === 'preparing' || liveStatus === 'ready'
                        ? '66%'
                        : '33%',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmedOrder(null)}
                className="flex-1 font-semibold rounded-xl h-11"
              >
                Order More Items
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MISSING TABLE MODAL PROMPT */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-card border border-border shadow-2xl rounded-3xl p-6 text-center space-y-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <QrCode className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Which table are you at?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Scan your table QR code sticker or enter your table number below to order.
              </p>
            </div>

            <form onSubmit={handleSetTable} className="space-y-3">
              <Input
                type="text"
                placeholder="e.g. 5, 12, or VIP-1"
                value={manualTableInput}
                onChange={(e) => setManualTableInput(e.target.value)}
                autoFocus
                className="text-center font-bold text-lg h-12 rounded-xl"
              />
              <Button
                type="submit"
                disabled={!manualTableInput.trim()}
                className="w-full h-11 rounded-xl font-bold"
              >
                Confirm Table
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* 4. LIVE TABLE ORDERS & QUEUE MODAL */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl overflow-hidden p-6 text-left space-y-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ChefHat className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">
                    Live Table Orders & Kitchen Queue
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Active tickets for {displayTableBadge}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOrdersModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* 1. Queue Orders */}
              {queueOrders.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                    <Clock className="size-4 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>In Kitchen Queue ({queueOrders.length})</span>
                  </div>
                  <div className="space-y-2">
                    {queueOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {ord.orderNumber}
                          </span>
                          <Badge className="bg-amber-500 text-black text-[10px] font-extrabold">
                            In Queue
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Order received. Waiting for chef to select into preparation.
                        </p>
                        <div className="space-y-1 pt-1 border-t border-amber-500/20 text-xs">
                          {(ord.items || []).map((it: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-foreground font-medium">
                              <span>
                                {it.quantity}x {it.name}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                ₹{Number(it.total || (it.price || 0) * it.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Preparation Orders */}
              {prepOrders.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <Flame className="size-4 animate-pulse text-chart-4" />
                    <span>In Kitchen Preparation ({prepOrders.length})</span>
                  </div>
                  <div className="space-y-2">
                    {prepOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {ord.orderNumber}
                          </span>
                          <Badge className="bg-chart-4 text-white text-[10px] font-extrabold animate-pulse">
                            Chef Cooking
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Chef has selected this order and is actively preparing your dishes.
                        </p>
                        <div className="space-y-1 pt-1 border-t border-primary/20 text-xs">
                          {(ord.items || []).map((it: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-foreground font-medium">
                              <span>
                                {it.quantity}x {it.name}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                ₹{Number(it.total || (it.price || 0) * it.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Ready / Served Orders */}
              {readyOrServedOrders.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Ready / Served ({readyOrServedOrders.length})</span>
                  </div>
                  <div className="space-y-2">
                    {readyOrServedOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 opacity-85"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {ord.orderNumber}
                          </span>
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            {ord.status === 'ready' ? 'Ready' : 'Served'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs">
                          {(ord.items || []).map((it: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-muted-foreground">
                              <span>
                                {it.quantity}x {it.name}
                              </span>
                              <span>₹{Number(it.total || (it.price || 0) * it.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tableOrders.length === 0 && (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <UtensilsCrossed className="size-10 mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No active orders for this table yet</p>
                  <p className="text-xs">Browse the menu below and add items to your cart to order.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-border flex gap-2">
              <Button
                variant="default"
                className="w-full h-11 rounded-xl font-bold"
                onClick={() => setShowOrdersModal(false)}
              >
                + Order More Items from Menu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-5 pb-28">
        {/* Table Banner Notification if locked */}
        {tableNumber && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-foreground">
                      Dining at <span className="text-primary">{displayTableBadge}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Dine-in Locked
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Dishes will be delivered directly to your table
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setManualTableInput(tableNumber)
                  setShowTableModal(true)
                }}
                className="h-8 text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10 shrink-0 ml-auto sm:ml-0 cursor-pointer"
              >
                Change Table
              </Button>
            </div>
          </div>
        )}

        {/* Live Orders Status Quick Pill Banner */}
        {totalActiveOrders > 0 && (
          <div
            onClick={() => setShowOrdersModal(true)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 border border-primary/30 shadow-xs cursor-pointer hover:border-primary transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                <ChefHat className="size-4 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {queueOrders.length > 0 && prepOrders.length > 0
                    ? `${queueOrders.length} in Queue · ${prepOrders.length} in Kitchen Prep`
                    : queueOrders.length > 0
                    ? `${queueOrders.length} order waiting in Kitchen Queue`
                    : `${prepOrders.length} order actively cooking in Kitchen`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Tap to track live cooking progress & queue orders
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs font-bold rounded-lg border-primary/40">
              Track <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* Search & Vegetarian Filter Row */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, ingredients..."
              className="pl-10 h-11 rounded-2xl bg-card border-border/80 text-sm shadow-xs focus-visible:ring-primary/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Pure Veg Toggle */}
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            className={cn(
              'flex items-center gap-2 h-11 px-4 rounded-2xl border text-xs font-extrabold transition-all shadow-xs cursor-pointer select-none shrink-0',
              vegOnly
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10'
                : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <span
              className={cn(
                'size-2.5 rounded-full transition-all',
                vegOnly ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-muted-foreground/40'
              )}
            />
            <span>Veg Only</span>
          </button>
        </div>

        {/* Category Pills (Horizontal Sticky Bar) */}
        <div className="sticky top-[61px] z-20 -mx-4 px-4 py-2.5 bg-background/95 backdrop-blur-md border-b border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer select-none',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]'
                : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/30'
            )}
          >
            All Items ({menuItems.length})
          </button>
          {activeCategories.map((cat) => {
            const count = menuItems.filter(
              (i) => i.categoryId === cat.id || (i.category || '').toLowerCase() === cat.name.toLowerCase()
            ).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer select-none',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/30'
                )}
              >
                {cat.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl border border-border/60 bg-card/60 p-4 animate-pulse flex justify-between"
              >
                <div className="space-y-2.5 flex-1 pr-4">
                  <div className="h-4 w-12 bg-muted rounded" />
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded pt-1" />
                </div>
                <div className="size-24 rounded-2xl bg-muted shrink-0" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="py-12 px-6 text-center bg-card rounded-3xl border border-destructive/20 space-y-3">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="font-bold text-sm">Unable to load menu</h3>
            <p className="text-xs text-muted-foreground">{fetchError}</p>
            <Button size="sm" onClick={loadMenu} className="gap-1.5 rounded-xl">
              <RefreshCw className="size-3.5" /> Retry
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-card rounded-3xl border border-border/80 p-8 space-y-3">
            <UtensilsCrossed className="size-10 text-muted-foreground mx-auto opacity-50" />
            <h3 className="font-bold text-base">No available items found</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              We couldn't find any dishes matching your filters. Try clearing search or selecting a different category.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setVegOnly(false)
              }}
              className="rounded-xl text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          /* Structured Dishes Grid */
          <div className="space-y-8 pt-2">
            {Array.from(itemsByCategory.entries()).map(([catName, items]) => (
              <section key={catName} className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                      {catName}
                    </h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => {
                    const inCartQty = cart[item.id]?.quantity || 0
                    const desc = getCleanDescription(item.description)

                    return (
                      <div
                        key={item.id}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-xs hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex gap-4 items-start">
                          {/* Left: Info */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Dietary badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.isVeg ? (
                                <span
                                  className="size-4 border-2 border-emerald-600 dark:border-emerald-500 rounded-sm flex items-center justify-center p-0.5 shrink-0"
                                  title="Pure Vegetarian"
                                >
                                  <span className="size-2 bg-emerald-600 dark:bg-emerald-500 rounded-full" />
                                </span>
                              ) : (
                                <span
                                  className="size-4 border-2 border-rose-600 dark:border-rose-500 rounded-sm flex items-center justify-center p-0.5 shrink-0"
                                  title="Non-Vegetarian"
                                >
                                  <span className="size-2 bg-rose-600 dark:border-rose-500 rounded-full" />
                                </span>
                              )}

                              {item.isSpicy && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Flame className="size-3" />
                                  Spicy
                                </span>
                              )}

                              {item.prepTime && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                  <Clock className="size-3" />
                                  {item.prepTime}m
                                </span>
                              )}
                            </div>

                            {/* Dish Name */}
                            <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                              {item.name}
                            </h3>

                            {/* Clean Description */}
                            {desc && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {desc}
                              </p>
                            )}

                            {/* Price */}
                            <div className="pt-2">
                              <span className="text-lg font-black text-foreground tracking-tight">
                                ₹{item.price.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Right: Dish Image / Add Button */}
                          <div className="flex flex-col items-center justify-between shrink-0 w-28 gap-2.5">
                            {/* Image container */}
                            <div className="relative size-24 rounded-2xl overflow-hidden bg-muted/40 border border-border/80 shadow-xs flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    ;(e.target as HTMLElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-muted/30 to-background p-2 text-center">
                                  <UtensilsCrossed className="size-7 text-primary/40 mb-1" />
                                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                    {item.category?.slice(0, 8) || 'Fresh'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Controls: Add or Quantity increment/decrement */}
                            <div className="w-full">
                              {inCartQty === 0 ? (
                                <Button
                                  size="sm"
                                  onClick={() => addToCart(item)}
                                  className="w-full h-8 text-xs font-extrabold rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 transition-all shadow-xs cursor-pointer active:scale-95"
                                >
                                  + ADD
                                </Button>
                              ) : (
                                <div className="flex items-center justify-between w-full h-8 bg-primary text-primary-foreground rounded-xl px-1.5 shadow-md shadow-primary/20 font-bold">
                                  <button
                                    onClick={() => decrementCart(item.id)}
                                    className="size-6 flex items-center justify-center rounded-lg hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="size-3.5" />
                                  </button>
                                  <span className="font-extrabold text-xs px-1">
                                    {inCartQty}
                                  </span>
                                  <button
                                    onClick={() => addToCart(item)}
                                    className="size-6 flex items-center justify-center rounded-lg hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="size-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* 5. STICKY BOTTOM CART FLOATING BAR (MOBILE & DESKTOP) */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-5 inset-x-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-primary text-primary-foreground rounded-2xl shadow-2xl hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer font-bold border border-primary-foreground/20"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center text-xs font-black shadow-inner">
                {cartItemCount}
              </div>
              <div className="text-left leading-tight">
                <p className="text-[11px] font-semibold text-primary-foreground/85 uppercase tracking-wide">
                  {cartItemCount === 1 ? '1 Dish' : `${cartItemCount} Dishes`} Added
                </p>
                <p className="text-base font-extrabold tracking-tight">
                  ₹{cartGrandTotal.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black bg-white/20 px-3.5 py-1.5 rounded-xl">
              <span>View Cart</span>
              <ArrowRight className="size-4" />
            </div>
          </button>
        </div>
      )}

      {/* 6. CART DRAWER / SIDE SHEET */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-primary" />
                <h2 className="font-extrabold text-base">Your Order</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCartOpen(false)}
                className="size-8 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Table Number Locked Status */}
            <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Ordering For</p>
                  <p className="text-sm font-extrabold text-foreground">{displayTableBadge}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-background text-muted-foreground">
                Locked to Session
              </Badge>
            </div>

            {/* Error banner inside drawer if any */}
            {orderError && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItemList.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <ShoppingBag className="size-10 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-xs text-muted-foreground font-medium">Your cart is empty</p>
                </div>
              ) : (
                cartItemList.map(({ menuItem, quantity }) => (
                  <div
                    key={menuItem.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs truncate text-foreground">
                        {menuItem.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        ₹{menuItem.price.toFixed(2)} each
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-background border border-border rounded-xl">
                        <button
                          onClick={() => decrementCart(menuItem.id)}
                          className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="font-bold text-xs px-2">{quantity}</span>
                        <button
                          onClick={() => addToCart(menuItem)}
                          className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <span className="font-extrabold text-xs text-foreground min-w-12 text-right">
                        ₹{(menuItem.price * quantity).toFixed(2)}
                      </span>

                      <button
                        onClick={() => removeFromCart(menuItem.id)}
                        className="text-muted-foreground/60 hover:text-destructive p-1"
                        title="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Special Instructions */}
              {cartItemList.length > 0 && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Special Instructions (optional)
                  </label>
                  <Textarea
                    placeholder="e.g. Less spicy, allergy to peanuts, extra lime..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="text-xs resize-none rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Bill Summary & Place Order Footer */}
            {cartItemList.length > 0 && (
              <div className="p-4 border-t border-border bg-card space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (5%)</span>
                    <span>₹{cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-foreground pt-1 border-t border-border/60">
                    <span>Grand Total</span>
                    <span className="text-primary">₹{cartGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={submitting || cartItemCount === 0}
                  className="w-full h-12 rounded-xl font-extrabold text-sm shadow-md"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="size-4 animate-spin" />
                      Sending to Kitchen...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Place Order (₹{cartGrandTotal.toFixed(2)})
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

