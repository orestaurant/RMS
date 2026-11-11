import { TopNavbar } from '@/components/layout/top-navbar'
import { KitchenDisplay } from '@/components/kitchen/kitchen-display'

export default function KitchenPage() {
  return (
    <>
      <TopNavbar title="Kitchen Display" subtitle="Live order queue · Kanban view" />
      <KitchenDisplay />
    </>
  )
}
