'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
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
  Car,
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Music,
  Headphones,
  Crown,
  BellRing,
  Gift,
  Tag,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CustomerLocationLock,
  CustomerLocationData,
  isValidCoord,
} from '@/components/orders/CustomerLocationLock'
import { CustomerBillModal } from '@/components/billing/customer-bill-modal'
import { SongRequestModal } from '@/components/customer/song-request-modal'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { LiveBatchAddonBanner } from '@/components/orders/LiveBatchAddonBanner'

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

  // 1b. Order Mode & Highway Drive-In Delivery State
  const [orderMode, setOrderMode] = useState<'dine_in' | 'drive_in'>('dine_in')
  const [isDriveInModalOpen, setIsDriveInModalOpen] = useState<boolean>(false)
  const [locationData, setLocationData] = useState<CustomerLocationData>({
    isLocationLocked: false,
    vehicleNumber: '',
    landmarkNote: '',
    customerLat: null,
    customerLng: null,
    locationAccuracy: null,
    locationCapturedAt: null,
  })

  // 2. Data State
  const [menuItems, setMenuItems] = useState<CustomerMenuItem[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // 3. Table Orders & Live Queue State
  const [tableOrders, setTableOrders] = useState<any[]>([])
  const [showOrdersModal, setShowOrdersModal] = useState<boolean>(false)
  const [showBillModal, setShowBillModal] = useState<boolean>(false)
  const [selectedOrderIdForBill, setSelectedOrderIdForBill] = useState<string | null>(null)
  const [showSongModal, setShowSongModal] = useState<boolean>(false)

  // Append Mode State (Attach dishes to active running live order)
  const [isAppendMode, setIsAppendMode] = useState<boolean>(false)
  const [appendTargetOrder, setAppendTargetOrder] = useState<any | null>(null)

  // Real-time tick for live dish preparation countdown timers
  const [liveNow, setLiveNow] = useState<number>(Date.now())
  useEffect(() => {
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setLiveNow(Date.now())
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // 4. Filters & Pagination State
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(8)

  // 5. Cart & Drawer State
  const [cart, setCart] = useState<{ [cartKey: string]: CartItem }>({})
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [orderNotes, setOrderNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Coupon & Review Discount State
  const [couponInput, setCouponInput] = useState<string>('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [appliedCouponPercent, setAppliedCouponPercent] = useState<number>(0)
  const [appliedCouponMinOrder, setAppliedCouponMinOrder] = useState<number>(0)
  const [couponMessage, setCouponMessage] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState<boolean>(false)
  const [savedReviewCoupon, setSavedReviewCoupon] = useState<string | null>(null)
  const [customerAuth, setCustomerAuth] = useState<{
    id: string
    name: string
    isFirstOrder: boolean
    totalOrders: number
    hasSubmittedReview: boolean
    reviewDiscountCode: string | null
    reviewDiscountClaimed: boolean
  } | null>(null)

  // Auto-detect customer profile & saved review discount coupon from localStorage/session
  useEffect(() => {
    try {
      const saved = localStorage.getItem('resto_saved_coupon')
      if (saved) {
        setSavedReviewCoupon(saved)
        setCouponInput(saved)
      }
    } catch (e) {}

    fetch('/api/customer/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.customer) {
          setCustomerAuth(data.customer)
          // If customer has never ordered before (first-time customer), suggest FIRST15
          if (data.customer.isFirstOrder) {
            setCouponInput('FIRST15')
          } else if (data.customer.reviewDiscountCode && !data.customer.reviewDiscountClaimed) {
            setSavedReviewCoupon(data.customer.reviewDiscountCode)
            setCouponInput(data.customer.reviewDiscountCode)
          }
        }
      })
      .catch(() => {})
  }, [])

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

  // Initialize and persist table number / drive-in vehicle info from searchParams or localStorage
  useEffect(() => {
    const urlTable = searchParams?.get('table') || searchParams?.get('tableNumber')
    const urlMode = searchParams?.get('mode') || searchParams?.get('orderType')
    const urlVehicle = searchParams?.get('vehicle') || searchParams?.get('vehicleNumber')
    const urlLandmark = searchParams?.get('landmark') || searchParams?.get('spot')
    const isDriveInParam =
      urlMode === 'drive_in' ||
      urlMode === 'car' ||
      searchParams?.get('drive_in') === 'true' ||
      Boolean(urlVehicle)

    let initialMode: 'dine_in' | 'drive_in' = 'dine_in'
    if (urlTable && urlTable.trim()) {
      // Table in URL (e.g. ?table=1 from QR code) always defaults to Dine-In
      initialMode = 'dine_in'
      if (typeof window !== 'undefined') {
        localStorage.setItem('rms_customer_order_mode', 'dine_in')
      }
    } else if (isDriveInParam) {
      initialMode = 'drive_in'
    } else if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('rms_customer_order_mode')
      if (savedMode === 'drive_in') {
        initialMode = 'drive_in'
      }
    }
    setOrderMode(initialMode)

    if (typeof window !== 'undefined') {
      try {
        const savedLoc = localStorage.getItem('rms_customer_location')
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc)
          setLocationData((prev) => ({
            ...prev,
            ...parsed,
            vehicleNumber: urlVehicle ? String(urlVehicle).trim().toUpperCase() : parsed.vehicleNumber || '',
            landmarkNote: urlLandmark ? String(urlLandmark).trim() : parsed.landmarkNote || '',
          }))
        } else if (urlVehicle || urlLandmark) {
          setLocationData((prev) => ({
            ...prev,
            vehicleNumber: urlVehicle ? String(urlVehicle).trim().toUpperCase() : '',
            landmarkNote: urlLandmark ? String(urlLandmark).trim() : '',
          }))
        }
      } catch (e) {
        // ignore
      }
    }

    const savedTable = typeof window !== 'undefined' ? localStorage.getItem('rms_customer_table') : null

    if (urlTable && urlTable.trim()) {
      const clean = urlTable.trim()
      setTableNumber(clean)
      setIsTableLocked(true)
      localStorage.setItem('rms_customer_table', clean)
    } else if (savedTable && savedTable.trim()) {
      setTableNumber(savedTable.trim())
      setIsTableLocked(true)
    } else if (!isDriveInParam && initialMode !== 'drive_in') {
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
        // Display all available menu items (strictly excluding raw warehouse inventory items)
        const availableOnly = itemsJson.data.filter(
          (item: CustomerMenuItem) =>
            item.isAvailable !== false &&
            (item.category || '').toLowerCase().trim() !== 'inventory' &&
            !/^sku:\s*[^\s|]+\s*\|/i.test(item.description || '') &&
            (item as any).source !== 'inventory'
        )
        setMenuItems(availableOnly)
      } else {
        throw new Error(itemsJson.message || 'Failed to load menu items')
      }

      if (catJson.success && Array.isArray(catJson.data)) {
        const cleanCategories = catJson.data.filter(
          (cat: any) => (cat.name || '').toLowerCase().trim() !== 'inventory'
        )
        setCategories(cleanCategories)
      }
    } catch (err: any) {
      console.error('Error loading menu:', err)
      setFetchError(err.message || 'Failed to connect to menu server')
    } finally {
      setLoading(false)
    }
  }, [])

  // Active table / car delivery key for live orders polling
  const activeTableKey = useMemo(() => {
    if (orderMode === 'drive_in') {
      return locationData.vehicleNumber
        ? `🚗 ${locationData.vehicleNumber.trim().toUpperCase()}`
        : '🚗 Car Delivery'
    }
    return tableNumber
  }, [orderMode, locationData.vehicleNumber, tableNumber])

  // Poll active table orders so customer sees live queue & cooking updates in real time
  const fetchTableOrders = useCallback(async () => {
    if (!activeTableKey) return
    try {
      const res = await fetch(`/api/orders?table=${encodeURIComponent(activeTableKey)}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setTableOrders(json.data)
        }
      }
    } catch (err) {
      console.warn('Error fetching live table orders:', err)
    }
  }, [activeTableKey])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  // Visibility-aware polling (pauses automatically when tab is hidden)
  useEffect(() => {
    fetchTableOrders()
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTableOrders()
      }
    }, 4000)

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTableOrders()
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }

    return () => {
      clearInterval(timer)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }
  }, [fetchTableOrders])

  // Detect appendOrderId from URL query
  useEffect(() => {
    const urlAppendId = searchParams?.get('appendOrderId')
    if (urlAppendId && tableOrders.length > 0) {
      const matched = tableOrders.find((o: any) => o.id === urlAppendId)
      if (matched) {
        setIsAppendMode(true)
        setAppendTargetOrder(matched)
      }
    }
  }, [searchParams, tableOrders])

  // Handle manual table entry submission
  const handleSetTable = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTableInput.trim()) return
    const clean = manualTableInput.trim()
    setTableNumber(clean)
    setOrderMode('dine_in')
    setIsTableLocked(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('rms_customer_table', clean)
      localStorage.setItem('rms_customer_order_mode', 'dine_in')
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
  // Dynamic Discount Calculation (First-Time 15%, Existing Customer / Review 10%)
  const isCouponMinOrderMet = cartSubtotal >= appliedCouponMinOrder
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0
    if (!isCouponMinOrderMet) return 0
    const percent = appliedCouponPercent > 0 ? appliedCouponPercent : (appliedCoupon === 'FIRST15' ? 15 : 10)
    return Math.round(cartSubtotal * (percent / 100) * 100) / 100
  }, [appliedCoupon, isCouponMinOrderMet, appliedCouponPercent, cartSubtotal])

  const taxableSubtotal = Math.max(0, cartSubtotal - discountAmount)
  const cartTax = Math.round(taxableSubtotal * 0.05 * 100) / 100
  const cartGrandTotal = Math.round((taxableSubtotal + cartTax) * 100) / 100

  // Coupon validation & application handlers
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase()
    if (!code) {
      setCouponError('Please enter a coupon code')
      return
    }

    setValidatingCoupon(true)
    setCouponError(null)
    setCouponMessage(null)

    try {
      const res = await fetch('/api/customer/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code, subtotal: cartSubtotal }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setCouponError(data.message || 'Invalid coupon code')
        return
      }

      setAppliedCoupon(code)
      setAppliedCouponPercent(data.discountPercent || (code === 'FIRST15' ? 15 : 10))
      setAppliedCouponMinOrder(data.minOrder ?? (code === 'FIRST15' ? 0 : 300))
      setCouponMessage(data.message)
      setCouponError(null)
    } catch (e) {
      // Offline / fallback verification
      if (code === 'FIRST15') {
        setAppliedCoupon(code)
        setAppliedCouponPercent(15)
        setAppliedCouponMinOrder(0)
        setCouponMessage('15% First-Time Customer Discount Applied!')
      } else if (code === 'EXISTING10' || code === 'WELCOME10') {
        setAppliedCoupon(code)
        setAppliedCouponPercent(10)
        setAppliedCouponMinOrder(1000)
        setCouponMessage(
          cartSubtotal >= 1000
            ? '10% Discount Applied on Order above ₹1,000!'
            : `Add ₹${(1000 - cartSubtotal).toFixed(2)} more to unlock 10% discount (Minimum order ₹1,000).`
        )
      } else if (code.startsWith('REVIEW10') || code.includes('REVIEW')) {
        setAppliedCoupon(code)
        setAppliedCouponPercent(10)
        setAppliedCouponMinOrder(300)
        setCouponMessage(
          cartSubtotal >= 300
            ? '10% Discount Applied!'
            : `Add ₹${(300 - cartSubtotal).toFixed(2)} more to unlock 10% discount.`
        )
      } else {
        setCouponError('Could not validate coupon code. Please try again.')
      }
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setAppliedCouponPercent(0)
    setCouponMessage(null)
    setCouponError(null)
  }

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

      // Dietary match (Veg / Non-Veg)
      if (dietaryFilter === 'veg' && !item.isVeg) return false
      if (dietaryFilter === 'non-veg' && item.isVeg) return false

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
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery])

  // Reset pagination to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchQuery, dietaryFilter, itemsPerPage])

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

    if (orderMode === 'drive_in') {
      if (!locationData.vehicleNumber && !locationData.landmarkNote && !isValidCoord(locationData.customerLat, locationData.customerLng)) {
        setIsDriveInModalOpen(true)
        setOrderError('Please enter your vehicle number or highway parking spot before placing order.')
        return
      }
    } else if (!tableNumber) {
      setShowTableModal(true)
      return
    }

    try {
      setSubmitting(true)
      setOrderError(null)

      const finalTable = orderMode === 'drive_in'
        ? (locationData.vehicleNumber ? `🚗 ${locationData.vehicleNumber.trim().toUpperCase()}` : '🚗 Car Delivery')
        : tableNumber

      // ── Handle Append Mode (Attach to Existing Live Order) ──
      if (isAppendMode && appendTargetOrder) {
        const appendPayload = {
          orderId: appendTargetOrder.id,
          tableNumber: finalTable || appendTargetOrder.tableNumber || '1',
          customerName: typeof window !== 'undefined' ? localStorage.getItem('rms_customer_name') || 'Table Guest' : 'Table Guest',
          items: cartItemList.map((ci) => ({
            menuItemId: ci.menuItem.id,
            name: ci.menuItem.name,
            dishName: ci.menuItem.name,
            price: ci.unitPrice ?? ci.menuItem.price,
            quantity: ci.quantity,
            notes: ci.specialInstructions,
            isAddon: true,
          })),
        }

        const res = await fetch('/api/orders/live-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appendPayload),
        })

        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to attach items to live order.')
        }

        // Successfully attached! Reset cart and append mode
        setCart({})
        setIsCartOpen(false)
        setIsAppendMode(false)
        setAppendTargetOrder(null)
        setOrderNotes('')
        setShowOrdersModal(true)
        await fetchTableOrders()
        return
      }

      const payload = {
        tableNumber: finalTable,
        orderType: orderMode === 'drive_in' ? 'drive_in' : 'dine_in',
        status: 'pending',
        notes: orderNotes.trim() || undefined,
        totalAmount: cartGrandTotal,
        couponCode: appliedCoupon && isCouponMinOrderMet ? appliedCoupon : undefined,
        discountAmount: appliedCoupon && isCouponMinOrderMet ? discountAmount : 0,
        discountPercentage: appliedCoupon && isCouponMinOrderMet ? (appliedCouponPercent || 10) : 0,
        vehicleNumber: orderMode === 'drive_in' ? (locationData.vehicleNumber?.trim().toUpperCase() || undefined) : undefined,
        landmarkNote: orderMode === 'drive_in' ? (locationData.landmarkNote?.trim() || undefined) : undefined,
        customerLat: orderMode === 'drive_in' ? locationData.customerLat : undefined,
        customerLng: orderMode === 'drive_in' ? locationData.customerLng : undefined,
        locationAccuracy: orderMode === 'drive_in' ? locationData.locationAccuracy : undefined,
        isLocationLocked: orderMode === 'drive_in' ? true : undefined,
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
      // Clear applied and saved coupon upon order completion
      try {
        localStorage.removeItem('resto_saved_coupon')
      } catch (e) {}
      setAppliedCoupon(null)
      setSavedReviewCoupon(null)
      setCouponMessage(null)
      setCouponError(null)
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

  // Helper format table / vehicle badge (e.g. T12, Table 01, 🚗 DL 01 AB 1234)
  const displayTableBadge = useMemo(() => {
    if (orderMode === 'drive_in') {
      if (locationData.vehicleNumber) {
        return `🚗 ${locationData.vehicleNumber.trim().toUpperCase()}`
      }
      return '🚗 Car Delivery'
    }
    if (!tableNumber) return 'No Table'
    let s = String(tableNumber).trim()
    if (/^tt\d+/i.test(s)) s = s.replace(/^tt(\d+)/i, 'T$1')
    if (/^t\d+/i.test(s)) return s.toUpperCase()
    if (/^\d+$/.test(s)) return `Table ${s.padStart(2, '0')}`
    return s
  }, [orderMode, locationData.vehicleNumber, tableNumber])

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

            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer" title="Go to Home Page">
              <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center font-bold shadow-md shadow-primary/25 shrink-0">
                <UtensilsCrossed className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight leading-none text-foreground truncate">
                    RestoSphere
                  </h1>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {orderMode === 'drive_in' ? 'Highway Food Cart / Car Ordering' : 'Table Self-Ordering Menu'}
                </p>
              </div>
            </Link>
          </div>

          {/* Right Header Actions: Mode Toggle (Dine-In & Drive-In) + Live Orders + Cart */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 1. Dine-In Option (Editable Table Number) */}
            <Button
              type="button"
              variant={orderMode === 'dine_in' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOrderMode('dine_in')
                if (typeof window !== 'undefined') {
                  localStorage.setItem('rms_customer_order_mode', 'dine_in')
                }
                setManualTableInput(tableNumber || '')
                setShowTableModal(true)
              }}
              className={cn(
                'h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all',
                orderMode === 'dine_in'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              title="Dine-In - Click to select or edit table"
            >
              <UtensilsCrossed className="size-3.5" />
              <span>Dine-In</span>
              {tableNumber ? (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5',
                  orderMode === 'dine_in'
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-foreground'
                )}>
                  {tableNumber.toLowerCase().startsWith('table') ? tableNumber : `Table ${tableNumber}`}
                  <Edit3 className="size-2.5 opacity-80" />
                </span>
              ) : (
                <span className="text-[10px] opacity-75 font-normal hidden sm:inline">(Set Table)</span>
              )}
            </Button>

            {/* 2. Drive-In Option (Editable Spot Details) */}
            <Button
              type="button"
              variant={orderMode === 'drive_in' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOrderMode('drive_in')
                if (typeof window !== 'undefined') {
                  localStorage.setItem('rms_customer_order_mode', 'drive_in')
                }
                setIsDriveInModalOpen(true)
              }}
              className={cn(
                'h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all',
                orderMode === 'drive_in'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-amber-600/20'
                  : 'border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              title="Drive-In - Click to edit vehicle / spot delivery details"
            >
              <Car className="size-3.5" />
              <span>Drive-In</span>
              {locationData.vehicleNumber ? (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5 max-w-[80px] truncate',
                  orderMode === 'drive_in'
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-foreground'
                )}>
                  {locationData.vehicleNumber}
                  <Edit3 className="size-2.5 opacity-80" />
                </span>
              ) : (
                <span className="text-[10px] opacity-75 font-normal hidden sm:inline">(Car Spot)</span>
              )}
            </Button>

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

      {/* ── APPEND MODE ACTIVE BANNER ──────────────────────── */}
      {isAppendMode && appendTargetOrder && (
        <div className="sticky top-16 z-30 p-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-xl rounded-2xl mx-4 my-2 flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Flame className="size-4 animate-bounce" />
            </div>
            <div className="min-w-0 text-xs">
              <p className="font-extrabold truncate">
                Append Mode Active: Adding to Live Order #{appendTargetOrder.orderNumber || appendTargetOrder.id}
              </p>
              <p className="text-[11px] text-white/90 truncate">
                Newly selected dishes attach directly to your existing running table bill
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAppendMode(false)
              setAppendTargetOrder(null)
            }}
            className="h-8 px-3 text-xs font-bold bg-white text-orange-600 border-white hover:bg-white/90 shrink-0 cursor-pointer shadow-sm"
          >
            Cancel Append
          </Button>
        </div>
      )}

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

      {/* 3. DINE-IN TABLE SELECTION / EDIT MODAL */}
      {showTableModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTableModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-sm bg-card border border-border shadow-2xl rounded-3xl p-6 text-center space-y-4">
            <div className="flex justify-end absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTableModal(false)}
                className="size-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <UtensilsCrossed className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Select Dine-In Table</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Choose or type your table number for direct table service.
              </p>
            </div>

            {/* Quick Table Selection Pills */}
            <div className="space-y-1.5 text-left pt-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block text-center">
                Quick Select Table
              </label>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((t) => {
                  const isSelected = manualTableInput === t || tableNumber === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setManualTableInput(t)
                        setTableNumber(t)
                        setOrderMode('dine_in')
                        setIsTableLocked(true)
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('rms_customer_table', t)
                          localStorage.setItem('rms_customer_order_mode', 'dine_in')
                        }
                        setShowTableModal(false)
                      }}
                      className={cn(
                        'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-muted/60 hover:bg-muted text-foreground border-border/70'
                      )}
                    >
                      Table {t}
                    </button>
                  )
                })}
              </div>
            </div>

            <form onSubmit={handleSetTable} className="space-y-3 pt-1">
              <Input
                type="text"
                placeholder="Or custom table (e.g. 10, VIP-1)"
                value={manualTableInput}
                onChange={(e) => setManualTableInput(e.target.value)}
                autoFocus
                className="text-center font-bold text-base h-11 rounded-xl"
              />
              <Button
                type="submit"
                disabled={!manualTableInput.trim()}
                className="w-full h-11 rounded-xl font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirm Table
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground text-[10px] font-bold">OR SWITCH MODE</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTableModal(false)
                setOrderMode('drive_in')
                if (typeof window !== 'undefined') {
                  localStorage.setItem('rms_customer_order_mode', 'drive_in')
                }
                setIsDriveInModalOpen(true)
              }}
              className="w-full h-11 rounded-xl font-bold text-xs gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
            >
              <Car className="size-4" />
              <span>🚗 Switch to Highway Car Drive-In</span>
            </Button>
          </div>
        </div>
      )}

      {/* 4. LIVE TABLE ORDERS & REAL-TIME 5-STEP TRACKER MODAL */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] text-left">
            {/* Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/70 shrink-0 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 sm:size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Clock className="size-4.5 sm:size-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                    Live Table Orders
                    {totalActiveOrders > 0 && (
                      <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Live status tracking for {displayTableBadge} · updates automatically
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => fetchTableOrders()}
                  title="Refresh Orders"
                >
                  <RefreshCw className="size-4" />
                </Button>
                <button
                  onClick={() => setShowOrdersModal(false)}
                  className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Orders List with Stepper */}
            <div className="overflow-y-auto flex-1 px-3.5 py-3 sm:px-6 sm:py-4 space-y-3 min-h-0 overscroll-contain">
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
                      className="p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 sm:space-y-3 hover:border-primary/40 transition-colors"
                    >
                      {/* Ticket Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs sm:text-sm text-foreground truncate">
                              {ord.orderNumber || ord.id}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-extrabold capitalize px-2 py-0.5 shrink-0',
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
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="text-right leading-tight">
                            <span className="text-sm sm:text-base font-extrabold text-primary block">
                              ₹{Number(ord.totalAmount || ord.total || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {ord.paymentStatus || 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setSelectedOrderIdForBill(ord.fullId || ord.id || ord.orderNumber)
                                setShowOrdersModal(false)
                                setShowBillModal(true)
                              }}
                              className="h-6.5 px-2 text-[10px] sm:text-[11px] font-extrabold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer z-20 pointer-events-auto"
                              title="Bill only this specific order"
                            >
                              <Receipt className="size-3" />
                              <span>Bill</span>
                            </Button>
                            {!isServed && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setIsAppendMode(true)
                                  setAppendTargetOrder(ord)
                                  setShowOrdersModal(false)
                                  setIsCartOpen(false)
                                }}
                                className="h-6.5 px-2 text-[10px] sm:text-[11px] font-extrabold gap-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-xs cursor-pointer z-20 pointer-events-auto"
                                title="Add dishes directly to this live order"
                              >
                                <Plus className="size-3" />
                                <span>Add on Live Order</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Visual Stepper Tracker (Compact & Responsive) ── */}
                      <div className="py-2.5 px-2.5 sm:px-3 bg-muted/30 rounded-xl sm:rounded-2xl border border-border/50">
                        <div className="flex items-center justify-between relative px-2 sm:px-4">
                          {/* Connector line container with strict bounds and overflow-hidden */}
                          <div className="absolute top-3 left-4 right-4 h-0.5 sm:h-1 z-0 overflow-hidden rounded-full bg-muted-foreground/20">
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
                              <div key={st.step} className="flex flex-col items-center z-10 gap-1">
                                <div
                                  className={cn(
                                    'size-6 sm:size-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300',
                                    isDone && !isCurrent
                                      ? 'bg-emerald-500 text-black shadow-xs font-black'
                                      : isCurrent
                                      ? 'bg-primary text-primary-foreground ring-2 sm:ring-4 ring-primary/20 animate-pulse shadow-md font-black scale-105 sm:scale-110'
                                      : 'bg-card border border-border text-muted-foreground/60'
                                  )}
                                >
                                  {isDone && !isCurrent ? (
                                    <Check className="size-3 sm:size-3.5 stroke-[3]" />
                                  ) : (
                                    <StepIcon className="size-3 sm:size-3.5" />
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'text-[9px] sm:text-[10px] tracking-tight text-center leading-tight',
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
                        <div className="mt-2 sm:mt-2.5 p-2 rounded-lg sm:rounded-xl bg-background/90 border border-border/60 text-xs flex items-center gap-2">
                          <span className="font-bold text-foreground shrink-0 text-[10px] sm:text-[11px] uppercase tracking-wide">
                            Live Update:
                          </span>
                          <span className={cn('text-[11px] sm:text-xs font-semibold leading-snug', stepInfo.badgeColor.split(' ')[2])}>
                            {stepInfo.description}
                          </span>
                        </div>
                      </div>

                      {/* Car / Spot Delivery Badge in ticket */}
                      {(ord.vehicleNumber || ord.landmarkNote || isValidCoord(ord.customerLat, ord.customerLng)) && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/25 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <Car className="size-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-foreground block truncate">
                                {ord.vehicleNumber ? `Car: ${ord.vehicleNumber}` : 'Highway Car Delivery'}
                              </span>
                              {ord.landmarkNote && (
                                <span className="text-[11px] text-muted-foreground block truncate">
                                  📍 Spot: {ord.landmarkNote}
                                </span>
                              )}
                            </div>
                          </div>
                          {isValidCoord(ord.customerLat, ord.customerLng) && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${ord.customerLat},${ord.customerLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline flex items-center gap-1 shrink-0 font-bold bg-background/80 px-2 py-1 rounded-lg border border-primary/20"
                            >
                              <Navigation className="size-3 text-primary" />
                              <span>Map</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Ordered Items List with Real-Time Preparation Timing & Status */}
                      <div className="space-y-1.5 pt-1 text-xs border-t border-border/50">
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                          <span>Ordered Items ({itemsList.length})</span>
                          <span className="text-[10px] font-normal lowercase text-muted-foreground/75">live status</span>
                        </div>
                        {itemsList.map((it: any, i: number) => {
                          const dishPrepMinutes = Number(it.prepTime || it.preparationTimeMinutes || 15)
                          const orderStartTime = ord.createdAt ? new Date(ord.createdAt).getTime() : Date.now()
                          const elapsedMins = Math.max(0, Math.floor((liveNow - orderStartTime) / 60000))
                          const remainingMins = Math.max(1, dishPrepMinutes - elapsedMins)

                          const ordStatus = String(ord.status || '').toLowerCase().trim()
                          const isDishPending = ordStatus === 'pending'
                          const isDishCooking = ordStatus === 'accepted' || ordStatus === 'confirmed' || ordStatus === 'preparing' || ordStatus === 'cooking'
                          const isDishReady = ordStatus === 'ready'
                          const isDishServed = ordStatus === 'served' || ordStatus === 'completed'

                          return (
                            <div key={i} className="p-2 sm:p-2.5 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                              <div className="flex justify-between items-center text-foreground font-medium gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="size-5 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {it.quantity}x
                                  </span>
                                  <span className="font-semibold text-xs text-foreground truncate">
                                    {it.name}
                                  </span>
                                </div>
                                <span className="text-foreground font-mono font-bold text-xs shrink-0">
                                  ₹{Number(it.total || (it.price || 0) * it.quantity).toFixed(2)}
                                </span>
                              </div>

                              {/* Real-time Dish Timing & Status Badge */}
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  {isDishPending && (
                                    <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1 px-1.5 py-0 h-4">
                                      <Clock className="size-2 animate-spin text-amber-500" />
                                      <span>Pending Approval</span>
                                    </Badge>
                                  )}
                                  {isDishCooking && (
                                    <Badge variant="outline" className="text-[9px] font-extrabold bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 gap-1 px-1.5 py-0 h-4">
                                      <Flame className="size-2 text-orange-500 animate-pulse" />
                                      <span>Cooking ({remainingMins}m left)</span>
                                    </Badge>
                                  )}
                                  {isDishReady && (
                                    <Badge variant="outline" className="text-[9px] font-bold bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1 px-1.5 py-0 h-4">
                                      <Sparkles className="size-2 text-emerald-500" />
                                      <span>Ready to Serve</span>
                                    </Badge>
                                  )}
                                  {isDishServed && (
                                    <Badge variant="outline" className="text-[9px] font-bold bg-sky-500/15 text-sky-500 border-sky-500/30 gap-1 px-1.5 py-0 h-4">
                                      <UtensilsCrossed className="size-2 text-sky-500" />
                                      <span>Served</span>
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Prep ~{dishPrepMinutes}m
                                </span>
                              </div>

                              {(it.notes || it.specialInstructions) && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pl-1 truncate">
                                  ↳ {it.notes || it.specialInstructions}
                                </p>
                              )}
                            </div>
                          )
                        })}
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
            <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-border/70 bg-card shrink-0 space-y-1.5">
              {tableOrders.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 sm:h-9.5 rounded-xl font-semibold text-xs gap-1.5 border border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 shadow-2xs cursor-pointer transition-all active:scale-[0.98] px-2.5 truncate"
                      onClick={() => {
                        if (tableOrders.length === 1) {
                          setSelectedOrderIdForBill(tableOrders[0].fullId || tableOrders[0].id || tableOrders[0].orderNumber)
                        } else {
                          setSelectedOrderIdForBill(null)
                        }
                        setShowOrdersModal(false)
                        setShowBillModal(true)
                      }}
                    >
                      <BellRing className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">Ask for Bill</span>
                    </Button>

                    <Button
                      type="button"
                      variant="default"
                      className="w-full h-9 sm:h-9.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs shadow-emerald-600/20 cursor-pointer transition-all active:scale-[0.98] px-2.5 truncate"
                      onClick={() => {
                        if (tableOrders.length === 1) {
                          setSelectedOrderIdForBill(tableOrders[0].fullId || tableOrders[0].id || tableOrders[0].orderNumber)
                        } else {
                          setSelectedOrderIdForBill(null)
                        }
                        setShowOrdersModal(false)
                        setShowBillModal(true)
                      }}
                    >
                      <Receipt className="size-3.5 shrink-0" />
                      <span className="truncate">Settle Bill & Tip</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-center pt-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-auto px-4 h-7.5 rounded-full font-medium text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-all cursor-pointer shadow-2xs gap-1.5"
                      onClick={() => setShowOrdersModal(false)}
                    >
                      <ArrowLeft className="size-3 text-muted-foreground" />
                      <span>Continue Browsing Menu</span>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="default"
                    className="w-auto px-5 h-8.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs gap-1.5"
                    onClick={() => setShowOrdersModal(false)}
                  >
                    <ArrowLeft className="size-3" />
                    <span>Browse Menu</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4b. CUSTOMIZE DISH MODAL (Spices, Veg/Non-Veg, Sauces, Cheese, Chef Notes) */}
      {customizingItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCustomizingItem(null)
              setEditingCartKey(null)
            }
          }}
        >
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
        {/* Live 20-Second Chef Preparation & Batch Add-on Banner */}
        <LiveBatchAddonBanner
          currentTableNumber={tableNumber || 'Table 1'}
          customerName="Menu Guest"
          onOrderPlaced={fetchTableOrders}
        />
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
              className="pl-10 h-11 rounded-2xl bg-card border border-border/70 text-xs sm:text-sm shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/20"
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

          {/* Dietary Filter (Veg & Non-Veg) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Veg Toggle */}
            <button
              type="button"
              onClick={() => setDietaryFilter((prev) => (prev === 'veg' ? 'all' : 'veg'))}
              aria-pressed={dietaryFilter === 'veg'}
              className={cn(
                'flex items-center gap-2 h-11 px-3 sm:px-3.5 rounded-2xl border text-xs font-bold transition-all shadow-2xs cursor-pointer select-none shrink-0',
                dietaryFilter === 'veg'
                  ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-emerald-500/10'
                  : 'bg-card border-border/70 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <span
                className={cn(
                  'size-2.5 rounded-full transition-all shrink-0',
                  dietaryFilter === 'veg'
                    ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                    : 'bg-emerald-600/60'
                )}
              />
              <span>Veg</span>
            </button>

            {/* Non-Veg Toggle */}
            <button
              type="button"
              onClick={() => setDietaryFilter((prev) => (prev === 'non-veg' ? 'all' : 'non-veg'))}
              aria-pressed={dietaryFilter === 'non-veg'}
              className={cn(
                'flex items-center gap-2 h-11 px-3 sm:px-3.5 rounded-2xl border text-xs font-bold transition-all shadow-2xs cursor-pointer select-none shrink-0',
                dietaryFilter === 'non-veg'
                  ? 'bg-rose-500/10 border-rose-500/60 text-rose-700 dark:text-rose-400 font-extrabold shadow-rose-500/10'
                  : 'bg-card border-border/70 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <span
                className={cn(
                  'size-2.5 rounded-full transition-all shrink-0',
                  dietaryFilter === 'non-veg'
                    ? 'bg-rose-500 ring-4 ring-rose-500/20'
                    : 'bg-rose-600/60'
                )}
              />
              <span>Non-Veg</span>
            </button>
          </div>
        </div>

        {/* Category Pills (Horizontal Sticky Bar) */}
        <div className="sticky top-[64px] z-20 -mx-4 px-4 py-2.5 bg-background/90 backdrop-blur-xl border-b border-border/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer select-none',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:border-border'
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
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:border-border'
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
                setDietaryFilter('all')
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
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full bg-primary ring-4 ring-primary/20" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                      {catName}
                    </h2>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {items.length} {items.length === 1 ? 'dish' : 'dishes'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => {
                    const inCartQty = getItemQtyInCart(item.id)
                    const desc = getCleanDescription(item.description)
                    const isNonVeg = !item.isVeg || /chicken|mutton|fish|egg|prawn|meat|lamb|beef|pork|seafood/i.test(item.name || '')

                    return (
                      <div
                        key={item.id}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card hover:bg-card/90 p-4 shadow-2xs hover:shadow-xl hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <div className="flex gap-4 items-start">
                          {/* Left: Info */}
                          <div className="flex-1 min-w-0 flex flex-col h-full justify-between space-y-1.5">
                            <div>
                              {/* Dietary badge & prep time */}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {!isNonVeg ? (
                                  <span
                                    className="size-4 border-2 border-emerald-600 dark:border-emerald-500 rounded-sm flex items-center justify-center p-0.5 shrink-0 bg-emerald-50 dark:bg-emerald-950/40"
                                    title="Pure Vegetarian"
                                  >
                                    <span className="size-2 bg-emerald-600 dark:bg-emerald-500 rounded-full" />
                                  </span>
                                ) : (
                                  <span
                                    className="size-4 border-2 border-rose-600 dark:border-rose-500 rounded-sm flex items-center justify-center p-0.5 shrink-0 bg-rose-50 dark:bg-rose-950/40"
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

                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                  <Clock className="size-3" />
                                  {item.prepTime || 15}m
                                </span>

                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                  <Star className="size-2.5 fill-amber-500 text-amber-500" />
                                  {item.rating ? item.rating.toFixed(1) : '4.8'}
                                </span>
                              </div>

                              {/* Dish Name */}
                              <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors leading-snug capitalize tracking-tight">
                                {item.name}
                              </h3>

                              {/* Clean Description / Tagline */}
                              {desc ? (
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                                  {desc}
                                </p>
                              ) : (
                                <p className="text-[11px] text-muted-foreground/75 italic line-clamp-1 mt-0.5">
                                  Chef prepared fresh with authentic ingredients
                                </p>
                              )}
                            </div>

                            {/* Price */}
                            <div className="pt-2">
                              <span className="text-base sm:text-lg font-black text-foreground font-mono tracking-tight">
                                ₹{item.price.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Right: Dish Image / Add Button */}
                          <div className="flex flex-col items-center justify-between shrink-0 w-28 gap-2">
                            {/* Image container */}
                            <div className="relative size-24 sm:size-26 rounded-2xl overflow-hidden bg-muted/30 border border-border/80 shadow-xs group-hover:shadow-md transition-all">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                                  className="w-full h-8.5 rounded-xl bg-white dark:bg-card border-2 border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white font-black text-xs shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <span>ADD</span>
                                  <Plus className="size-3.5 stroke-[3]" />
                                </Button>
                              ) : (
                                <div className="flex items-center justify-between w-full h-8.5 bg-emerald-600 text-white rounded-xl px-1.5 shadow-md shadow-emerald-600/25 font-bold">
                                  <button
                                    onClick={() => decrementCart(item.id)}
                                    className="size-6 flex items-center justify-center rounded-lg hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="size-3.5" />
                                  </button>
                                  <span className="font-black text-xs px-1 font-mono">
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
                                className="w-full text-[10px] font-bold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1 transition-colors cursor-pointer py-0.5"
                                title="Customise Spices, Veg/Non-Veg, Sauces & Cheese"
                              >
                                <SlidersHorizontal className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Customisable</span>
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

      {/* 5. STICKY BOTTOM CART FLOATING BAR (DESKTOP) - Mobile uses the unified bottom action dock */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="hidden sm:block fixed bottom-5 inset-x-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300">
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

            {/* Mode Switcher: Table Dine-In vs Highway Car Drive-In */}
            <div className="px-4 pt-3 pb-2 bg-muted/20 border-b border-border/50">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/80">
                <button
                  type="button"
                  onClick={() => {
                    setOrderMode('dine_in')
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('rms_customer_order_mode', 'dine_in')
                    }
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    orderMode === 'dine_in'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <UtensilsCrossed className="size-3.5" />
                  <span>Table Dine-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderMode('drive_in')
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('rms_customer_order_mode', 'drive_in')
                    }
                    if (!locationData.vehicleNumber && !locationData.landmarkNote) {
                      setIsDriveInModalOpen(true)
                    }
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    orderMode === 'drive_in'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Car className="size-3.5" />
                  <span>🚗 Car Drive-In</span>
                </button>
              </div>
            </div>

            {/* Table Number or Drive-In Spot Details */}
            {orderMode === 'drive_in' ? (
              <div className="p-4 bg-primary/10 border-b border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                      <Car className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground font-medium">Highway Delivery For</p>
                      <p className="text-sm font-extrabold text-foreground truncate">
                        {locationData.vehicleNumber ? `🚗 ${locationData.vehicleNumber}` : 'Car Spot Unset'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDriveInModalOpen(true)}
                    className="h-7 text-xs font-bold px-2.5 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                  >
                    <Edit3 className="size-3" />
                    <span>{locationData.vehicleNumber || locationData.landmarkNote ? 'Edit Spot' : 'Set Spot'}</span>
                  </Button>
                </div>

                {/* Spot / Pre-set note point & GPS Status Badge */}
                <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-1 text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <MapPin className="size-3 text-primary shrink-0" />
                      Local Note Point:
                    </span>
                    <span className="font-bold text-foreground text-right truncate max-w-[190px]">
                      {locationData.landmarkNote || 'Not chosen (Tap Edit to choose)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Compass className="size-3 text-primary shrink-0" />
                      GPS Tracking:
                    </span>
                    {isValidCoord(locationData.customerLat, locationData.customerLng) ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
                        <CheckCircle2 className="size-3" />
                        Acquired ({locationData.locationAccuracy ? `±${locationData.locationAccuracy}m` : 'Active'})
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70 italic">GPS optional (tap Edit to capture)</span>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40">
                    Waiters will deliver food directly to your vehicle outside.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-primary/5 border-b border-primary/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">Ordering For</p>
                      <p className="text-sm font-extrabold text-foreground">{displayTableBadge}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-background text-muted-foreground">
                      Locked to Session
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setManualTableInput(tableNumber)
                        setShowTableModal(true)
                      }}
                      className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10"
                    >
                      Change
                    </Button>
                  </div>
                </div>

                {/* Highway / Food Cart Drive-in Callout Button */}
                <button
                  type="button"
                  onClick={() => {
                    setOrderMode('drive_in')
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('rms_customer_order_mode', 'drive_in')
                    }
                    setIsDriveInModalOpen(true)
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-dashed border-primary/40 bg-card hover:bg-primary/5 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Car className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        Parked nearby in a Car or on Highway?
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Click to enter Vehicle # & GPS spot for window delivery
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}

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

              {/* Coupon / Promo Code Section */}
              {cartItemList.length > 0 && (
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold flex items-center gap-1.5 text-foreground">
                      <Gift className="size-3.5 text-orange-500" />
                      <span>Have a Coupon Code?</span>
                    </label>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-bold text-destructive hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* 1-Click First Order (15%) or Review/Existing Customer (10%) Coupon Badge */}
                  {!appliedCoupon && (
                    <>
                      {customerAuth?.isFirstOrder ? (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 truncate">
                              <span>🎉</span>
                              <span className="font-mono">FIRST15</span>
                              <span className="font-semibold text-[11px]">• Extra 15% First Order Special</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Exclusive 15% discount for your very first order!
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setCouponInput('FIRST15')
                              handleApplyCoupon('FIRST15')
                            }}
                            disabled={validatingCoupon}
                            className="h-7 px-2.5 text-[11px] font-extrabold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shrink-0 cursor-pointer shadow-2xs"
                          >
                            {validatingCoupon ? <RefreshCw className="size-3 animate-spin" /> : 'Apply 15%'}
                          </Button>
                        </div>
                      ) : savedReviewCoupon ? (
                        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 truncate">
                              <span>🎁</span>
                              <span className="font-mono">{savedReviewCoupon}</span>
                              <span className="font-semibold text-[11px]">(10% Review Discount)</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              1-time 10% discount from your dining review (Min. ₹300)
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setCouponInput(savedReviewCoupon)
                              handleApplyCoupon(savedReviewCoupon)
                            }}
                            disabled={validatingCoupon}
                            className="h-7 px-2.5 text-[11px] font-extrabold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shrink-0 cursor-pointer"
                          >
                            {validatingCoupon ? <RefreshCw className="size-3 animate-spin" /> : 'Apply 10%'}
                          </Button>
                        </div>
                      ) : customerAuth && !customerAuth.isFirstOrder ? (
                        cartSubtotal >= 1000 ? (
                          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground flex items-center gap-1 truncate">
                                <span>✨</span>
                                <span className="font-mono">EXISTING10</span>
                                <span className="font-semibold text-[11px]">• 10% Off on Orders Above ₹1,000</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Enjoy 10% off on your dining order (Min. order ₹1,000)
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setCouponInput('EXISTING10')
                                handleApplyCoupon('EXISTING10')
                              }}
                              disabled={validatingCoupon}
                              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg shrink-0 cursor-pointer"
                            >
                              {validatingCoupon ? <RefreshCw className="size-3 animate-spin" /> : 'Apply 10%'}
                            </Button>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <span>✨</span>
                                <span>Add ₹{(1000 - cartSubtotal).toFixed(0)} more to unlock 10% discount!</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                10% off for valued guests on orders of ₹1,000 or more
                              </p>
                            </div>
                          </div>
                        )
                      ) : null}
                    </>
                  )}

                  {/* Coupon Input Box */}
                  {!appliedCoupon ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Enter coupon (e.g. REVIEW10-...)"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase())
                            setCouponError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleApplyCoupon()
                            }
                          }}
                          className="h-9 pl-8 text-xs uppercase font-mono font-bold rounded-xl"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleApplyCoupon()}
                        disabled={validatingCoupon || !couponInput.trim()}
                        className="h-9 px-3.5 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        {validatingCoupon ? <RefreshCw className="size-3 animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                  ) : (
                    /* Active Coupon Status */
                    <div
                      className={cn(
                        'p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2',
                        isCouponMinOrderMet
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          {isCouponMinOrderMet ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                          <span className="font-mono">{appliedCoupon}</span>
                          <span>{isCouponMinOrderMet ? `• ${appliedCouponPercent}% Discount Active` : '• Condition not met'}</span>
                        </div>
                        {isCouponMinOrderMet ? (
                          <p className="text-[11px] opacity-90">
                            🎉 {appliedCouponPercent}% discount applied! You save ₹{discountAmount.toFixed(2)}.
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold opacity-90">
                            ⚠️ Add ₹{(appliedCouponMinOrder - cartSubtotal).toFixed(2)} more items to unlock {appliedCouponPercent}% discount (Min. order ₹{appliedCouponMinOrder})!
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-bold underline hover:opacity-80 shrink-0 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}
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
                  {discountAmount > 0 && (
                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Gift className="size-3" />
                        <span>{appliedCoupon === 'FIRST15' ? 'First Order Discount' : 'Discount'} ({appliedCouponPercent || 10}%)</span>
                      </span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
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
                  className={cn(
                    'w-full h-12 rounded-xl font-extrabold text-sm shadow-md cursor-pointer transition-all',
                    isAppendMode
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                      : ''
                  )}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="size-4 animate-spin" />
                      {isAppendMode ? 'Appending to Live Order...' : 'Sending to Kitchen...'}
                    </span>
                  ) : isAppendMode && appendTargetOrder ? (
                    <span className="flex items-center gap-2">
                      <Plus className="size-4" />
                      Attach to Live Order #{appendTargetOrder.orderNumber || appendTargetOrder.id} (₹{cartGrandTotal.toFixed(2)})
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
      <div className="fixed bottom-3 inset-x-2.5 sm:hidden z-40 flex items-center gap-1.5 max-w-md mx-auto p-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl">
        {tableOrders.length > 0 && (
          <Button
            onClick={() => setShowBillModal(true)}
            className="h-11 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1 shrink-0 cursor-pointer"
          >
            <Receipt className="size-4 shrink-0" />
            <span>Bill & Tip</span>
          </Button>
        )}

        {/* Floating Review & 10% Discount */}
        <Link href={`/customer/feedback?table=${encodeURIComponent(tableNumber || '1')}`}>
          <Button
            className="size-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center p-0 shrink-0 cursor-pointer"
            title="Review & Claim 10% Off"
          >
            <Star className="size-4.5 fill-white" />
          </Button>
        </Link>

        <Button
          onClick={() => setShowOrdersModal(true)}
          className="flex-1 min-w-0 h-11 px-2 rounded-xl bg-muted/60 hover:bg-muted border border-primary/30 text-primary hover:text-primary font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer truncate"
        >
          <Clock className="size-4 text-primary shrink-0" />
          <span className="truncate">Orders</span>
          {tableOrders.length > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 h-4 font-black shrink-0">
              {tableOrders.length}
            </Badge>
          )}
        </Button>

        <Button
          onClick={() => setIsCartOpen(true)}
          className={cn(
            'flex-1 min-w-0 h-11 px-2 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer truncate transition-all',
            cartItemCount > 0
              ? 'bg-primary text-primary-foreground shadow-primary/30'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <ShoppingBag className="size-4 shrink-0" />
          <span className="truncate">Cart ({cartItemCount})</span>
          {cartItemCount > 0 && <span className="font-mono font-bold shrink-0 hidden xs:inline">· ₹{cartGrandTotal.toFixed(0)}</span>}
        </Button>
      </div>

      {/* 7. DIGITAL BILL & POST-SERVICE TIPPING MODAL */}
      <CustomerBillModal
        open={showBillModal}
        onOpenChange={(open) => {
          setShowBillModal(open)
          if (!open) setSelectedOrderIdForBill(null)
        }}
        tableNumber={orderMode === 'drive_in' ? displayTableBadge : tableNumber}
        tableOrders={tableOrders}
        selectedOrderId={selectedOrderIdForBill}
        onSuccess={() => {
          setSelectedOrderIdForBill(null)
          fetchTableOrders()
        }}
      />

      {/* 8. SONG PLAYING REQUEST (DJ SYNC) MODAL */}
      <SongRequestModal
        open={showSongModal}
        onOpenChange={setShowSongModal}
        tableNumber={orderMode === 'drive_in' ? displayTableBadge : tableNumber}
        guestName={typeof window !== 'undefined' ? localStorage.getItem('rms_customer_name') || 'Guest' : 'Guest'}
      />

      {/* 8. HIGHWAY / FOOD CART DRIVE-IN SPOT MODAL */}
      <Dialog open={isDriveInModalOpen} onOpenChange={setIsDriveInModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black">
              <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <Car className="size-4.5" />
              </div>
              <span>Highway / Food Cart Drive-In</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Order remotely from cars parked nearby. Enter your vehicle number and select a pre-set local note point (or GPS) so waiters deliver directly to your vehicle window.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <CustomerLocationLock
              data={locationData}
              onChange={(updated) => {
                setLocationData(updated)
                if (typeof window !== 'undefined') {
                  localStorage.setItem('rms_customer_location', JSON.stringify(updated))
                }
              }}
              showToggle={false}
              title="Vehicle Details & Parking Spot"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDriveInModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setOrderMode('drive_in')
                if (typeof window !== 'undefined') {
                  localStorage.setItem('rms_customer_order_mode', 'drive_in')
                  localStorage.setItem('rms_customer_location', JSON.stringify(locationData))
                }
                setIsDriveInModalOpen(false)
              }}
              className="rounded-xl font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="size-3.5" />
              <span>Confirm Vehicle & Spot</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

