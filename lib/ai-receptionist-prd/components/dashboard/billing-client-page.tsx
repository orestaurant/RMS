'use client'

import Link from 'next/link'
import { updateInvoiceStatus } from '@/app/actions/billing'
import { useState } from 'react'

interface Company {
  id: string
  name: string
}

interface Subscription {
  id: string
  companyId: string
  planName: string
  tier: string
  monthlyPrice: number
  status: string
  startDate: Date
  renewalDate: Date
  maxReceptionists: number
  maxContacts: number
  callMinutesPerMonth: number
  createdAt: Date
  updatedAt: Date
}

interface Invoice {
  id: string
  subscriptionId: string
  companyId: string
  amount: number
  status: string
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
  }>
  createdAt: Date
  updatedAt: Date
}

interface BillingStats {
  currentPlan: string
  monthlyPrice: number
  subscriptionStatus: string
  totalRevenue: number
  outstandingBalance: number
  paidInvoices: number
  overdueInvoices: number
  totalInvoices: number
}

interface BillingClientPageProps {
  company: Company
  subscription: Subscription | null
  invoices: Invoice[]
  stats: BillingStats
}

type PlanTier = 'starter' | 'professional' | 'enterprise'

const PLANS: Record<PlanTier, { name: string; price: number; receptionists: number; contacts: number; minutes: number }> = {
  starter: { name: 'Starter', price: 99, receptionists: 1, contacts: 500, minutes: 1000 },
  professional: { name: 'Professional', price: 299, receptionists: 5, contacts: 5000, minutes: 10000 },
  enterprise: { name: 'Enterprise', price: 999, receptionists: 50, contacts: 50000, minutes: 100000 },
}

export default function BillingClientPage({
  company,
  subscription,
  invoices,
  stats,
}: BillingClientPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(
    (subscription?.tier as PlanTier) || null
  )
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, string>>(
    invoices.reduce((acc, inv) => ({ ...acc, [inv.id]: inv.status }), {})
  )

  const handleUpgradePlan = async (tier: PlanTier) => {
    try {
      console.log('[v0] Upgrading to plan:', tier)
      // In a real app, this would integrate with Stripe
      setSelectedPlan(tier)
    } catch (error) {
      console.error('[v0] Failed to upgrade plan:', error)
    }
  }

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus as 'draft' | 'issued' | 'paid' | 'overdue')
      setInvoiceStatuses({ ...invoiceStatuses, [invoiceId]: newStatus })
    } catch (error) {
      console.error('[v0] Failed to update invoice:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'issued':
        return 'bg-blue-100 text-blue-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href={`/dashboard/company/${company.id}`} className="text-primary hover:text-primary/90 text-sm mb-4 inline-block">
            ← Back to Company
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{company.name} - Billing</h1>
          <p className="text-muted-foreground mt-1">Manage subscriptions and invoices</p>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                ${stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                ${stats.outstandingBalance.toLocaleString()}
              </p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Paid Invoices</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.paidInvoices}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Overdue Invoices</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.overdueInvoices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Current Plan */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Current Plan</h2>
          {subscription ? (
            <div className="p-6 bg-background border border-border rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{subscription.planName}</h3>
                  <p className="text-muted-foreground">
                    ${subscription.monthlyPrice}/month
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  subscription.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {subscription.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Max Receptionists</p>
                  <p className="text-lg font-semibold text-foreground">
                    {subscription.maxReceptionists}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Contacts</p>
                  <p className="text-lg font-semibold text-foreground">
                    {subscription.maxContacts.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Call Minutes/Month</p>
                  <p className="text-lg font-semibold text-foreground">
                    {subscription.callMinutesPerMonth.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Started: {new Date(subscription.startDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Renews: {new Date(subscription.renewalDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-lg border border-border">
              <p className="text-muted-foreground mb-4">No active subscription</p>
              <p className="text-sm text-muted-foreground">Choose a plan to get started</p>
            </div>
          )}
        </section>

        {/* Plans */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PLANS).map(([tier, plan]) => (
              <div
                key={tier}
                className={`p-6 rounded-lg border transition ${
                  selectedPlan === tier
                    ? 'border-primary bg-background'
                    : 'border-border bg-muted/50 hover:border-primary'
                }`}
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-foreground mb-4">
                  ${plan.price}
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="text-foreground">
                    {plan.receptionists} AI Receptionist{plan.receptionists !== 1 ? 's' : ''}
                  </li>
                  <li className="text-foreground">
                    {plan.contacts.toLocaleString()} Contacts
                  </li>
                  <li className="text-foreground">
                    {plan.minutes.toLocaleString()} Call Minutes/Month
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgradePlan(tier as PlanTier)}
                  disabled={selectedPlan === tier}
                  className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    selectedPlan === tier
                      ? 'bg-primary text-primary-foreground cursor-default'
                      : 'bg-background border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {selectedPlan === tier ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Invoices */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Invoices</h2>
          {invoices.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg border border-border">
              <p className="text-muted-foreground">No invoices yet</p>
            </div>
          ) : (
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="px-6 py-3 text-left text-foreground font-semibold">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-foreground font-semibold">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-foreground font-semibold">
                        Issue Date
                      </th>
                      <th className="px-6 py-3 text-left text-foreground font-semibold">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-foreground font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-foreground font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-border hover:bg-muted/50 transition"
                      >
                        <td className="px-6 py-3 text-foreground font-mono">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-6 py-3 text-foreground font-semibold">
                          ${inv.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {new Date(inv.issueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <select
                            value={invoiceStatuses[inv.id]}
                            onChange={(e) =>
                              handleUpdateInvoiceStatus(inv.id, e.target.value)
                            }
                            className={`px-2 py-1 rounded text-xs font-semibold border-0 ${getStatusColor(
                              invoiceStatuses[inv.id]
                            )}`}
                          >
                            <option value="draft">Draft</option>
                            <option value="issued">Issued</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <a
                            href="#"
                            className="text-primary hover:text-primary/90 text-xs font-semibold"
                          >
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
