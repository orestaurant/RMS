'use client'

import Link from 'next/link'

interface Company {
  id: string
  name: string
}

interface Trend {
  date: string
  calls: number
  completed: number
  missed: number
}

interface Analytics {
  overview: {
    totalCalls: number
    totalContacts: number
    totalDeals: number
    totalAppointments: number
  }
  calls: {
    totalCalls: number
    completedCalls: number
    missedCalls: number
    failedCalls: number
    recentCalls: number
    avgCallDuration: number
    callSuccessRate: number
  }
  deals: {
    totalDeals: number
    wonDeals: number
    openDeals: number
    totalDealValue: number
    winRate: number
    avgDealValue: number
  }
  contacts: {
    totalContacts: number
    newContacts: number
  }
  appointments: {
    totalAppointments: number
    upcomingAppointments: number
    completedAppointments: number
    cancelledAppointments: number
  }
  messages: {
    totalMessages: number
    smsMessages: number
    emailMessages: number
    sentMessages: number
  }
}

interface AnalyticsClientPageProps {
  company: Company
  analytics: Analytics
  trends: Trend[]
}

export default function AnalyticsClientPage({
  company,
  analytics,
  trends,
}: AnalyticsClientPageProps) {
  const maxCalls = Math.max(...trends.map((t) => t.calls), 1)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href={`/dashboard/company/${company.id}`} className="text-primary hover:text-primary/90 text-sm mb-4 inline-block">
            ← Back to Company
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{company.name} - Analytics</h1>
          <p className="text-muted-foreground mt-1">Performance metrics and insights</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 bg-background border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Calls</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {analytics.overview.totalCalls}
              </p>
            </div>
            <div className="p-6 bg-background border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Contacts</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {analytics.overview.totalContacts}
              </p>
            </div>
            <div className="p-6 bg-background border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Deals</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {analytics.overview.totalDeals}
              </p>
            </div>
            <div className="p-6 bg-background border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Appointments</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {analytics.overview.totalAppointments}
              </p>
            </div>
          </div>
        </section>

        {/* Call Trends */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Call Trends (Last 7 Days)</h2>
          <div className="p-6 bg-background border border-border rounded-lg">
            <div className="space-y-4">
              {trends.map((trend) => (
                <div key={trend.date}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">{trend.date}</span>
                    <span className="text-sm text-muted-foreground">{trend.calls} calls</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${maxCalls > 0 ? (trend.calls / maxCalls) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>✓ {trend.completed} completed</span>
                    <span>✗ {trend.missed} missed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed Metrics */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Detailed Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Call Metrics */}
            <div className="p-6 bg-background border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Call Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.calls.callSuccessRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Call Duration</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.calls.avgCallDuration}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed Calls</span>
                  <span className="text-sm font-semibold text-green-600">
                    {analytics.calls.completedCalls}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Missed Calls</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {analytics.calls.missedCalls}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Failed Calls</span>
                  <span className="text-sm font-semibold text-red-600">
                    {analytics.calls.failedCalls}
                  </span>
                </div>
              </div>
            </div>

            {/* Deal Metrics */}
            <div className="p-6 bg-background border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Sales Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.deals.winRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Deal Value</span>
                  <span className="text-sm font-semibold text-foreground">
                    ${analytics.deals.totalDealValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Deal Value</span>
                  <span className="text-sm font-semibold text-foreground">
                    ${analytics.deals.avgDealValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Won Deals</span>
                  <span className="text-sm font-semibold text-green-600">
                    {analytics.deals.wonDeals}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Open Deals</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {analytics.deals.openDeals}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Metrics */}
            <div className="p-6 bg-background border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Contact Management</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Contacts</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.contacts.totalContacts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New (Last 30 Days)</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {analytics.contacts.newContacts}
                  </span>
                </div>
              </div>
            </div>

            {/* Messaging Metrics */}
            <div className="p-6 bg-background border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Messaging</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Messages</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.messages.totalMessages}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">SMS</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.messages.smsMessages}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.messages.emailMessages}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sent</span>
                  <span className="text-sm font-semibold text-green-600">
                    {analytics.messages.sentMessages}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Metrics */}
            <div className="p-6 bg-background border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Appointments</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Appointments</span>
                  <span className="text-sm font-semibold text-foreground">
                    {analytics.appointments.totalAppointments}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {analytics.appointments.upcomingAppointments}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-sm font-semibold text-green-600">
                    {analytics.appointments.completedAppointments}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cancelled</span>
                  <span className="text-sm font-semibold text-red-600">
                    {analytics.appointments.cancelledAppointments}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
