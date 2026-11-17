import { TopNavbar } from '@/components/layout/top-navbar'
import { BillingManagementView } from '@/components/billing/billing-management-view'

export const metadata = {
  title: 'Billing & Invoices | Restaurant Management OS',
  description: 'Manage table billing, manager discounts, payment settlements, and waiter tip ledger.',
}

export default function BillingPage() {
  return (
    <>
      <TopNavbar title="Billing & Invoices" subtitle="Table billing · Discounts · Settlements · Tips" />
      <BillingManagementView />
    </>
  )
}
