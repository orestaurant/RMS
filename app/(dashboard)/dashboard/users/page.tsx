import { TopNavbar } from '@/components/layout/top-navbar'
import { StaffView } from '@/components/staff/staff-view'

export default function UsersPage() {
  return (
    <>
      <TopNavbar title="User Management" subtitle="Role Assignment · Staff Directory · Access Control" />
      <StaffView />
    </>
  )
}

