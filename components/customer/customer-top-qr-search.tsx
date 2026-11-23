'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  Search,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Camera,
  Sparkles,
  UtensilsCrossed,
  ArrowRight,
  X,
  Flame,
  Leaf,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StickerCard } from '@/components/tables/table-qr-generator'
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

interface CustomerTopQrSearchProps {
  initialTable?: string
  restaurantName?: string
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

export function CustomerTopQrSearch({
  initialTable = '1',
  restaurantName = 'RestoSphere',
}: CustomerTopQrSearchProps) {
  // Table state
  const [tableNumber, setTableNumber] = useState<string>(initialTable)
  const [hostUrl, setHostUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Modals state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraInputTable, setCameraInputTable] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchResults, setSearchResults] = useState<DishSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResultsDropdown, setShowResultsDropdown] = useState(false)
  const [qrCardCollapsed, setQrCardCollapsed] = useState(false)

  // Resolve network host URL for phone QR scan
  useEffect(() => {
    const localOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const defaultHost = process.env.NEXT_PUBLIC_APP_URL || localOrigin
    setHostUrl(defaultHost)

    fetch('/api/system/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.networkUrl) {
          if (
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ) {
            setHostUrl(data.networkUrl)
          }
        }
      })
      .catch((err) => console.warn('Could not resolve LAN IP:', err))
  }, [])

  const getTargetUrl = useCallback(
    (tbl: string | number) => {
      const clean = String(tbl).trim() || '1'
      const base = hostUrl && hostUrl.trim() ? hostUrl.trim().replace(/\/$/, '') : 'http://localhost:3000'
      return `${base}/menu?table=${encodeURIComponent(clean)}&theme=light`
    },
    [hostUrl]
  )

  const formatTableBadge = (tbl: string | number) => {
    const s = String(tbl).trim()
    if (/^\d+$/.test(s)) {
      return `Table ${s.padStart(2, '0')}`
    }
    return s.toLowerCase().startsWith('table') ? s : `Table ${s}`
  }

  // Copy URL with visual feedback
  const handleCopy = () => {
    const url = getTargetUrl(tableNumber)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Live search dishes
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
          setShowResultsDropdown(true)
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error('Failed to search dishes:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory])

  // Camera simulation or device camera stream
  const handleCameraStart = async () => {
    setCameraActive(true)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        const videoEl = document.getElementById('customer-qr-scanner-video') as HTMLVideoElement | null
        if (videoEl) {
          videoEl.srcObject = stream
          videoEl.play()
        }
      }
    } catch (e) {
      console.warn('Camera access not available or denied, using manual fallback:', e)
    }
  }

  const handleCameraStop = () => {
    setCameraActive(false)
    const videoEl = document.getElementById('customer-qr-scanner-video') as HTMLVideoElement | null
    if (videoEl && videoEl.srcObject) {
      const stream = videoEl.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoEl.srcObject = null
    }
  }

  const handleSimulatedTableSelect = (tbl: string) => {
    handleCameraStop()
    setIsCameraModalOpen(false)
    window.location.href = `/menu?table=${encodeURIComponent(tbl)}`
  }

  return (
    <div className="w-full space-y-4">
      {/* ── Top Bar Container: Responsive Card ────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm overflow-hidden">
        {/* Header Ribbon */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border/60 bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <QrCode className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>Scan Table QR & Search Dishes</span>
                <Badge className="bg-primary/15 text-primary text-[10px] py-0 px-2 font-medium border-primary/20">
                  Live Menu
                </Badge>
              </h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Scan QR code with your phone camera or search dishes to view the menu and place your order
              </p>
            </div>
          </div>

          {/* Quick Actions at Top Right */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCameraModalOpen(true)
                handleCameraStart()
              }}
              className="h-8 text-xs font-semibold gap-1.5"
              title="Scan QR with camera"
            >
              <Camera className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Camera Scanner</span>
              <span className="sm:hidden">Scan</span>
            </Button>

            <Link href={getTargetUrl(tableNumber)}>
              <Button
                size="sm"
                className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs cursor-pointer"
              >
                <UtensilsCrossed className="size-3.5" />
                <span>Open Dishes Menu</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQrCardCollapsed(!qrCardCollapsed)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground sm:hidden"
              title={qrCardCollapsed ? 'Expand QR' : 'Collapse QR'}
            >
              {qrCardCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Main Body: Search Bar + QR Sticker Section */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* ── 1. Dishes Search Bar with Category Filter Chips ───── */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!showResultsDropdown) setShowResultsDropdown(true)
                }}
                onFocus={() => {
                  if (searchResults.length > 0 || searchQuery.trim()) {
                    setShowResultsDropdown(true)
                  }
                }}
                placeholder="Search dishes (e.g. Butter Chicken, Paneer Tikka, Biryani, Mojito, Pizza)..."
                className="pl-10 pr-24 h-11 text-xs sm:text-sm rounded-xl border-border/80 focus-visible:ring-primary shadow-xs"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {isSearching ? (
                  <RefreshCw className="size-4 text-primary animate-spin" />
                ) : searchQuery ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                      setShowResultsDropdown(false)
                    }}
                    className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}

                <Link href={`/menu?search=${encodeURIComponent(searchQuery || '')}&table=${tableNumber}`}>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground"
                  >
                    Find
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2.5 scrollbar-none text-xs">
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSelectedCategory(chip.id)}
                    className={cn(
                      'whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>

            {/* Live Search Results Dropdown / Tray */}
            {showResultsDropdown && (searchQuery.trim() || searchResults.length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden max-h-96 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 bg-muted/40 border-b border-border/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Dishes Found ({searchResults.length})
                    </span>
                    {searchQuery && (
                      <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                        for &ldquo;{searchQuery}&rdquo;
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowResultsDropdown(false)}
                    className="size-6 rounded-full"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                <div className="overflow-y-auto divide-y divide-border/50 p-2 space-y-1">
                  {isSearching ? (
                    <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                      <RefreshCw className="size-5 text-primary animate-spin" />
                      <span>Searching restaurant kitchen menu...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">No dishes matching &ldquo;{searchQuery}&rdquo;</p>
                      <p className="text-[11px]">Try searching &ldquo;paneer&rdquo;, &ldquo;pizza&rdquo;, &ldquo;burger&rdquo;, or &ldquo;tea&rdquo;</p>
                      <div className="pt-2">
                        <Link href={`/menu?table=${tableNumber}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Browse All Menu Dishes
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    searchResults.map((dish) => (
                      <div
                        key={dish.id}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="size-12 rounded-lg object-cover border border-border/60 shrink-0"
                            />
                          ) : (
                            <div className="size-12 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 border border-orange-500/20">
                              <UtensilsCrossed className="size-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
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
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-rose-500/30 text-rose-500">
                                  🌶️ Spicy
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {dish.category}
                              </span>
                            </div>

                            {dish.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 truncate mt-0.5">
                                {dish.description}
                              </p>
                            )}

                            <span className="text-xs font-black text-primary font-mono mt-0.5 block">
                              ₹{dish.price}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/menu?search=${encodeURIComponent(dish.name)}&table=${tableNumber}`}
                          className="shrink-0"
                        >
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <ShoppingBag className="size-3" />
                            <span>View & Order</span>
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 bg-muted/30 border-t border-border/70 text-center">
                  <Link
                    href={`/menu?table=${tableNumber}`}
                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    View Complete Menu Catalog <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. QR Code Preview Card & Table Selector (Responsive) ── */}
          {!qrCardCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-xl bg-card border border-border/70 p-4 sm:p-5">
              {/* Left Column: Admin Sticker Card (Scaled & Responsive) */}
              <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center justify-center">
                <div className="transform hover:scale-[1.01] transition-transform w-full max-w-[280px]">
                  <StickerCard
                    tableNumber={tableNumber || '1'}
                    badge={formatTableBadge(tableNumber || '1')}
                    targetUrl={getTargetUrl(tableNumber || '1')}
                    restaurantName={restaurantName}
                    compact
                  />
                </div>
              </div>

              {/* Right Column: Table Controls & Quick Action Guidance */}
              <div className="md:col-span-7 lg:col-span-8 space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Instant Table Ordering QR
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]">
                      Ready to Scan
                    </Badge>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Scan with any phone camera to view dishes & order hot food
                  </h3>
                </div>

                {/* Table Number Switcher */}
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Current Seating Table:</span>
                    <span className="font-mono text-primary font-bold">
                      {formatTableBadge(tableNumber)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="e.g. 1, 2, VIP-1"
                      className="h-8.5 text-xs font-semibold max-w-[140px] rounded-lg bg-background"
                    />
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {['1', '2', '3', '4', '5'].map((tbl) => (
                        <button
                          key={tbl}
                          type="button"
                          onClick={() => setTableNumber(tbl)}
                          className={cn(
                            'px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer',
                            tableNumber === tbl
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                          )}
                        >
                          T-{tbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Link href={getTargetUrl(tableNumber)}>
                    <Button
                      size="sm"
                      className="h-9 gap-1.5 text-xs font-bold shadow-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer"
                    >
                      <UtensilsCrossed className="size-3.5" />
                      <span>Browse Dishes Menu</span>
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    <span>{copied ? 'Link Copied!' : 'Copy Menu URL'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCameraModalOpen(true)
                      handleCameraStart()
                    }}
                    className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Camera className="size-3.5 text-primary" />
                    <span>Scan with Device</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getTargetUrl(tableNumber), '_blank')}
                    className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Open Menu in new tab"
                  >
                    <ExternalLink className="size-3.5" />
                    <span className="hidden sm:inline">Open in Tab</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Camera Scanner Modal ─────────────────────────────── */}
      <Dialog
        open={isCameraModalOpen}
        onOpenChange={(open) => {
          setIsCameraModalOpen(open)
          if (!open) handleCameraStop()
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Camera className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Scan Table QR Code
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Point your phone or laptop camera at the QR code sticker on your table.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Viewfinder */}
            <div className="relative rounded-2xl border-2 border-dashed border-primary/40 bg-muted/30 p-4 flex flex-col items-center justify-center text-center space-y-2 overflow-hidden min-h-[220px]">
              <video
                id="customer-qr-scanner-video"
                autoPlay
                playsInline
                muted
                className="w-full max-w-[280px] h-44 object-cover rounded-xl bg-black/80"
              />

              {/* Scanning crosshair overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="size-36 border-2 border-primary/80 rounded-2xl relative shadow-lg">
                  <div className="absolute inset-x-0 h-0.5 bg-primary animate-pulse" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center text-muted-foreground">
              Align the QR code sticker inside the frame to automatically view dishes
            </p>

            {/* Quick table selector buttons if camera is not available */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <span className="font-semibold text-foreground block">
                Or select your seated table directly:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((tbl) => (
                  <Button
                    key={tbl}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSimulatedTableSelect(tbl)}
                    className="h-8 text-xs font-bold hover:bg-primary hover:text-primary-foreground"
                  >
                    Table {tbl}
                  </Button>
                ))}
              </div>
            </div>

            {/* Manual table input */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                placeholder="Enter Table # (e.g. 5, VIP-2)"
                value={cameraInputTable}
                onChange={(e) => setCameraInputTable(e.target.value)}
                className="h-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cameraInputTable.trim()) {
                    handleSimulatedTableSelect(cameraInputTable.trim())
                  }
                }}
              />
              <Button
                disabled={!cameraInputTable.trim()}
                onClick={() => handleSimulatedTableSelect(cameraInputTable.trim())}
                className="h-9 text-xs font-bold px-4"
              >
                Go to Menu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
