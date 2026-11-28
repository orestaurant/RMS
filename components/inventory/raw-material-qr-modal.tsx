'use client'

import { useState, useEffect, useMemo } from 'react'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, QrCode, MapPin, Scale, ShieldAlert, Check, Copy } from 'lucide-react'
import { QRCodeSVG } from '@/lib/qr-code'

export interface RawMaterialQRProps {
  isOpen: boolean
  onClose: () => void
  material: {
    id: string
    name: string
    sku: string
    quantity: number
    weight: number
    weightUnit: string
    location: string
    minThreshold: number
    qrCodeData?: string | null
    vendorName?: string
    updatedAt?: string
  } | null
}

const CLIENT_QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 4,
  width: 320,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
}

export function RawMaterialQRModal({ isOpen, onClose, material }: RawMaterialQRProps) {
  const [printing, setPrinting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [hostUrl, setHostUrl] = useState('')

  useEffect(() => {
    const localOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const defaultHost = process.env.NEXT_PUBLIC_APP_URL || localOrigin
    setHostUrl(defaultHost)

    if (
      typeof window !== 'undefined' &&
      !process.env.NEXT_PUBLIC_APP_URL &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      fetch('/api/system/network-info')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.networkUrl && !String(data.networkUrl).includes('127.0.0.1')) {
            setHostUrl(data.networkUrl)
          }
        })
        .catch(() => {})
    }
  }, [])

  const qrInspectUrl = useMemo(() => {
    if (!material) return ''
    const base = hostUrl ? hostUrl.trim().replace(/\/$/, '') : ''
    const query = `sku=${encodeURIComponent(material.sku)}&product=${encodeURIComponent(material.name)}`
    return base ? `${base}/?${query}` : `/?${query}`
  }, [hostUrl, material])

  if (!material) return null

  const handlePrintLabel = async () => {
    const printWindow = window.open('', '_blank', 'width=600,height=600')
    if (!printWindow) return

    setPrinting(true)
    const qrImageSrc = await QRCode.toDataURL(qrInspectUrl, CLIENT_QR_OPTIONS)
      .catch(() => material.qrCodeData || '')
      .finally(() => setPrinting(false))

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${material.sku}</title>
          <style>
            @page {
              size: 4in 3in;
              margin: 0.2in;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 12px;
              color: #0f172a;
              background: #ffffff;
            }
            .label-card {
              border: 2px dashed #0f172a;
              border-radius: 8px;
              padding: 14px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            .brand {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              font-weight: 700;
              color: #ea580c;
              margin-bottom: 4px;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              margin: 2px 0;
            }
            .sku {
              font-family: monospace;
              font-size: 14px;
              font-weight: 700;
              background: #f1f5f9;
              padding: 3px 8px;
              border-radius: 4px;
              margin: 4px 0 8px 0;
            }
            .qr-img {
              width: 140px;
              height: 140px;
              object-fit: contain;
              margin: 4px 0;
            }
            .meta-grid {
              width: 100%;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px 8px;
              font-size: 11px;
              margin-top: 8px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              text-align: left;
            }
            .meta-item strong {
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="brand">RestoSphere Inventory Label</div>
            <div class="title">${material.name}</div>
            <div class="sku">${material.sku}</div>
            <img class="qr-img" src="${qrImageSrc}" alt="QR Code" />
            <div class="meta-grid">
              <div class="meta-item"><strong>Location:</strong> ${material.location}</div>
              <div class="meta-item"><strong>Spec/Weight:</strong> ${material.weight} ${material.weightUnit}</div>
              <div class="meta-item"><strong>Min Threshold:</strong> ${material.minThreshold}</div>
              <div class="meta-item"><strong>Assigned Vendor:</strong> ${material.vendorName || 'General'}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleCopySKU = () => {
    navigator.clipboard.writeText(material.sku)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrInspectUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 bg-card gap-3">
        <DialogHeader className="text-left pr-7">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
              <QrCode className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold leading-snug">
                Raw Material QR Label
              </DialogTitle>
              <DialogDescription className="text-xs">
                Scan with scanner or mobile camera to inspect product details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-background/60 rounded-xl border border-border/80 shadow-xs">
          <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
            <QRCodeSVG
              value={qrInspectUrl}
              size={168}
              fgColor="#000000"
              bgColor="#ffffff"
              includeMargin
            />
          </div>

          <div className="mt-3 text-center">
            <h3 className="font-semibold text-base tracking-tight">{material.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono text-xs bg-muted/60 cursor-pointer" onClick={handleCopySKU}>
                {material.sku}
                {copied ? <Check className="size-3 ml-1 text-emerald-500" /> : null}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                {material.weight} {material.weightUnit}
              </Badge>
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={qrInspectUrl}
            >
              {copiedUrl ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">Scan link copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span className="truncate max-w-[260px]">
                    ?sku={material.sku}&amp;product={material.name}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Details specification list */}
        <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="truncate">
              <strong className="text-foreground">Location:</strong> {material.location}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Scale className="size-3.5 text-primary shrink-0" />
            <span className="truncate">
              <strong className="text-foreground">Stock:</strong> {material.quantity} ({material.weight} {material.weightUnit})
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />
            <span className="truncate">
              <strong className="text-foreground">Min Threshold:</strong> {material.minThreshold}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="truncate">
              <strong className="text-foreground">Vendor:</strong> {material.vendorName || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="-mx-5 -mb-5 px-5 py-3.5 mt-1 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs w-full sm:w-auto"
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrintLabel}
            disabled={printing}
            className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
          >
            <Printer className="size-3.5" />
            {printing ? 'Preparing...' : 'Print Label'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
