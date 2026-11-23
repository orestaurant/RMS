'use client'

import { TopNavbar } from '@/components/layout/top-navbar'
import { CustomerTopSearch } from '@/components/customer/customer-top-search'
import { CustomerOrdersView } from '@/components/customer/customer-orders-view'

export default function CustomerOrdersDashboardPage() {
  return (
    <>
      <TopNavbar
        title="All Orders"
        subtitle="Live orders & dining history"
      >
        <CustomerTopSearch />
      </TopNavbar>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <CustomerOrdersView hideHeader />
      </div>
    </>
  )
}
