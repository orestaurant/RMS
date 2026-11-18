'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  QrCode,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { clearAuthCache } from '@/hooks/useAuthContext'

interface CustomerAuthPageProps {
  initialTab?: 'guest' | 'signin' | 'register'
}

function CustomerAuthContent({ initialTab = 'guest' }: CustomerAuthPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlTab = searchParams.get('tab') as 'guest' | 'signin' | 'register' | null
  const urlTable = searchParams.get('table') || searchParams.get('tableNumber') || ''

  const [activeTab, setActiveTab] = useState<'guest' | 'signin' | 'register'>(
    urlTab || (urlTable ? 'guest' : initialTab)
  )

  // Clear any existing admin cached auth context when accessing customer portal
  useEffect(() => {
    clearAuthCache()
  }, [])

  // Guest Login State (Instant Table QR / Mobile Session)
  const [guestName, setGuestName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rms_customer_name') || ''
    }
    return ''
  })
  const [guestPhone, setGuestPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rms_customer_phone') || ''
    }
    return ''
  })
  const [guestTable, setGuestTable] = useState(() => {
    if (urlTable) return urlTable
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rms_customer_table') || '1'
    }
    return '1'
  })
  const [guestLoading, setGuestLoading] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginErrorCode, setLoginErrorCode] = useState<string | null>(null)

  // Register State
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regMobile, setRegMobile] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const nameClean = guestName.trim() || 'Guest Diner'
    const phoneClean = guestPhone.trim()

    if (phoneClean && phoneClean.replace(/[^0-9]/g, '').length < 7) {
      setGuestError('Please enter a valid mobile number (or leave blank for instant dining).')
      return
    }

    setGuestLoading(true)
    setGuestError(null)

    try {
      const res = await fetch('/api/customer/auth/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameClean,
          phone: phoneClean || undefined,
          tableNumber: guestTable.trim() || '1',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setGuestError(data.message || 'Failed to create guest session.')
        setGuestLoading(false)
        return
      }

      // Persist in localStorage for instant multi-guest table awareness
      if (typeof window !== 'undefined') {
        localStorage.setItem('rms_customer_name', data.customer?.name || nameClean)
        if (phoneClean) localStorage.setItem('rms_customer_phone', phoneClean)
        if (guestTable) localStorage.setItem('rms_customer_table', guestTable.trim())
      }

      // Route directly to active menu with pre-selected table
      const targetUrl = guestTable
        ? `/menu?table=${encodeURIComponent(guestTable.trim())}`
        : '/menu'
      window.location.href = targetUrl
    } catch (err: any) {
      setGuestError(err?.message || 'Network error occurred. Please try again.')
      setGuestLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password.')
      setLoginErrorCode(null)
      return
    }

    setLoginLoading(true)
    setLoginError(null)
    setLoginErrorCode(null)

    try {
      const res = await fetch('/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setLoginError(data.message || 'Invalid email or password.')
        setLoginErrorCode(data.code || null)
        setLoginLoading(false)
        return
      }

      if (typeof window !== 'undefined' && data.customer) {
        localStorage.setItem('rms_customer_name', data.customer.name || '')
        if (data.customer.mobile) localStorage.setItem('rms_customer_phone', data.customer.mobile)
      }

      // Success: navigate directly to Menu or Live Orders view
      window.location.href = data.redirect || (guestTable ? `/menu?table=${encodeURIComponent(guestTable)}` : '/orders')
    } catch (err: any) {
      setLoginError(err?.message || 'A network error occurred. Please try again.')
      setLoginErrorCode(null)
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

      if (typeof window !== 'undefined' && data.customer) {
        localStorage.setItem('rms_customer_name', data.customer.name || regName)
        if (regMobile) localStorage.setItem('rms_customer_phone', regMobile)
      }

      // Success: navigate directly to menu or orders view
      window.location.href = data.redirect || (guestTable ? `/menu?table=${encodeURIComponent(guestTable)}` : '/orders')
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
              <span>Instant Table Menu, Dish Booking & Live Orders</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-primary hover:underline text-[11px]">Home</span>
            </p>
          </div>
        </Link>

        {/* Tabbed Card Container */}
        <Card className="border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-3">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as 'guest' | 'signin' | 'register')
                setLoginError(null)
                setRegError(null)
                setGuestError(null)
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-2">
                <TabsTrigger value="guest" className="text-xs font-semibold cursor-pointer gap-1">
                  <Sparkles className="size-3 text-amber-500" />
                  <span>Guest</span>
                </TabsTrigger>
                <TabsTrigger value="signin" className="text-xs font-semibold cursor-pointer">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="text-xs font-semibold cursor-pointer">
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {activeTab === 'guest' ? (
              /* ─── 1. Instant Guest Login (No Password) ────── */
              <div className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span>Quick Guest Dine-In</span>
                    <Badge className="text-[10px] bg-primary/15 text-primary border-primary/20 py-0 h-4">
                      No Password
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Enter your name & mobile to browse the live menu and book dishes immediately.
                  </CardDescription>
                </div>

                {guestError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{guestError}</span>
                  </div>
                )}

                <form onSubmit={handleGuestLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-name" className="text-xs font-medium text-foreground">
                      Your Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="guest-name"
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
                        required
                        disabled={guestLoading}
                        className="pl-9 text-sm h-10 bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guest-phone" className="text-xs font-medium text-foreground">
                      Mobile Number <span className="text-muted-foreground font-normal">(For order SMS & e-bill)</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="guest-phone"
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        disabled={guestLoading}
                        className="pl-9 text-sm h-10 bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guest-table" className="text-xs font-medium text-foreground">
                      Table / Spot Number
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="guest-table"
                        type="text"
                        value={guestTable}
                        onChange={(e) => setGuestTable(e.target.value)}
                        placeholder="e.g. Table 4"
                        disabled={guestLoading}
                        className="pl-9 text-sm h-10 bg-background/50 font-medium"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-bold gap-2 shadow-lg shadow-primary/25 mt-2 cursor-pointer"
                    disabled={guestLoading || !guestName.trim()}
                  >
                    {guestLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Starting Session...</span>
                      </>
                    ) : (
                      <>
                        <UtensilsCrossed className="size-4" />
                        <span>Start Dining & Browse Menu</span>
                        <ArrowRight className="size-4 ml-auto" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : activeTab === 'signin' ? (
              /* ─── 2. Sign In Form ───────────────────────── */
              <div className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold text-foreground">Welcome Back</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Sign in with your email to access your rewards and dining history
                  </CardDescription>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">{loginError}</span>
                    </div>

                    {(loginErrorCode === 'ACCOUNT_NOT_FOUND' || loginError.includes('create a customer account')) && (
                      <div className="pt-1 pl-6">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveTab('guest')
                            setGuestError(null)
                          }}
                          className="h-8 text-xs font-semibold bg-destructive/15 border-destructive/30 hover:bg-destructive/25 text-destructive gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>Use Guest Login Instead</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    )}
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
              /* ─── 3. Create Account Form ───────────────── */
              <div className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold text-foreground">Create Customer Account</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Register to access loyalty points, repeat orders, and priority service
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
          Protected by PostgreSQL & Prisma ORM • Instant Table Guest Sessions
        </p>
      </div>
    </div>
  )
}

export default function CustomerAuthPage(props: CustomerAuthPageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Loading...</div>}>
      <CustomerAuthContent {...props} />
    </Suspense>
  )
}
