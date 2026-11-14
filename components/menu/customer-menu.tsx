'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  ArrowLeft,
  ChevronLeft,
  Flame,
  Leaf,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Star,
  Check,
  SlidersHorizontal,
  Edit3,
  Receipt,
} from 'lucide-react'
import { CustomerBillModal } from '@/components/billing/customer-bill-modal'
import { ThemeToggle } from '@/components/ui/theme-toggle'
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

export interface ItemCustomization {
  spiceLevel: 'Mild' | 'Medium' | 'Spicy' | 'Extra Spicy'
  vegPreference: 'Veg' | 'Non-Veg'
  sauces: string[]
  cheese: string
  cheeseCost: number
  specialNote?: string
}

export interface CartItem {
  cartKey: string
  menuItem: CustomerMenuItem
  quantity: number
  unitPrice: number
  customization?: ItemCustomization
  specialInstructions?: string
}

export function generateCartKey(itemId: string, cust?: ItemCustomization): string {
  if (!cust) return itemId
  const saucesKey = (cust.sauces || []).slice().sort().join('-')
  return `${itemId}_${cust.spiceLevel || 'Med'}_${cust.vegPreference || 'Veg'}_${cust.cheese || 'NoCheese'}_${saucesKey}`
}

export const SPICE_OPTIONS = [
  { id: 'Mild', label: 'Mild', desc: 'No red chilli, kid-friendly' },
  { id: 'Medium', label: 'Medium', desc: 'Balanced traditional spices' },
  { id: 'Spicy', label: 'Spicy', desc: 'Extra green chillies 🔥' },
  { id: 'Extra Spicy', label: 'Extra Spicy', desc: 'Fiery hot chef special 🔥🔥' },
] as const

export const SAUCE_OPTIONS = [
  { id: 'Mint Chutney', label: 'Mint Chutney', desc: 'Fresh pudina & curd dip' },
  { id: 'Garlic Mayo', label: 'Garlic Mayo Dip', desc: 'Creamy garlic dip' },
  { id: 'Sweet Saunth', label: 'Sweet Saunth', desc: 'Tangy tamarind chutney' },
  { id: 'Schezwan Dip', label: 'Schezwan Dip', desc: 'Spicy chilli dipping sauce' },
  { id: 'Tomato Ketchup', label: 'Tomato Ketchup', desc: 'Classic condiment' },
]

export const CHEESE_OPTIONS = [
  { id: 'No Extra Cheese', label: 'No Extra Cheese', cost: 0 },
  { id: 'Cheese Slice', label: 'Cheese Slice (+₹20)', cost: 20 },
  { id: 'Extra Amul Cheese', label: 'Extra Amul Grated Cheese (+₹30)', cost: 30 },
  { id: 'Mozzarella Cheese Burst', label: 'Mozzarella Cheese Burst (+₹45)', cost: 45 },
]

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

export const LIFECYCLE_STEPS = [
  { step: 1, label: 'Order Placed', shortLabel: 'Placed', icon: ShoppingBag },
  { step: 2, label: 'Accepted by Waiter', shortLabel: 'Accepted', icon: CheckCircle2 },
  { step: 3, label: 'Preparing in Kitchen', shortLabel: 'Preparing', icon: Flame },
  { step: 4, label: 'Ready to Serve', shortLabel: 'Ready', icon: ChefHat },
  { step: 5, label: 'Served', shortLabel: 'Served', icon: UtensilsCrossed },
]

export function getOrderLifecycleInfo(status: string) {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'served' || s === 'completed') {
    return {
      step: 5,
      label: 'Served',
      badgeColor: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
      description: 'Your food has been served to your table. Enjoy your meal!',
    }
  }
  if (s === 'ready') {
    return {
      step: 4,
      label: 'Ready to Serve',
      badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
      description: 'Dishes are freshly prepared & ready for table serving!',
    }
  }
  if (s === 'preparing' || s === 'cooking') {
    return {
      step: 3,
      label: 'Preparing in Kitchen',
      badgeColor: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
      description: 'Chef is actively cooking your fresh dishes in the kitchen.',
    }
  }
  if (s === 'accepted' || s === 'confirmed') {
    return {
      step: 2,
      label: 'Accepted by Waiter',
      badgeColor: 'border-primary/40 bg-primary/10 text-primary',
      description: 'Waiter has verified and accepted your order. Routed to kitchen queue.',
    }
  }
  return {
    step: 1,
    label: 'Order Placed',
    badgeColor: 'border-warning/40 bg-warning/10 text-warning',
    description: 'Order placed from table. Waiting for waiter to confirm & accept.',
  }
}

export function CustomerMenu() {
  const searchParams = useSearchParams()
  const router = useRouter()

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
  const [showBillModal, setShowBillModal] = useState<boolean>(false)

  // 4. Filters & Pagination State
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [vegOnly, setVegOnly] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(8)

  // 5. Cart & Drawer State
  const [cart, setCart] = useState<{ [cartKey: string]: CartItem }>({})
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [orderNotes, setOrderNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  // 5b. Customization Modal State
  const [customizingItem, setCustomizingItem] = useState<CustomerMenuItem | null>(null)
  const [editingCartKey, setEditingCartKey] = useState<string | null>(null)
  const [draftSpice, setDraftSpice] = useState<'Mild' | 'Medium' | 'Spicy' | 'Extra Spicy'>('Medium')
  const [draftVeg, setDraftVeg] = useState<'Veg' | 'Non-Veg'>('Veg')
  const [draftSauces, setDraftSauces] = useState<string[]>([])
  const [draftCheese, setDraftCheese] = useState<string>('No Extra Cheese')
  const [draftCheeseCost, setDraftCheeseCost] = useState<number>(0)
  const [draftSpecialNote, setDraftSpecialNote] = useState<string>('')

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

  // Helper to count total quantity of a menu item across all customized keys
  const getItemQtyInCart = (itemId: string) => {
    return Object.values(cart)
      .filter((ci) => ci.menuItem.id === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0)
  }

  // Open Customization Modal (for new item or editing existing cart item)
  const openCustomizeModal = (
    item: CustomerMenuItem,
    cartKey?: string,
    existingCust?: ItemCustomization
  ) => {
    setCustomizingItem(item)
    setEditingCartKey(cartKey || null)

    if (existingCust) {
      setDraftSpice(existingCust.spiceLevel)
      setDraftVeg(existingCust.vegPreference)
      setDraftSauces(existingCust.sauces || [])
      setDraftCheese(existingCust.cheese)
      setDraftCheeseCost(existingCust.cheeseCost || 0)
      setDraftSpecialNote(existingCust.specialNote || '')
    } else {
      setDraftSpice(item.isSpicy ? 'Spicy' : 'Medium')
      setDraftVeg(item.isVeg ? 'Veg' : 'Non-Veg')
      setDraftSauces([])
      setDraftCheese('No Extra Cheese')
      setDraftCheeseCost(0)
      setDraftSpecialNote('')
    }
  }

  const toggleDraftSauce = (sauceId: string) => {
    setDraftSauces((prev) =>
      prev.includes(sauceId) ? prev.filter((s) => s !== sauceId) : [...prev, sauceId]
    )
  }

  const handleSelectCheese = (cheeseOption: { id: string; label: string; cost: number }) => {
    setDraftCheese(cheeseOption.id)
    setDraftCheeseCost(cheeseOption.cost)
  }

  const handleSaveCustomization = () => {
    if (!customizingItem) return

    const customization: ItemCustomization = {
      spiceLevel: draftSpice,
      vegPreference: draftVeg,
      sauces: draftSauces,
      cheese: draftCheese,
      cheeseCost: draftCheeseCost,
      specialNote: draftSpecialNote.trim() || undefined,
    }

    const instructionParts: string[] = []
    instructionParts.push(`Spice: ${draftSpice}`)
    instructionParts.push(draftVeg === 'Veg' ? 'Veg 🟢' : 'Non-Veg 🔴')
    if (draftCheeseCost > 0) {
      instructionParts.push(`${draftCheese} (+₹${draftCheeseCost})`)
    }
    if (draftSauces.length > 0) {
      instructionParts.push(`Sauce: ${draftSauces.join(', ')}`)
    }
    if (draftSpecialNote.trim()) {
      instructionParts.push(`Note: ${draftSpecialNote.trim()}`)
    }
    const specialInstructions = instructionParts.join(' • ')

    const unitPrice = customizingItem.price + draftCheeseCost
    const newKey = generateCartKey(customizingItem.id, customization)

    setCart((prev) => {
      const copy = { ...prev }

      if (editingCartKey && editingCartKey !== newKey) {
        const oldQty = copy[editingCartKey]?.quantity || 1
        delete copy[editingCartKey]
        copy[newKey] = {
          cartKey: newKey,
          menuItem: customizingItem,
          quantity: (copy[newKey]?.quantity || 0) + oldQty,
          unitPrice,
          customization,
          specialInstructions,
        }
      } else if (editingCartKey && editingCartKey === newKey) {
        copy[newKey] = {
          ...copy[newKey],
          unitPrice,
          customization,
          specialInstructions,
        }
      } else {
        copy[newKey] = {
          cartKey: newKey,
          menuItem: customizingItem,
          quantity: (copy[newKey]?.quantity || 0) + 1,
          unitPrice,
          customization,
          specialInstructions,
        }
      }

      return copy
    })

    setCustomizingItem(null)
    setEditingCartKey(null)
  }

  // Quick 1-click add from menu item cards
  const addToCart = (item: CustomerMenuItem) => {
    const matchingKey = Object.keys(cart).find((k) => cart[k].menuItem.id === item.id)
    if (matchingKey) {
      setCart((prev) => ({
        ...prev,
        [matchingKey]: {
          ...prev[matchingKey],
          quantity: prev[matchingKey].quantity + 1,
        },
      }))
    } else {
      const defaultCust: ItemCustomization = {
        spiceLevel: item.isSpicy ? 'Spicy' : 'Medium',
        vegPreference: item.isVeg ? 'Veg' : 'Non-Veg',
        sauces: [],
        cheese: 'No Extra Cheese',
        cheeseCost: 0,
      }
      const specialInstructions = `Spice: ${defaultCust.spiceLevel} • ${defaultCust.vegPreference === 'Veg' ? 'Veg 🟢' : 'Non-Veg 🔴'}`
      const newKey = generateCartKey(item.id, defaultCust)
      setCart((prev) => ({
        ...prev,
        [newKey]: {
          cartKey: newKey,
          menuItem: item,
          quantity: 1,
          unitPrice: item.price,
          customization: defaultCust,
          specialInstructions,
        },
      }))
    }
  }

  // Quick decrement from menu item cards
  const decrementCart = (itemId: string) => {
    const matchingKeys = Object.keys(cart).filter((k) => cart[k].menuItem.id === itemId)
    if (matchingKeys.length === 0) return
    const keyToDec = matchingKeys[matchingKeys.length - 1]
    decrementCartKey(keyToDec)
  }

  // Precise cart drawer operations by cartKey
  const decrementCartKey = (key: string) => {
    setCart((prev) => {
      const existing = prev[key]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const copy = { ...prev }
        delete copy[key]
        return copy
      }
      return {
        ...prev,
        [key]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      }
    })
  }

  const incrementCartKey = (key: string) => {
    setCart((prev) => {
      const existing = prev[key]
      if (!existing) return prev
      return {
        ...prev,
        [key]: {
          ...existing,
          quantity: existing.quantity + 1,
        },
      }
    })
  }

  const removeFromCartKey = (key: string) => {
    setCart((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  // Calculate cart totals (using dynamic unitPrice including customization extras)
  const cartItemList = useMemo(() => Object.values(cart), [cart])
  const cartItemCount = useMemo(
    () => cartItemList.reduce((sum, item) => sum + item.quantity, 0),
    [cartItemList]
  )
  const cartSubtotal = useMemo(
    () =>
      cartItemList.reduce(
        (sum, item) => sum + (item.unitPrice ?? item.menuItem.price) * item.quantity,
        0
      ),
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
          o.status === 'CONFIRMED' ||
          o.status === 'accepted' ||
          o.status === 'ACCEPTED'
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

  // Reset pagination to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchQuery, vegOnly, itemsPerPage])

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))

  // Paginated slice of filtered items for optimized DOM rendering
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  // Group paginated items by category for structured browsing
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CustomerMenuItem[]>()
    for (const item of paginatedItems) {
      const cat = item.category || 'Specialties'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [paginatedItems])

  const handlePageChange = (newPage: number) => {
    const target = Math.max(1, Math.min(newPage, totalPages))
    setCurrentPage(target)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 160, behavior: 'smooth' })
    }
  }

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }, [router])

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
          price: ci.unitPrice ?? ci.menuItem.price,
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
          price: ci.unitPrice ?? ci.menuItem.price,
        })),
      }

      setConfirmedOrder(confirmed)
      setLiveStatus(confirmed.status || 'pending')
      setCart({})
      setIsCartOpen(false)
      setOrderNotes('')
      // Instantly open live order tracker
      setShowOrdersModal(true)
      // Background non-blocking table orders refresh
      fetchTableOrders()
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
          {/* Back Button + Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="h-9 px-2.5 sm:px-3 rounded-xl border-border/80 hover:bg-muted text-foreground font-semibold gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline text-xs font-bold">Back</span>
            </Button>

            <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center font-bold shadow-md shadow-primary/25 shrink-0">
              <UtensilsCrossed className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight leading-none text-foreground truncate">
                  RestoSphere
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                  Dine-in
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
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

            {/* Live Orders Button - Always prominent in header */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrdersModal(true)}
              className="h-9 px-3 rounded-xl font-extrabold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-xs cursor-pointer relative"
              title="Track live table orders and kitchen status"
            >
              <Clock className="size-3.5 text-primary" />
              <span>Live Orders</span>
              {tableOrders.length > 0 && (
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full text-[10px] font-black shadow-xs',
                    totalActiveOrders > 0
                      ? 'bg-primary text-primary-foreground animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tableOrders.length}
                </span>
              )}
            </Button>

            {/* Bring Bill / Pay Button (Visible once customer has placed at least one order) */}
            {tableOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBillModal(true)}
                className="h-9 px-3 rounded-xl font-extrabold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs cursor-pointer"
                title="View itemized bill, tip waiter, or pay online"
              >
                <Receipt className="size-3.5 text-emerald-500" />
                <span>Bill & Tip</span>
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

            {/* Mobile / Customer Light-Dark Theme Toggle */}
            <ThemeToggle showLabel={false} className="h-9 w-9 p-0 rounded-xl" />
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

      {/* 4. LIVE TABLE ORDERS & REAL-TIME 5-STEP TRACKER MODAL */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden p-5 sm:p-6 text-left space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    Live Table Orders
                    {totalActiveOrders > 0 && (
                      <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Live status tracking for {displayTableBadge} · updates automatically
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() => fetchTableOrders()}
                  title="Refresh Orders"
                >
                  <RefreshCw className="size-4" />
                </Button>
                <button
                  onClick={() => setShowOrdersModal(false)}
                  className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Orders List with Stepper */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {tableOrders.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground space-y-3">
                  <div className="size-12 rounded-2xl bg-muted/50 text-muted-foreground flex items-center justify-center mx-auto">
                    <ShoppingBag className="size-6 opacity-60" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">No orders placed yet for this table</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Explore the menu, add your favorite dishes to the cart, and place an order to track live progress here.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl font-bold text-xs mt-2"
                    onClick={() => setShowOrdersModal(false)}
                  >
                    Browse Menu
                  </Button>
                </div>
              ) : (
                tableOrders.map((ord: any) => {
                  const stepInfo = getOrderLifecycleInfo(ord.status)
                  const itemsList = ord.items || []
                  const s = String(ord.status || '').toLowerCase().trim()
                  const isServed = s === 'served' || s === 'completed'
                  // Show only 4 steps until staff marks it served! "Served" step only appears when served.
                  const activeSteps = isServed ? LIFECYCLE_STEPS : LIFECYCLE_STEPS.slice(0, 4)
                  const currentActiveIndex = isServed
                    ? 4
                    : Math.max(0, Math.min(activeSteps.length - 1, stepInfo.step - 1))
                  const progressPercent =
                    activeSteps.length > 1
                      ? (currentActiveIndex / (activeSteps.length - 1)) * 100
                      : 0

                  return (
                    <div
                      key={ord.id || ord.orderNumber}
                      className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3.5 hover:border-primary/40 transition-colors"
                    >
                      {/* Ticket Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-foreground">
                              {ord.orderNumber || ord.id}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-extrabold capitalize px-2 py-0.5',
                                stepInfo.badgeColor
                              )}
                            >
                              {stepInfo.label}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
                            Placed {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-primary block">
                            ₹{Number(ord.totalAmount || ord.total || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {ord.paymentStatus || 'pay at counter'}
                          </span>
                        </div>
                      </div>

                      {/* ── Visual Stepper Tracker (Served step hidden until served) ── */}
                      <div className="py-3 px-3 bg-muted/40 rounded-2xl border border-border/50">
                        <div className="flex items-center justify-between relative px-2 sm:px-4">
                          {/* Connector line container with strict bounds and overflow-hidden */}
                          <div className="absolute top-3.5 left-5 right-5 h-1 z-0 overflow-hidden rounded-full bg-muted-foreground/20">
                            <div
                              className="h-full bg-gradient-to-r from-warning via-primary to-emerald-500 transition-all duration-500 rounded-full"
                              style={{
                                width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                              }}
                            />
                          </div>

                          {activeSteps.map((st) => {
                            const isDone = isServed ? true : stepInfo.step > st.step
                            const isCurrent = isServed ? st.step === 5 : stepInfo.step === st.step
                            const StepIcon = st.icon

                            return (
                              <div key={st.step} className="flex flex-col items-center z-10 gap-1.5">
                                <div
                                  className={cn(
                                    'size-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300',
                                    isDone && !isCurrent
                                      ? 'bg-emerald-500 text-black shadow-xs font-black'
                                      : isCurrent
                                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse shadow-md font-black scale-110'
                                      : 'bg-card border border-border text-muted-foreground/60'
                                  )}
                                >
                                  {isDone && !isCurrent ? (
                                    <Check className="size-3.5 stroke-[3]" />
                                  ) : (
                                    <StepIcon className="size-3.5" />
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'text-[10px] tracking-tight text-center leading-tight',
                                    isCurrent
                                      ? 'font-black text-foreground'
                                      : isDone
                                      ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                      : 'text-muted-foreground/60 font-medium'
                                  )}
                                >
                                  {st.shortLabel}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Status Description Explainer */}
                        <div className="mt-3.5 p-2.5 rounded-xl bg-background/90 border border-border/60 text-xs flex items-center gap-2">
                          <span className="font-bold text-foreground shrink-0 text-[11px] uppercase tracking-wide">
                            Live Update:
                          </span>
                          <span className={cn('text-xs font-semibold leading-snug', stepInfo.badgeColor.split(' ')[2])}>
                            {stepInfo.description}
                          </span>
                        </div>
                      </div>

                      {/* Ordered Items List with Customization Details */}
                      <div className="space-y-2 pt-1 text-xs border-t border-border/50">
                        {itemsList.map((it: any, i: number) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-center text-foreground font-medium">
                              <span>
                                <span className="text-primary font-bold mr-1.5">{it.quantity}x</span>
                                {it.name}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                ₹{Number(it.total || (it.price || 0) * it.quantity).toFixed(2)}
                              </span>
                            </div>
                            {(it.notes || it.specialInstructions) && (
                              <span className="text-[10px] text-amber-500/90 font-medium pl-4">
                                ↳ {it.notes || it.specialInstructions}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Order Special Notes */}
                      {ord.notes && (
                        <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-xl border border-border/50 flex items-start gap-1.5">
                          <span className="font-semibold text-foreground">Note:</span>
                          <span>{ord.notes}</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
              {tableOrders.length > 0 && (
                <Button
                  variant="default"
                  className="flex-1 h-11 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md cursor-pointer"
                  onClick={() => {
                    setShowOrdersModal(false)
                    setShowBillModal(true)
                  }}
                >
                  <Receipt className="size-4" />
                  <span>Bring Bill & Tip Waiter</span>
                </Button>
              )}
              <Button
                variant={tableOrders.length > 0 ? 'outline' : 'default'}
                className="flex-1 h-11 rounded-xl font-bold cursor-pointer"
                onClick={() => setShowOrdersModal(false)}
              >
                Continue Browsing Menu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4b. CUSTOMIZE DISH MODAL (Spices, Veg/Non-Veg, Sauces, Cheese, Chef Notes) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl overflow-hidden p-5 sm:p-6 text-left space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">
                    {editingCartKey ? 'Edit Customisation' : 'Customise Dish'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-foreground mt-0.5">
                  {customizingItem.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Base: ₹{customizingItem.price.toFixed(2)}
                  {draftCheeseCost > 0 && (
                    <span className="text-emerald-500 font-bold ml-1.5">
                      + ₹{draftCheeseCost} cheese
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setCustomizingItem(null)
                  setEditingCartKey(null)
                }}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Customization Options */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* 1. Veg / Non-Veg Preference */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Dietary Preference</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDraftVeg('Veg')}
                    className={cn(
                      'flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer',
                      draftVeg === 'Veg'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                        : 'border-border/80 hover:bg-muted text-muted-foreground'
                    )}
                  >
                    <span className="size-3.5 border-2 border-emerald-600 dark:border-emerald-500 rounded-sm flex items-center justify-center p-0.5">
                      <span className="size-1.5 bg-emerald-600 dark:bg-emerald-500 rounded-full" />
                    </span>
                    <span>Pure Veg 🟢</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftVeg('Non-Veg')}
                    className={cn(
                      'flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer',
                      draftVeg === 'Non-Veg'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/30'
                        : 'border-border/80 hover:bg-muted text-muted-foreground'
                    )}
                  >
                    <span className="size-3.5 border-2 border-rose-600 dark:border-rose-500 rounded-sm flex items-center justify-center p-0.5">
                      <span className="size-1.5 bg-rose-600 dark:border-rose-500 rounded-full" />
                    </span>
                    <span>Non-Veg 🔴</span>
                  </button>
                </div>
              </div>

              {/* 2. Spices Level */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Flame className="size-3.5 text-amber-500" />
                  <span>Spice Level</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SPICE_OPTIONS.map((sp) => {
                    const isSelected = draftSpice === sp.id
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => setDraftSpice(sp.id as any)}
                        className={cn(
                          'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/25 shadow-xs'
                            : 'border-border/80 hover:bg-muted text-foreground'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs">{sp.label}</span>
                          {isSelected && <Check className="size-3.5 text-primary stroke-[3]" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium leading-tight">
                          {sp.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Cheese Options */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Cheese Customisation</span>
                </label>
                <div className="space-y-1.5">
                  {CHEESE_OPTIONS.map((ch) => {
                    const isSelected = draftCheese === ch.id
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleSelectCheese(ch)}
                        className={cn(
                          'w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer',
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/25'
                            : 'border-border/80 hover:bg-muted text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'size-4 rounded-full border flex items-center justify-center transition-all',
                              isSelected
                                ? 'border-amber-500 bg-amber-500 text-black'
                                : 'border-muted-foreground/40'
                            )}
                          >
                            {isSelected && <span className="size-1.5 bg-black rounded-full" />}
                          </div>
                          <span className="text-xs font-bold">{ch.label}</span>
                        </div>
                        <span className="text-xs font-black text-primary">
                          {ch.cost > 0 ? `+₹${ch.cost}` : 'Included'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. Sauces & Dips (Multi-select) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Complimentary Sauces & Dips
                  </label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    (Multi-select)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAUCE_OPTIONS.map((sc) => {
                    const isChecked = draftSauces.includes(sc.id)
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => toggleDraftSauce(sc.id)}
                        className={cn(
                          'p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2',
                          isChecked
                            ? 'border-emerald-500/60 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/30'
                            : 'border-border/80 hover:bg-muted text-muted-foreground'
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground leading-snug">
                            {sc.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{sc.desc}</p>
                        </div>
                        <div
                          className={cn(
                            'size-4 rounded-md border flex items-center justify-center shrink-0 transition-all',
                            isChecked
                              ? 'border-emerald-500 bg-emerald-500 text-black'
                              : 'border-muted-foreground/40'
                          )}
                        >
                          {isChecked && <Check className="size-3 stroke-[3]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 5. Special Notes / Chef Instruction */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Special Cooking Instructions (Optional)
                </label>
                <Textarea
                  placeholder="e.g. Extra crispy, less oil, separate chutney..."
                  value={draftSpecialNote}
                  onChange={(e) => setDraftSpecialNote(e.target.value)}
                  rows={2}
                  className="text-xs resize-none rounded-xl"
                />
              </div>
            </div>

            {/* Modal Footer with Live Dynamic Price and Save/Add Action */}
            <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Item Total
                </span>
                <span className="text-base font-black text-foreground">
                  ₹{(customizingItem.price + draftCheeseCost).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomizingItem(null)
                    setEditingCartKey(null)
                  }}
                  className="rounded-xl font-bold text-xs h-10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCustomization}
                  className="rounded-xl font-extrabold text-xs h-10 px-4 gap-2 shadow-md cursor-pointer"
                >
                  <Check className="size-4" />
                  <span>
                    {editingCartKey ? 'Update Item' : 'Add to Order'} · ₹
                    {(customizingItem.price + draftCheeseCost).toFixed(2)}
                  </span>
                </Button>
              </div>
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
                    const inCartQty = getItemQtyInCart(item.id)
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

                            {/* Controls: Add or Quantity increment/decrement + Customise */}
                            <div className="w-full space-y-1">
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

                              <button
                                type="button"
                                onClick={() => openCustomizeModal(item)}
                                className="w-full text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors cursor-pointer py-0.5"
                                title="Customise Spices, Veg/Non-Veg, Sauces & Cheese"
                              >
                                <SlidersHorizontal className="size-2.5 text-primary" />
                                <span>Customise</span>
                              </button>
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

        {/* 4b. PAGINATION CONTROLS */}
        {!loading && !fetchError && filteredItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2 border-t border-border/60">
            {/* Range info and items per page selector */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium flex-wrap">
              <span>
                Showing{' '}
                <strong className="text-foreground font-bold">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, filteredItems.length)}
                </strong>
                –
                <strong className="text-foreground font-bold">
                  {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                </strong>{' '}
                of <strong className="text-foreground font-bold">{filteredItems.length}</strong> dishes
              </span>

              {/* Items per page selector */}
              <div className="flex items-center gap-1 pl-2 border-l border-border/60">
                <span className="text-[11px] text-muted-foreground hidden sm:inline">Per page:</span>
                {[6, 8, 12, 24].map((size) => (
                  <button
                    key={size}
                    onClick={() => setItemsPerPage(size)}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer',
                      itemsPerPage === size
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Page navigation buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1]
                      const showEllipsis = prev && p - prev > 1

                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && (
                            <span className="text-muted-foreground text-xs px-1 select-none">…</span>
                          )}
                          <button
                            onClick={() => handlePageChange(p)}
                            className={cn(
                              'size-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center select-none',
                              currentPage === p
                                ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                                : 'border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      )
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
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
                cartItemList.map((item) => (
                  <div
                    key={item.cartKey}
                    className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-foreground truncate">
                          {item.menuItem.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          ₹{item.unitPrice.toFixed(2)} each
                        </p>

                        {/* Customization Details Badges */}
                        {item.customization && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Flame className="size-2.5" />
                              {item.customization.spiceLevel}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border',
                                item.customization.vegPreference === 'Veg'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              )}
                            >
                              {item.customization.vegPreference === 'Veg' ? 'Veg 🟢' : 'Non-Veg 🔴'}
                            </span>
                            {item.customization.cheeseCost > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                {item.customization.cheese}
                              </span>
                            )}
                            {item.customization.sauces.length > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                                {item.customization.sauces.join(', ')}
                              </span>
                            )}
                            {item.customization.specialNote && (
                              <span className="text-[10px] text-muted-foreground italic block w-full mt-0.5">
                                Note: "{item.customization.specialNote}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit Customization Trigger */}
                        <button
                          type="button"
                          onClick={() => openCustomizeModal(item.menuItem, item.cartKey, item.customization)}
                          className="px-2 py-1 rounded-lg hover:bg-primary/15 text-primary font-bold text-[10px] flex items-center gap-1 border border-primary/25 bg-primary/5 cursor-pointer transition-colors"
                          title="Edit Customisation"
                        >
                          <Edit3 className="size-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => removeFromCartKey(item.cartKey)}
                          className="text-muted-foreground/60 hover:text-destructive p-1 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity controls & item total */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <div className="flex items-center bg-background border border-border rounded-xl">
                        <button
                          onClick={() => decrementCartKey(item.cartKey)}
                          className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="font-bold text-xs px-2">{item.quantity}</span>
                        <button
                          onClick={() => incrementCartKey(item.cartKey)}
                          className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <span className="font-black text-xs text-foreground font-mono">
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
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
      {/* Floating Bottom Bar for Mobile / Table QR Customers */}
      <div className="fixed bottom-3 inset-x-3 sm:hidden z-40 flex items-center gap-2 max-w-md mx-auto">
        {tableOrders.length > 0 && (
          <Button
            onClick={() => setShowBillModal(true)}
            className="h-12 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xl flex items-center justify-center gap-1.5 shrink-0"
          >
            <Receipt className="size-4" />
            <span>Bill & Tip</span>
          </Button>
        )}

        <Button
          onClick={() => setShowOrdersModal(true)}
          className="flex-1 h-12 rounded-2xl bg-card/95 backdrop-blur-md border border-primary/40 text-primary hover:bg-primary/10 font-bold text-xs shadow-xl flex items-center justify-center gap-2"
        >
          <Clock className="size-4 text-primary" />
          <span>Live Orders</span>
          {tableOrders.length > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 h-4 font-black">
              {tableOrders.length}
            </Badge>
          )}
        </Button>

        <Button
          onClick={() => setIsCartOpen(true)}
          className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xs shadow-xl flex items-center justify-center gap-2"
        >
          <ShoppingBag className="size-4" />
          <span>Cart ({cartItemCount})</span>
          {cartItemCount > 0 && <span>· ₹{cartGrandTotal.toFixed(0)}</span>}
        </Button>
      </div>

      {/* 7. DIGITAL BILL & POST-SERVICE TIPPING MODAL */}
      <CustomerBillModal
        open={showBillModal}
        onOpenChange={setShowBillModal}
        tableNumber={tableNumber}
        tableOrders={tableOrders}
        onSuccess={() => {
          fetchTableOrders()
        }}
      />
    </div>
  )
}

