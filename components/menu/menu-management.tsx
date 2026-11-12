'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false)

  // Add Category form state
  const [catName, setCatName] = useState('')
  const [catDescription, setCatDescription] = useState('')

  // Fetch live categories from PostgreSQL
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/menu/categories')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setCategories(json.data)
        if (!categoryId && json.data.length > 0) {
          setCategoryId(json.data[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load menu categories:', err)
    }
  }, [categoryId])

  // Fetch live items from PostgreSQL
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/menu/items')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data)
      } else {
        setItems([])
      }
    } catch (err) {
      console.error('Failed to load menu items:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [fetchCategories, fetchItems])

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

  // Handle Add Item Submit
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !categoryId || !price) {
      alert('Item name, category, and price are required.')
      return
    }

    setSaving(true)
    try {
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
    setEditItemOpen(true)
  }

  // Handle Edit Item Submit
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setSaving(true)
    try {
      const res = await fetch(`/api/menu/items/${editingItem.id}`, {
        method: 'PATCH',
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
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update item')
      }

      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? json.data : i)))
      fetchCategories()
      setEditItemOpen(false)
      setEditingItem(null)

      setFeedback({ type: 'success', message: `Item "${json.data.name}" updated!` })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: any) {
      alert(err.message || 'Error updating item')
    } finally {
      setSaving(false)
    }
  }

  // Handle Create Category Submit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) {
      alert('Category name is required')
      return
    }

    setSaving(true)
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

      await fetchCategories()
      setAddCatOpen(false)
      setCatName('')
      setCatDescription('')

      setFeedback({ type: 'success', message: `Category "${json.data.name}" created!` })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: any) {
      alert(err.message || 'Error creating category')
    } finally {
      setSaving(false)
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
        restaurantName="Spice Garden Restaurant"
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

                {/* Actions (Edit / Delete) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-md">
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

      {/* ─── ADD CATEGORY DIALOG ─────────────────────────────────── */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Menu Category</DialogTitle>
            <DialogDescription>
              Create a new category to group related dishes (e.g. Starters, Breads, Drinks).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCategory} className="space-y-4 py-2">
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

            <DialogFooter className="pt-2">
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
        </DialogContent>
      </Dialog>
    </main>
  )
}
