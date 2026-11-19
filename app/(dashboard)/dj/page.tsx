import { TopNavbar } from '@/components/layout/top-navbar'
import { DjDashboardView } from '@/components/dj/dj-dashboard-view'

export const metadata = {
  title: 'DJ Dashboard & Booth | RestoSphere',
  description: 'Live DJ song requests, crowd queue management, and real-time playback control.',
}

export default function DjPage() {
  return (
    <>
      <TopNavbar title="DJ Dashboard" subtitle="Live DJ booth · Real-time guest song requests" />
      <DjDashboardView />
    </>
  )
}
