'use client'

import { TopNavbar } from '@/components/layout/top-navbar'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { useAuthContext } from '@/hooks/useAuthContext'

export default function DashboardPage() {
  const { auth } = useAuthContext()
  const isCustomer = String(auth?.role || '').toUpperCase() === 'CUSTOMER'

  return (
    <>
      <TopNavbar
        title={isCustomer ? 'Customer Portal' : 'Dashboard'}
        subtitle={isCustomer ? 'Live orders & guest services' : 'Overview & live performance'}
      />
      <DashboardOverview />
    </>
  )
}
