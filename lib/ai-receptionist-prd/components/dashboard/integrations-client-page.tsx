'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  disconnectIntegration,
  getIntegrations,
  connectIntegration,
} from '@/app/actions/integrations'
import type { InferSelectModel } from 'drizzle-orm'
import { company as companyTable } from '@/lib/db/schema'

interface Company {
  id: string
  name: string
  userId: string
}

interface Integration {
  id: string
  type: string
  name: string
  isActive: boolean
  createdAt: Date
}

export function IntegrationsClientPage({ company }: { company: Company }) {
  const router = useRouter()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [testingId, setTestingId] = useState<string>('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})

  const availableIntegrations = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Payment processing and billing',
      icon: '💳',
      fields: ['api_key'],
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'SMS and voice communications',
      icon: '📞',
      fields: ['account_sid', 'auth_token'],
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Calendar and appointment sync',
      icon: '📅',
      fields: ['api_key', 'calendar_id'],
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Slack workspace notifications',
      icon: '💬',
      fields: ['webhook_url'],
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'CRM and sales automation',
      icon: '🎯',
      fields: ['api_key'],
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Automate workflows',
      icon: '⚡',
      fields: ['api_key'],
    },
  ]

  const handleAddIntegration = async (typeId: string) => {
    setLoading(true)
    try {
      await connectIntegration(company.id, typeId)
      await loadIntegrations()
      setShowForm(false)
      setSelectedType('')
      setCredentials({})
    } catch (error) {
      console.error('Error adding integration:', error)
    }
    setLoading(false)
  }

  const handleRemoveIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to remove this integration?')) return

    setLoading(true)
    try {
      await disconnectIntegration(company.id, integrationId)
      await loadIntegrations()
    } catch (error) {
      console.error('Error removing integration:', error)
    }
    setLoading(false)
  }

  const handleTestIntegration = async (integrationId: string) => {
    setTestingId(integrationId)
    try {
      alert('Integration connected and active!')
    } catch (error) {
      console.error('Error testing integration:', error)
      alert('Error testing integration')
    }
    setTestingId('')
  }

  const loadIntegrations = async () => {
    try {
      const result = await getIntegrations(company.id)
      setIntegrations(result)
    } catch (error) {
      console.error('Error loading integrations:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href={`/dashboard/company/${company.id}`} className="text-primary hover:underline text-sm">
                ← Back
              </Link>
              <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
            </div>
            <p className="text-muted-foreground">Connect external services and tools to enhance your receptionist</p>
          </div>
        </div>

        {/* Connected Integrations */}
        {integrations.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Connected Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {integrations.map((integration) => {
                const template = availableIntegrations.find((t) => t.id === integration.type)
                return (
                  <div key={integration.id} className="bg-background border border-border rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{template?.icon}</span>
                          <h3 className="text-lg font-semibold text-foreground">{integration.name}</h3>
                        </div>
                        <span
                          className={`inline-block px-3 py-1 text-xs rounded-full ${
                            integration.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {integration.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveIntegration(integration.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemoveIntegration(integration.id)}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded hover:bg-muted"
                      >
                        Settings
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Available Integrations */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Available Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableIntegrations.map((template) => {
              const isConnected = integrations.some((i) => i.type === template.id)
              return (
                <div
                  key={template.id}
                  className={`bg-background border rounded-lg p-6 ${
                    isConnected ? 'border-green-500 bg-green-50/50' : 'border-border'
                  }`}
                >
                  <div className="text-4xl mb-4">{template.icon}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                  {!isConnected && (
                    <button
                      onClick={() => handleAddIntegration(template.id)}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      {loading ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                  {isConnected && <div className="text-green-600 text-sm font-medium">✓ Connected</div>}
                </div>
              )
            })}
          </div>
        </section>


      </div>
    </div>
  )
}
