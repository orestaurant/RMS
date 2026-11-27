import { TopNavbar } from '@/components/layout/top-navbar'
import { RawMaterialsView } from '@/components/inventory/raw-materials-view'

export const metadata = {
  title: 'Raw Material Inventory | RestoSphere',
  description: 'Manage warehouse raw material stocks, QR codes, and automated vendor alerts',
}

export default function InventoryPage() {
  return (
    <>
      <TopNavbar
        title="Raw Material Inventory"
        subtitle="Stock Levels · Automated Vendor Alerts · QR Codes"
      />
      <RawMaterialsView />
    </>
  )
}
