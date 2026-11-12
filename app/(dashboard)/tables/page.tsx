import { TopNavbar } from '@/components/layout/top-navbar'
import { TablesView } from '@/components/tables/tables-view'

export default function TablesPage() {
  return (
    <>
      <TopNavbar title="Table Management" subtitle="Live floor map · Real-time occupancy" />
      <TablesView />
    </>
  )
}
