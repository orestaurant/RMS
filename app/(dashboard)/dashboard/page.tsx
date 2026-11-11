import { TopNavbar } from '@/components/layout/top-navbar'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'

export default function DashboardPage() {
  return (
    <>
      <TopNavbar title="Dashboard" subtitle="Overview & live performance" />
      <DashboardOverview />
    </>
  )
}

