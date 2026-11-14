'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UtensilsCrossed,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CustomerAuthPageProps {
  initialTab?: 'signin' | 'register'
}

export default function CustomerAuthPage({ initialTab = 'signin' }: CustomerAuthPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(initialTab)

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Register State
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regMobile, setRegMobile] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password.')
      return
    }

    setLoginLoading(true)
    setLoginError(null)

    try {
      const res = await fetch('/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setLoginError(data.message || 'Invalid email or password.')
        setLoginLoading(false)
        return
      }

      // Success: full navigation to clear all prior in-memory session and cache states
      window.location.href = '/dashboard'
    } catch (err: any) {
      setLoginError(err?.message || 'A network error occurred. Please try again.')
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName || !regEmail || !regPassword) {
      setRegError('Name, email, and password are required.')
      return
    }

    if (regPassword.length < 4) {
      setRegError('Password must be at least 4 characters long.')
      return
    }

    setRegLoading(true)
    setRegError(null)

    try {
      const res = await fetch('/api/customer/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          mobile: regMobile || undefined,
          password: regPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setRegError(data.message || 'Registration failed.')
        setRegLoading(false)
        return
      }

      // Success: full navigation to clear all prior in-memory session and cache states
      window.location.href = '/dashboard'
    } catch (err: any) {
      setRegError(err?.message || 'A network error occurred. Please try again.')
      setRegLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-chart-1/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        {/* Restaurant Header — Clicking redirects to Home Page */}
        <Link
          href="/"
          className="flex flex-col items-center text-center gap-2 group cursor-pointer transition-transform hover:scale-105"
          title="Go to Home Page"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-xl shadow-rose-500/25 ring-1 ring-white/20 group-hover:shadow-rose-500/40 transition-all">
            <UtensilsCrossed className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
              Resto<span className="text-rose-500">Sphere</span>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0 h-4">
                Customer Portal
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <span>Access menus, reservations & dining</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-primary hover:underline text-[11px]">← Back to Home</span>
            </p>
          </div>
        </Link>

        {/* Tabbed Card Container */}
        <Card className="border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-3">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as 'signin' | 'register')
                setLoginError(null)
                setRegError(null)
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="signin" className="text-xs font-semibold cursor-pointer">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="text-xs font-semibold cursor-pointer">
                  Create Account
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {activeTab === 'signin' ? (
              /* ─── Sign In Form ───────────────────────── */
              <div className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold text-foreground">Welcome Customer</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Sign in with your email to access the restaurant portal
                  </CardDescription>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-xs font-medium text-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={loginLoading}
                        className="pl-9 text-sm h-10 bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-xs font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={loginLoading}
                        className="pl-9 pr-10 text-sm h-10 bg-background/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 text-sm font-semibold gap-2 shadow-lg shadow-primary/20"
                    disabled={loginLoading || !loginEmail.trim() || !loginPassword.trim()}
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>Sign In as Customer</span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              /* ─── Create Account Form ───────────────── */
              <div className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold text-foreground">Create Customer Account</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Register to access menus, reservations, rewards and orders
                  </CardDescription>
                </div>

                {regError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="reg-name" className="text-xs font-medium text-foreground">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Aarav Sharma"
                        required
                        disabled={regLoading}
                        className="pl-9 text-sm h-9 bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-email" className="text-xs font-medium text-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="aarav@example.com"
                        required
                        disabled={regLoading}
                        className="pl-9 text-sm h-9 bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-mobile" className="text-xs font-medium text-foreground">
                      Mobile Number <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="reg-mobile"
                        type="tel"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        placeholder="+91 98765 43210"
                        disabled={regLoading}
                        className="pl-9 text-sm h-9 bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-password" className="text-xs font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 4 characters"
                        required
                        disabled={regLoading}
                        className="pl-9 pr-10 text-sm h-9 bg-background/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 text-sm font-semibold gap-2 shadow-lg shadow-primary/20 mt-2"
                    disabled={regLoading || !regName.trim() || !regEmail.trim() || !regPassword.trim()}
                  >
                    {regLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        <span>Create Account & Continue</span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-0 border-t border-border/40 mt-1">
            {/* Switch to Admin Login */}
            <div className="flex items-center justify-between w-full text-xs pt-3">
              <span className="text-muted-foreground">Restaurant Staff / Admin?</span>
              <Link
                href="/login"
                className="font-medium text-primary hover:underline flex items-center gap-1"
              >
                Go to Admin Sign In <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <p className="text-center text-[11px] text-muted-foreground">
          Protected by PostgreSQL & Prisma ORM • JWT HttpOnly Sessions
        </p>
      </div>
    </div>
  )
}
