'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Bell, Lock, Palette, Database, Users, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface SettingsState {
  restaurantName: string
  restaurantEmail: string
  restaurantPhone: string
  timezone: string
  currency: string
  notificationsEmail: boolean
  notificationsSms: boolean
  notificationsPush: boolean
  backupDaily: boolean
  backupWeekly: boolean
}

export function SettingsView() {
  const router = useRouter()
  const [settings, setSettings] = useState<SettingsState>({
    restaurantName: 'Spice Garden',
    restaurantEmail: 'info@spicegarden.com',
    restaurantPhone: '+91-22-1234-5678',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    notificationsEmail: true,
    notificationsSms: true,
    notificationsPush: true,
    backupDaily: true,
    backupWeekly: true,
  })

  const [saved, setSaved] = useState(false)

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

      {/* Data & Backup */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="size-5" />
          <h3 className="text-lg font-semibold">Data & Backup</h3>
        </div>
        <Separator className="mb-6" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Daily Backups</p>
              <p className="text-xs text-muted-foreground mt-1">Automatically backup data daily at 2 AM</p>
            </div>
            <input
              type="checkbox"
              checked={settings.backupDaily}
              onChange={(e) => updateSetting('backupDaily', e.target.checked)}
              className="rounded w-4 h-4"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Weekly Backups</p>
              <p className="text-xs text-muted-foreground mt-1">Automatically backup data weekly on Sundays</p>
            </div>
            <input
              type="checkbox"
              checked={settings.backupWeekly}
              onChange={(e) => updateSetting('backupWeekly', e.target.checked)}
              className="rounded w-4 h-4"
            />
          </div>
          <Separator />
          <Button variant="outline" className="w-full gap-2">
            <Database className="size-4" />
            Download Backup Now
          </Button>
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
          <Button variant="outline" className="w-full gap-2">
            <Lock className="size-4" />
            Change Password
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => router.push('/staff')}>
            <Users className="size-4" />
            Manage Access & Permissions
          </Button>
        </div>
      </Card>

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
