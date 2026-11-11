'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateReceptionist } from '@/app/actions/receptionist'
import ReceptionistTestChat from './receptionist-test-chat'

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

interface ReceptionistConfigClientProps {
  receptionist: Receptionist
}

export default function ReceptionistConfigClient({
  receptionist,
}: ReceptionistConfigClientProps) {
  const [formData, setFormData] = useState({
    name: receptionist.name,
    language: receptionist.language,
    greetingMessage: receptionist.greetingMessage || '',
    systemPrompt: receptionist.systemPrompt || '',
    transferNumber: receptionist.transferNumber || '',
    isActive: receptionist.isActive,
  })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState<'settings' | 'test'>('settings')
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveStatus('idle')

    try {
      await updateReceptionist(receptionist.id, {
        name: formData.name,
        language: formData.language,
        greetingMessage: formData.greetingMessage,
        systemPrompt: formData.systemPrompt,
        transferNumber: formData.transferNumber,
        isActive: formData.isActive,
      })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('[v0] Save error:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{receptionist.name}</h1>
              <p className="text-muted-foreground mt-1">Receptionist Configuration</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    formData.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-medium text-foreground">
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-0 font-semibold text-sm border-b-2 transition ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`py-4 px-0 font-semibold text-sm border-b-2 transition ${
                activeTab === 'test'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Test Chat
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'settings' ? (
          <div className="max-w-3xl">
            <form onSubmit={handleSave} className="space-y-8">
              {/* Basic Info */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-6">Basic Information</h2>
                <div className="space-y-4 bg-muted rounded-lg p-6 border border-border">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Receptionist Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      <option value="pt">Portuguese</option>
                      <option value="it">Italian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      Receptionist is Active
                    </label>
                  </div>
                </div>
              </section>

              {/* Greeting */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-2">Greeting Message</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  This is what the AI receptionist will say when answering calls
                </p>
                <textarea
                  value={formData.greetingMessage}
                  onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                  placeholder="e.g., Hello, thank you for calling. How can I help you today?"
                  rows={3}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </section>

              {/* System Prompt */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-2">System Prompt</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Define the receptionist&apos;s personality, tone, and behavior. Leave empty for defaults.
                </p>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="e.g., You are a friendly and professional receptionist. Be helpful and courteous. Always collect caller information and determine their needs..."
                  rows={6}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </section>

              {/* Transfer Settings */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-6">Call Transfer Settings</h2>
                <div className="space-y-4 bg-muted rounded-lg p-6 border border-border">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Transfer Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.transferNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, transferNumber: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      The receptionist will transfer calls to this number if needed
                    </p>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="flex gap-4 pt-8">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="border border-border text-foreground px-6 py-2 rounded-lg hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
              </div>

              {saveStatus === 'success' && (
                <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm">
                  Changes saved successfully!
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
                  Failed to save changes. Please try again.
                </div>
              )}
            </form>
          </div>
        ) : (
          <ReceptionistTestChat receptionistId={receptionist.id} />
        )}
      </main>
    </div>
  )
}
