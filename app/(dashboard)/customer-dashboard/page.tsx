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
      <CustomerDashboardView />
    </>
  )
}
