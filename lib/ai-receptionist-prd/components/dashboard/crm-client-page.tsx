'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createContact, deleteContact } from '@/app/actions/contact'
import { createDeal, deleteDeal } from '@/app/actions/deal'

interface Company {
  id: string
  name: string
}

interface Contact {
  id: string
  companyId: string
  firstName: string
  lastName?: string
  email?: string
  phoneNumber?: string
  company?: string
  title?: string
  source?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface Deal {
  id: string
  companyId: string
  contactId?: string
  name: string
  value?: number
  currency: string
  status: string
  probability: number
  expectedCloseDate?: Date
  closedDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface DealStats {
  totalDeals: number
  totalValue: number
  openDeals: number
  wonDeals: number
  averageDealValue: number
}

interface CRMClientPageProps {
  company: Company
  initialContacts: Contact[]
  initialDeals: Deal[]
  dealStats: DealStats
}

type Tab = 'contacts' | 'deals'

export default function CRMClientPage({
  company,
  initialContacts,
  initialDeals,
  dealStats,
}: CRMClientPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('contacts')
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [showContactForm, setShowContactForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [contactFormData, setContactFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    company: '',
    title: '',
    source: '',
  })
  const [dealFormData, setDealFormData] = useState({
    name: '',
    value: '',
    status: 'new',
    probability: '0',
  })

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newContact = await createContact({
        companyId: company.id,
        firstName: contactFormData.firstName,
        lastName: contactFormData.lastName,
        email: contactFormData.email,
        phoneNumber: contactFormData.phoneNumber,
        company: contactFormData.company,
        title: contactFormData.title,
        source: contactFormData.source,
      })
      setContacts([...contacts, newContact])
      setContactFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        company: '',
        title: '',
        source: '',
      })
      setShowContactForm(false)
    } catch (error) {
      console.error('[v0] Failed to create contact:', error)
    }
  }

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newDeal = await createDeal({
        companyId: company.id,
        name: dealFormData.name,
        value: dealFormData.value ? parseFloat(dealFormData.value) : undefined,
        status: dealFormData.status,
        probability: parseInt(dealFormData.probability),
      })
      setDeals([...deals, newDeal])
      setDealFormData({
        name: '',
        value: '',
        status: 'new',
        probability: '0',
      })
      setShowDealForm(false)
    } catch (error) {
      console.error('[v0] Failed to create deal:', error)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteContact(contactId)
        setContacts(contacts.filter((c) => c.id !== contactId))
      } catch (error) {
        console.error('[v0] Failed to delete contact:', error)
      }
    }
  }

  const handleDeleteDeal = async (dealId: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteDeal(dealId)
        setDeals(deals.filter((d) => d.id !== dealId))
      } catch (error) {
        console.error('[v0] Failed to delete deal:', error)
      }
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
          <h1 className="text-3xl font-bold text-foreground">{company.name} - CRM</h1>
          <p className="text-muted-foreground mt-1">Manage contacts and sales deals</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-4 px-0 font-semibold text-sm border-b-2 transition ${
                activeTab === 'contacts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Contacts ({contacts.length})
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              className={`py-4 px-0 font-semibold text-sm border-b-2 transition ${
                activeTab === 'deals'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Deals ({deals.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'contacts' ? (
          <div>
            {/* Deal Stats */}
            <div className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold text-foreground">{dealStats.totalDeals}</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">${dealStats.totalValue.toLocaleString()}</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Open Deals</p>
                <p className="text-2xl font-bold text-foreground">{dealStats.openDeals}</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Won Deals</p>
                <p className="text-2xl font-bold text-green-600">{dealStats.wonDeals}</p>
              </div>
            </div>

            {/* Contacts */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Contacts</h2>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
              >
                {showContactForm ? 'Cancel' : 'New Contact'}
              </button>
            </div>

            {showContactForm && (
              <form onSubmit={handleCreateContact} className="mb-8 p-6 bg-muted rounded-lg border border-border">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">First Name *</label>
                    <input
                      type="text"
                      value={contactFormData.firstName}
                      onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                    <input
                      type="text"
                      value={contactFormData.lastName}
                      onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <input
                      type="email"
                      value={contactFormData.email}
                      onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                    <input
                      type="tel"
                      value={contactFormData.phoneNumber}
                      onChange={(e) => setContactFormData({ ...contactFormData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Company</label>
                    <input
                      type="text"
                      value={contactFormData.company}
                      onChange={(e) => setContactFormData({ ...contactFormData, company: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                    <input
                      type="text"
                      value={contactFormData.title}
                      onChange={(e) => setContactFormData({ ...contactFormData, title: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold"
                >
                  Create Contact
                </button>
              </form>
            )}

            {contacts.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-lg border border-border">
                <p className="text-muted-foreground">No contacts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contacts.map((contact) => (
                  <div key={contact.id} className="p-6 bg-background border border-border rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    {contact.title && <p className="text-sm text-muted-foreground">{contact.title}</p>}
                    {contact.email && (
                      <p className="text-sm text-muted-foreground break-all">{contact.email}</p>
                    )}
                    {contact.phoneNumber && (
                      <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
                    )}
                    {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="mt-4 text-destructive hover:text-destructive/90 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Sales Pipeline</h2>
              <button
                onClick={() => setShowDealForm(!showDealForm)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
              >
                {showDealForm ? 'Cancel' : 'New Deal'}
              </button>
            </div>

            {showDealForm && (
              <form onSubmit={handleCreateDeal} className="mb-8 p-6 bg-muted rounded-lg border border-border">
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Deal Name *</label>
                    <input
                      type="text"
                      value={dealFormData.name}
                      onChange={(e) => setDealFormData({ ...dealFormData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Value ($)</label>
                    <input
                      type="number"
                      value={dealFormData.value}
                      onChange={(e) => setDealFormData({ ...dealFormData, value: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <select
                      value={dealFormData.status}
                      onChange={(e) => setDealFormData({ ...dealFormData, status: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="new">New</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed_won">Closed Won</option>
                      <option value="closed_lost">Closed Lost</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold"
                >
                  Create Deal
                </button>
              </form>
            )}

            {deals.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-lg border border-border">
                <p className="text-muted-foreground">No deals yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {deals.map((d) => (
                  <div key={d.id} className="p-6 bg-background border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{d.name}</h3>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        {d.status}
                      </span>
                    </div>
                    {d.value && (
                      <p className="text-2xl font-bold text-foreground mb-2">
                        ${d.value.toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mb-4">Probability: {d.probability}%</p>
                    <button
                      onClick={() => handleDeleteDeal(d.id)}
                      className="text-destructive hover:text-destructive/90 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
