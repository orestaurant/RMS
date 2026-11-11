import { TopNavbar } from '@/components/layout/top-navbar'
import { BillingView } from '@/components/billing/billing-view'

export default function BillingPage() {
  return (
    <>
      <TopNavbar title="Billing & Invoicing" subtitle="Invoices · Payments · Reports" />
      <BillingView />
    </>
  )
}
