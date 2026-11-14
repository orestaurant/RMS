'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || 'Invalid email or password.')
        setLoading(false)
        return
      }

      // Success: full navigation to clear all prior in-memory session and cache states
      const targetUrl = data.redirect || '/dashboard'
      window.location.href = targetUrl
    } catch (err: any) {
      setError(err?.message || 'An unexpected network error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-chart-1/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        {/* Brand Header — Clicking redirects to Home Page */}
        <Link
          href="/"
          className="flex flex-col items-center text-center gap-2 group cursor-pointer transition-transform hover:scale-105"
          title="Go to Home Page"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-white/20 group-hover:shadow-orange-500/40 transition-all">
            <UtensilsCrossed className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
              Resto<span className="text-orange-500">Sphere</span>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold text-primary border-primary/30 py-0 h-4">
                Staff Admin
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <span>Restaurant Operating System</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-primary hover:underline text-[11px]">← Back to Home</span>
            </p>
          </div>
        </Link>

        {/* Sign In Card */}
        <Card className="border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
              Sign In
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your credentials to access the administrative dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {/* Inline Error Alert Box */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@restaurant.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="pl-9 text-sm bg-background/50 border-input focus-visible:ring-primary h-10"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="pl-9 pr-10 text-sm bg-background/50 border-input focus-visible:ring-primary h-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold gap-2 shadow-lg shadow-primary/20"
                disabled={loading || !email.trim() || !password.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Sign In to Dashboard</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-0 border-t border-border/40 mt-2">
            <div className="flex items-center justify-between w-full text-xs pt-3">
              <span className="text-muted-foreground">Are you a customer?</span>
              <Link
                href="/customer/login"
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <UtensilsCrossed className="size-3" />
                Customer Login / Register <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-muted-foreground">
          Protected by PostgreSQL & Prisma ORM • JWT HttpOnly Sessions
        </p>
      </div>
    </div>
  )
}

