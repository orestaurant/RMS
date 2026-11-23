'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  Sparkles,
  UtensilsCrossed,
  ArrowRight,
  ShoppingBag,
  RefreshCw,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QrScannerModal } from '@/components/customer/qr-scanner-modal'
import { cn } from '@/lib/utils'

interface DishSearchResult {
  id: string
  name: string
  description?: string
  categoryId?: string
  category: string
  price: number
  image?: string
  isVeg?: boolean
  isVegan?: boolean
  isSpicy?: boolean
  prepTime?: number
}

interface CustomerTopSearchProps {
  tableNumber?: string
  className?: string
}

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All Dishes' },
  { id: 'Starters', label: 'Starters' },
  { id: 'Main Course', label: 'Main Course' },
  { id: 'Fast Food', label: 'Fast Food' },
  { id: 'Beverages', label: 'Beverages' },
  { id: 'Desserts', label: 'Desserts' },
  { id: 'veg', label: 'Pure Veg 🌱' },
]

export function CustomerTopSearch({
  tableNumber = '1',
  className,
}: CustomerTopSearchProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchResults, setSearchResults] = useState<DishSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Live search dishes with debounce
  useEffect(() => {
    if (!searchQuery.trim() && selectedCategory === 'all') {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const params = new URLSearchParams()
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim())
        }
        if (selectedCategory !== 'all' && selectedCategory !== 'veg') {
          params.set('category', selectedCategory)
        }

        const res = await fetch(`/api/menu/items?${params.toString()}`)
        const json = await res.json()
        if (res.ok && json.success && Array.isArray(json.data)) {
          let items: DishSearchResult[] = json.data
          if (selectedCategory === 'veg') {
            items = items.filter((i) => i.isVeg)
          }
          setSearchResults(items)
          setIsDropdownOpen(true)
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error('Failed to search dishes in navbar:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
        setIsFocused(false)
        setIsMobileExpanded(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false)
        setIsFocused(false)
        setIsMobileExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Execute direct search submission
  const handleSubmitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsDropdownOpen(false)
    setIsMobileExpanded(false)
    const targetUrl = `/menu?search=${encodeURIComponent(searchQuery.trim())}&table=${encodeURIComponent(tableNumber)}`
    router.push(targetUrl)
  }

  const handleClear = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsDropdownOpen(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <>
      <div className={cn('flex items-center gap-1.5 sm:gap-2 w-full max-w-sm md:max-w-md lg:max-w-lg', className)}>
        {/* Search input container */}
        <div
          ref={containerRef}
          className={cn(
            'relative flex-1 min-w-0 transition-all duration-200',
            isMobileExpanded && 'fixed inset-x-2 top-2.5 z-50 max-w-none shadow-2xl rounded-2xl bg-background'
          )}
        >
          {/* ── Search Input Field ── */}
          <form onSubmit={handleSubmitSearch} className="relative flex items-center">
            <Search className="absolute left-3 size-3.5 sm:size-4 text-muted-foreground pointer-events-none transition-colors" />

            <Input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (!isDropdownOpen) setIsDropdownOpen(true)
              }}
              onFocus={() => {
                setIsFocused(true)
                if (window.innerWidth < 640) {
                  setIsMobileExpanded(true)
                }
                if (searchResults.length > 0 || searchQuery.trim() || selectedCategory !== 'all') {
                  setIsDropdownOpen(true)
                }
              }}
              placeholder="Search dishes (e.g. Biryani, Pizza)..."
              className={cn(
                'pl-8 sm:pl-9 pr-14 sm:pr-20 h-8 sm:h-9 text-xs sm:text-sm rounded-full border-border/80 bg-muted/40 hover:bg-muted/60 focus:bg-background transition-all shadow-2xs focus-visible:ring-1 focus-visible:ring-primary',
                (isFocused || isDropdownOpen) && 'bg-background border-primary/50 ring-1 ring-primary/20'
              )}
            />

            {/* Right actions: Clear / Loading / Find button */}
            <div className="absolute right-1 sm:right-1.5 flex items-center gap-1">
              {isSearching ? (
                <RefreshCw className="size-3.5 text-primary animate-spin mr-1" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="size-5 sm:size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3" />
                </button>
              ) : null}

              {/* Quick Find Button */}
              <Button
                type="submit"
                size="sm"
                className="h-6 sm:h-7 px-2 sm:px-2.5 text-[10px] sm:text-xs font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
              >
                <span>Find</span>
              </Button>

              {/* Mobile Collapse Button when expanded on mobile */}
              {isMobileExpanded && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileExpanded(false)
                    setIsDropdownOpen(false)
                  }}
                  className="size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground sm:hidden cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* ── Search Dropdown Results ── */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden max-h-[80vh] sm:max-h-96 flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Category Chips Bar */}
              <div className="p-2 sm:p-2.5 bg-muted/40 border-b border-border/60">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  {CATEGORY_CHIPS.map((chip) => {
                    const isActive = selectedCategory === chip.id
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(chip.id)
                          if (!isDropdownOpen) setIsDropdownOpen(true)
                        }}
                        className={cn(
                          'whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer border',
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-semibold'
                            : 'bg-background/80 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {chip.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Header Info */}
              <div className="px-3 py-2 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles className="size-3 text-primary" />
                  <span>
                    {searchResults.length > 0
                      ? `Dishes Found (${searchResults.length})`
                      : searchQuery
                      ? `Searching for "${searchQuery}"`
                      : 'Popular Menu Categories'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* List of Dishes */}
              <div className="overflow-y-auto divide-y divide-border/40 p-1.5 space-y-1">
                {isSearching ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                    <RefreshCw className="size-5 text-primary animate-spin" />
                    <span>Searching kitchen dishes...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-5 text-center text-xs text-muted-foreground space-y-1.5">
                    {searchQuery ? (
                      <>
                        <p className="font-semibold text-foreground">No dishes matching &ldquo;{searchQuery}&rdquo;</p>
                        <p className="text-[11px]">Try searching &ldquo;paneer&rdquo;, &ldquo;biryani&rdquo;, &ldquo;pizza&rdquo;, or &ldquo;shake&rdquo;</p>
                      </>
                    ) : (
                      <p className="text-[11px]">Select a category or type a dish name above</p>
                    )}
                    <div className="pt-1.5">
                      <Link
                        href={`/menu?table=${encodeURIComponent(tableNumber)}`}
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Button size="sm" variant="outline" className="h-7 text-xs font-medium cursor-pointer">
                          Browse Full Menu Catalog
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  searchResults.map((dish) => (
                    <div
                      key={dish.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="size-10 sm:size-11 rounded-lg object-cover border border-border/60 shrink-0"
                          />
                        ) : (
                          <div className="size-10 sm:size-11 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 border border-orange-500/20">
                            <UtensilsCrossed className="size-4" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                              {dish.name}
                            </span>
                            {dish.isVeg !== undefined && (
                              <span
                                className={cn(
                                  'size-2 rounded-full shrink-0',
                                  dish.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                )}
                                title={dish.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                              />
                            )}
                            {dish.isSpicy && (
                              <span className="text-[9px] px-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                🌶️ Spicy
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded hidden sm:inline">
                              {dish.category}
                            </span>
                          </div>

                          {dish.description && (
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1 truncate">
                              {dish.description}
                            </p>
                          )}

                          <span className="text-xs font-bold text-primary font-mono block">
                            ₹{dish.price}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/menu?search=${encodeURIComponent(dish.name)}&table=${encodeURIComponent(tableNumber)}`}
                        onClick={() => setIsDropdownOpen(false)}
                        className="shrink-0"
                      >
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        >
                          <ShoppingBag className="size-3 hidden xs:inline" />
                          <span>Order</span>
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>

              {/* Footer link to all menu */}
              <div className="p-2 bg-muted/30 border-t border-border/60 text-center">
                <Link
                  href={`/menu?table=${encodeURIComponent(tableNumber)}`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View Complete Menu Catalog</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Camera Scanner Button in Top Bar beside Search Input ── */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 shrink-0 rounded-full border-border/80 bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-2xs cursor-pointer"
          title="Scan Table QR with Camera"
        >
          <Camera className="size-3.5 sm:size-4 text-primary group-hover:text-current" />
          <span>Scan</span>
        </Button>
      </div>

      {/* ── Real-Time Working QR Scanner Modal ── */}
      <QrScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
      />
    </>
  )
}
