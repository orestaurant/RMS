import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import OnboardingClient from '@/components/onboarding/onboarding-client'

export const metadata = {
  title: 'Onboarding | CallAI',
}

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  return <OnboardingClient userId={session.user.id} userName={session.user.name || ''} />
}
