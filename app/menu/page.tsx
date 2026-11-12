import { Suspense } from 'react'
import { CustomerMenu } from '@/components/menu/customer-menu'
import { RefreshCw } from 'lucide-react'

export const metadata = {
  title: 'Digital Menu & Table Ordering | Spice Garden',
  description: 'Scan QR code, browse live restaurant menu, and place dine-in orders directly from your table.',
}

export default function CustomerMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="size-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Loading restaurant menu...</p>
          </div>
        </div>
      }
    >
      <CustomerMenu />
    </Suspense>
  )
}

