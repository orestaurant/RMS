'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Percent,
  Check,
  Building2,
  Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function FeedbackIntegrationsView() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedRedirect, setCopiedRedirect] = useState(false)

  // Google OAuth & Review State
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [showGoogleSecret, setShowGoogleSecret] = useState(false)
  const [googleRedirectUri, setGoogleRedirectUri] = useState('http://localhost:3000/api/auth/feedback/google/callback')
  const [googlePlaceReviewUrl, setGooglePlaceReviewUrl] = useState('')
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(true)

  // Meta (Facebook) State
  const [facebookPageUrl, setFacebookPageUrl] = useState('')
  const [facebookAppId, setFacebookAppId] = useState('')
  const [facebookAppSecret, setFacebookAppSecret] = useState('')
  const [showFacebookSecret, setShowFacebookSecret] = useState(false)
  const [facebookRedirectUri, setFacebookRedirectUri] = useState('http://localhost:3000/api/auth/feedback/facebook/callback')
  const [copiedFacebookRedirect, setCopiedFacebookRedirect] = useState(false)
  const [isFacebookEnabled, setIsFacebookEnabled] = useState(false)

  // Instagram State
  const [instagramProfileUrl, setInstagramProfileUrl] = useState('')
  const [instagramAppId, setInstagramAppId] = useState('')
  const [instagramAppSecret, setInstagramAppSecret] = useState('')
  const [showInstagramSecret, setShowInstagramSecret] = useState(false)
  const [isInstagramEnabled, setIsInstagramEnabled] = useState(false)

  // Discount & Incentive Settings
  const [reviewDiscountPercent, setReviewDiscountPercent] = useState('10')
  const [reviewDiscountEnabled, setReviewDiscountEnabled] = useState(true)

  // Review Stats
  const [stats, setStats] = useState({
    totalReviews: 0,
    verifiedGoogleReviews: 0,
    averageRating: 5.0,
    recentReviews: [] as any[],
  })

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/integrations/feedback')
      const json = await res.json()

      if (json.success && json.data) {
        const d = json.data
        if (d.google) {
          setGoogleClientId(d.google.clientId || '')
          setGoogleClientSecret(d.google.clientSecretMasked || '')
          const defaultGoogleUri = typeof window !== 'undefined'
            ? `${window.location.origin}/api/auth/callback/google`
            : 'https://rms-nu-mauve.vercel.app/api/auth/callback/google'
          setGoogleRedirectUri(
            d.google.redirectUri && !d.google.redirectUri.includes('localhost')
              ? d.google.redirectUri
              : defaultGoogleUri
          )
          setGooglePlaceReviewUrl(d.google.placeReviewUrl || '')
          setIsGoogleEnabled(d.google.isEnabled)
        }
        const metaData = d.meta || d.facebook
        if (metaData) {
          setFacebookPageUrl(metaData.metaReviewUrl || metaData.pageUrl || '')
          setFacebookAppId(metaData.metaAppId || metaData.appId || '')
          setFacebookAppSecret(metaData.metaAppSecretMasked || metaData.appSecretMasked || '')
          setIsFacebookEnabled(Boolean(metaData.metaReviewsEnabled ?? metaData.isEnabled))
        }
        if (d.instagram) {
          setInstagramProfileUrl(d.instagram.profileUrl || '')
          setInstagramAppId(d.instagram.appId || '')
          setInstagramAppSecret(d.instagram.appSecretMasked || '')
          setIsInstagramEnabled(d.instagram.isEnabled)
        }
        if (d.discount) {
          setReviewDiscountPercent(String(d.discount.percentage || 10))
          setReviewDiscountEnabled(d.discount.isEnabled)
        }
        if (d.stats) {
          setStats(d.stats)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch review integrations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    if (typeof window !== 'undefined') {
      setFacebookRedirectUri(`${window.location.origin}/api/auth/callback/facebook`)
    }
  }, [])

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(googleRedirectUri)
    setCopiedRedirect(true)
    setTimeout(() => setCopiedRedirect(false), 2000)
  }

  const handleCopyFacebookRedirect = () => {
    navigator.clipboard.writeText(facebookRedirectUri)
    setCopiedFacebookRedirect(true)
    setTimeout(() => setCopiedFacebookRedirect(false), 2000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(null)
    setError(null)

    try {
      const payload = {
        googleClientId,
        googleClientSecret,
        googleRedirectUri,
        googlePlaceReviewUrl,
        isGoogleEnabled,

        // Meta (Facebook) Reviews Settings
        metaReviewUrl: facebookPageUrl.trim(),
        facebookPageUrl: facebookPageUrl.trim(),
        metaAppId: facebookAppId.trim(),
        facebookAppId: facebookAppId.trim(),
        metaAppSecret: facebookAppSecret.trim(),
        facebookAppSecret: facebookAppSecret.trim(),
        metaReviewsEnabled: isFacebookEnabled,
        isFacebookEnabled,

        instagramProfileUrl,
        instagramAppId,
        instagramAppSecret,
        isInstagramEnabled,

        reviewDiscountPercent: Number(reviewDiscountPercent) || 10,
        reviewDiscountEnabled,
      }

      const res = await fetch('/api/integrations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save settings')
      }

      setSaveSuccess('Review and social integrations updated successfully!')
      setTimeout(() => setSaveSuccess(null), 4000)
      fetchSettings()
    } catch (err: any) {
      setError(err?.message || 'Error saving settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 via-primary/5 to-transparent p-5 rounded-2xl border border-blue-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <h2 className="text-xl font-bold tracking-tight">Customer Feedback & Google Review Verification</h2>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              OAuth 2.0 Live
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Incentivize authentic customer reviews with instant bill discounts. Diners sign in with Google to prevent spam, unlock automated 10% bill discounts, and get directed straight to your Google Maps review link.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/customer/feedback" target="_blank">
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer border-primary/30 text-primary hover:bg-primary/5">
              <ExternalLink className="size-4" />
              Preview Guest Portal
            </Button>
          </Link>
          <Button onClick={fetchSettings} variant="ghost" size="sm" className="gap-2 shrink-0">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-border/70 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Verified Google Reviews</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{stats.verifiedGoogleReviews}</p>
          </div>
        </Card>

        <Card className="p-4 border-border/70 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="size-6 fill-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Average Guest Rating</p>
            <div className="flex items-center gap-1.5">
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.averageRating.toFixed(1)}</p>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/70 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Percent className="size-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Review Discount Incentive</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{reviewDiscountPercent}% OFF</p>
          </div>
        </Card>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Google OAuth & Reviews Card (Primary) */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <div className="bg-muted/40 p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Google Brand Logo */}
              <div className="size-10 rounded-xl bg-white border border-border shadow-xs flex items-center justify-center shrink-0 p-2">
                <svg viewBox="0 0 24 24" className="w-full h-full">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Google OAuth & Place Reviews</h3>
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                    Production Ready
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real Google OAuth 2.0 customer sign-in with verified identity and direct Google Maps review shortlink
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-foreground">
                {isGoogleEnabled ? 'Active' : 'Disabled'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGoogleEnabled}
                  onChange={(e) => setIsGoogleEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google Client ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="google-client-id" className="text-xs font-semibold">
                    Google Client ID <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-mono">From Google Cloud Console</span>
                </div>
                <Input
                  id="google-client-id"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="e.g. 779382544698-...apps.googleusercontent.com"
                  className="font-mono text-xs"
                  required
                />
              </div>

              {/* Google Client Secret */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="google-client-secret" className="text-xs font-semibold">
                    Google Client Secret <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Keep confidential</span>
                </div>
                <div className="relative">
                  <Input
                    id="google-client-secret"
                    type={showGoogleSecret ? 'text' : 'password'}
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    placeholder="GOCSPX-..."
                    className="font-mono text-xs pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleSecret((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  >
                    {showGoogleSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Authorized Redirect URI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="google-redirect-uri" className="text-xs font-semibold">
                  Authorized Redirect URI (Callback)
                </Label>
                <span className="text-[11px] text-muted-foreground">Add this exact URL to your Google Cloud Console Credentials</span>
              </div>
              <div className="flex gap-2">
                <Input
                  id="google-redirect-uri"
                  value={googleRedirectUri}
                  onChange={(e) => setGoogleRedirectUri(e.target.value)}
                  className="font-mono text-xs bg-muted/40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRedirectUri}
                  className="gap-1.5 shrink-0 text-xs font-semibold cursor-pointer"
                  title="Copy Redirect URI to clipboard"
                >
                  {copiedRedirect ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Google Place Review URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="google-place-url" className="text-xs font-semibold">
                  Google Maps Place Review URL (Direct Customer Link)
                </Label>
                {googlePlaceReviewUrl && (
                  <a
                    href={googlePlaceReviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Test Place Review Link <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Input
                id="google-place-url"
                value={googlePlaceReviewUrl}
                onChange={(e) => setGooglePlaceReviewUrl(e.target.value)}
                placeholder="e.g. https://g.page/r/your-restaurant/review or https://search.google.com/local/writereview?placeid=..."
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                After customer signs in with Google, they will receive a one-click button to open this link and submit their review directly on Google Maps.
              </p>
            </div>

            {/* Review Incentive Discount Setting */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Customer Review Discount Incentive</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewDiscountEnabled}
                    onChange={(e) => setReviewDiscountEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-32">
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={reviewDiscountPercent}
                      onChange={(e) => setReviewDiscountPercent(e.target.value)}
                      className="text-xs font-bold pr-8"
                      disabled={!reviewDiscountEnabled}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied to guest bill upon Google verification. Diners receive an instant promo voucher that staff can also auto-apply during billing settlement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Meta (Facebook) Reviews Card */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <div className="bg-muted/40 p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Facebook Brand Icon */}
              <div className="size-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 font-bold text-lg shadow-xs">
                f
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Meta (Facebook) Reviews</h3>
                  {isFacebookEnabled ? (
                    <Badge className="bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/25 text-xs">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs">
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct Facebook Business Page review link & Meta Graph API integration
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-foreground">
                {isFacebookEnabled ? 'Active' : 'Disabled'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFacebookEnabled}
                  onChange={(e) => setIsFacebookEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1877F2]"></div>
              </label>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="facebook-page-url" className="text-xs font-semibold">
                  Facebook Page Direct Review URL
                </Label>
                {facebookPageUrl && (
                  <a
                    href={facebookPageUrl.startsWith('http') ? facebookPageUrl : `https://${facebookPageUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#1877F2] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Test Facebook Page <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Input
                id="facebook-page-url"
                value={facebookPageUrl}
                onChange={(e) => setFacebookPageUrl(e.target.value)}
                placeholder="e.g. https://www.facebook.com/your-restaurant/reviews"
                className="text-xs font-mono"
              />
              {facebookPageUrl && !facebookPageUrl.startsWith('http://') && !facebookPageUrl.startsWith('https://') && (
                <p className="text-[11px] text-amber-500 font-medium">
                  Note: Please include https:// so the link opens properly for customers.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                When enabled, diners will see a direct button to review and recommend your restaurant on Facebook.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="facebook-app-id" className="text-xs font-semibold">
                    Meta App ID
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-mono">From Meta for Developers</span>
                </div>
                <Input
                  id="facebook-app-id"
                  value={facebookAppId}
                  onChange={(e) => setFacebookAppId(e.target.value)}
                  placeholder="e.g. 1170742322161378"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="facebook-app-secret" className="text-xs font-semibold">
                    Meta App Secret
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Keep confidential</span>
                </div>
                <div className="relative">
                  <Input
                    id="facebook-app-secret"
                    type={showFacebookSecret ? 'text' : 'password'}
                    value={facebookAppSecret}
                    onChange={(e) => setFacebookAppSecret(e.target.value)}
                    placeholder="Enter Meta App Secret"
                    className="text-xs font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFacebookSecret((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  >
                    {showFacebookSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Authorized Meta Redirect URI */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="facebook-redirect-uri" className="text-xs font-semibold">
                  Authorized Meta OAuth Redirect URI (Callback)
                </Label>
                <span className="text-[11px] text-muted-foreground">Add to Meta App Dashboard &gt; Facebook Login &gt; Valid OAuth Redirect URIs</span>
              </div>
              <div className="flex gap-2">
                <Input
                  id="facebook-redirect-uri"
                  value={facebookRedirectUri}
                  onChange={(e) => setFacebookRedirectUri(e.target.value)}
                  className="font-mono text-xs bg-muted/40"
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyFacebookRedirect}
                  className="gap-1.5 shrink-0 text-xs font-semibold cursor-pointer"
                  title="Copy Redirect URI to clipboard"
                >
                  {copiedFacebookRedirect ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Instagram Direct Tagging (Placeholder Card) */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <div className="bg-muted/40 p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Instagram Gradient Icon */}
              <div className="size-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                📸
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Instagram Direct Profile & Tagging</h3>
                  <Badge variant="outline" className="text-pink-600 border-pink-500/30 text-xs">
                    Optional / Direct URL
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Link your Instagram handle so diners can tag your dishes in stories and posts
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-foreground">
                {isInstagramEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInstagramEnabled}
                  onChange={(e) => setIsInstagramEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="instagram-profile-url" className="text-xs font-semibold">
                  Instagram Profile URL or Handle
                </Label>
                {instagramProfileUrl && (
                  <a
                    href={instagramProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-pink-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Visit Instagram <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Input
                id="instagram-profile-url"
                value={instagramProfileUrl}
                onChange={(e) => setInstagramProfileUrl(e.target.value)}
                placeholder="e.g. https://www.instagram.com/restosphere"
                className="text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={fetchSettings}
            disabled={saving}
            className="cursor-pointer"
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 cursor-pointer font-bold px-6 shadow-sm"
          >
            {saving ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Integration Settings
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Recent Reviews Audit */}
      {stats.recentReviews && stats.recentReviews.length > 0 && (
        <Card className="p-6 border-border/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Recent Verified Customer Feedback</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live feedback submitted by verified guests dining at RestoSphere
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {stats.totalReviews} Total Reviews
            </Badge>
          </div>

          <div className="divide-y divide-border/60">
            {stats.recentReviews.map((rev: any) => (
              <div key={rev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{rev.customerName || 'Guest Diner'}</span>
                    {rev.isGoogleVerified && (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 py-0">
                        <CheckCircle2 className="size-2.5" /> Google Verified
                      </Badge>
                    )}
                    {rev.tableNumber && (
                      <span className="text-[11px] text-muted-foreground">Table #{rev.tableNumber}</span>
                    )}
                  </div>
                  {rev.comment && <p className="text-muted-foreground italic">"{rev.comment}"</p>}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center text-amber-500 gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-3.5 ${i < rev.rating ? 'fill-amber-500' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
