import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyById } from '@/app/actions/company'
import { getMessagesByCompany, getConversationStats } from '@/app/actions/message'
import MessagingClientPage from '@/components/dashboard/messaging-client-page'

export const metadata = {
  title: 'Messages | CallAI',
}

export default async function MessagingPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const comp = await getCompanyById(params.id)
    const messages = await getMessagesByCompany(params.id)
    const stats = await getConversationStats(params.id)

    return (
      <MessagingClientPage
        company={comp}
        initialMessages={messages}
        stats={stats}
      />
    )
  } catch (error) {
    redirect('/dashboard')
  }
}
