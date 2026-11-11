import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyById } from '@/app/actions/company'
import { getSubscriptionByCompany, getInvoicesByCompany, getBillingStats } from '@/app/actions/billing'
import BillingClientPage from '@/components/dashboard/billing-client-page'

export const metadata = {
  title: 'Billing | CallAI',
}

export default async function BillingPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const comp = await getCompanyById(params.id)
    const subscription = await getSubscriptionByCompany(params.id)
    const invoices = await getInvoicesByCompany(params.id)
    const stats = await getBillingStats(params.id)

    return (
      <BillingClientPage
        company={comp}
        subscription={subscription}
        invoices={invoices}
        stats={stats}
      />
    )
  } catch (error) {
    redirect('/dashboard')
  }
}
