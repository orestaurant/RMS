import { TopNavbar } from '@/components/layout/top-navbar'
import { InventoryView } from '@/components/inventory/inventory-view'

export default function InventoryPage() {
  return (
    <>
      <TopNavbar title="Inventory Management" subtitle="Items · Stock Levels · Reorder Points" />
      <InventoryView />
    </>
  )
}
