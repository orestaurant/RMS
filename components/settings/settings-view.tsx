'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save,
  Bell,
  Lock,
  Palette,
  Users,
  FileText,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Star,
  Globe,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DEFAULT_NOTE_POINTS } from '@/lib/note-points'
import { updateNotePointsClientCache } from '@/hooks/useNotePoints'

interface SettingsState {
  restaurantName: string
  restaurantEmail: string
  restaurantPhone: string
  timezone: string
  currency: string
  notificationsEmail: boolean
  notificationsSms: boolean
  notificationsPush: boolean
}

export function SettingsView() {
  const router = useRouter()
  const [settings, setSettings] = useState<SettingsState>({
    restaurantName: 'RestoSphere',
    restaurantEmail: 'info@restosphere.com',
    restaurantPhone: '+91-22-1234-5678',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    notificationsEmail: true,
    notificationsSms: true,
    notificationsPush: true,
  })

  const [saved, setSaved] = useState(false)

  // Local Note Points (Highway / Drive-In Landmarks) State
  const [notePoints, setNotePoints] = useState<string[]>(DEFAULT_NOTE_POINTS)
  const [notePointsRestaurantId, setNotePointsRestaurantId] = useState<string | null>(null)
  const [notePointsLoading, setNotePointsLoading] = useState(true)
  const [notePointsSaving, setNotePointsSaving] = useState(false)
  const [notePointsError, setNotePointsError] = useState<string | null>(null)
  const [notePointsSavedMsg, setNotePointsSavedMsg] = useState<string | null>(null)
  const [newNotePoint, setNewNotePoint] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/settings/note-points')
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json?.success && Array.isArray(json?.data?.notePoints)) {
          setNotePoints(json.data.notePoints)
          setNotePointsRestaurantId(json.data.restaurantId || null)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setNotePointsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const persistNotePoints = async (nextList: string[]) => {
    if (nextList.length === 0) {
      setNotePointsError('At least one local note point is required.')
      return
    }
    setNotePointsError(null)
    setNotePointsSavedMsg(null)
    setNotePointsSaving(true)

    try {
      const res = await fetch('/api/settings/note-points', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notePoints: nextList,
          restaurantId: notePointsRestaurantId,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setNotePointsError(json.message || 'Failed to save local note points.')
        return
      }
      const savedList: string[] = json.data?.notePoints || nextList
      setNotePoints(savedList)
      updateNotePointsClientCache(savedList, json.data?.restaurantId || notePointsRestaurantId)
      setNotePointsSavedMsg('Local note points updated! Customers and waiters will see these immediately.')
      setTimeout(() => setNotePointsSavedMsg(null), 3500)
    } catch (err: any) {
      setNotePointsError(err?.message || 'Failed to save local note points.')
    } finally {
      setNotePointsSaving(false)
    }
  }

  const handleAddNotePoint = () => {
    const trimmed = newNotePoint.trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!trimmed) return
    if (notePoints.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setNotePointsError(`"${trimmed}" already exists in the list.`)
      return
    }
    if (notePoints.length >= 30) {
      setNotePointsError('Maximum 30 note points allowed.')
      return
    }
    setNotePointsError(null)
    setNotePoints((prev) => [...prev, trimmed])
    setNewNotePoint('')
  }

  const handleStartEditNotePoint = (idx: number) => {
    setEditingIndex(idx)
    setEditingValue(notePoints[idx] || '')
    setNotePointsError(null)
  }

  const handleConfirmEditNotePoint = () => {
    if (editingIndex === null) return
    const trimmed = editingValue.trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!trimmed) {
      setNotePointsError('Note point cannot be empty.')
      return
    }
    const duplicate = notePoints.some(
      (p, i) => i !== editingIndex && p.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) {
      setNotePointsError(`"${trimmed}" already exists.`)
      return
    }
    setNotePoints((prev) => prev.map((p, i) => (i === editingIndex ? trimmed : p)))
    setEditingIndex(null)
    setEditingValue('')
  }

  const handleDeleteNotePoint = (idx: number) => {
    if (notePoints.length <= 1) {
      setNotePointsError('At least one local note point must remain.')
      return
    }
    setNotePointsError(null)
    setNotePoints((prev) => prev.filter((_, i) => i !== idx))
    if (editingIndex === idx) {
      setEditingIndex(null)
      setEditingValue('')
    }
  }

  const handleResetNotePoints = () => {
    setNotePointsError(null)
    setEditingIndex(null)
    setNotePoints(DEFAULT_NOTE_POINTS)
  }

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordSuccess(null)
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (!newPassword) {
      setPasswordError('Please enter a new password.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password.')
      return
    }

    try {
      setPasswordLoading(true)
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setPasswordError(data.message || 'Failed to update password. Please check your credentials.')
        return
      }

      setPasswordSuccess('Your password has been changed successfully!')
      setTimeout(() => {
        setIsPasswordModalOpen(false)
        resetPasswordForm()
      }, 1500)
    } catch (err: any) {
      setPasswordError(err.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateSetting = (key: keyof SettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex-1 space-y-6 p-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your restaurant and platform settings</p>
      </div>

      {saved && (
        <div className="rounded-lg bg-success/10 border border-success/50 p-3 text-sm text-success">
          ✓ Settings saved successfully
        </div>
      )}

      {/* Restaurant Information */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="size-5" />
          <h3 className="text-lg font-semibold">Restaurant Information</h3>
        </div>
        <Separator className="mb-6" />
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Restaurant Name
            </Label>
            <Input
              id="name"
              value={settings.restaurantName}
              onChange={(e) => updateSetting('restaurantName', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={settings.restaurantEmail}
              onChange={(e) => updateSetting('restaurantEmail', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="phone"
              value={settings.restaurantPhone}
              onChange={(e) => updateSetting('restaurantPhone', e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timezone" className="text-sm font-medium">
                Timezone
              </Label>
              <Input
                id="timezone"
                value={settings.timezone}
                onChange={(e) => updateSetting('timezone', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="currency" className="text-sm font-medium">
                Currency
              </Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="size-5" />
          <h3 className="text-lg font-semibold">Notifications</h3>
        </div>
        <Separator className="mb-6" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Email Notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Receive alerts via email</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notificationsEmail}
              onChange={(e) => updateSetting('notificationsEmail', e.target.checked)}
              className="rounded w-4 h-4"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">SMS Notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Receive alerts via SMS</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notificationsSms}
              onChange={(e) => updateSetting('notificationsSms', e.target.checked)}
              className="rounded w-4 h-4"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Push Notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Receive push alerts on your device</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notificationsPush}
              onChange={(e) => updateSetting('notificationsPush', e.target.checked)}
              className="rounded w-4 h-4"
            />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="size-5" />
          <h3 className="text-lg font-semibold">Security</h3>
        </div>
        <Separator className="mb-6" />
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 cursor-pointer hover:bg-accent"
            onClick={() => {
              resetPasswordForm()
              setIsPasswordModalOpen(true)
            }}
          >
            <Lock className="size-4" />
            Change Password
          </Button>
          <Button variant="outline" className="w-full gap-2 cursor-pointer hover:bg-accent" onClick={() => router.push('/staff')}>
            <Users className="size-4" />
            Manage Access & Permissions
          </Button>
        </div>
      </Card>

      {/* Highway / Drive-In Local Note Points */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Highway &amp; Drive-In Local Note Points</h3>
              <p className="text-xs text-muted-foreground">
                Configure quick-tap landmarks (e.g., Under Banyan Tree, Near ATM) shown to car/highway customers &amp; waiters.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit text-xs">
            {notePoints.length} / 30 Points
          </Badge>
        </div>
        <Separator className="mb-5" />

        {notePointsError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{notePointsError}</span>
          </div>
        )}

        {notePointsSavedMsg && (
          <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{notePointsSavedMsg}</span>
          </div>
        )}

        {/* Add New Note Point */}
        <div className="flex gap-2 mb-4">
          <Input
            value={newNotePoint}
            onChange={(e) => setNewNotePoint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddNotePoint()
              }
            }}
            placeholder="Add new local note point (e.g. Near Toll Plaza Gate 2)..."
            maxLength={60}
            disabled={notePointsLoading || notePointsSaving}
            className="text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddNotePoint}
            disabled={!newNotePoint.trim() || notePointsLoading || notePointsSaving}
            className="gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="size-4" />
            Add Point
          </Button>
        </div>

        {/* List of Note Points */}
        {notePointsLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="size-4 animate-spin" />
            Loading local note points...
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-5">
            {notePoints.map((point, idx) => (
              <div
                key={`${point}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs"
              >
                {editingIndex === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleConfirmEditNotePoint()
                        } else if (e.key === 'Escape') {
                          setEditingIndex(null)
                        }
                      }}
                      maxLength={60}
                      autoFocus
                      className="h-7 text-xs px-2"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmEditNotePoint}
                      className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded cursor-pointer"
                      title="Save edit"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="p-1 text-muted-foreground hover:bg-muted rounded cursor-pointer"
                      title="Cancel"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium text-foreground">{point}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditNotePoint(idx)}
                        disabled={notePointsSaving}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer"
                        title="Edit note point"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotePoint(idx)}
                        disabled={notePointsSaving || notePoints.length <= 1}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded disabled:opacity-40 cursor-pointer"
                        title="Remove note point"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetNotePoints}
            disabled={notePointsLoading || notePointsSaving}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            Reset to Defaults
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => persistNotePoints(notePoints)}
            disabled={notePointsLoading || notePointsSaving}
            className="gap-1.5 text-xs cursor-pointer"
          >
            {notePointsSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                Save Note Points
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Integrations & Customer Reviews */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="size-5 text-amber-500" />
          <h3 className="text-lg font-semibold">Integrations & Customer Reviews</h3>
        </div>
        <Separator className="mb-6" />
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Configure Google OAuth 2.0 customer verification, direct Google Maps place review shortlinks, and 10% dining discount incentives.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 cursor-pointer hover:bg-accent"
              onClick={() => router.push('/integrations?tab=reviews')}
            >
              <Star className="size-4 text-amber-500" />
              Configure Google Reviews & OAuth
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 cursor-pointer hover:bg-accent"
              onClick={() => router.push('/integrations?tab=delivery')}
            >
              <Globe className="size-4" />
              Delivery Aggregators (Zomato/Swiggy)
            </Button>
          </div>
        </div>
      </Card>

      {/* Change Password Dialog */}
      <Dialog
        open={isPasswordModalOpen}
        onOpenChange={(open) => {
          setIsPasswordModalOpen(open)
          if (!open) resetPasswordForm()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lock className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold">Change Account Password</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Enter your current password and choose a secure new password for your account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            {passwordError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-medium">
                Current Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordLoading}
                  required
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-medium">
                New Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                  required
                  minLength={6}
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium">
                Confirm New Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                  required
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={passwordLoading}
                onClick={() => setIsPasswordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={passwordLoading || Boolean(passwordSuccess)}
                className="gap-2 cursor-pointer"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" />
                    Update Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} className="gap-2">
          <Save className="size-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
