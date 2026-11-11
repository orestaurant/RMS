'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createReceptionist, getReceptionistsByCompany, deleteReceptionist } from '@/app/actions/receptionist'
import { updateCompany } from '@/app/actions/company'

interface Company {
  id: string
  name: string
  industry?: string
  website?: string
  phoneNumber?: string
  plan: string
  status: string
  logo?: string
}

interface Receptionist {
  id: string
  companyId: string
  name: string
  voiceId?: string
  language: string
  systemPrompt?: string
  greetingMessage?: string
  transferNumber?: string
  isActive: boolean
  createdAt: Date
}

interface CompanyClientPageProps {
  company: Company
  initialReceptionists: Receptionist[]
}

export default function CompanyClientPage({
  company,
  initialReceptionists,
}: CompanyClientPageProps) {
  const [receptionists, setReceptionists] = useState<Receptionist[]>(initialReceptionists)
  const [showNewForm, setShowNewForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    language: 'en',
    greetingMessage: 'Hello, thank you for calling. How can I help you?',
    transferNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreateReceptionist = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const newReceptionist = await createReceptionist({
        companyId: company.id,
        name: formData.name,
        language: formData.language,
        greetingMessage: formData.greetingMessage,
        transferNumber: formData.transferNumber,
      })
      setReceptionists([...receptionists, newReceptionist])
      setFormData({
        name: '',
        language: 'en',
        greetingMessage: 'Hello, thank you for calling. How can I help you?',
        transferNumber: '',
      })
      setShowNewForm(false)
    } catch (error) {
      console.error('[v0] Failed to create receptionist:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReceptionist = async (receptionistId: string) => {
    if (window.confirm('Are you sure you want to delete this receptionist?')) {
      try {
        await deleteReceptionist(receptionistId)
        setReceptionists(receptionists.filter((r) => r.id !== receptionistId))
      } catch (error) {
        console.error('[v0] Failed to delete receptionist:', error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-primary hover:text-primary/90 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
          <p className="text-muted-foreground mt-2">
            Plan: <span className="font-semibold text-foreground capitalize">{company.plan}</span>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Company Info */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted rounded-lg p-6 border border-border">
            {company.industry && (
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="text-foreground font-semibold">{company.industry}</p>
              </div>
            )}
            {company.website && (
              <div>
                <p className="text-sm text-muted-foreground">Website</p>
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/90">
                  {company.website}
                </a>
              </div>
            )}
            {company.phoneNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="text-foreground font-semibold">{company.phoneNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-foreground font-semibold capitalize">{company.status}</p>
            </div>
          </div>
        </section>

        {/* Settings & Integration Links */}
        <section className="flex justify-end gap-2 mb-8">
          <Link
            href={`/dashboard/company/${company.id}/integrations`}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm"
          >
            Integrations
          </Link>
          <Link
            href={`/dashboard/company/${company.id}/settings`}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm"
          >
            Settings
          </Link>
        </section>

        {/* Quick Links */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href={`/dashboard/company/${company.id}/calls`}
              className="p-6 bg-background border border-border rounded-lg hover:border-primary hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">Call Management</h3>
              <p className="text-sm text-muted-foreground">View and manage call history</p>
              <p className="text-xs text-primary mt-4">View calls →</p>
            </Link>
            <Link
              href={`/dashboard/company/${company.id}/contacts`}
              className="p-6 bg-background border border-border rounded-lg hover:border-primary hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">CRM</h3>
              <p className="text-sm text-muted-foreground">Manage contacts and sales deals</p>
              <p className="text-xs text-primary mt-4">View CRM →</p>
            </Link>
            <Link
              href={`/dashboard/company/${company.id}/appointments`}
              className="p-6 bg-background border border-border rounded-lg hover:border-primary hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">Appointments</h3>
              <p className="text-sm text-muted-foreground">Schedule and manage appointments</p>
              <p className="text-xs text-primary mt-4">View appointments →</p>
            </Link>
            <Link
              href={`/dashboard/company/${company.id}/analytics`}
              className="p-6 bg-background border border-border rounded-lg hover:border-primary hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">Analytics</h3>
              <p className="text-sm text-muted-foreground">View performance metrics</p>
              <p className="text-xs text-primary mt-4">View analytics →</p>
            </Link>
            <Link
              href={`/dashboard/company/${company.id}/messages`}
              className="p-6 bg-background border border-border rounded-lg hover:border-primary hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">Messages</h3>
              <p className="text-sm text-muted-foreground">Send SMS and email campaigns</p>
              <p className="text-xs text-primary mt-4">View messages →</p>
            </Link>
          </div>
        </section>

        {/* Receptionists Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">AI Receptionists</h2>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              {showNewForm ? 'Cancel' : 'New Receptionist'}
            </button>
          </div>

          {/* New Receptionist Form */}
          {showNewForm && (
            <form onSubmit={handleCreateReceptionist} className="mb-12 p-6 bg-muted rounded-lg border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-4">Create New Receptionist</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Receptionist Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Sarah"
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Greeting Message
                  </label>
                  <textarea
                    value={formData.greetingMessage}
                    onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                    placeholder="What should the receptionist say when answering calls?"
                    rows={3}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Transfer Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.transferNumber}
                    onChange={(e) => setFormData({ ...formData, transferNumber: e.target.value })}
                    placeholder="Phone number to transfer calls to"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Receptionist'}
                </button>
              </div>
            </form>
          )}

          {/* Receptionists List */}
          {receptionists.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg border border-border">
              <p className="text-muted-foreground mb-4">No receptionists yet. Create one to get started!</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
              >
                Create First Receptionist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {receptionists.map((receptionist) => (
                <div
                  key={receptionist.id}
                  className="p-6 bg-background border border-border rounded-lg hover:border-primary transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{receptionist.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Status: {receptionist.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                      {receptionist.language.toUpperCase()}
                    </span>
                  </div>
                  {receptionist.greetingMessage && (
                    <p className="text-sm text-muted-foreground mb-4 italic">
                      &quot;{receptionist.greetingMessage}&quot;
                    </p>
                  )}
                  {receptionist.transferNumber && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Transfer: {receptionist.transferNumber}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/receptionist/${receptionist.id}`}
                      className="flex-1 text-center px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-semibold"
                    >
                      Configure
                    </Link>
                    <button
                      onClick={() => handleDeleteReceptionist(receptionist.id)}
                      className="px-3 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
