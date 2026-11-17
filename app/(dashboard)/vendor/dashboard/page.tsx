import { TopNavbar } from '@/components/layout/top-navbar'
import { VendorDashboardView } from '@/components/dashboard/vendor-dashboard-view'

export const metadata = {
  title: 'Vendor Dashboard | RestoSphere',
  description: 'Live restock requests and low-inventory alerts for suppliers',
}

export default function VendorDashboardPage() {
  return (
    <>
      <TopNavbar
        title="Vendor Dashboard"
        subtitle="Live Restock Requests · Low Stock Alerts"
      />
      <VendorDashboardView />
    </>
  )
}
