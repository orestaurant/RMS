import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { company } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { IntegrationsClientPage } from '@/components/dashboard/integrations-client-page'

export default async function IntegrationsPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    redirect('/sign-in')
  }

  const comp = await db.select().from(company).where(eq(company.id, params.id)).limit(1)

  if (!comp.length) {
    redirect('/dashboard')
  }

  if (comp[0].userId !== session.user.id) {
    redirect('/dashboard')
  }

  return <IntegrationsClientPage company={comp[0]} />
}
