import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyById } from '@/app/actions/company'
import { getReceptionistsByCompany } from '@/app/actions/receptionist'
import CompanyClientPage from '@/components/dashboard/company-client-page'

export const metadata = {
  title: 'Company | CallAI',
}

export default async function CompanyPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const comp = await getCompanyById(params.id)
    const receptionists = await getReceptionistsByCompany(params.id)

    return <CompanyClientPage company={comp} initialReceptionists={receptionists} />
  } catch (error) {
    redirect('/dashboard')
  }
}
