'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Camera,
  UtensilsCrossed,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StickerCard } from '@/components/tables/table-qr-generator'
import { QrScannerModal } from '@/components/customer/qr-scanner-modal'
import { cn } from '@/lib/utils'

interface CustomerTopQrSearchProps {
  initialTable?: string
  restaurantName?: string
}

export function CustomerTopQrSearch({
  initialTable = '1',
  restaurantName = 'RestoSphere',
}: CustomerTopQrSearchProps) {
  // Table state
  const [tableNumber, setTableNumber] = useState<string>(initialTable)
  const [hostUrl, setHostUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
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
                <span>Scan Table QR & Live Menu</span>
                <Badge className="bg-primary/15 text-primary text-[10px] py-0 px-2 font-medium border-primary/20">
                  Instant Ordering
                </Badge>
              </h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Scan QR code with your phone camera or click below to view the menu and place your order
              </p>
            </div>
          </div>

          {/* Quick Actions at Top Right */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCameraModalOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
              title="Scan QR with camera"
            >
              <Camera className="size-3.5 text-muted-foreground" />
              <span>Scan</span>
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

        {/* Main Body: QR Sticker Section & Table Switcher */}
        <div className="p-4 sm:p-6">
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
                    onClick={() => setIsCameraModalOpen(true)}
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

      {/* ── Real-Time Camera Scanner Modal ─────────────────── */}
      <QrScannerModal
        open={isCameraModalOpen}
        onOpenChange={setIsCameraModalOpen}
        onScanSuccess={(scannedTbl) => {
          setTableNumber(scannedTbl)
        }}
      />
    </div>
  )
}
