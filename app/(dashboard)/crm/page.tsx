import { TopNavbar } from '@/components/layout/top-navbar'
import { CRMView } from '@/components/crm/crm-view'

export default function CRMPage() {
  return (
    <>
      <TopNavbar title="CRM" subtitle="Customers · Loyalty · Relationships" />
      <CRMView />
    </>
  )
}
