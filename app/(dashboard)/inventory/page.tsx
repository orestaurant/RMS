import { cookies } from 'next/headers'
import { TopNavbar } from '@/components/layout/top-navbar'
import { RawMaterialsView } from '@/components/inventory/raw-materials-view'
import { SESSION_COOKIE_NAME, verifyJWT, normalizeRole } from '@/lib/auth'

export const metadata = {
  title: 'Raw Material Inventory | RestoSphere',
  description: 'Manage warehouse raw material stocks, QR codes, and automated vendor alerts',
}

export default async function InventoryPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const payload = token ? await verifyJWT(token) : null
  const initialRole = normalizeRole(payload?.role)
  const isChef = initialRole === 'CHEF'

  return (
    <>
      <TopNavbar
        title="Raw Material Inventory"
        subtitle={
          isChef
            ? 'Stock Levels · Kitchen Stock Updates'
            : 'Stock Levels · Automated Vendor Alerts · QR Codes'
        }
      />
      <RawMaterialsView initialRole={initialRole} />
    </>
  )
}
