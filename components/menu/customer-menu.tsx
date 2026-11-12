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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

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

  // 3. Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [vegOnly, setVegOnly] = useState<boolean>(false)

  // 4. Cart & Drawer State
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({})
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [orderNotes, setOrderNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  // 5. Order Confirmation State
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
        fetch('/api/menu/items'),
        fetch('/api/menu/categories'),
      ])

      const itemsJson = await itemsRes.json()
      const catJson = await catRes.json()

      if (itemsJson.success && Array.isArray(itemsJson.data)) {
        // Strict filter: display ONLY items where isAvailable === true
        const availableOnly = itemsJson.data.filter((item: CustomerMenuItem) => item.isAvailable === true)
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

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

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

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Must be available
      if (item.isAvailable !== true) return false

      // Category match
      if (selectedCategory !== 'all') {
        const matchesCat =
          item.categoryId === selectedCategory ||
          item.category.toLowerCase() === selectedCategory.toLowerCase()
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

  // Helper format badge
  const displayTableBadge = tableNumber
    ? /^\d+$/.test(tableNumber)
      ? `Table ${tableNumber.padStart(2, '0')}`
      : `Table ${tableNumber}`
    : 'No Table'

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-foreground flex flex-col antialiased">
      {/* 1. TOP CUSTOMER HEADER */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/80 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight leading-none text-foreground">
                Spice Garden
              </h1>
              <span className="text-[11px] text-muted-foreground font-medium">
                Dine-In Self Ordering
              </span>
            </div>
          </div>

          {/* Right Header Actions: Locked Table Badge + Cart Trigger */}
          <div className="flex items-center gap-2">
            {/* Locked Table Number Badge */}
            {tableNumber ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold shadow-xs select-none"
                title="Ordering for this table (Session locked)"
              >
                <Lock className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>{displayTableBadge}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTableModal(true)}
                className="h-8 text-xs font-semibold gap-1 text-primary border-primary/40"
              >
                <QrCode className="size-3.5" />
                Enter Table
              </Button>
            )}

            {/* Cart Icon Button with Counter */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="relative h-9 px-3.5 rounded-xl font-bold gap-2 shadow-sm"
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-white text-primary text-[11px] font-extrabold shadow-sm">
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

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4 pb-28">
        {/* Table Banner Notification if locked */}
        {tableNumber && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-2xl px-4 py-2.5 text-xs text-foreground">
            <div className="flex items-center gap-2">
              <Lock className="size-3.5 text-primary" />
              <span>
                Ordering for <strong className="font-bold text-primary">{displayTableBadge}</strong>. Dishes will be delivered directly to this table.
              </span>
            </div>
            <button
              onClick={() => {
                setManualTableInput(tableNumber)
                setShowTableModal(true)
              }}
              className="text-[11px] font-semibold text-primary underline underline-offset-2 hover:opacity-80 ml-2 shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>
        )}

        {/* Search & Vegetarian Filter Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, ingredients..."
              className="pl-9 h-11 rounded-xl bg-card border-border/80 text-sm shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Pure Veg Toggle */}
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 h-11 px-3.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
              vegOnly
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                : 'bg-card border-border/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="size-2 rounded-full bg-emerald-600" />
            Veg Only
          </button>
        </div>

        {/* Category Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter(
              (i) => i.categoryId === cat.id || i.category.toLowerCase() === cat.name.toLowerCase()
            ).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="size-8 text-primary animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading live menu...</p>
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
          <div className="space-y-6">
            {Array.from(itemsByCategory.entries()).map(([catName, items]) => (
              <section key={catName} className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span>{catName}</span>
                    <span className="text-[11px] font-normal text-muted-foreground/70">
                      ({items.length})
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((item) => {
                    const inCartQty = cart[item.id]?.quantity || 0

                    return (
                      <Card
                        key={item.id}
                        className="overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                      >
                        <CardContent className="p-3.5 flex gap-3.5">
                          {/* Left: Info */}
                          <div className="flex-1 space-y-1">
                            {/* Dietary badge */}
                            <div className="flex items-center gap-1.5">
                              {item.isVeg ? (
                                <span
                                  className="size-3.5 border border-emerald-600 rounded-sm flex items-center justify-center p-0.5 shrink-0"
                                  title="Vegetarian"
                                >
                                  <span className="size-1.5 bg-emerald-600 rounded-full" />
                                </span>
                              ) : (
                                <span
                                  className="size-3.5 border border-rose-600 rounded-sm flex items-center justify-center p-0.5 shrink-0"
                                  title="Non-Vegetarian"
                                >
                                  <span className="size-1.5 bg-rose-600 rounded-full" />
                                </span>
                              )}

                              {item.isSpicy && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                                  <Flame className="size-3" />
                                  Spicy
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-sm text-foreground leading-snug">
                              {item.name}
                            </h3>

                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-base font-extrabold text-foreground">
                                ₹{item.price.toFixed(2)}
                              </span>
                              {item.prepTime && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                                  <Clock className="size-3" />
                                  {item.prepTime}m
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Dish Image / Add Button */}
                          <div className="flex flex-col items-center justify-between shrink-0 w-24">
                            {/* Image container */}
                            <div className="size-20 rounded-xl bg-muted/60 overflow-hidden relative flex items-center justify-center border border-border/60">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to placeholder icon
                                    ;(e.target as HTMLElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <UtensilsCrossed className="size-6 text-muted-foreground/40" />
                              )}
                            </div>

                            {/* Controls: Add or Quantity increment/decrement */}
                            <div className="w-full mt-2">
                              {inCartQty === 0 ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart(item)}
                                  className="w-full h-8 text-xs font-bold rounded-xl border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground shadow-xs cursor-pointer"
                                >
                                  + Add
                                </Button>
                              ) : (
                                <div className="flex items-center justify-between w-full h-8 bg-primary text-primary-foreground rounded-xl px-1.5 shadow-sm">
                                  <button
                                    onClick={() => decrementCart(item.id)}
                                    className="size-6 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <span className="font-extrabold text-xs px-1">
                                    {inCartQty}
                                  </span>
                                  <button
                                    onClick={() => addToCart(item)}
                                    className="size-6 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
        <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between p-3.5 bg-foreground text-background rounded-2xl shadow-xl hover:opacity-95 transition-all cursor-pointer font-bold"
          >
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-xl bg-background/20 text-background flex items-center justify-center text-xs font-extrabold">
                {cartItemCount}
              </span>
              <div className="text-left leading-tight">
                <p className="text-xs font-semibold opacity-90">View Your Order</p>
                <p className="text-sm font-extrabold">₹{cartGrandTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-extrabold">
              <span>Checkout</span>
              <ChevronRight className="size-4" />
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

