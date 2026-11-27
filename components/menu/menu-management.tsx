'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  UtensilsCrossed,
  Loader2,
  AlertCircle,
  FolderPlus,
  Flame,
  CheckCircle2,
  QrCode,
  ExternalLink,
  ChefHat,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react'
import { TableQRGenerator } from '@/components/tables/table-qr-generator'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface MenuItem {
  id: string
  name: string
  description: string
  categoryId: string
  category: string
  price: number
  costPrice?: number
  image?: string
  isVeg: boolean
  isVegan?: boolean
  isSpicy?: boolean
  spiceLevel?: number
  isAvailable: boolean
  prepTime: number
  rating?: number
  tags?: string[]
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  displayOrder: number
  itemCount?: number
}

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

export function MenuManagement() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Modals state
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Add Item form state
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [description, setDescription] = useState('')
  const [isVeg, setIsVeg] = useState(true)
  const [isSpicy, setIsSpicy] = useState(false)
  const [prepTime, setPrepTime] = useState('15')
  const [isAvailable, setIsAvailable] = useState(true)
  const [image, setImage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newItemRecipe, setNewItemRecipe] = useState<
    Array<{
      ingredientName: string
      quantity: string
      unit: string
      inventoryItemId?: string
      rawMaterialId?: string
      sku?: string
    }>
  >([])
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false)

  // Handle direct file upload from device / camera
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      setImageLoadError(false)

      // 1. Instant client preview with FileReader
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result)
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
        setImage(json.url)
      }
    } catch (err) {
      console.warn('Upload error, kept data URL preview:', err)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  // Recipe / Bill of Materials (BOM) state
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [recipeItem, setRecipeItem] = useState<MenuItem | null>(null)
  const [recipeIngredients, setRecipeIngredients] = useState<
    Array<{
      ingredientName: string
      quantity: string
      unit: string
      inventoryItemId?: string
      rawMaterialId?: string
      sku?: string
    }>
  >([])
  const [inventoryOptions, setInventoryOptions] = useState<
    Array<{
      key: string
      name: string
      sku: string
      quantity: number
      unit: string
      source: 'inventory' | 'raw_material' | 'both'
      inventoryItemId?: string
      rawMaterialId?: string
      status: 'in-stock' | 'low-stock' | 'out-of-stock'
    }>
  >([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeSaving, setRecipeSaving] = useState(false)

  // Add / Manage Category form state
  const [catName, setCatName] = useState('')
  const [catDescription, setCatDescription] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatDescription, setEditCatDescription] = useState('')
  const [savingCatId, setSavingCatId] = useState<string | null>(null)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null)
  const [reassignTargetCatId, setReassignTargetCatId] = useState<string>('')
  const [catError, setCatError] = useState<string | null>(null)

  // Fetch live categories and items in parallel from fast cached backend APIs
  const loadMenuData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const [catRes, itemsRes] = await Promise.all([
        fetch('/api/menu/categories', { cache: 'no-store' }),
        fetch('/api/menu/items', { cache: 'no-store' }),
      ])
      const [catJson, itemsJson] = await Promise.all([
        catRes.json(),
        itemsRes.json(),
      ])

      if (catJson.success && Array.isArray(catJson.data)) {
        const cleanCats = catJson.data.filter((c: any) => (c.name || '').toLowerCase().trim() !== 'inventory')
        setCategories(cleanCats)
        setCategoryId((prev) => prev || (cleanCats[0]?.id || ''))
      }
      if (itemsJson.success && Array.isArray(itemsJson.data)) {
        const cleanItems = itemsJson.data.filter(
          (item: any) =>
            (item.category || '').toLowerCase().trim() !== 'inventory' &&
            !/^sku:\s*[^\s|]+\s*\|/i.test(item.description || '')
        )
        setItems(cleanItems)
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('Failed to load menu data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/menu/categories', { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        const cleanCats = json.data.filter((c: any) => (c.name || '').toLowerCase().trim() !== 'inventory')
        setCategories(cleanCats)
      }
    } catch (err) {
      console.error('Failed to load menu categories:', err)
    }
  }, [])

  const fetchItems = useCallback(async () => {
    await loadMenuData(false)
  }, [loadMenuData])

  const fetchInventoryOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/recipes?optionsOnly=true', { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.data?.inventoryOptions)) {
        setInventoryOptions(json.data.inventoryOptions)
      }
    } catch (err) {
      console.error('Failed to load inventory options:', err)
    }
  }, [])

  useEffect(() => {
    loadMenuData(true)
    fetchInventoryOptions()
  }, [loadMenuData, fetchInventoryOptions])

  // Refresh inventory stock options whenever Add Item modal opens
  useEffect(() => {
    if (addItemOpen) {
      fetchInventoryOptions()
    }
  }, [addItemOpen, fetchInventoryOptions])

  // Toggle item availability
  const handleToggleAvailability = async (item: MenuItem) => {
    const newStatus = !item.isAvailable
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newStatus } : i))
    )

    try {
      const res = await fetch(`/api/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
    } catch (err) {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i))
      )
    }
  }

  // Delete item
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${itemName}" from the menu?`)) {
      return
    }

    try {
      const res = await fetch(`/api/menu/items/${itemId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId))
        fetchCategories()
        setFeedback({ type: 'success', message: `"${itemName}" removed successfully.` })
        setTimeout(() => setFeedback(null), 3000)
      } else {
        alert(json.message || 'Failed to delete item')
      }
    } catch (err) {
      console.error('Delete item error:', err)
      alert('Network error while deleting item')
    }
  }

  // Open Recipe / BOM configuration modal
  const openRecipeModal = async (item: MenuItem) => {
    setRecipeItem(item)
    setRecipeOpen(true)
    setRecipeLoading(true)
    try {
      const res = await fetch(`/api/inventory/recipes?menuItemId=${item.id}`, { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.data?.inventoryOptions)) {
        setInventoryOptions(json.data.inventoryOptions)
      }
      if (json.success && json.data?.recipe) {
        setRecipeIngredients(
          json.data.recipe.map((r: any) => ({
            inventoryItemId: r.inventoryItemId,
            rawMaterialId: r.rawMaterialId,
            sku: r.sku,
            ingredientName: r.ingredientName,
            quantity: String(r.quantity),
            unit: r.unit || 'kg',
          }))
        )
      } else {
        setRecipeIngredients([])
      }
    } catch (err) {
      console.error('Failed to load recipe:', err)
    } finally {
      setRecipeLoading(false)
    }
  }

  // Save Recipe / BOM configuration
  const handleSaveRecipe = async () => {
    if (!recipeItem) return
    try {
      setRecipeSaving(true)
      const validIngredients = recipeIngredients
        .filter((r) => r.ingredientName.trim())
        .map((r) => ({
          inventoryItemId: r.inventoryItemId,
          rawMaterialId: r.rawMaterialId,
          sku: r.sku,
          ingredientName: r.ingredientName.trim(),
          quantity: parseFloat(r.quantity) || 0.1,
          unit: r.unit.trim() || 'kg',
        }))

      const res = await fetch('/api/inventory/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: recipeItem.id,
          recipe: validIngredients,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setRecipeOpen(false)
        await fetchItems()
        setFeedback({
          type: 'success',
          message: `Recipe saved! Raw materials will auto-deduct when "${recipeItem.name}" is prepared.`,
        })
      } else {
        alert(json.error || 'Failed to save recipe')
      }
    } catch (err) {
      console.error('Failed to save recipe:', err)
      alert('Network error saving recipe')
    } finally {
      setRecipeSaving(false)
    }
  }

  // Resolve matching inventory option for a recipe ingredient row
  const findMatchedInventory = (ing: {
    inventoryItemId?: string
    rawMaterialId?: string
    sku?: string
    ingredientName: string
  }) => {
    const norm = ing.ingredientName.toLowerCase().trim()
    return inventoryOptions.find(
      (opt) =>
        (ing.inventoryItemId && opt.inventoryItemId === ing.inventoryItemId) ||
        (ing.rawMaterialId && opt.rawMaterialId === ing.rawMaterialId) ||
        (ing.sku && opt.sku.toLowerCase() === ing.sku.toLowerCase()) ||
        (norm && (opt.name.toLowerCase().trim() === norm || opt.name.toLowerCase().includes(norm)))
    )
  }

  // Shared helper to render inventory-linked recipe rows in Add Item and Recipe dialogs
  const renderRecipeRows = (
    rows: Array<{
      ingredientName: string
      quantity: string
      unit: string
      inventoryItemId?: string
      rawMaterialId?: string
      sku?: string
    }>,
    setRows: React.Dispatch<
      React.SetStateAction<
        Array<{
          ingredientName: string
          quantity: string
          unit: string
          inventoryItemId?: string
          rawMaterialId?: string
          sku?: string
        }>
      >
    >
  ) => (
    <div className="space-y-2">
      {rows.map((ing, idx) => {
        const matched = findMatchedInventory(ing)
        return (
          <div key={idx} className="space-y-1.5 bg-background border rounded-lg p-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <select
                  value={matched?.key || '__custom__'}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '__custom__') {
                      setRows((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                inventoryItemId: undefined,
                                rawMaterialId: undefined,
                                sku: undefined,
                              }
                            : item
                        )
                      )
                      return
                    }
                    const picked = inventoryOptions.find((o) => o.key === val)
                    if (picked) {
                      setRows((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                ingredientName: picked.name,
                                unit: picked.unit || item.unit,
                                inventoryItemId: picked.inventoryItemId,
                                rawMaterialId: picked.rawMaterialId,
                                sku: picked.sku,
                              }
                            : item
                        )
                      )
                    }
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-medium"
                >
                  <option value="__custom__">-- Custom / Type Name --</option>
                  {inventoryOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.name} ({opt.quantity} {opt.unit}{' '}
                      {opt.status === 'out-of-stock'
                        ? '• OUT OF STOCK'
                        : opt.status === 'low-stock'
                        ? '• Low'
                        : '• In Stock'}
                      )
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="Qty"
                  value={ing.quantity}
                  onChange={(e) => {
                    const val = e.target.value
                    setRows((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                    )
                  }}
                  className="h-8 text-xs text-right font-mono"
                />
              </div>
              <div className="w-16">
                <select
                  value={ing.unit}
                  onChange={(e) => {
                    const val = e.target.value
                    setRows((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                    )
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-1.5 text-xs"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                title="Remove Ingredient"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            {!matched && (
              <Input
                placeholder="Ingredient Name (e.g. Paneer, Onion, Oil)"
                value={ing.ingredientName}
                onChange={(e) => {
                  const val = e.target.value
                  setRows((prev) =>
                    prev.map((item, i) =>
                      i === idx
                        ? {
                            ...item,
                            ingredientName: val,
                            inventoryItemId: undefined,
                            rawMaterialId: undefined,
                            sku: undefined,
                          }
                        : item
                    )
                  )
                }}
                className="h-7 text-xs"
              />
            )}

            <div className="flex items-center justify-between text-[11px] px-0.5">
              {matched ? (
                <span
                  className={cn(
                    'font-medium',
                    matched.status === 'out-of-stock'
                      ? 'text-destructive'
                      : matched.status === 'low-stock'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  )}
                >
                  {matched.status === 'out-of-stock'
                    ? `⚠️ Out of Stock in Inventory (0 ${matched.unit})`
                    : `✓ Linked to Inventory: ${matched.quantity} ${matched.unit} available`}
                </span>
              ) : (
                <span className="text-amber-600">
                  ⚠️ Not found in Inventory — add &quot;{ing.ingredientName || 'item'}&quot; in Inventory for auto-deduction
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Handle Add Item Submit
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !categoryId || !price) {
      alert('Item name, category, and price are required.')
      return
    }

    setSaving(true)
    try {
      const validRecipe = newItemRecipe
        .filter((r) => r.ingredientName.trim())
        .map((r) => ({
          inventoryItemId: r.inventoryItemId,
          rawMaterialId: r.rawMaterialId,
          sku: r.sku,
          ingredientName: r.ingredientName.trim(),
          quantity: parseFloat(r.quantity) || 0.1,
          unit: r.unit.trim() || 'kg',
        }))

      const res = await fetch('/api/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          categoryId,
          price: parseFloat(price),
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
          description: description.trim(),
          isVeg,
          isSpicy,
          prepTime: parseInt(prepTime) || 15,
          isAvailable,
          imageUrl: image.trim(),
          image: image.trim(),
          ...(validRecipe.length > 0 ? { recipe: validRecipe } : {}),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to add item')
      }

      // Prepend newly created item
      setItems((prev) => [json.data, ...prev])
      fetchCategories()
      setAddItemOpen(false)

      // Reset form
      setName('')
      setPrice('')
      setCostPrice('')
      setDescription('')
      setIsVeg(true)
      setIsSpicy(false)
      setPrepTime('15')
      setIsAvailable(true)
      setImage('')
      setImageLoadError(false)
      setNewItemRecipe([])

      setFeedback({ type: 'success', message: `Item "${json.data.name}" added to menu!` })
      setTimeout(() => setFeedback(null), 3500)
    } catch (err: any) {
      alert(err.message || 'Error creating menu item')
    } finally {
      setSaving(false)
    }
  }

  // Open Edit Item Modal
  const openEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setName(item.name)
    setCategoryId(item.categoryId)
    setPrice(String(item.price))
    setCostPrice(item.costPrice ? String(item.costPrice) : '')
    setDescription(item.description || '')
    setIsVeg(item.isVeg)
    setIsSpicy(Boolean(item.isSpicy))
    setPrepTime(String(item.prepTime || 15))
    setIsAvailable(item.isAvailable)
    setImage(item.image || (item as any).imageUrl || '')
    setImageLoadError(false)
    setEditItemOpen(true)
  }

  // Handle Edit Item Submit (0ms optimistic save with automatic rollback on failure)
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    const targetItem = editingItem
    const nextName = name.trim()
    const nextPrice = parseFloat(price)
    const nextCostPrice = costPrice ? parseFloat(costPrice) : undefined
    const nextDescription = description.trim()
    const nextPrepTime = parseInt(prepTime) || 15
    const nextImage = image.trim()
    const matchedCat = categories.find((c) => c.id === categoryId)

    const optimisticItem: MenuItem = {
      ...targetItem,
      name: nextName,
      categoryId,
      category: matchedCat?.name || targetItem.category,
      price: !isNaN(nextPrice) ? nextPrice : targetItem.price,
      costPrice: nextCostPrice,
      description: nextDescription,
      isVeg,
      isSpicy,
      prepTime: nextPrepTime,
      isAvailable,
      image: nextImage,
    }

    const previousItems = items
    setItems((prev) => prev.map((i) => (i.id === targetItem.id ? optimisticItem : i)))
    setEditItemOpen(false)
    setEditingItem(null)
    setImage('')
    setImageLoadError(false)
    setFeedback({ type: 'success', message: `Item "${nextName}" updated!` })
    setTimeout(() => setFeedback(null), 3000)

    try {
      const res = await fetch(`/api/menu/items/${targetItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          categoryId,
          price: nextPrice,
          costPrice: nextCostPrice,
          description: nextDescription,
          isVeg,
          isSpicy,
          prepTime: nextPrepTime,
          isAvailable,
          imageUrl: nextImage,
          image: nextImage,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update item')
      }

      if (json.data) {
        setItems((prev) => prev.map((i) => (i.id === targetItem.id ? json.data : i)))
      }
    } catch (err: any) {
      setItems(previousItems)
      setFeedback({ type: 'error', message: err.message || 'Error updating item' })
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  // Handle Create Category Submit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) {
      setCatError('Category name is required')
      return
    }

    setSaving(true)
    setCatError(null)
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          description: catDescription.trim(),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create category')
      }

      if (json.data) {
        setCategories((prev) => [...prev.filter((c) => c.id !== json.data.id), json.data])
      }
      setAddCatOpen(false)
      setCatName('')
      setCatDescription('')
      setCatError(null)

      setFeedback({ type: 'success', message: `Category "${json.data.name}" created!` })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: any) {
      setCatError(err.message || 'Error creating category')
    } finally {
      setSaving(false)
    }
  }

  // Handle Inline Category Edit Save (0ms optimistic update + fast PATCH sync)
  const handleUpdateCategory = async (cat: MenuCategory) => {
    const trimmedName = editCatName.trim()
    const trimmedDesc = editCatDescription.trim()

    if (!trimmedName) {
      setCatError('Category name is required')
      return
    }
    if (trimmedName.toLowerCase() === 'inventory') {
      setCatError('"Inventory" is a reserved category name')
      return
    }
    const duplicate = categories.find(
      (c) => c.id !== cat.id && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicate) {
      setCatError(`Category "${trimmedName}" already exists`)
      return
    }

    // No-op fast exit if unchanged
    if (trimmedName === cat.name && trimmedDesc === (cat.description || '')) {
      setEditingCatId(null)
      setCatError(null)
      return
    }

    const previousCategories = categories
    const previousItems = items

    // 1. Instant 0ms optimistic UI update
    setCatError(null)
    setEditingCatId(null)
    setSavingCatId(cat.id)
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id ? { ...c, name: trimmedName, description: trimmedDesc } : c
      )
    )
    if (trimmedName !== cat.name) {
      setItems((prev) =>
        prev.map((i) =>
          i.categoryId === cat.id || i.category.toLowerCase() === cat.name.toLowerCase()
            ? { ...i, category: trimmedName }
            : i
        )
      )
    }
    setFeedback({ type: 'success', message: `Category "${trimmedName}" updated!` })
    setTimeout(() => setFeedback(null), 3000)

    // 2. Persist in DB without blocking UI close/interaction
    try {
      const res = await fetch(`/api/menu/categories/${encodeURIComponent(cat.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDesc,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update category')
      }
      if (json.data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, ...json.data } : c))
        )
      }
    } catch (err: any) {
      // Revert optimistic changes if server validation fails
      setCategories(previousCategories)
      setItems(previousItems)
      setEditingCatId(cat.id)
      setEditCatName(trimmedName)
      setEditCatDescription(trimmedDesc)
      setCatError(err.message || 'Failed to save category changes')
    } finally {
      setSavingCatId(null)
    }
  }

  // Handle Delete Category (supports empty delete, reassigning items, or force deleting with items)
  const handleDeleteCategory = async (
    cat: MenuCategory,
    options?: { force?: boolean; reassignTo?: string }
  ) => {
    setDeletingCatId(cat.id)
    setCatError(null)
    try {
      const params = new URLSearchParams()
      if (options?.force) params.set('force', 'true')
      if (options?.reassignTo) params.set('reassignTo', options.reassignTo)
      const qs = params.toString()

      const res = await fetch(
        `/api/menu/categories/${encodeURIComponent(cat.id)}${qs ? `?${qs}` : ''}`,
        { method: 'DELETE' }
      )
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete category')
      }

      const remaining = categories.filter((c) => c.id !== cat.id)
      setCategories(remaining)
      setConfirmDeleteCatId(null)
      setReassignTargetCatId('')

      if (options?.force) {
        setItems((prev) =>
          prev.filter(
            (i) => i.categoryId !== cat.id && i.category.toLowerCase() !== cat.name.toLowerCase()
          )
        )
      } else if (options?.reassignTo) {
        const targetCat = remaining.find((c) => c.id === options.reassignTo)
        setItems((prev) =>
          prev.map((i) =>
            i.categoryId === cat.id || i.category.toLowerCase() === cat.name.toLowerCase()
              ? {
                  ...i,
                  categoryId: options.reassignTo!,
                  category: targetCat?.name || i.category,
                }
              : i
          )
        )
      }

      if (
        selectedCategory === cat.id ||
        selectedCategory.toLowerCase() === cat.name.toLowerCase()
      ) {
        setSelectedCategory('all')
      }
      if (categoryId === cat.id) {
        setCategoryId(remaining[0]?.id || '')
      }

      setFeedback({ type: 'success', message: json.message || `Category "${cat.name}" deleted!` })
      setTimeout(() => setFeedback(null), 3500)
      loadMenuData(false)
    } catch (err: any) {
      setCatError(err.message || 'Error deleting category')
    } finally {
      setDeletingCatId(null)
    }
  }

  // Filtered items based on search and selected category tab
  const filteredItems = items.filter((item) => {
    const matchCat =
      selectedCategory === 'all' ||
      item.categoryId === selectedCategory ||
      item.category.toLowerCase() === selectedCategory.toLowerCase()

    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)

    return matchCat && matchSearch
  })

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Table QR Generator Modal */}
      <TableQRGenerator
        isOpen={qrGeneratorOpen}
        onClose={() => setQrGeneratorOpen(false)}
        restaurantName="RestoSphere"
      />
      {/* Toast Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-medium animate-in fade-in slide-in-from-top-1 border',
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          )}
        >
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Summary stats from live PostgreSQL data */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Items', value: items.length },
          { label: 'Available', value: items.filter((i) => i.isAvailable).length },
          { label: 'Veg Items', value: items.filter((i) => i.isVeg).length },
          { label: 'Categories', value: categories.length },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5 text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="pl-9 h-9 bg-background/50 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Table QR Generator Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQrGeneratorOpen(true)}
            className="gap-1.5 h-9 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 shadow-sm"
          >
            <QrCode className="size-4" />
            Table QR Codes
          </Button>

          {/* Customer Menu Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/menu?table=1', '_blank')}
            className="gap-1.5 h-9 text-xs font-medium border border-border"
            title="Open Customer QR Menu in new tab"
          >
            <ExternalLink className="size-3.5" />
            Customer View
          </Button>

          {/* Add Category Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddCatOpen(true)}
            className="gap-1.5 h-9 text-xs font-semibold cursor-pointer"
          >
            <FolderPlus className="size-4" />
            Add Category
          </Button>

          {/* Add Item Button */}
          <Button
            size="sm"
            onClick={() => {
              if (categories.length === 0) {
                alert('Please create at least one category before adding menu items.')
                setAddCatOpen(true)
                return
              }
              setAddItemOpen(true)
            }}
            className="gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Plus className="size-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1.5 bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs h-8 px-3 cursor-pointer border border-border/50"
          >
            All Items
            <span className="ml-1.5 opacity-70">({items.length})</span>
          </TabsTrigger>

          {categories.map((cat) => {
            const count = items.filter(
              (i) => i.categoryId === cat.id || i.category.toLowerCase() === cat.name.toLowerCase()
            ).length

            return (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs h-8 px-3 cursor-pointer border border-border/50"
              >
                {cat.name}
                <span className="ml-1.5 opacity-70">({count})</span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Menu items card table / list */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs">Loading live menu from database...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <UtensilsCrossed className="size-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {search.trim() ? 'No Matching Items Found' : 'No Menu Items Added Yet'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
              {search.trim()
                ? `No items match "${search}". Try searching for another item or clear the filter.`
                : 'Your restaurant menu is currently empty. Click "Add Item" to add delicious dishes to your live menu.'}
            </p>
            {search.trim() ? (
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Clear Search Filter
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  if (categories.length === 0) {
                    setAddCatOpen(true)
                  } else {
                    setAddItemOpen(true)
                  }
                }}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                {categories.length === 0 ? 'Create First Category' : 'Add First Menu Item'}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group',
                  !item.isAvailable && 'opacity-60 bg-muted/10'
                )}
              >
                {/* Veg / Non-Veg Indicator */}
                <div
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-sm border-2',
                    item.isVeg ? 'border-success' : 'border-destructive'
                  )}
                  title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                >
                  <div
                    className={cn(
                      'size-2 rounded-full',
                      item.isVeg ? 'bg-success' : 'bg-destructive'
                    )}
                  />
                </div>

                {/* Dish Photo Thumbnail */}
                {item.image && (
                  <div className="size-9 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-muted/40 hidden sm:block">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Name, Tag, Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate text-foreground">
                      {item.name}
                    </span>
                    {item.isSpicy && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 text-destructive border-destructive/30 gap-0.5">
                        <Flame className="size-2.5" />
                        Spicy
                      </Badge>
                    )}
                    {!item.isAvailable && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 text-muted-foreground">
                        Out of stock
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Category badge */}
                <Badge variant="outline" className="hidden sm:flex text-xs capitalize shrink-0">
                  {item.category}
                </Badge>

                {/* Prep time */}
                <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="size-3" />
                  {item.prepTime}m
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-foreground">₹{item.price}</span>
                  {item.costPrice !== undefined && item.costPrice > 0 && (
                    <span className="block text-[10px] text-muted-foreground">
                      Cost: ₹{item.costPrice}
                    </span>
                  )}
                </div>

                {/* Toggle availability */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 cursor-pointer"
                  onClick={() => handleToggleAvailability(item)}
                  title={item.isAvailable ? 'Click to mark Out of Stock' : 'Click to mark Available'}
                >
                  {item.isAvailable ? (
                    <ToggleRight className="size-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="size-5 text-muted-foreground" />
                  )}
                </Button>

                {/* Actions (Recipe / Edit / Delete) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 cursor-pointer hover:text-amber-500"
                    onClick={() => openRecipeModal(item)}
                    title="Recipe / Raw Materials (BOM)"
                  >
                    <ChefHat className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 cursor-pointer hover:text-primary"
                    onClick={() => openEditModal(item)}
                    title="Edit Item"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 cursor-pointer hover:text-destructive"
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    title="Delete Item"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ─── ADD ITEM DIALOG ────────────────────────────────────── */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Create a new dish or beverage. It will appear immediately in your restaurant menu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-4 py-2">
            {/* Item Name */}
            <div className="space-y-1.5">
              <Label htmlFor="item-name" className="text-xs font-medium">
                Item Name *
              </Label>
              <Input
                id="item-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Paneer Tikka Masala"
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Category & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="item-category" className="text-xs font-medium">
                  Category *
                </Label>
                <select
                  id="item-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-price" className="text-xs font-medium">
                  Base Price (₹) *
                </Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="249.00"
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="item-desc" className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id="item-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fresh cottage cheese cubes cooked in rich tandoori gravy..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Prep Time & Cost Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="item-preptime" className="text-xs font-medium">
                  Prep Time (minutes)
                </Label>
                <Input
                  id="item-preptime"
                  type="number"
                  min="1"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="15"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-cost" className="text-xs font-medium">
                  Cost Price (₹) <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="item-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="120.00"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* ── Dish Photo Upload & Image Address Section ── */}
            <div className="p-3 rounded-2xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-primary" />
                  Dish Photo (File Upload or Image URL)
                </label>
                {image && (
                  <button
                    type="button"
                    onClick={() => {
                      setImage('')
                      setImageLoadError(false)
                    }}
                    className="text-[11px] text-destructive hover:underline flex items-center gap-0.5 cursor-pointer"
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
                  className="h-8 px-3 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
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
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value)
                    setImageLoadError(false)
                  }}
                  className="h-8 text-xs bg-background flex-1"
                />
              </div>

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
                        setImage(food.url)
                        setImageLoadError(false)
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-border bg-background hover:border-primary/50 text-foreground transition-all cursor-pointer"
                    >
                      + {food.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Image Preview Box */}
              {image && (
                <div className="relative rounded-xl border border-border overflow-hidden bg-background p-2 flex items-center gap-3 animate-in fade-in">
                  <div className="relative size-16 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-muted/40">
                    <img
                      src={image}
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
                          Ready for catalog and customer menu display.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dietary Type & Spicy Options */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="dietary"
                    checked={isVeg}
                    onChange={() => setIsVeg(true)}
                    className="text-success focus:ring-success"
                  />
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-success" />
                    Veg
                  </span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="dietary"
                    checked={!isVeg}
                    onChange={() => setIsVeg(false)}
                    className="text-destructive focus:ring-destructive"
                  />
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-destructive" />
                    Non-Veg
                  </span>
                </label>
              </div>

              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpicy}
                  onChange={(e) => setIsSpicy(e.target.checked)}
                  className="rounded text-primary"
                />
                <span className="flex items-center gap-1">
                  <Flame className="size-3 text-destructive" />
                  Spicy
                </span>
              </label>
            </div>

            {/* ── Inventory / Raw Materials Mapping (Auto-Deduct on Prepare) ── */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ChefHat className="size-3.5 text-amber-500" />
                    Raw Materials / Inventory Link (Optional)
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Check if ingredients exist in Inventory; stock auto-deducts when Chef marks Ready.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2 gap-1"
                  onClick={() =>
                    setNewItemRecipe((prev) => [
                      ...prev,
                      {
                        ingredientName: inventoryOptions[0]?.name || '',
                        quantity: '0.1',
                        unit: inventoryOptions[0]?.unit || 'kg',
                        inventoryItemId: inventoryOptions[0]?.inventoryItemId,
                        rawMaterialId: inventoryOptions[0]?.rawMaterialId,
                        sku: inventoryOptions[0]?.sku,
                      },
                    ])
                  }
                >
                  <Plus className="size-3" /> Add Ingredient
                </Button>
              </div>

              {newItemRecipe.length > 0 && renderRecipeRows(newItemRecipe, setNewItemRecipe)}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddItemOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  'Add to Menu'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT ITEM DIALOG ────────────────────────────────────── */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update item specifications, price, or category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateItem} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-medium">
                Item Name *
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-category" className="text-xs font-medium">
                  Category *
                </Label>
                <select
                  id="edit-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-price" className="text-xs font-medium">
                  Base Price (₹) *
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-preptime" className="text-xs font-medium">
                  Prep Time (minutes)
                </Label>
                <Input
                  id="edit-preptime"
                  type="number"
                  min="1"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cost" className="text-xs font-medium">
                  Cost Price (₹)
                </Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* ── Dish Photo Upload & Image Address Section ── */}
            <div className="p-3 rounded-2xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-primary" />
                  Dish Photo (File Upload or Image URL)
                </label>
                {image && (
                  <button
                    type="button"
                    onClick={() => {
                      setImage('')
                      setImageLoadError(false)
                    }}
                    className="text-[11px] text-destructive hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <X className="size-3" />
                    Remove
                  </button>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={editFileInputRef}
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
                  onClick={() => editFileInputRef.current?.click()}
                  className="h-8 px-3 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
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
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value)
                    setImageLoadError(false)
                  }}
                  className="h-8 text-xs bg-background flex-1"
                />
              </div>

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
                        setImage(food.url)
                        setImageLoadError(false)
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-border bg-background hover:border-primary/50 text-foreground transition-all cursor-pointer"
                    >
                      + {food.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Image Preview Box */}
              {image && (
                <div className="relative rounded-xl border border-border overflow-hidden bg-background p-2 flex items-center gap-3 animate-in fade-in">
                  <div className="relative size-16 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-muted/40">
                    <img
                      src={image}
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
                          Ready for catalog and customer menu display.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dietary & Spicy */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="edit-dietary"
                    checked={isVeg}
                    onChange={() => setIsVeg(true)}
                  />
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-success" />
                    Veg
                  </span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="edit-dietary"
                    checked={!isVeg}
                    onChange={() => setIsVeg(false)}
                  />
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-destructive" />
                    Non-Veg
                  </span>
                </label>
              </div>

              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpicy}
                  onChange={(e) => setIsSpicy(e.target.checked)}
                />
                <span className="flex items-center gap-1">
                  <Flame className="size-3 text-destructive" />
                  Spicy
                </span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditItemOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── ADD / MANAGE CATEGORY DIALOG ────────────────────────── */}
      <Dialog
        open={addCatOpen}
        onOpenChange={(open) => {
          setAddCatOpen(open)
          if (!open) {
            setCatError(null)
            setConfirmDeleteCatId(null)
            setEditingCatId(null)
            setEditCatName('')
            setEditCatDescription('')
            setReassignTargetCatId('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[88vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Manage Menu Categories</DialogTitle>
            <DialogDescription>
              Create, edit, or delete menu categories from your menu.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {catError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{catError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name" className="text-xs font-medium">
                  Category Name *
                </Label>
                <Input
                  id="cat-name"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Beverages, Desserts"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-desc" className="text-xs font-medium">
                  Description <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="cat-desc"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Refreshing soft drinks, mocktails and fresh juices"
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddCatOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Creating...
                    </>
                  ) : (
                    'Create Category'
                  )}
                </Button>
              </DialogFooter>
            </form>

            {/* Existing Categories List with Edit & Delete Options */}
            {categories.length > 0 && (
              <div className="border-t border-border/70 pt-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Existing Categories ({categories.length})</span>
                  <span className="font-normal normal-case text-right">Edit or delete</span>
                </div>

                <div className="space-y-2">
                {categories.map((cat) => {
                  const count = items.filter(
                    (i) => i.categoryId === cat.id || i.category.toLowerCase() === cat.name.toLowerCase()
                  ).length
                  const isEditing = editingCatId === cat.id
                  const isConfirming = confirmDeleteCatId === cat.id
                  const isDeleting = deletingCatId === cat.id
                  const isSavingCat = savingCatId === cat.id
                  const otherCategories = categories.filter((c) => c.id !== cat.id)

                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-border/70 bg-muted/25 p-3 text-xs space-y-2.5"
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            handleUpdateCategory(cat)
                          }}
                          className="space-y-2"
                        >
                          <Input
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingCatId(null)
                                setCatError(null)
                              }
                            }}
                            placeholder="Category name"
                            autoFocus
                            required
                            className="h-8 text-xs font-semibold bg-background"
                          />
                          <Input
                            value={editCatDescription}
                            onChange={(e) => setEditCatDescription(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingCatId(null)
                                setCatError(null)
                              }
                            }}
                            placeholder="Description (optional)"
                            className="h-8 text-xs bg-background"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-0.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCatId(null)
                                setCatError(null)
                              }}
                              className="h-7 px-2.5 text-[11px] cursor-pointer"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={!editCatName.trim() || isSavingCat}
                              className="h-7 px-3 text-[11px] font-bold cursor-pointer"
                            >
                              {isSavingCat ? (
                                <Loader2 className="size-3 animate-spin mr-1" />
                              ) : null}
                              Save
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground truncate">{cat.name}</span>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4.5 px-1.5 font-mono text-muted-foreground"
                              >
                                {count} {count === 1 ? 'item' : 'items'}
                              </Badge>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {cat.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isConfirming && count === 0 ? (
                              <>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="h-7 px-2.5 text-[11px] font-bold cursor-pointer"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    'Confirm'
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteCatId(null)}
                                  className="size-7 cursor-pointer"
                                  title="Cancel delete"
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </>
                            ) : !isConfirming ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={Boolean(deletingCatId)}
                                  onClick={() => {
                                    setCatError(null)
                                    setConfirmDeleteCatId(null)
                                    setEditingCatId(cat.id)
                                    setEditCatName(cat.name)
                                    setEditCatDescription(cat.description || '')
                                  }}
                                  className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                  title={`Edit ${cat.name}`}
                                >
                                  <Edit2 className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={Boolean(deletingCatId)}
                                  onClick={() => {
                                    setCatError(null)
                                    setEditingCatId(null)
                                    setConfirmDeleteCatId(cat.id)
                                    setReassignTargetCatId(otherCategories[0]?.id || '')
                                  }}
                                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title={`Delete ${cat.name}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isDeleting}
                                onClick={() => setConfirmDeleteCatId(null)}
                                className="size-7 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Safe inline options when deleting a category that still has items */}
                      {isConfirming && count > 0 && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-2">
                          <p className="text-[11px] font-medium text-foreground">
                            <strong>{cat.name}</strong> has {count} active {count === 1 ? 'dish' : 'dishes'}. Move dishes to another category or delete all:
                          </p>

                          {otherCategories.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={reassignTargetCatId}
                                onChange={(e) => setReassignTargetCatId(e.target.value)}
                                disabled={isDeleting}
                                className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-[11px] font-medium"
                              >
                                {otherCategories.map((oc) => (
                                  <option key={oc.id} value={oc.id}>
                                    Move to: {oc.name}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isDeleting || !reassignTargetCatId}
                                onClick={() =>
                                  handleDeleteCategory(cat, { reassignTo: reassignTargetCatId })
                                }
                                className="h-7 px-2.5 text-[11px] font-semibold shrink-0 cursor-pointer"
                              >
                                {isDeleting ? <Loader2 className="size-3 animate-spin" /> : 'Move & Delete'}
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={isDeleting}
                              onClick={() => handleDeleteCategory(cat, { force: true })}
                              className="h-7 px-2.5 text-[11px] font-bold cursor-pointer"
                            >
                              {isDeleting ? (
                                <Loader2 className="size-3 animate-spin mr-1" />
                              ) : null}
                              Delete Category &amp; {count} {count === 1 ? 'Item' : 'Items'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ─── RECIPE (BOM) DIALOG ──────────────────────────────────── */}
      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="size-5 text-amber-500" />
              <span>Recipe & Raw Material Consumption</span>
            </DialogTitle>
            <DialogDescription>
              {recipeItem?.name ? (
                <span>
                  Configure ingredients used per serving of{' '}
                  <strong className="text-foreground">{recipeItem.name}</strong>. Stock will auto-deduct in real-time when prepared in Kitchen.
                </span>
              ) : (
                'Configure raw material consumption for this dish.'
              )}
            </DialogDescription>
          </DialogHeader>

          {recipeLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span>Loading recipe breakdown...</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  Ingredients per <strong>1 serving</strong>
                </span>
                <span className="text-[11px] font-mono bg-background px-2 py-0.5 rounded border">
                  Auto-Deducts on KDS &quot;Ready&quot;
                </span>
              </div>

              {recipeIngredients.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No custom ingredients configured yet.
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    Select from Inventory / Raw Materials below so stock auto-deducts when prepared!
                  </p>
                </div>
              ) : (
                renderRecipeRows(recipeIngredients, setRecipeIngredients)
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 border-dashed gap-1.5"
                onClick={() => {
                  setRecipeIngredients((prev) => [
                    ...prev,
                    {
                      ingredientName: inventoryOptions[0]?.name || '',
                      quantity: '0.1',
                      unit: inventoryOptions[0]?.unit || 'kg',
                      inventoryItemId: inventoryOptions[0]?.inventoryItemId,
                      rawMaterialId: inventoryOptions[0]?.rawMaterialId,
                      sku: inventoryOptions[0]?.sku,
                    },
                  ])
                }}
              >
                <Plus className="size-3.5" /> Add Ingredient
              </Button>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRecipeOpen(false)}
              disabled={recipeSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRecipe}
              disabled={recipeSaving || recipeLoading}
              className="gap-1.5"
            >
              {recipeSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Recipe (BOM)'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
