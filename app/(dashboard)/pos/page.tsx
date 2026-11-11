import { TopNavbar } from '@/components/layout/top-navbar'
import { POSTerminal } from '@/components/pos/pos-terminal'

export default function POSPage() {
  return (
    <>
      <TopNavbar title="POS Terminal" subtitle="Touch-optimized · Fast checkout" />
      <POSTerminal />
    </>
  )
}
