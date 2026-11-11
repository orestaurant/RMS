import { TopNavbar } from '@/components/layout/top-navbar'
import { StaffView } from '@/components/staff/staff-view'

export default function StaffPage() {
  return (
    <>
      <TopNavbar title="Staff Management" subtitle="Team · Roles · Schedules" />
      <StaffView />
    </>
  )
}
