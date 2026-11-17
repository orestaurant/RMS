'use client'

import { useState } from 'react'
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
import { Download, Printer, QrCode, MapPin, Scale, ShieldAlert, Check } from 'lucide-react'

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
  } | null
}

export function RawMaterialQRModal({ isOpen, onClose, material }: RawMaterialQRProps) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!material) return null

  const handleDownloadPNG = () => {
    if (!material.qrCodeData) return
    const link = document.createElement('a')
    link.href = material.qrCodeData
    link.download = `${material.sku}-label-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadSVG = async () => {
    try {
      setDownloading(true)
      const res = await fetch(`/api/inventory/raw-materials/${material.id}`)
      const json = await res.json()
      if (json.success && json.data?.svgQr) {
        const blob = new Blob([json.data.svgQr], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${material.sku}-label-qr.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        handleDownloadPNG()
      }
    } catch (err) {
      handleDownloadPNG()
    } finally {
      setDownloading(false)
    }
  }

  const handlePrintLabel = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=600')
    if (!printWindow) return

    const qrImageSrc = material.qrCodeData || ''

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 bg-card">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <QrCode className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Raw Material QR Label</DialogTitle>
              <DialogDescription className="text-xs">
                Scan with scanner or mobile camera to inspect warehouse stock
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-5 bg-background/60 rounded-xl border border-border/80 my-2 shadow-sm">
          {material.qrCodeData ? (
            <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200">
              <img
                src={material.qrCodeData}
                alt={`QR code for ${material.name}`}
                className="size-48 object-contain"
              />
            </div>
          ) : (
            <div className="size-48 flex items-center justify-center text-muted-foreground bg-muted/40 rounded-lg">
              No QR data available
            </div>
          )}

          <div className="mt-4 text-center">
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
          </div>
        </div>

        {/* Details specification list */}
        <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-muted/30 rounded-lg border border-border/50">
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
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPNG}
            className="gap-1.5 text-xs w-full sm:w-auto"
          >
            <Download className="size-3.5" />
            PNG
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadSVG}
            disabled={downloading}
            className="gap-1.5 text-xs w-full sm:w-auto"
          >
            <Download className="size-3.5" />
            SVG
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrintLabel}
            className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
          >
            <Printer className="size-3.5" />
            Print Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
