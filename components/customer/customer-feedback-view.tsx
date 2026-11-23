'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Star,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  UtensilsCrossed,
  ShieldCheck,
  ArrowRight,
  Gift,
  Copy,
  Check,
  MessageSquare,
  ThumbsUp,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

function FeedbackViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlTable = searchParams.get('table') || searchParams.get('tableNumber') || ''
  const urlOrderId = searchParams.get('orderId') || ''
  const googleVerifiedParam = searchParams.get('google_verified') === '1'
  const facebookVerifiedParam = searchParams.get('facebook_verified') === '1' || searchParams.get('meta_verified') === '1'
  const isVerifiedParam = googleVerifiedParam || facebookVerifiedParam
  const reviewPlatformParam = searchParams.get('review_platform') || (facebookVerifiedParam ? 'facebook' : 'google')
  const reviewerNameParam = searchParams.get('reviewer_name') || ''
  const reviewerEmailParam = searchParams.get('reviewer_email') || ''
  const reviewerPhotoParam = searchParams.get('reviewer_photo') || ''
  const reviewerSubParam = searchParams.get('reviewer_sub') || ''
  const authErrorParam = searchParams.get('error')

  // Form State
  const [tableNumber, setTableNumber] = useState(urlTable || '1')
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [foodRating, setFoodRating] = useState<number>(5)
  const [serviceRating, setServiceRating] = useState<number>(5)
  const [ambienceRating, setAmbienceRating] = useState<number>(5)
  const [comment, setComment] = useState('')

  // Verification & Profile State
  const [isGoogleVerified, setIsGoogleVerified] = useState(isVerifiedParam)
  const [reviewPlatform, setReviewPlatform] = useState<string>(reviewPlatformParam)
  const [customerName, setCustomerName] = useState(reviewerNameParam)
  const [customerEmail, setCustomerEmail] = useState(reviewerEmailParam)
  const [customerPhoto, setCustomerPhoto] = useState(reviewerPhotoParam)
  const [googleSubId, setGoogleSubId] = useState(reviewerSubParam)

  // Public Settings & Place Review URL
  const [googlePlaceReviewUrl, setGooglePlaceReviewUrl] = useState('')
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(true)
  const [reviewDiscountPercent, setReviewDiscountPercent] = useState(10)
  const [facebookPageUrl, setFacebookPageUrl] = useState('')
  const [metaReviewUrl, setMetaReviewUrl] = useState('https://www.facebook.com')
  const [metaReviewsEnabled, setMetaReviewsEnabled] = useState(true)

  // UI Flow State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [discountCode, setDiscountCode] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch initial feedback settings & customer status
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/customer/feedback?table=${encodeURIComponent(urlTable)}&orderId=${encodeURIComponent(urlOrderId)}`)
        const json = await res.json()

        if (json.success && json.data) {
          const d = json.data

          // Check if customer has already submitted their 1-time review
          if (d.alreadyReviewed && d.previousFeedback) {
            setSubmitted(true)
            if (d.previousFeedback.discountCode) {
              setDiscountCode(d.previousFeedback.discountCode)
              try {
                localStorage.setItem('resto_saved_coupon', d.previousFeedback.discountCode)
              } catch (e) {}
            }
            if (d.previousFeedback.rating) setRating(d.previousFeedback.rating)
            if (d.previousFeedback.comment) setComment(d.previousFeedback.comment)
          }

          if (d.settings) {
            setGooglePlaceReviewUrl(d.settings.googlePlaceReviewUrl || '')
            setIsGoogleEnabled(d.settings.isGoogleEnabled ?? true)
            setReviewDiscountPercent(d.settings.reviewDiscountPercent || 10)
            const resolvedMetaUrl = d.settings.metaReviewUrl || d.settings.facebookPageUrl || ''
            const resolvedMetaEnabled = Boolean(d.settings.metaReviewsEnabled ?? d.settings.isFacebookEnabled)
            setFacebookPageUrl(resolvedMetaUrl)
            setMetaReviewUrl(resolvedMetaUrl)
            setMetaReviewsEnabled(resolvedMetaEnabled)
          }

          // Prioritize reviewer details from dedicated review verification
          if (d.reviewer) {
            setIsGoogleVerified(true)
            if (d.reviewer.platform) setReviewPlatform(d.reviewer.platform)
            if (d.reviewer.name) setCustomerName(d.reviewer.name)
            if (d.reviewer.email) setCustomerEmail(d.reviewer.email)
            if (d.reviewer.photo) setCustomerPhoto(d.reviewer.photo)
            if (d.reviewer.sub) setGoogleSubId(d.reviewer.sub)
            try {
              sessionStorage.setItem('resto_review_verifier', JSON.stringify({
                isGoogleVerified: true,
                reviewPlatform: d.reviewer.platform,
                customerName: d.reviewer.name,
                customerEmail: d.reviewer.email,
                customerPhoto: d.reviewer.photo,
                googleSubId: d.reviewer.sub,
              }))
            } catch (e) {}
          } else if (isVerifiedParam) {
            setIsGoogleVerified(true)
            if (reviewPlatformParam) setReviewPlatform(reviewPlatformParam)
            if (reviewerNameParam) setCustomerName(reviewerNameParam)
            if (reviewerEmailParam) setCustomerEmail(reviewerEmailParam)
            if (reviewerPhotoParam) setCustomerPhoto(reviewerPhotoParam)
            if (reviewerSubParam) setGoogleSubId(reviewerSubParam)
            try {
              sessionStorage.setItem('resto_review_verifier', JSON.stringify({
                isGoogleVerified: true,
                reviewPlatform: reviewPlatformParam,
                customerName: reviewerNameParam,
                customerEmail: reviewerEmailParam,
                customerPhoto: reviewerPhotoParam,
                googleSubId: reviewerSubParam,
              }))
            } catch (e) {}
          } else if (d.isGoogleVerified) {
            setIsGoogleVerified(true)
            if (d.customer) {
              if (!customerName) setCustomerName(d.customer.name || '')
              if (!customerEmail) setCustomerEmail(d.customer.email || '')
              if (!customerPhoto) setCustomerPhoto(d.customer.profilePictureUrl || '')
            }
          } else {
            // Restore from sessionStorage fallback if available
            try {
              const cached = sessionStorage.getItem('resto_review_verifier')
              if (cached) {
                const parsed = JSON.parse(cached)
                if (parsed && parsed.isGoogleVerified) {
                  setIsGoogleVerified(true)
                  if (parsed.reviewPlatform) setReviewPlatform(parsed.reviewPlatform)
                  if (parsed.customerName && !customerName) setCustomerName(parsed.customerName)
                  if (parsed.customerEmail && !customerEmail) setCustomerEmail(parsed.customerEmail)
                  if (parsed.customerPhoto && !customerPhoto) setCustomerPhoto(parsed.customerPhoto)
                  if (parsed.googleSubId && !googleSubId) setGoogleSubId(parsed.googleSubId)
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn('Failed to load feedback settings:', e)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [urlTable, urlOrderId, isVerifiedParam])

  // Handle Google OAuth Initiation
  const handleGoogleLogin = () => {
    const query = new URLSearchParams({
      returnUrl: '/customer/feedback',
      table: tableNumber,
      orderId: urlOrderId,
    })
    window.location.href = `/api/auth/feedback/google?${query.toString()}`
  }

  // Handle Meta (Facebook) OAuth Initiation
  const handleFacebookLogin = () => {
    const query = new URLSearchParams({
      returnUrl: '/customer/feedback',
      table: tableNumber,
      orderId: urlOrderId,
    })
    window.location.href = `/api/auth/feedback/facebook?${query.toString()}`
  }

  // Handle Feedback Submission
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const payload = {
        rating,
        foodRating,
        serviceRating,
        ambienceRating,
        comment,
        tableNumber,
        orderId: urlOrderId || undefined,
        isGoogleVerified,
        googleSubId: googleSubId || undefined,
        customerName: customerName || 'Valued Guest',
        customerEmail: customerEmail || undefined,
        customerPhotoUrl: customerPhoto || undefined,
        reviewPlatform,
      }

      const res = await fetch('/api/customer/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        if (data.alreadyReviewed && data.discountCode) {
          setDiscountCode(data.discountCode)
          setSubmitted(true)
          try {
            localStorage.setItem('resto_saved_coupon', data.discountCode)
          } catch (e) {}
        }
        throw new Error(data.message || 'Failed to submit review')
      }

      const finalDiscountCode = data.discountCode || 'REVIEW10-CLAIMED'
      setDiscountCode(finalDiscountCode)
      try {
        localStorage.setItem('resto_saved_coupon', finalDiscountCode)
        sessionStorage.removeItem('resto_review_verifier')
      } catch (e) {}
      if (data.googlePlaceReviewUrl) {
        setGooglePlaceReviewUrl(data.googlePlaceReviewUrl)
      }
      if (data.metaReviewUrl || data.facebookPageUrl) {
        const resolvedMetaUrl = data.metaReviewUrl || data.facebookPageUrl || ''
        setMetaReviewUrl(resolvedMetaUrl)
        setFacebookPageUrl(resolvedMetaUrl)
      }
      if (data.metaReviewsEnabled !== undefined || data.isFacebookEnabled !== undefined) {
        setMetaReviewsEnabled(Boolean(data.metaReviewsEnabled ?? data.isFacebookEnabled))
      }
      setSubmitted(true)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error submitting feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCode = () => {
    if (discountCode) {
      navigator.clipboard.writeText(discountCode)
      try {
        localStorage.setItem('resto_saved_coupon', discountCode)
      } catch (e) {}
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const effectiveMetaReviewUrl = metaReviewUrl || facebookPageUrl
  const isValidUrl = (url?: string | null) => {
    if (!url) return false
    const trimmed = url.trim()
    return trimmed.startsWith('http://') || trimmed.startsWith('https://')
  }
  const showGoogleReviewAction = Boolean(isGoogleEnabled && isValidUrl(googlePlaceReviewUrl))
  const showMetaReviewAction = Boolean(metaReviewsEnabled && isValidUrl(effectiveMetaReviewUrl))

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-xl mx-auto w-full space-y-6 pt-4 pb-12">
        {/* Restaurant Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <UtensilsCrossed className="size-3.5" />
            <span>RestoSphere Dining Experience</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Customer Feedback & Reviews
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Your dining experience matters. Verify your review with Google to claim an instant{' '}
            <strong className="text-foreground">{reviewDiscountPercent}% discount</strong> on your meal!
          </p>
        </div>

        {authErrorParam && (
          <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              {authErrorParam.includes('facebook') ? 'Meta (Facebook)' : 'Google'} authentication failed
              {authErrorParam !== 'true' && authErrorParam !== '1' && !authErrorParam.startsWith('google_oauth_') ? ` (${decodeURIComponent(authErrorParam).replace(/[_-]+/g, ' ')})` : ''}. Please try again.
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success State Screen */}
        {submitted ? (
          <Card className="border-border/80 shadow-lg text-center p-6 space-y-6 bg-card animate-in fade-in zoom-in-95 duration-200">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
              <Sparkles className="size-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">Thank You for Your Feedback!</h2>
              <p className="text-xs text-muted-foreground">
                Your review has been successfully registered. Show this promo coupon to your server to apply your discount.
              </p>
            </div>

            {/* Discount Coupon Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border-2 border-dashed border-orange-500/40 space-y-3">
              <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs uppercase tracking-wider">
                <Gift className="size-4" />
                <span>{reviewDiscountPercent}% Instant Bill Discount</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl font-black tracking-widest text-foreground">
                  {discountCode}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-8 px-2.5 text-xs gap-1 cursor-pointer bg-background"
                >
                  {copiedCode ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Valid on your next order above ₹500
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Table #{tableNumber} · Code saved automatically for your next order
                </p>
              </div>

              {/* Direct Next Order CTA */}
              <div className="pt-1">
                <a
                  href={`/menu?table=${tableNumber || '1'}`}
                  className="w-full h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <UtensilsCrossed className="size-4" />
                  <span>Order from Menu with 10% Discount</span>
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </div>

            {/* External Review Actions (Google Maps & Meta / Facebook) */}
            {(showGoogleReviewAction || showMetaReviewAction) && (
              <div
                className={cn(
                  'gap-3 text-left',
                  showGoogleReviewAction && showMetaReviewAction
                    ? 'grid grid-cols-1 sm:grid-cols-2'
                    : 'space-y-3'
                )}
              >
                {/* Direct Google Place Review Action */}
                {showGoogleReviewAction && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs">
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
                        <span className="text-xs font-bold text-foreground">Post Review on Google Maps</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Support our local chefs by publishing your rating directly onto Google Maps:
                      </p>
                    </div>
                    <a
                      href={googlePlaceReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full pt-1"
                    >
                      <Button className="w-full gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-xs h-9 cursor-pointer transition-colors shadow-2xs">
                        <ExternalLink className="size-3.5" />
                        Open Google Maps Review Box
                      </Button>
                    </a>
                  </div>
                )}

                {/* Direct Meta (Facebook) Review Action */}
                {showMetaReviewAction && (
                  <div className="p-4 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/25 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          f
                        </div>
                        <span className="text-xs font-bold text-foreground">Review on Meta (Facebook)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Recommend our restaurant and share your thoughts on our official Facebook Page:
                      </p>
                    </div>
                    <a
                      href={effectiveMetaReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full pt-1"
                    >
                      <Button className="w-full gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs h-9 cursor-pointer transition-colors shadow-2xs">
                        <ExternalLink className="size-3.5" />
                        Open Facebook Reviews
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link href={`/menu?table=${encodeURIComponent(tableNumber)}`} className="flex-1">
                <Button variant="outline" className="w-full text-xs font-semibold cursor-pointer">
                  Back to Digital Menu
                </Button>
              </Link>
              <Link href="/customer/orders" className="flex-1">
                <Button className="w-full text-xs font-bold cursor-pointer">
                  Track Live Orders
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Google Verification Card */}
            <Card className="border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="p-5 pb-4 bg-muted/30 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 rounded-full bg-primary/10 text-primary text-xs font-bold items-center justify-center">
                      1
                    </span>
                    <CardTitle className="text-sm font-bold">Reviewer Verification</CardTitle>
                  </div>
                  {isGoogleVerified ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] gap-1 font-semibold">
                      <CheckCircle2 className="size-3" />
                      {reviewPlatform === 'facebook' ? 'Meta Verified' : 'Google Verified'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground font-medium">
                      Required for Discount
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {isGoogleVerified ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <Avatar className="size-10 border border-emerald-500/30">
                      <AvatarImage src={customerPhoto || ''} alt={customerName} />
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold">
                        {customerName ? customerName.substring(0, 2).toUpperCase() : 'GU'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground truncate">{customerName}</p>
                        <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{customerEmail || 'Verified Social Identity'}</p>
                    </div>
                    {reviewPlatform === 'facebook' ? (
                      <Badge className="bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/30 text-[10px] gap-1 py-0.5 shrink-0">
                        <div className="size-2.5 rounded-2xs bg-[#1877F2] text-white flex items-center justify-center font-bold text-[7px] leading-none">f</div>
                        Meta Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500 text-white text-[10px] py-0.5 shrink-0">
                        10% Discount Qualified
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Signing in with your Google or Meta (Facebook) account confirms your authentic dining experience and unlocks a{' '}
                      <span className="font-bold text-foreground">{reviewDiscountPercent}% discount voucher</span>.
                    </p>

                    <div className={cn(
                      'gap-2.5',
                      isGoogleEnabled && metaReviewsEnabled ? 'grid grid-cols-1 sm:grid-cols-2' : 'flex flex-col'
                    )}>
                      {isGoogleEnabled && (
                        <Button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full gap-2.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-semibold text-xs h-10 shadow-xs cursor-pointer transition-all"
                        >
                          <svg viewBox="0 0 24 24" className="size-4 shrink-0">
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
                          <span>Sign in with Google</span>
                        </Button>
                      )}

                      {metaReviewsEnabled && (
                        <Button
                          type="button"
                          onClick={handleFacebookLogin}
                          className="w-full gap-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs h-10 shadow-xs cursor-pointer transition-all"
                        >
                          <div className="size-4 rounded-xs bg-white text-[#1877F2] font-black flex items-center justify-center text-xs leading-none">
                            f
                          </div>
                          <span>Sign in with Facebook</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
                      <ShieldCheck className="size-3 text-emerald-500" />
                      <span>Zero spam · Verified identity guarantees instant discount</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Dining Ratings Form */}
            <form onSubmit={handleSubmitFeedback}>
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="p-5 pb-4 bg-muted/30 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 rounded-full bg-primary/10 text-primary text-xs font-bold items-center justify-center">
                      2
                    </span>
                    <CardTitle className="text-sm font-bold">Your Rating & Comments</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* Table & Guest Meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="feedback-table" className="text-xs font-semibold">
                        Table Number
                      </Label>
                      <Input
                        id="feedback-table"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. 1"
                        className="text-xs h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="guest-name" className="text-xs font-semibold">
                        Guest Name
                      </Label>
                      <Input
                        id="guest-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your name"
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Overall Star Rating */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/70 text-center space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Overall Dining Rating
                    </Label>
                    <div className="flex items-center justify-center gap-2 py-1">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const active = (hoverRating || rating) >= starVal
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => setRating(starVal)}
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                          >
                            <Star
                              className={`size-8 sm:size-9 transition-colors ${
                                active ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {rating === 5 && '🌟 Extraordinary! Exceeded expectations'}
                      {rating === 4 && '😊 Very Good! Loved the experience'}
                      {rating === 3 && '👍 Average / Good'}
                      {rating === 2 && '😐 Needs Improvement'}
                      {rating === 1 && '👎 Unsatisfied'}
                    </p>
                  </div>

                  {/* Detailed Category Breakdown */}
                  <div className="space-y-2.5 pt-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Detailed Ratings</Label>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {/* Food */}
                      <div className="p-2.5 rounded-lg border border-border/70 bg-card space-y-1.5">
                        <span className="text-[11px] font-bold text-foreground">🍕 Food Taste</span>
                        <div className="flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFoodRating(s)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star
                                className={`size-3.5 ${
                                  foodRating >= s ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Service */}
                      <div className="p-2.5 rounded-lg border border-border/70 bg-card space-y-1.5">
                        <span className="text-[11px] font-bold text-foreground">⚡ Service Speed</span>
                        <div className="flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setServiceRating(s)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star
                                className={`size-3.5 ${
                                  serviceRating >= s ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ambience */}
                      <div className="p-2.5 rounded-lg border border-border/70 bg-card space-y-1.5">
                        <span className="text-[11px] font-bold text-foreground">✨ Ambience</span>
                        <div className="flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setAmbienceRating(s)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star
                                className={`size-3.5 ${
                                  ambienceRating >= s ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Box */}
                  <div className="space-y-1.5">
                    <Label htmlFor="feedback-comment" className="text-xs font-semibold">
                      Your Comments & Dish Highlights
                    </Label>
                    <Textarea
                      id="feedback-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Which dishes did you love most? Any tips for our chef or service staff?"
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* Direct Place Link Preview */}
                  {showGoogleReviewAction && (
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-blue-500 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">
                          Also post publicly to RestoSphere Google Maps Place
                        </span>
                      </div>
                      <a
                        href={googlePlaceReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        Open Maps <ExternalLink className="size-3" />
                      </a>
                    </div>
                  )}

                  {/* Direct Meta (Facebook) Link Preview */}
                  {showMetaReviewAction && (
                    <div className="p-3 rounded-lg bg-[#1877F2]/5 border border-[#1877F2]/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-4 rounded bg-[#1877F2] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          f
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Also post publicly to RestoSphere Facebook Page
                        </span>
                      </div>
                      <a
                        href={effectiveMetaReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1877F2] dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        Open Facebook <ExternalLink className="size-3" />
                      </a>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-5 pt-0 flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-10 gap-2 font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer shadow-md"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        Submitting Review...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Submit Review & Claim {reviewDiscountPercent}% Discount
                      </>
                    )}
                  </Button>

                  {!isGoogleVerified && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      Tip: You can verify with Google in Step 1 to guarantee your discount code is accepted by staff.
                    </p>
                  )}
                </CardFooter>
              </Card>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export function CustomerFeedbackView() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground gap-2">
          <RefreshCw className="size-4 animate-spin" />
          <span>Loading feedback portal...</span>
        </div>
      }
    >
      <FeedbackViewContent />
    </Suspense>
  )
}
