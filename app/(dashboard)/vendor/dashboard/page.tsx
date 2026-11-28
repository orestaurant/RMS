import { TopNavbar } from '@/components/layout/top-navbar'
import { VendorDashboardView } from '@/components/dashboard/vendor-dashboard-view'

export const metadata = {
  title: 'Restock Requests | RestoSphere',
  description: 'Manage individual low-stock restock requests and warehouse deliveries',
}

export default function VendorDashboardPage() {
  return (
    <>
      <TopNavbar
        title="Restock Requests"
        subtitle="Individual Restock Requests · Live Auto-Sync"
      />
      <VendorDashboardView mode="requests" />
    </>
  )
}
