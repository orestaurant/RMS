import { Suspense } from 'react'
import { CustomerFeedbackView } from '@/components/customer/customer-feedback-view'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Customer Feedback & Google Review Verification | RestoSphere',
  description: 'Share your dining feedback and verify with Google to claim your 10% meal discount.',
}

export default function CustomerFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>Loading feedback form...</span>
        </div>
      }
    >
      <CustomerFeedbackView />
    </Suspense>
  )
}

