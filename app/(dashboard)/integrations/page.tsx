'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopNavbar } from '@/components/layout/top-navbar'
import { AggregatorsView } from '@/components/integrations/aggregators-view'
import { FeedbackIntegrationsView } from '@/components/integrations/feedback-integrations-view'
import { Star, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'delivery' ? 'delivery' : 'reviews'
  const [activeTab, setActiveTab] = useState<'reviews' | 'delivery'>(initialTab)

  return (
    <>
      <TopNavbar
        title="Platform & Review Integrations"
        subtitle="Google Reviews & OAuth · Food Delivery Aggregators (BYOK)"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/80 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer',
              activeTab === 'reviews'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Star className="size-4" />
            <span>Customer Feedback & Google Reviews</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={cn(
              'flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer',
              activeTab === 'delivery'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="size-4" />
            <span>Delivery Aggregators (Zomato · Swiggy · Uber Eats)</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'reviews' ? (
          <FeedbackIntegrationsView />
        ) : (
          <AggregatorsView />
        )}
      </div>
    </>
  )
}
