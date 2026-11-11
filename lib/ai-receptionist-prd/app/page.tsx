import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">CallAI Receptionist</h1>
          <div className="flex gap-4">
            <Link href="/sign-in" className="text-foreground hover:text-muted-foreground">
              Sign In
            </Link>
            <Link href="/sign-up" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            AI-Powered Receptionist for Your Business
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Never miss a call. Never lose a lead. Automate your phone lines with intelligent AI that answers calls, schedules appointments, and qualifies prospects.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/sign-up" className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 font-semibold">
              Get Started Free
            </Link>
            <a href="#features" className="border border-border text-foreground px-8 py-3 rounded-lg hover:bg-muted">
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div id="features" className="bg-muted/30 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-foreground mb-12 text-center">
            Powerful Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background border border-border p-8 rounded-lg">
              <h4 className="text-xl font-semibold text-foreground mb-4">
                24/7 Availability
              </h4>
              <p className="text-muted-foreground">
                Your AI receptionist never sleeps. Answer calls anytime, anywhere, without hiring additional staff.
              </p>
            </div>
            <div className="bg-background border border-border p-8 rounded-lg">
              <h4 className="text-xl font-semibold text-foreground mb-4">
                Smart Scheduling
              </h4>
              <p className="text-muted-foreground">
                Automatically create appointments, check availability, and send confirmations in real-time.
              </p>
            </div>
            <div className="bg-background border border-border p-8 rounded-lg">
              <h4 className="text-xl font-semibold text-foreground mb-4">
                Lead Qualification
              </h4>
              <p className="text-muted-foreground">
                Intelligently qualify leads and route calls to the right team members instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2026 CallAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
