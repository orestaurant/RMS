import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyById } from '@/app/actions/company'
import { getCallRecordsByCompany, getCallStats } from '@/app/actions/call'
import CallManagementClient from '@/components/dashboard/call-management-client'

export const metadata = {
  title: 'Call Management | CallAI',
}

export default async function CallsPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const comp = await getCompanyById(params.id)
    const calls = await getCallRecordsByCompany(params.id, 100)
    const stats = await getCallStats(params.id)

    return (
      <CallManagementClient
        company={comp}
        initialCalls={calls}
        initialStats={stats}
      />
    )
  } catch (error) {
    redirect('/dashboard')
  }
}
