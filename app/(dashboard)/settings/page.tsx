import { TopNavbar } from '@/components/layout/top-navbar'
import { SettingsView } from '@/components/settings/settings-view'

export default function SettingsPage() {
  return (
    <>
      <TopNavbar title="Settings" subtitle="System · Notifications · Preferences" />
      <SettingsView />
    </>
  )
}
