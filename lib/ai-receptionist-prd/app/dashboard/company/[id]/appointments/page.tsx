import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyById } from '@/app/actions/company'
import { getAppointmentsByCompany, getAppointmentStats } from '@/app/actions/appointment'
import AppointmentsClientPage from '@/components/dashboard/appointments-client-page'

export const metadata = {
  title: 'Appointments | CallAI',
}

export default async function AppointmentsPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  try {
    const comp = await getCompanyById(params.id)
    const appointments = await getAppointmentsByCompany(params.id)
    const stats = await getAppointmentStats(params.id)

    return (
      <AppointmentsClientPage
        company={comp}
        initialAppointments={appointments}
        stats={stats}
      />
    )
  } catch (error) {
    redirect('/dashboard')
  }
}
