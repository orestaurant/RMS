import { TopNavbar } from '@/components/layout/top-navbar'
import { InventoryManagerDashboardView } from '@/components/dashboard/inventory-manager-dashboard-view'

export const metadata = {
  title: 'Vendor Requests | RestoSphere',
  description: 'Track vendor restock requests, responses, supply confirmations, and completed deliveries',
}

export default function InventoryVendorRequestsPage() {
  return (
    <>
      <TopNavbar
        title="Vendor Requests"
        subtitle="Restock Requests · Vendor Responses · Supply Confirmations"
      />
      <InventoryManagerDashboardView mode="vendor-requests" />
    </>
  )
}
