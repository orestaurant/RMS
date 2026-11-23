'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'
import {
  Camera,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FlipHorizontal,
  Zap,
  ZapOff,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'

interface QrScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess?: (table: string, targetUrl: string) => void
}

/**
 * Parses scanned QR text into a valid /menu route
 */
export function parseScannedQrToMenuUrl(rawData: string): { table: string; targetUrl: string } {
  const trimmed = (rawData || '').trim()
  if (!trimmed) {
    return { table: '1', targetUrl: '/menu?table=1' }
  }

  // 1. Check if it's a full or relative URL
  try {
    const isFullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    const urlObj = isFullUrl
      ? new URL(trimmed)
      : trimmed.startsWith('/')
      ? new URL(`http://localhost${trimmed}`)
      : null

    if (urlObj) {
      const tableParam = urlObj.searchParams.get('table')
      if (tableParam) {
        return { table: tableParam, targetUrl: `/menu?table=${encodeURIComponent(tableParam)}` }
      }

      // Check if path includes /menu
      if (urlObj.pathname.includes('/menu')) {
        return {
          table: '1',
          targetUrl: `${urlObj.pathname}${urlObj.search || ''}`,
        }
      }
    }
  } catch {
    // Not a URL string
  }

  // 2. Check query string format like "table=2" or "table=VIP-1"
  const tableMatch = trimmed.match(/table=([^&]+)/i)
  if (tableMatch && tableMatch[1]) {
    const tbl = decodeURIComponent(tableMatch[1].trim())
    return { table: tbl, targetUrl: `/menu?table=${encodeURIComponent(tbl)}` }
  }

  // 3. Check text patterns like "Table 4", "Table-02", "T-3", "T5", "3"
  const labelMatch = trimmed.match(/\b(?:table|tbl|t)?[-_\s]*([a-zA-Z0-9]+)\b/i)
  if (labelMatch && labelMatch[1]) {
    const tbl = labelMatch[1].trim()
    return { table: tbl, targetUrl: `/menu?table=${encodeURIComponent(tbl)}` }
  }

  // 4. Default fallback
  return { table: trimmed, targetUrl: `/menu?table=${encodeURIComponent(trimmed)}` }
}

/**
 * Synthesizes a pleasant audio chime when QR is scanned successfully
 */
function playScanChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0.15, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    playTone(587.33, 0, 0.12) // D5
    playTone(880.0, 0.1, 0.2) // A5
  } catch (e) {
    console.warn('Audio chime unsupported or blocked:', e)
  }
}

export function QrScannerModal({
  open,
  onOpenChange,
  onScanSuccess,
}: QrScannerModalProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [scannedResult, setScannedResult] = useState<{ table: string; targetUrl: string } | null>(null)
  const [manualTable, setManualTable] = useState('')

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
    setTorchOn(false)
    setHasTorch(false)
  }, [])

  // Trigger success redirect
  const handleSuccessRedirect = useCallback(
    (parsed: { table: string; targetUrl: string }) => {
      setScannedResult(parsed)
      playScanChime()

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([80, 50, 80])
        } catch {}
      }

      if (onScanSuccess) {
        onScanSuccess(parsed.table, parsed.targetUrl)
      }

      // Allow 750ms for user to see the green success banner before redirecting
      setTimeout(() => {
        stopCamera()
        onOpenChange(false)
        router.push(parsed.targetUrl)
      }, 750)
    },
    [onOpenChange, onScanSuccess, router, stopCamera]
  )

  // Scanning loop using requestAnimationFrame + jsQR
  const startScanLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const scanFrame = () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(scanFrame)
        return
      }

      // Match canvas dimensions to video feed
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (qrCode && qrCode.data) {
          const parsed = parseScannedQrToMenuUrl(qrCode.data)
          handleSuccessRedirect(parsed)
          return
        }
      } catch (err) {
        console.warn('Frame scan error:', err)
      }

      // Continue scanning next frame
      animationFrameRef.current = requestAnimationFrame(scanFrame)
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame)
  }, [handleSuccessRedirect])

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    stopCamera()
    setErrorMsg(null)
    setScannedResult(null)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this browser or device.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0]
      if (track) {
        const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined
        if (capabilities && capabilities.torch) {
          setHasTorch(true)
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        setCameraActive(true)
        startScanLoop()
      }
    } catch (err: unknown) {
      console.warn('Camera error:', err)
      const message =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Please allow camera permissions in your browser or select your table below.'
            : err.message
          : 'Could not access device camera.'
      setErrorMsg(message)
      setCameraActive(false)
    }
  }, [cameraFacing, startScanLoop, stopCamera])

  // Handle open/close modal
  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
      setScannedResult(null)
      setErrorMsg(null)
    }

    return () => {
      stopCamera()
    }
  }, [open, startCamera, stopCamera])

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return

    try {
      const newTorchState = !torchOn
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newTorchState }],
      })
      setTorchOn(newTorchState)
    } catch (e) {
      console.warn('Could not toggle flashlight:', e)
    }
  }

  // Switch between front and back camera
  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  // Manual fallback table click
  const handleManualSelect = (table: string) => {
    const parsed = parseScannedQrToMenuUrl(table)
    handleSuccessRedirect(parsed)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-3xl p-4 sm:p-6 overflow-hidden">
        {/* Hidden Canvas for QR Frame Extraction */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogHeader className="pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                <Camera className="size-4 sm:size-5" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span>Live Camera QR Scanner</span>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5">
                    Auto-Scan
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Point your phone camera at the QR code sticker on your dining table.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-1 text-xs">
          {/* ── Viewfinder Area ── */}
          <div className="relative rounded-2xl border-2 border-dashed border-primary/50 bg-black/90 p-2 flex flex-col items-center justify-center text-center overflow-hidden min-h-[240px] sm:min-h-[270px]">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-56 sm:h-64 object-cover rounded-xl"
            />

            {/* Target Reticle / Scanning Crosshair Overlay */}
            {!scannedResult && !errorMsg && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="size-44 sm:size-48 border-2 border-primary/80 rounded-2xl relative shadow-2xl flex items-center justify-center">
                  {/* Corner accents */}
                  <span className="absolute -top-1 -left-1 size-4 border-t-4 border-l-4 border-primary rounded-tl-md" />
                  <span className="absolute -top-1 -right-1 size-4 border-t-4 border-r-4 border-primary rounded-tr-md" />
                  <span className="absolute -bottom-1 -left-1 size-4 border-b-4 border-l-4 border-primary rounded-bl-md" />
                  <span className="absolute -bottom-1 -right-1 size-4 border-b-4 border-r-4 border-primary rounded-br-md" />

                  {/* Pulsing scanning beam line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse shadow-lg" />
                </div>
                <p className="text-[11px] text-white/90 font-medium mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                  Align Table QR Code inside the square
                </p>
              </div>
            )}

            {/* Success Overlay when QR Code is scanned */}
            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white animate-in zoom-in-95 duration-200">
                <div className="size-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-2 animate-bounce">
                  <CheckCircle2 className="size-8" />
                </div>
                <h4 className="text-base font-bold">Table QR Code Detected!</h4>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Table <span className="font-bold underline">{scannedResult.table}</span> verified
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs bg-white/10 px-3 py-1.5 rounded-full">
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Loading full restaurant menu...</span>
                </div>
              </div>
            )}

            {/* Error Overlay if camera fails or is blocked */}
            {errorMsg && (
              <div className="absolute inset-0 bg-background/95 p-4 flex flex-col items-center justify-center text-center gap-2">
                <AlertCircle className="size-8 text-amber-500" />
                <p className="text-xs font-semibold text-foreground max-w-xs">{errorMsg}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startCamera}
                  className="h-8 text-xs font-medium gap-1.5 mt-1"
                >
                  <RefreshCw className="size-3" />
                  <span>Try Again</span>
                </Button>
              </div>
            )}

            {/* Camera Floating Quick Controls (Flip Camera / Torch) */}
            {cameraActive && !scannedResult && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {hasTorch && (
                  <Button
                    size="icon"
                    variant="secondary"
                    type="button"
                    onClick={toggleTorch}
                    className="size-8 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs"
                    title={torchOn ? 'Turn off light' : 'Turn on light'}
                  >
                    {torchOn ? <ZapOff className="size-3.5 text-amber-400" /> : <Zap className="size-3.5" />}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  type="button"
                  onClick={toggleCameraFacing}
                  className="size-8 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs"
                  title="Switch front/back camera"
                >
                  <FlipHorizontal className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* ── Fallback Table Selector: Always Available ── */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Or pick your dining table directly:</span>
              <span className="text-[10px] text-muted-foreground">Instant menu access</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((tbl) => (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => handleManualSelect(tbl)}
                  className="h-8 rounded-lg text-xs font-bold border border-border bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  T-{tbl}
                </button>
              ))}
            </div>

            {/* Manual input */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                placeholder="Custom table (e.g. VIP-1, T-9)"
                value={manualTable}
                onChange={(e) => setManualTable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualTable.trim()) {
                    handleManualSelect(manualTable.trim())
                  }
                }}
                className="h-8.5 text-xs rounded-xl"
              />
              <Button
                size="sm"
                disabled={!manualTable.trim()}
                onClick={() => handleManualSelect(manualTable.trim())}
                className="h-8.5 text-xs font-bold px-3.5 rounded-xl bg-primary text-primary-foreground shrink-0 cursor-pointer"
              >
                <UtensilsCrossed className="size-3.5 mr-1" />
                <span>Open Menu</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
