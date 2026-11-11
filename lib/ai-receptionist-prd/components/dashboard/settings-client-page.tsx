'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateCompanySettings,
  getCompanySettings,
  deleteCompany,
} from '@/app/actions/settings'
import type { InferSelectModel } from 'drizzle-orm'
import { company as companyTable, user as userTable } from '@/lib/db/schema'

type Company = InferSelectModel<typeof companyTable>
type User = InferSelectModel<typeof userTable>

export function SettingsClientPage({
  company,
  user,
}: {
  company: Company
  user: User
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'company' | 'security' | 'danger'>('company')
  const [formData, setFormData] = useState({
    name: company.name || '',
    industry: company.industry || '',
    website: company.website || '',
    phoneNumber: company.phoneNumber || '',
  })
  const [message, setMessage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await updateCompanySettings(company.id, formData)
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error saving settings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }

    setLoading(false)
  }

  const handleDeleteCompany = async () => {
    if (!confirm('Are you absolutely sure? This action cannot be undone. All data will be deleted.')) {
      return
    }

    setLoading(true)
    try {
      await deleteCompany(company.id)
      router.push('/dashboard')
    } catch (error) {
      setMessage('Error deleting company: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/dashboard/company/${company.id}`} className="text-primary hover:underline text-sm">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => setTab('company')}
              className={`pb-4 text-sm font-medium transition ${
                tab === 'company'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Company Information
            </button>
            <button
              onClick={() => setTab('security')}
              className={`pb-4 text-sm font-medium transition ${
                tab === 'security'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setTab('danger')}
              className={`pb-4 text-sm font-medium transition ${
                tab === 'danger'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Danger Zone
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.startsWith('Error')
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-green-100 text-green-800 border border-green-300'
            }`}
          >
            {message}
          </div>
        )}

        {/* Company Information Tab */}
        {tab === 'company' && (
          <div className="bg-background border border-border rounded-lg p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Company Information</h2>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="e.g., Healthcare, Finance, Retail"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      name: company.name || '',
                      industry: company.industry || '',
                      website: company.website || '',
                      phoneNumber: company.phoneNumber || '',
                    })
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <div className="bg-background border border-border rounded-lg p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Security Settings</h2>
            <div className="space-y-6">
              <div className="border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add an extra layer of security to your account
                </p>
                <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
                  Enable 2FA
                </button>
              </div>

              <div className="border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">API Keys</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage API keys for programmatic access
                </p>
                <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
                  Manage API Keys
                </button>
              </div>

              <div className="border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Active Sessions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  View and manage your active sessions
                </p>
                <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
                  View Sessions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone Tab */}
        {tab === 'danger' && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-700 mb-6">Danger Zone</h2>
            <div className="space-y-6">
              <div className="border border-red-300 rounded-lg p-6">
                <h3 className="font-semibold text-red-700 mb-2">Delete Company</h3>
                <p className="text-sm text-red-600 mb-4">
                  Permanently delete this company and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteCompany}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Company'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
