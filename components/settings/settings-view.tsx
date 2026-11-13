'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
