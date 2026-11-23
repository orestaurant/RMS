'use client'

import { TopNavbar } from '@/components/layout/top-navbar'
import { CustomerDashboardView } from '@/components/dashboard/customer-dashboard-view'
import { CustomerTopSearch } from '@/components/customer/customer-top-search'

export default function CustomerDashboardPage() {
  return (
    <>
      <TopNavbar
        title="Customer Portal"
        subtitle="Live orders & guest services"
      >
        <CustomerTopSearch />
      </TopNavbar>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <CustomerDashboardView />
      </div>
    </>
  )
}
