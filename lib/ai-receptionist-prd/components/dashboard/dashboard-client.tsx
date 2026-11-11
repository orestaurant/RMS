'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCompanies, createCompany } from '@/app/actions/company'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  industry?: string
  plan: string
  status: string
  createdAt: Date
}

export default function DashboardClient({ userId }: { userId: string }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await getCompanies()
        setCompanies(data)
      } catch (error) {
        console.error('[v0] Failed to fetch companies:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [])

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newCompany = await createCompany({
        name: newCompanyName,
        industry: newCompanyIndustry,
      })
      setCompanies([...companies, newCompany])
      setNewCompanyName('')
      setNewCompanyIndustry('')
      setShowNewCompanyForm(false)
    } catch (error) {
      console.error('[v0] Failed to create company:', error)
    }
  }

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">Your Companies</h2>
          <button
            onClick={() => setShowNewCompanyForm(!showNewCompanyForm)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            {showNewCompanyForm ? 'Cancel' : 'New Company'}
          </button>
        </div>

        {/* New Company Form */}
        {showNewCompanyForm && (
          <form onSubmit={handleCreateCompany} className="mb-12 p-6 bg-muted rounded-lg border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-4">Create New Company</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry (Optional)
                </label>
                <input
                  type="text"
                  value={newCompanyIndustry}
                  onChange={(e) => setNewCompanyIndustry(e.target.value)}
                  placeholder="e.g., Healthcare, Real Estate"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold"
              >
                Create Company
              </button>
            </div>
          </form>
        )}

        {/* Companies List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg border border-border">
            <p className="text-muted-foreground mb-4">No companies yet. Create one to get started!</p>
            <button
              onClick={() => setShowNewCompanyForm(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              Create First Company
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((comp) => (
              <Link
                key={comp.id}
                href={`/dashboard/company/${comp.id}`}
                className="p-6 bg-background border border-border rounded-lg hover:border-primary hover:shadow-lg transition"
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">{comp.name}</h3>
                {comp.industry && (
                  <p className="text-sm text-muted-foreground mb-2">Industry: {comp.industry}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    {comp.plan}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comp.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
