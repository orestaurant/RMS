'use client'

import React, { useState, useId } from 'react'
import {
  QrCode,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Layers,
  UtensilsCrossed,
  Sparkles,
  Download,
  X,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { QRCodeSVG } from '@/lib/qr-code'

interface TableQRGeneratorProps {
  initialTable?: string | number
  isOpen?: boolean
  onClose?: () => void
  restaurantName?: string
}

export function TableQRGenerator({
  initialTable = '1',
  isOpen = true,
  onClose,
  restaurantName = 'Spice Garden Restaurant',
}: TableQRGeneratorProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [tableNumber, setTableNumber] = useState<string>(String(initialTable))
  const [batchStart, setBatchStart] = useState<number>(1)
  const [batchEnd, setBatchEnd] = useState<number>(10)
  const [batchPrefix, setBatchPrefix] = useState<string>('')
  const [copied, setCopied] = useState<string | null>(null)
  const [activePrintTable, setActivePrintTable] = useState<string | null>(null)

  // Host URL state & auto network IP resolution for mobile phone scanning
  const [hostUrl, setHostUrl] = useState<string>('')
  const [lanUrl, setLanUrl] = useState<string>('')

  React.useEffect(() => {
    // 1. Initial default
    const localOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const defaultHost = process.env.NEXT_PUBLIC_APP_URL || localOrigin
    setHostUrl(defaultHost)

    // 2. Fetch server network LAN IP so phone scan works immediately on Wi-Fi
    fetch('/api/system/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.networkUrl) {
          setLanUrl(data.networkUrl)
          // If accessing via localhost on laptop, default to LAN IP so phone scanning works out of the box!
          if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            setHostUrl(data.networkUrl)
          }
        }
      })
      .catch((err) => console.warn('Could not resolve LAN IP:', err))
  }, [])

  const getTargetUrl = (table: string | number) => {
    const cleanTable = String(table).trim()
    const base = hostUrl && hostUrl.trim() ? hostUrl.trim().replace(/\/$/, '') : 'http://localhost:3000'
    return `${base}/menu?table=${encodeURIComponent(cleanTable)}`
  }

  const formatTableBadge = (tbl: string | number) => {
    const s = String(tbl).trim()
    if (/^\d+$/.test(s)) {
      return `Table ${s.padStart(2, '0')}`
    }
    return s.toLowerCase().startsWith('table') ? s : `Table ${s}`
  }

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handlePrint = (singleTable?: string) => {
    if (singleTable) {
      setActivePrintTable(singleTable)
    } else {
      setActivePrintTable(null)
    }
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const batchTables = React.useMemo(() => {
    const list: string[] = []
    const start = Math.max(1, Math.min(batchStart, batchEnd))
    const end = Math.min(100, Math.max(batchStart, batchEnd))
    for (let i = start; i <= end; i++) {
      const formatted = batchPrefix ? `${batchPrefix}${i}` : String(i)
      list.push(formatted)
    }
    return list
  }, [batchStart, batchEnd, batchPrefix])

  if (!isOpen) return null

  return (
    <>
      {/* Print CSS Styles injected dynamically */}
      <style jsx global>{`
        @media print {
          /* Hide everything in normal app */
          body * {
            visibility: hidden !important;
          }
          /* Show only the print container and its children */
          #print-sticker-container,
          #print-sticker-container * {
            visibility: visible !important;
          }
          #print-sticker-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 24px !important;
            background: white !important;
          }
          .qr-sticker-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 2px solid #000 !important;
            border-radius: 16px !important;
            box-shadow: none !important;
            width: 320px !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Admin UI Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-4 bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <QrCode className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Table QR Code Generator</h2>
                <p className="text-xs text-muted-foreground">
                  Generate print-ready QR code stickers for instant customer table ordering
                </p>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full size-8">
                <X className="size-4" />
              </Button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Mode Selector */}
            <div className="flex items-center justify-between bg-muted/50 p-1.5 rounded-xl border border-border/60 max-w-md">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'single'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <QrCode className="size-3.5" />
                Single Table
              </button>
              <button
                type="button"
                onClick={() => setMode('batch')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'batch'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="size-3.5" />
                Batch Tables (1 to N)
              </button>
            </div>

            {/* Controls */}
            {mode === 'single' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-card p-4 rounded-xl border border-border/60">
                <div className="space-y-1.5">
                  <Label htmlFor="tableNumberInput" className="text-xs font-semibold">
                    Table Number or Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="tableNumberInput"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="e.g. 5 or VIP-1"
                      className="font-medium h-10"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Target URL: <span className="font-mono text-primary">{getTargetUrl(tableNumber || '1')}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePrint(tableNumber)}
                    className="flex-1 gap-2 h-10 font-medium shadow-sm"
                  >
                    <Printer className="size-4" />
                    Print Sticker
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(getTargetUrl(tableNumber || '1'), 'single')}
                    className="h-10 gap-1.5"
                  >
                    {copied === 'single' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    Copy URL
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(getTargetUrl(tableNumber || '1'), '_blank')}
                    title="Open Menu URL in new tab"
                    className="h-10 w-10 border border-border"
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-card p-4 rounded-xl border border-border/60">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Start Table #</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={batchStart}
                      onChange={(e) => setBatchStart(parseInt(e.target.value) || 1)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">End Table #</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={batchEnd}
                      onChange={(e) => setBatchEnd(parseInt(e.target.value) || 1)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Prefix (optional)</Label>
                    <Input
                      placeholder="e.g. T- or VIP-"
                      value={batchPrefix}
                      onChange={(e) => setBatchPrefix(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div className="text-xs text-muted-foreground">
                    Generating <span className="font-semibold text-foreground">{batchTables.length}</span> table stickers
                  </div>
                  <Button onClick={() => handlePrint()} className="gap-2 font-medium shadow-sm">
                    <Printer className="size-4" />
                    Print All {batchTables.length} Stickers
                  </Button>
                </div>
              </div>
            )}

            {/* Live Preview Area */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  Print-Ready Sticker Preview
                </h3>
                <span className="text-xs text-muted-foreground">
                  High-res 300 DPI vector QR encoding
                </span>
              </div>

              {mode === 'single' ? (
                <div className="flex justify-center p-6 bg-muted/20 border border-dashed border-border rounded-2xl">
                  <StickerCard
                    tableNumber={tableNumber || '1'}
                    badge={formatTableBadge(tableNumber || '1')}
                    targetUrl={getTargetUrl(tableNumber || '1')}
                    restaurantName={restaurantName}
                    onPrint={() => handlePrint(tableNumber)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-4 bg-muted/20 border border-dashed border-border rounded-2xl">
                  {batchTables.map((tbl) => (
                    <StickerCard
                      key={tbl}
                      tableNumber={tbl}
                      badge={formatTableBadge(tbl)}
                      targetUrl={getTargetUrl(tbl)}
                      restaurantName={restaurantName}
                      compact
                      onPrint={() => handlePrint(tbl)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/70 px-6 py-4 bg-muted/30">
            <div className="text-xs text-muted-foreground">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Print Sticker</kbd> to output sticker label size with no header or background clutter.
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="px-6">
                Done
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden printable stickers element */}
      <div id="print-sticker-container" className="hidden">
        {activePrintTable ? (
          <StickerCard
            tableNumber={activePrintTable}
            badge={formatTableBadge(activePrintTable)}
            targetUrl={getTargetUrl(activePrintTable)}
            restaurantName={restaurantName}
            isPrinting
          />
        ) : (
          batchTables.map((tbl) => (
            <StickerCard
              key={tbl}
              tableNumber={tbl}
              badge={formatTableBadge(tbl)}
              targetUrl={getTargetUrl(tbl)}
              restaurantName={restaurantName}
              isPrinting
            />
          ))
        )}
      </div>
    </>
  )
}

interface StickerCardProps {
  tableNumber: string | number
  badge: string
  targetUrl: string
  restaurantName: string
  compact?: boolean
  isPrinting?: boolean
  onPrint?: () => void
}

function StickerCard({
  tableNumber,
  badge,
  targetUrl,
  restaurantName,
  compact = false,
  isPrinting = false,
  onPrint,
}: StickerCardProps) {
  return (
    <div
      className={`qr-sticker-card relative flex flex-col items-center text-center transition-all bg-card border-2 border-border/80 shadow-md rounded-2xl ${
        compact ? 'p-4 max-w-[260px]' : 'p-6 max-w-[340px] w-full'
      }`}
    >
      {/* Decorative top accent */}
      <div className="w-12 h-1 rounded-full bg-primary/40 mb-3" />

      {/* Restaurant Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
          <UtensilsCrossed className="size-3.5" />
        </div>
        <span className="font-bold text-sm tracking-tight text-foreground">
          {restaurantName}
        </span>
      </div>

      <div className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-3">
        Scan to View Menu & Order
      </div>

      {/* QR Code Container with High Contrast & Framing */}
      <div className="relative p-3 bg-white rounded-xl shadow-sm border border-neutral-200 mb-3">
        <QRCodeSVG
          value={targetUrl}
          size={compact ? 140 : 180}
          fgColor="#0a0a0a"
          bgColor="#ffffff"
          includeMargin={false}
        />
        {/* Subtle center logo badge */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="size-7 rounded-full bg-white shadow-md border border-neutral-200 flex items-center justify-center text-primary">
            <UtensilsCrossed className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Table Badge */}
      <div className="w-full mt-1 mb-2">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-foreground text-background font-extrabold text-sm tracking-wide shadow-sm">
          {badge}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-[11px] text-muted-foreground leading-tight px-2">
        Open phone camera to view live menu & order directly from this table
      </p>

      {/* Hover action in admin preview */}
      {!isPrinting && onPrint && compact && (
        <Button
          size="sm"
          variant="outline"
          onClick={onPrint}
          className="mt-3 w-full h-8 text-xs gap-1"
        >
          <Printer className="size-3" />
          Print Single
        </Button>
      )}
    </div>
  )
}

