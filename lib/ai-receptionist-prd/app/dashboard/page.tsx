import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/dashboard-client'

export const metadata = {
  title: 'Dashboard | CallAI',
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  return <DashboardClient userId={session.user.id} />
}
