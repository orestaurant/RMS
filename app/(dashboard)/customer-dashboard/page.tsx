'use client'

import { TopNavbar } from '@/components/layout/top-navbar'
import { CustomerDashboardView } from '@/components/dashboard/customer-dashboard-view'

export default function CustomerDashboardPage() {
  return (
    <>
      <TopNavbar
        title="Customer Portal"
        subtitle="Live orders & guest services"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <CustomerDashboardView />
      </div>
    </>
  )
}
