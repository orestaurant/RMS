import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getReceptionistById } from '@/app/actions/receptionist'
import ReceptionistConfigClient from '@/components/dashboard/receptionist-config-client'

export const metadata = {
  title: 'Configure Receptionist | CallAI',
}

export default async function ReceptionistConfigPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const rec = await getReceptionistById(params.id)
    return <ReceptionistConfigClient receptionist={rec} />
  } catch (error) {
    redirect('/dashboard')
  }
}
