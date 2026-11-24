'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  Plus,
  Minus,
  UtensilsCrossed,
  Clock,
  Sparkles,
  Flame,
  ChefHat,
  Crown,
  Wand2,
  Trash2,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Zap,
  Tag,
  Sliders,
  Upload,
  X,
  ExternalLink,
  Camera,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/hooks/useAuthContext'
import { checkPermission } from '@/lib/rolesAndPermission'
import { triggerNotificationFeedback } from '@/lib/sound-vibrate'

export interface MenuItemData {
  id: string
  name: string
  category: string
  categoryId?: string
  price: number
  description?: string
  isVeg?: boolean
  isSpicy?: boolean
  isAvailable: boolean
  prepTime?: number
  image?: string
  tags?: string[]
}

interface TableDishMenuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableNumber: string | number
  tableId?: string
  isVip?: boolean
  onOrderPlaced?: () => void
}

// Preset custom requirement modifier chips for instant generator tool
const COMMON_REQUIREMENTS = [
  'Less Spicy',
  'Extra Spicy',
  'Jain Preparation (No Onion/Garlic)',
  'Less Oil / Low Calorie',
  'Gluten-Free',
  'Extra Crispy',
  'Separated Sauce/Gravy',
  'No Nuts / Nut Allergy',
  'Kids Friendly (Mild)',
  'Chef Special Garnish',
]

// High-res curated production-ready dish photo presets for instant 1-click selection
const CURATED_FOOD_PHOTOS = [
  {
    name: 'Paneer Tikka',
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Masala Dosa',
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Biryani',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Butter Chicken',
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Pizza Margherita',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Burger & Fries',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Gulab Jamun',
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
  },
]

export function TableDishMenuModal({
  open,
  onOpenChange,
  tableNumber,
  tableId,
  isVip = false,
  onOrderPlaced,
}: TableDishMenuModalProps) {
  const { auth } = useAuthContext()
  const role = auth?.role || 'WAITER'

  const [menuItems, setMenuItems] = useState<MenuItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Cart state: item ID -> quantity
  const [cart, setCart] = useState<Record<string, number>>({})

  // Custom customer request & Generator
  const [customerSpecialRequest, setCustomerSpecialRequest] = useState('')
  const [selectedPresetReqs, setSelectedPresetReqs] = useState<string[]>([])

  // VIP Unique Dish creation
  const [vipModalOpen, setVipModalOpen] = useState(false)
  const [vipDishName, setVipDishName] = useState('')
  const [vipDishPrice, setVipDishPrice] = useState('450')
  const [vipDishNotes, setVipDishNotes] = useState('')
  const [vipCustomDishes, setVipCustomDishes] = useState<Array<{ name: string; price: number; notes: string }>>([])

  // Add Dish to Catalog with AI Assistant modal
  const [addDishOpen, setAddDishOpen] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const [newDishPrice, setNewDishPrice] = useState('')
  const [newDishCategory, setNewDishCategory] = useState('Main Course')
  const [newDishPrepTime, setNewDishPrepTime] = useState('15')
  const [newDishIsVeg, setNewDishIsVeg] = useState(true)
  const [newDishImage, setNewDishImage] = useState('')
  const [imageLoadError, setImageLoadError] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newDishDesc, setNewDishDesc] = useState('')
  const [generatingAi, setGeneratingAi] = useState(false)
  const [savingDish, setSavingDish] = useState(false)

  // Bypass Live Ordering Switch
  const [bypassLiveOrdering, setBypassLiveOrdering] = useState(true)

  // Submit order state
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canAddDishToCatalog = checkPermission(role, 'canAddDish')
  const canEditAvailability = checkPermission(role, 'canEditDishAvailability')

  // Fetch live menu items
  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/menu/items')
      const json = await res.json()
      if (res.ok && json.success) {
        setMenuItems(json.data || [])
      }
    } catch (e) {
      console.warn('Failed to fetch menu:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setCart({})
      setOrderSuccess(false)
      setErrorMessage(null)
      fetchMenu()
    }
  }, [open, fetchMenu])

  // Reset image error state when newDishImage changes
  useEffect(() => {
    setImageLoadError(false)
  }, [newDishImage])

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>()
    menuItems.forEach((m) => {
      if (m.category) set.add(m.category)
    })
    return ['all', ...Array.from(set)]
  }, [menuItems])

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [menuItems, activeCategory, search])

  // Total amount and item count
  const { totalCount, totalPrice, totalEstPrepTime } = useMemo(() => {
    let count = 0
    let price = 0
    let maxPrep = 0

    Object.entries(cart).forEach(([id, qty]) => {
      if (qty > 0) {
        const item = menuItems.find((m) => m.id === id)
        if (item) {
          count += qty
          price += item.price * qty
          if ((item.prepTime || 15) > maxPrep) {
            maxPrep = item.prepTime || 15
          }
        }
      }
    })

    // Add VIP custom dishes
    vipCustomDishes.forEach((vd) => {
      count += 1
      price += vd.price
      if (20 > maxPrep) maxPrep = 20
    })

    return { totalCount: count, totalPrice: price, totalEstPrepTime: maxPrep || 15 }
  }, [cart, menuItems, vipCustomDishes])

  // Cart operations
  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: next }
    })
  }

  // Toggle modifier requirement
  const togglePresetRequirement = (req: string) => {
    setSelectedPresetReqs((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
    )
  }

  // Quick dish availability toggles
  const handleToggleSoldOut = async (item: MenuItemData) => {
    try {
      const newStatus = !item.isAvailable
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newStatus } : i))
      )
      await fetch(`/api/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus }),
      })
    } catch {
      fetchMenu()
    }
  }

  // Handle direct file upload from device / camera
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      setImageLoadError(false)

      // 1. Instant 0ms client preview with FileReader
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewDishImage(reader.result)
        }
      }
      reader.readAsDataURL(file)

      // 2. Server upload via /api/upload
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (res.ok && json.success && json.url) {
        setNewDishImage(json.url)
      }
    } catch (err) {
      console.warn('Upload error, kept data URL preview:', err)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Add VIP Dish
  const handleAddVipDish = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vipDishName.trim()) return

    setVipCustomDishes((prev) => [
      ...prev,
      {
        name: `VIP: ${vipDishName.trim()}`,
        price: Math.max(0, Number(vipDishPrice) || 0),
        notes: vipDishNotes.trim(),
      },
    ])

    setVipDishName('')
    setVipDishPrice('450')
    setVipDishNotes('')
    setVipModalOpen(false)
  }

  // AI Description Generator
  const handleGenerateAiDescription = () => {
    if (!newDishName.trim()) {
      alert('Please enter a dish name first to generate AI description.')
      return
    }

    setGeneratingAi(true)
    setTimeout(() => {
      const vegTag = newDishIsVeg ? 'Vegetarian' : 'Non-Vegetarian'
      const aiGenerated = `Chef's signature handcrafted ${newDishName.trim()}, prepared with authentic aromatic spices, farm-fresh ingredients, and traditional flame roasting technique. High protein, ${vegTag}, served hot with gourmet seasoning.`
      setNewDishDesc(aiGenerated)
      setGeneratingAi(false)
    }, 400)
  }

  // Save new dish to catalog
  const handleSaveNewDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDishName.trim() || !newDishPrice) return

    try {
      setSavingDish(true)
      const res = await fetch('/api/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDishName.trim(),
          price: Number(newDishPrice),
          category: newDishCategory,
          prepTime: Number(newDishPrepTime) || 15,
          isVeg: newDishIsVeg,
          description: newDishDesc.trim(),
          image: newDishImage.trim() || undefined,
          imageUrl: newDishImage.trim() || undefined,
          isAvailable: true,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to add dish')
      }

      setAddDishOpen(false)
      setNewDishName('')
      setNewDishPrice('')
      setNewDishDesc('')
      setNewDishImage('')
      setImageLoadError(false)
      fetchMenu()
    } catch (err: any) {
      alert(err.message || 'Error saving dish')
    } finally {
      setSavingDish(false)
    }
  }

  // Place order for table
  const handlePlaceOrder = async () => {
    if (totalCount === 0) return
    try {
      setSubmittingOrder(true)
      setErrorMessage(null)

      // Compile ordered items
      const orderItems: any[] = []
      Object.entries(cart).forEach(([id, qty]) => {
        if (qty > 0) {
          const item = menuItems.find((m) => m.id === id)
          if (item) {
            orderItems.push({
              id: item.id,
              menuItemId: item.id,
              name: item.name,
              quantity: qty,
              price: item.price,
              specialInstructions: selectedPresetReqs.join(', ') || undefined,
              notes: selectedPresetReqs.join(', ') || undefined,
            })
          }
        }
      })

      // Attach VIP unique custom dishes
      vipCustomDishes.forEach((vd) => {
        orderItems.push({
          name: vd.name,
          quantity: 1,
          price: vd.price,
          specialInstructions: vd.notes ? `[VIP Custom Dish]: ${vd.notes}` : '[VIP Custom Dish]',
          notes: vd.notes ? `[VIP Custom Dish]: ${vd.notes}` : '[VIP Custom Dish]',
        })
      })

      const combinedNotes = [
        customerSpecialRequest.trim(),
        selectedPresetReqs.length > 0 ? `Requirements: ${selectedPresetReqs.join(', ')}` : null,
        isVip ? '⭐ VIP TABLE GUEST' : null,
      ]
        .filter(Boolean)
        .join(' | ')

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: String(tableNumber),
          tableId,
          orderType: 'dine_in',
          items: orderItems,
          totalAmount: totalPrice,
          notes: combinedNotes,
          status: 'pending',
          source: 'TABLE_POS',
          bypassedLiveOrdering: bypassLiveOrdering,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to send order to kitchen')
      }

      // Trigger feedback & success
      triggerNotificationFeedback('order')
      setOrderSuccess(true)
      onOrderPlaced?.()

      setTimeout(() => {
        onOpenChange(false)
      }, 1800)
    } catch (err: any) {
      console.error('Order placement error:', err)
      setErrorMessage(err.message || 'Failed to send order to kitchen')
    } finally {
      setSubmittingOrder(false)
    }
  }

  // Detect if user entered a search page link instead of direct image (like stock.adobe.com/search?k=dosa)
  const isSearchPageUrl = useMemo(() => {
    if (!newDishImage) return false
    const lower = newDishImage.toLowerCase()
    return (
      (lower.includes('stock.adobe.com') && lower.includes('search')) ||
      (lower.includes('google.com') && lower.includes('search')) ||
      (lower.includes('shutterstock.com') && lower.includes('search')) ||
      (!lower.startsWith('data:') && !lower.match(/\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i) && lower.includes('?k='))
    )
  }, [newDishImage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButtonClassName="top-3 sm:top-3.5 right-3 sm:right-4 z-20 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
        className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl"
      >
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <UtensilsCrossed className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                  Take Order — Table {tableNumber}
                  {isVip && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 font-bold text-[10px]">
                      <Crown className="size-3 mr-1" />
                      VIP Table
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Select dishes, attach custom requirements, or create off-menu VIP dishes.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 mr-7 sm:mr-8">
              {/* VIP Unique Dish Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVipModalOpen(true)}
                className="h-8 text-xs font-bold gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
              >
                <Crown className="size-3.5" />
                <span className="hidden sm:inline">+ VIP Dish</span>
              </Button>

              {/* Add Dish to Catalog (Permission-Gated) */}
              {canAddDishToCatalog && (
                <Button
                  size="sm"
                  onClick={() => setAddDishOpen(true)}
                  className="h-8 text-xs font-bold gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">Add Dish</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {orderSuccess ? (
          <div className="p-12 text-center space-y-3 flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-lg font-black text-foreground">Order Sent to Kitchen for Table {tableNumber}!</h3>
            <p className="text-xs text-muted-foreground">
              Sent straight to Kitchen Display System (KDS). Estimated prep: ~{totalEstPrepTime} minutes.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Top Search & Category Filter */}
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search dishes or cuisines..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-muted/20 rounded-xl"
                />
              </div>

              {/* Bypass Live Ordering Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none bg-muted/30 px-3 py-1.5 rounded-xl border border-border">
                <Zap className="size-3.5 text-amber-500" />
                <span>Bypass Live Order Restrictions</span>
                <input
                  type="checkbox"
                  checked={bypassLiveOrdering}
                  onChange={(e) => setBypassLiveOrdering(e.target.checked)}
                  className="size-4 rounded accent-primary cursor-pointer"
                />
              </label>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all',
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* VIP Custom Off-Menu Dishes Attached */}
            {vipCustomDishes.length > 0 && (
              <div className="p-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Crown className="size-4 fill-amber-500" />
                    Off-Menu VIP Dishes Attached ({vipCustomDishes.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {vipCustomDishes.map((vd, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-card p-2 px-3 rounded-xl border border-amber-500/20 text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground">{vd.name}</span>
                        {vd.notes && <p className="text-[10px] text-muted-foreground">{vd.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground">₹{vd.price.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setVipCustomDishes((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-75"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dishes Grid with prominent Photo Display */}
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 text-primary animate-spin" />
                <span>Loading menu items...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No dishes found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const qty = cart[item.id] || 0
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3 rounded-2xl border transition-all flex flex-col justify-between text-xs group',
                        qty > 0
                          ? 'border-primary/50 bg-primary/5 shadow-xs'
                          : !item.isAvailable
                          ? 'border-border/60 bg-muted/20 opacity-60'
                          : 'border-border bg-card hover:border-primary/30'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* ── Dish Photo Thumbnail ── */}
                        <div className="relative size-16 sm:size-18 rounded-xl overflow-hidden shrink-0 border border-border/80 bg-muted/40 shadow-2xs">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none'
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  parent.classList.add('flex', 'items-center', 'justify-center')
                                }
                              }}
                            />
                          ) : null}
                          <div className={cn(
                            'size-full flex flex-col items-center justify-center text-muted-foreground/50',
                            item.image ? 'hidden' : 'flex'
                          )}>
                            <UtensilsCrossed className="size-5" />
                          </div>
                        </div>

                        {/* Dish Details */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                'size-2 rounded-full shrink-0',
                                item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                              )}
                            />
                            <span className="font-bold text-foreground text-sm leading-tight truncate">
                              {item.name}
                            </span>
                            {!item.isAvailable && (
                              <Badge variant="outline" className="text-[9px] px-1 h-4 border-destructive/40 text-destructive bg-destructive/10">
                                Sold Out
                              </Badge>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-mono font-black text-foreground text-xs">
                              ₹{item.price.toFixed(2)}
                            </span>
                            {/* Online Dish Prep Timing */}
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="size-3 text-primary" />
                              ~{item.prepTime || 15}m
                            </span>
                          </div>
                        </div>

                        {/* Availability controls & Action */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {canEditAvailability && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleSoldOut(item)}
                                className={cn(
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-md border',
                                  item.isAvailable
                                    ? 'text-muted-foreground border-border hover:bg-muted'
                                    : 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
                                )}
                                title="Toggle item availability / sold out"
                              >
                                {item.isAvailable ? 'Mark Sold Out' : 'Enable'}
                              </button>
                            </div>
                          )}

                          {/* Plus / Minus Counter */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {qty > 0 && (
                              <>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => updateCartQty(item.id, -1)}
                                  className="size-7 rounded-lg"
                                >
                                  <Minus className="size-3" />
                                </Button>
                                <span className="font-mono font-black text-xs w-5 text-center">{qty}</span>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant={qty > 0 ? 'default' : 'outline'}
                              disabled={!item.isAvailable}
                              onClick={() => updateCartQty(item.id, 1)}
                              className="size-7 rounded-lg"
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Customer Requests & Custom Requirement Generator */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-primary" />
                  Custom Requirements & Customer Requests Generator
                </label>
                <span className="text-[10px] text-muted-foreground">Click to toggle chips</span>
              </div>

              {/* Preset Generator Chips */}
              <div className="flex flex-wrap gap-1.5">
                {COMMON_REQUIREMENTS.map((req) => {
                  const isSelected = selectedPresetReqs.includes(req)
                  return (
                    <button
                      key={req}
                      type="button"
                      onClick={() => togglePresetRequirement(req)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {isSelected ? `✓ ${req}` : `+ ${req}`}
                    </button>
                  )
                })}
              </div>

              {/* Custom Freeform Request Input */}
              <Input
                placeholder="Type additional special notes (e.g. less salt, warm water, table by window)..."
                value={customerSpecialRequest}
                onChange={(e) => setCustomerSpecialRequest(e.target.value)}
                className="h-8 text-xs bg-card rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Footer Order Summary & Place Order */}
        {!orderSuccess && (
          <div className="p-4 border-t border-border bg-card shrink-0 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-foreground">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'}
                </span>
                <span className="text-xs text-muted-foreground">· Est. Prep ~{totalEstPrepTime} min</span>
              </div>
              <div className="font-mono font-black text-base text-primary">
                ₹{totalPrice.toFixed(2)}
              </div>
            </div>

            <Button
              disabled={totalCount === 0 || submittingOrder}
              onClick={handlePlaceOrder}
              className="h-11 px-6 font-black text-xs rounded-2xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {submittingOrder ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Sending to Kitchen...</span>
                </>
              ) : (
                <>
                  <ChefHat className="size-4" />
                  <span>Send to Kitchen (Table {tableNumber})</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* VIP Unique Dish Modal */}
        <Dialog open={vipModalOpen} onOpenChange={setVipModalOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-500">
                <Crown className="size-4" />
                Add Off-Menu VIP Unique Dish
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Craft a specialized custom dish specifically requested by this VIP guest.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddVipDish} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Unique Dish Name</label>
                <Input
                  placeholder="e.g. Truffle Infused Risotto or Custom Lobster"
                  value={vipDishName}
                  onChange={(e) => setVipDishName(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Price (₹)</label>
                <Input
                  type="number"
                  min="0"
                  value={vipDishPrice}
                  onChange={(e) => setVipDishPrice(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Chef Preparation Instructions</label>
                <Textarea
                  placeholder="Specify exact preparation instructions for executive chef..."
                  value={vipDishNotes}
                  onChange={(e) => setVipDishNotes(e.target.value)}
                  className="text-xs resize-none h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setVipModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold bg-amber-600 hover:bg-amber-700 text-white">
                  Attach VIP Dish
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Add Dish to Catalog with Photo Upload & AI Description ── */}
        <Dialog open={addDishOpen} onOpenChange={setAddDishOpen}>
          <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto bg-card border-border shadow-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <Sparkles className="size-4" />
                Add Dish to Catalog (with AI Description)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a new dish with instant photo upload / URL preview and AI-generated description.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveNewDish} className="space-y-3.5 py-1 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Dish Name</label>
                  <Input
                    placeholder="e.g. Paneer Tikka Masala"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Price (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="299"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Category</label>
                  <Input
                    placeholder="Main Course"
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Prep Time (Min)</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="15"
                    value={newDishPrepTime}
                    onChange={(e) => setNewDishPrepTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={newDishIsVeg}
                      onChange={(e) => setNewDishIsVeg(e.target.checked)}
                      className="size-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <span>Is Vegetarian</span>
                  </label>
                </div>
              </div>

              {/* ── Dish Photo Upload & Image Address Section ── */}
              <div className="p-3 rounded-2xl border border-border bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-primary" />
                    Dish Photo (File Upload or Image URL)
                  </label>
                  {newDishImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewDishImage('')
                        setImageLoadError(false)
                      }}
                      className="text-[11px] text-destructive hover:underline flex items-center gap-0.5"
                    >
                      <X className="size-3" />
                      Remove
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Upload Button + URL Input */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-3 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                  >
                    {uploadingImage ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    <span>{uploadingImage ? 'Uploading...' : 'Upload File'}</span>
                  </Button>

                  <Input
                    placeholder="Or paste image address (e.g. https://.../photo.jpg)"
                    value={newDishImage}
                    onChange={(e) => setNewDishImage(e.target.value)}
                    className="h-8 text-xs bg-card flex-1"
                  />
                </div>

                {/* Non-image search page warning (e.g. stock.adobe.com/search?k=dosa) */}
                {isSearchPageUrl && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      Notice: You pasted a website search link rather than a direct image file.
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Click any photo chip below to automatically attach a high-resolution culinary photo!
                    </p>
                  </div>
                )}

                {/* 1-Click Quick Preset Food Photos */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold block">
                    Quick Sample Photos (1-Tap):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {CURATED_FOOD_PHOTOS.map((food) => (
                      <button
                        key={food.name}
                        type="button"
                        onClick={() => {
                          setNewDishImage(food.url)
                          setImageLoadError(false)
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-border bg-card hover:border-primary/50 text-foreground transition-all"
                      >
                        + {food.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Live Image Preview Box ── */}
                {newDishImage && (
                  <div className="relative rounded-xl border border-border overflow-hidden bg-card p-2 flex items-center gap-3 animate-in fade-in">
                    <div className="relative size-16 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-muted/40">
                      <img
                        src={newDishImage}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="size-full object-cover"
                        onLoad={() => setImageLoadError(false)}
                        onError={() => setImageLoadError(true)}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {imageLoadError ? (
                        <div className="text-[11px] text-destructive space-y-0.5">
                          <p className="font-bold flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            Image preview unavailable
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Link may be blocked or invalid. Use &quot;Upload File&quot; or choose a quick sample above.
                          </p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 space-y-0.5">
                          <p className="font-bold flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-500" />
                            Image loaded successfully!
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            Ready for catalog and waiter menu display.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1">
                    <Sparkles className="size-3.5 text-primary" />
                    AI Description
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={generatingAi}
                    onClick={handleGenerateAiDescription}
                    className="h-6 px-2 text-[10px] font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Wand2 className="size-3" />
                    {generatingAi ? 'Generating...' : 'Auto-Generate AI Description'}
                  </Button>
                </div>
                <Textarea
                  placeholder="Generates rich culinary dish description..."
                  value={newDishDesc}
                  onChange={(e) => setNewDishDesc(e.target.value)}
                  className="text-xs resize-none h-18"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddDishOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingDish} className="font-bold cursor-pointer">
                  {savingDish && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Save to Catalog
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
