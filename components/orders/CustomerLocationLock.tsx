'use client'

import { useState, useEffect } from 'react'
import {
  Car,
  MapPin,
  Lock,
  Unlock,
  Navigation,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Compass,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface CustomerLocationData {
  isLocationLocked?: boolean
  vehicleNumber?: string | null
  landmarkNote?: string | null
  customerLat?: number | null
  customerLng?: number | null
  locationAccuracy?: number | null
  locationCapturedAt?: string | Date | null
}

export interface CustomerLocationLockProps {
  data: CustomerLocationData
  onChange?: (updated: CustomerLocationData) => void
  onSave?: (updated: CustomerLocationData, unlockOverride?: boolean) => Promise<void> | void
  isEditable?: boolean
  showToggle?: boolean
  compact?: boolean
  title?: string
  className?: string
}

export const PRESET_LANDMARKS = [
  'Under Banyan Tree',
  'Near Liquor Shop',
  'Main Road Side',
  'Opposite Gate',
  'Corner Parking',
]

/**
 * Validates whether the given latitude & longitude represent valid, non-zero coordinates.
 * Excludes (0, 0), NaN, null, and out-of-range values.
 */
export function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false
  const nLat = Number(lat)
  const nLng = Number(lng)
  if (isNaN(nLat) || isNaN(nLng)) return false
  if (nLat === 0 && nLng === 0) return false
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) return false
  return Math.abs(nLat) > 0.0001 || Math.abs(nLng) > 0.0001
}

export function CustomerLocationLock({
  data,
  onChange,
  onSave,
  isEditable = true,
  showToggle = false,
  compact = false,
  title = 'Customer Location / Vehicle Lock',
  className,
}: CustomerLocationLockProps) {
  // Local state ensures inputs & pills are immediately editable and never frozen
  const [localData, setLocalData] = useState<CustomerLocationData>(() => ({
    isLocationLocked: Boolean(data?.isLocationLocked),
    vehicleNumber: data?.vehicleNumber || '',
    landmarkNote: data?.landmarkNote || '',
    customerLat: data?.customerLat ?? null,
    customerLng: data?.customerLng ?? null,
    locationAccuracy: data?.locationAccuracy ?? null,
    locationCapturedAt: data?.locationCapturedAt ?? null,
  }))

  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gpsSuccess, setGpsSuccess] = useState(false)
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEnabled, setIsEnabled] = useState(
    Boolean(
      data?.vehicleNumber ||
      data?.landmarkNote ||
      isValidCoord(data?.customerLat, data?.customerLng) ||
      data?.isLocationLocked
    )
  )

  // Sync internal state whenever parent updates the data prop
  useEffect(() => {
    if (data) {
      setLocalData({
        isLocationLocked: Boolean(data.isLocationLocked),
        vehicleNumber: data.vehicleNumber || '',
        landmarkNote: data.landmarkNote || '',
        customerLat: data.customerLat ?? null,
        customerLng: data.customerLng ?? null,
        locationAccuracy: data.locationAccuracy ?? null,
        locationCapturedAt: data.locationCapturedAt ?? null,
      })
      if (
        data.vehicleNumber ||
        data.landmarkNote ||
        isValidCoord(data.customerLat, data.customerLng) ||
        data.isLocationLocked
      ) {
        setIsEnabled(true)
      }
    }
  }, [
    data?.isLocationLocked,
    data?.vehicleNumber,
    data?.landmarkNote,
    data?.customerLat,
    data?.customerLng,
    data?.locationAccuracy,
    data?.locationCapturedAt,
  ])

  const isLocked = Boolean(localData.isLocationLocked)
  const canEdit = isEditable && !isLocked

  const updateFields = (partial: Partial<CustomerLocationData>) => {
    setLocalData((prev) => {
      const next = {
        ...prev,
        ...partial,
      }
      onChange?.(next)
      return next
    })
  }

  const handleVehicleChange = (value: string) => {
    if (!canEdit) return
    const formatted = value.toUpperCase()
    updateFields({ vehicleNumber: formatted })
  }

  const handleVehicleBlur = () => {
    if (!canEdit) return
    if (localData.vehicleNumber) {
      updateFields({ vehicleNumber: localData.vehicleNumber.trim().replace(/\s+/g, ' ') })
    }
  }

  const handleLandmarkPillClick = (pill: string) => {
    if (!canEdit) return
    const current = (localData.landmarkNote || '').trim()
    if (!current) {
      updateFields({ landmarkNote: pill })
      return
    }

    // Toggle off / remove if already present
    if (current.toLowerCase().includes(pill.toLowerCase())) {
      const remaining = current
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.toLowerCase() !== pill.toLowerCase())
      updateFields({ landmarkNote: remaining.join(', ') })
      return
    }

    updateFields({ landmarkNote: `${current}, ${pill}` })
  }

  const handleCaptureGPS = () => {
    if (!canEdit) return

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('GPS Geolocation is not supported by your browser.')
      return
    }

    setGpsLoading(true)
    setGpsError(null)
    setGpsSuccess(false)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6))
        const lng = Number(position.coords.longitude.toFixed(6))
        const accuracy = Math.round(position.coords.accuracy)
        const capturedAt = new Date().toISOString()

        setGpsLoading(false)
        setGpsSuccess(true)
        setGpsError(null)

        updateFields({
          customerLat: lat,
          customerLng: lng,
          locationAccuracy: accuracy,
          locationCapturedAt: capturedAt,
        })
      },
      (error) => {
        setGpsLoading(false)
        setGpsSuccess(false)
        let message = 'Unable to capture GPS location.'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'GPS permission denied. Please allow location access in your browser or phone settings.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'GPS location is currently unavailable. You can still save vehicle number and landmark.'
            break
          case error.TIMEOUT:
            message = 'GPS request timed out. Please retry or enter landmark manually.'
            break
        }
        setGpsError(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleClearGPS = () => {
    if (!canEdit) return
    updateFields({
      customerLat: null,
      customerLng: null,
      locationAccuracy: null,
      locationCapturedAt: null,
    })
  }

  const handleLockToggle = () => {
    if (!isLocked) {
      // Locking the location
      updateFields({ isLocationLocked: true })
      if (onSave) {
        onSave({ ...localData, isLocationLocked: true }, true)
      }
    } else {
      // Requesting unlock -> prompt confirmation
      setUnlockConfirmOpen(true)
    }
  }

  const handleConfirmUnlock = async () => {
    setUnlockConfirmOpen(false)
    updateFields({ isLocationLocked: false })
    if (onSave) {
      try {
        setSaving(true)
        await onSave({ ...localData, isLocationLocked: false }, true)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleSaveClick = async () => {
    if (!onSave) return
    try {
      setSaving(true)
      await onSave(localData, !isLocked)
    } finally {
      setSaving(false)
    }
  }

  const hasCoords = isValidCoord(localData.customerLat, localData.customerLng)
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${localData.customerLat},${localData.customerLng}`
    : null

  const formattedCapturedAt = localData.locationCapturedAt
    ? new Date(localData.locationCapturedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isLocked
          ? 'border-primary/40 bg-primary/5 shadow-sm'
          : 'border-border bg-card',
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between p-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              isLocked
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Car className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold truncate text-foreground">{title}</span>
              {isLocked ? (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 gap-1 bg-primary/15 text-primary border-primary/30"
                >
                  <Lock className="size-2.5" />
                  Locked
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5 gap-1 text-muted-foreground"
                >
                  <Unlock className="size-2.5" />
                  Editable
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {isLocked
                ? 'Details are locked to prevent accidental overwrite'
                : 'Drive-in, car delivery, or customer spot tracking'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showToggle && !isLocked && (
            <Button
              type="button"
              variant={isEnabled ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const next = !isEnabled
                setIsEnabled(next)
                if (!next) {
                  updateFields({
                    vehicleNumber: '',
                    landmarkNote: '',
                    customerLat: null,
                    customerLng: null,
                    locationAccuracy: null,
                    locationCapturedAt: null,
                    isLocationLocked: false,
                  })
                }
              }}
            >
              {isEnabled ? 'Enabled' : 'Enable'}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setIsExpanded((v) => !v)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Main content body */}
      {isExpanded && (!showToggle || isEnabled) && (
        <div className="p-3.5 space-y-3.5 text-xs">
          {/* Lock / Unlock Banner notice */}
          {isLocked ? (
            <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-primary gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="size-3.5 shrink-0" />
                <span className="font-medium text-[11px] truncate">
                  Location locked. Accidental edits are disabled.
                </span>
              </div>
              {isEditable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2 gap-1 border-primary/40 bg-background hover:bg-primary/10 shrink-0"
                  onClick={handleLockToggle}
                  disabled={saving}
                >
                  <Unlock className="size-3" />
                  Unlock to Edit
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-muted/60 border border-border px-3 py-1.5 text-muted-foreground gap-2 flex-wrap sm:flex-nowrap">
              <span className="text-[11px] min-w-0">
                Enter vehicle & landmark, or capture GPS coordinates.
              </span>
              {(localData.vehicleNumber || localData.landmarkNote || hasCoords) && isEditable && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-6 text-[11px] px-2 gap-1 shrink-0"
                  onClick={handleLockToggle}
                >
                  <Lock className="size-3" />
                  Lock Location
                </Button>
              )}
            </div>
          )}

          {/* Vehicle Number Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Car className="size-3.5 text-primary" />
              Vehicle Number
            </label>
            <div className="relative">
              <Input
                value={localData.vehicleNumber || ''}
                onChange={(e) => handleVehicleChange(e.target.value)}
                onBlur={handleVehicleBlur}
                placeholder="e.g. UP78 AB 1234 or DL 01 CZ 9999"
                disabled={!canEdit}
                className={cn(
                  'font-mono uppercase font-semibold h-9 text-xs pl-8 tracking-wider bg-background',
                  !canEdit && 'bg-muted/50 cursor-not-allowed opacity-90'
                )}
              />
              <Car className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              {isLocked && (
                <Lock className="size-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Landmark / Spot Input & Quick Pills */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" />
              Landmark / Spot Description
            </label>

            {/* Quick-tap preset pills */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LANDMARKS.map((pill) => {
                const isSelected = Boolean(
                  localData.landmarkNote &&
                  localData.landmarkNote.toLowerCase().includes(pill.toLowerCase())
                )
                return (
                  <button
                    key={pill}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleLandmarkPillClick(pill)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border touch-manipulation',
                      isSelected
                        ? 'border-primary bg-primary/20 text-primary font-semibold shadow-xs'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      !canEdit && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {pill}
                  </button>
                )
              })}
            </div>

            <Input
              value={localData.landmarkNote || ''}
              onChange={(e) => canEdit && updateFields({ landmarkNote: e.target.value })}
              placeholder="e.g. White Swift parked 50m ahead near streetlight"
              disabled={!canEdit}
              className={cn(
                'h-9 text-xs bg-background',
                !canEdit && 'bg-muted/50 cursor-not-allowed opacity-90'
              )}
            />
          </div>

          {/* GPS Location Capture Section */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Compass className="size-3.5 text-primary" />
                Customer GPS Coordinates
              </label>

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="size-3" />
                  View in Google Maps
                </a>
              )}
            </div>

            {/* GPS Captured Info Box */}
            {hasCoords ? (
              <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Latitude</span>
                    <span className="font-mono font-medium text-foreground">{localData.customerLat}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Longitude</span>
                    <span className="font-mono font-medium text-foreground">{localData.customerLng}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/40 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
                    <CheckCircle2 className="size-3 text-success shrink-0" />
                    <span>
                      Accuracy: <strong className="text-foreground">±{localData.locationAccuracy || 5}m</strong>
                    </span>
                    {formattedCapturedAt && (
                      <span className="text-[10px]">({formattedCapturedAt})</span>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 gap-1 text-primary hover:text-primary"
                        onClick={handleCaptureGPS}
                        disabled={gpsLoading}
                      >
                        {gpsLoading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Navigation className="size-3" />
                        )}
                        Recapture
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-destructive"
                        onClick={handleClearGPS}
                        title="Clear GPS Coordinates"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 text-xs w-full gap-2 border-primary/30 text-primary hover:bg-primary/10',
                    !canEdit && 'opacity-60 cursor-not-allowed'
                  )}
                  onClick={handleCaptureGPS}
                  disabled={!canEdit || gpsLoading}
                >
                  {gpsLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Fetching GPS location from device...
                    </>
                  ) : (
                    <>
                      <Navigation className="size-3.5" />
                      Capture Customer GPS
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* GPS Error Alert */}
            {gpsError && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-[11px] text-warning-foreground">
                <AlertCircle className="size-3.5 shrink-0 text-warning mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-medium text-warning">{gpsError}</p>
                  <p className="text-muted-foreground text-[10px]">
                    You can still save the Vehicle Number and Landmark Note manually without GPS.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Optional Direct Save Button (when embedded in details dialog) */}
          {onSave && (
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleSaveClick}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    Save Location Details
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Unlock Confirmation Dialog */}
      <Dialog open={unlockConfirmOpen} onOpenChange={setUnlockConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Unlock className="size-4 text-warning" /> Unlock Location Details?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5">
              This order&apos;s customer location and vehicle details are currently locked.
              Unlocking will allow modifying coordinates and vehicle information. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnlockConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirmUnlock}
              className="gap-1.5"
            >
              <Unlock className="size-3.5" />
              Unlock to Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
