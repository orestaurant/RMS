import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyById } from '@/app/actions/company'
import { getCompanyAnalytics, getCallTrends } from '@/app/actions/analytics'
import AnalyticsClientPage from '@/components/dashboard/analytics-client-page'

export const metadata = {
  title: 'Analytics | CallAI',
}

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const comp = await getCompanyById(params.id)
    const analytics = await getCompanyAnalytics(params.id)
    const trends = await getCallTrends(params.id)

    return (
      <AnalyticsClientPage
        company={comp}
        analytics={analytics}
        trends={trends}
      />
    )
  } catch (error) {
    redirect('/dashboard')
  }
}
