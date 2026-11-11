'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, skipOnboarding } from '@/app/actions/onboarding'
import { createCompany } from '@/app/actions/company'
import Link from 'next/link'

interface OnboardingClientProps {
  userId: string
  userName: string
}

type Step = 'welcome' | 'company' | 'confirmation'

export default function OnboardingClient({ userId, userName }: OnboardingClientProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    firstName: userName.split(' ')[0] || '',
    lastName: userName.split(' ')[1] || '',
  })
  const router = useRouter()

  const handleCompanyCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create company
      const company = await createCompany({
        name: formData.companyName,
        industry: formData.industry,
      })

      // Complete onboarding
      await completeOnboarding({
        companyName: formData.companyName,
        industry: formData.industry,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      setStep('confirmation')
    } catch (error) {
      console.error('[v0] Onboarding error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    try {
      await skipOnboarding()
      router.push('/dashboard')
    } catch (error) {
      console.error('[v0] Error skipping onboarding:', error)
    }
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-background border border-border rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to CallAI</h1>
            <p className="text-muted-foreground">
              Let&apos;s set up your AI receptionist in just a few minutes.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Create Your Company</h3>
                <p className="text-sm text-muted-foreground">Set up your business profile</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Configure Your Receptionist</h3>
                <p className="text-sm text-muted-foreground">Customize your AI agent</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Connect Your Phone Line</h3>
                <p className="text-sm text-muted-foreground">Link your business number</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('company')}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold"
            >
              Get Started
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted font-semibold"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'company') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-background border border-border rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <button
              onClick={() => setStep('welcome')}
              className="text-primary hover:text-primary/90 text-sm mb-4 inline-block"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-foreground mb-2">Company Information</h1>
            <p className="text-muted-foreground text-sm">Tell us about your business</p>
          </div>

          <form onSubmit={handleCompanyCreation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Your company name"
                required
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select an industry</option>
                <option value="healthcare">Healthcare</option>
                <option value="real_estate">Real Estate</option>
                <option value="legal">Legal Services</option>
                <option value="consulting">Consulting</option>
                <option value="retail">Retail</option>
                <option value="hospitality">Hospitality</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Your first name"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Your last name"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.companyName}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-background border border-border rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">All Set!</h1>
          <p className="text-muted-foreground">
            Your company &quot;{formData.companyName}&quot; has been created. You&apos;re ready to configure your AI receptionist!
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoToDashboard}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold"
          >
            Go to Dashboard
          </button>
          <Link
            href="/dashboard"
            className="block w-full text-center border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted font-semibold"
          >
            Continue Later
          </Link>
        </div>
      </div>
    </div>
  )
}
