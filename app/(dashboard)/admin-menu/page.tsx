import { TopNavbar } from '@/components/layout/top-navbar'
import { MenuManagement } from '@/components/menu/menu-management'

export default function MenuPage() {
  return (
    <>
      <TopNavbar title="Menu Management" subtitle="Categories · Items · Variants" />
      <MenuManagement />
    </>
  )
}
