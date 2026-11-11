import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyById } from '@/app/actions/company'
import { getContactsByCompany } from '@/app/actions/contact'
import { getDealsByCompany, getDealStats } from '@/app/actions/deal'
import CRMClientPage from '@/components/dashboard/crm-client-page'

export const metadata = {
  title: 'CRM | CallAI',
}

export default async function CRMPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const comp = await getCompanyById(params.id)
    const contacts = await getContactsByCompany(params.id)
    const deals = await getDealsByCompany(params.id)
    const dealStats = await getDealStats(params.id)

    return (
      <CRMClientPage
        company={comp}
        initialContacts={contacts}
        initialDeals={deals}
        dealStats={dealStats}
      />
    )
  } catch (error) {
    redirect('/dashboard')
  }
}
