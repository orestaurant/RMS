import { TopNavbar } from '@/components/layout/top-navbar'
import { LiveOrdersView } from '@/components/orders/live-orders-view'

export default function OrdersPage() {
  return (
    <>
      <TopNavbar title="Live Orders" subtitle="Real-time order tracking" />
      <LiveOrdersView />
    </>
  )
}
