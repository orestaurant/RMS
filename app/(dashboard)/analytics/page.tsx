import { TopNavbar } from '@/components/layout/top-navbar'
import { AnalyticsView } from '@/components/analytics/analytics-view'

export default function AnalyticsPage() {
  return (
    <>
      <TopNavbar title="Analytics" subtitle="Revenue · Trends · Performance" />
      <AnalyticsView />
    </>
  )
}
