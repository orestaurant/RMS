/**
 * GET /api/auth/callback/facebook
 * Handles the OAuth 2.0 callback from Meta (Facebook) for Customer Feedback & Review Verification.
 * Production-ready for https://rms-nu-mauve.vercel.app/api/auth/callback/facebook
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { getCanonicalOrigin, resolveOAuthRedirectUri } from '@/lib/oauth-utils'

export const dynamic = 'force-dynamic'

interface FacebookUserInfo {
  id: string
  name: string
  first_name?: string
  last_name?: string
  email?: string
  picture?: {
    data?: {
      url?: string
      is_silhouette?: boolean
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const oauthError = searchParams.get('error') || searchParams.get('error_reason')
  const errorDescription = searchParams.get('error_description')

  const canonicalOrigin = getCanonicalOrigin(request)

  // Parse state to recover returnUrl and context
  let returnUrl = '/customer/feedback'
  let tableNumber = ''
  let orderId = ''
  let restaurantId = ''
  let stateRedirectUri = ''

  if (stateRaw) {
    try {
      const stateParsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
      if (stateParsed.returnUrl) returnUrl = stateParsed.returnUrl
      if (stateParsed.tableNumber) tableNumber = stateParsed.tableNumber
      if (stateParsed.orderId) orderId = stateParsed.orderId
      if (stateParsed.restaurantId) restaurantId = stateParsed.restaurantId
      if (stateParsed.redirectUri) stateRedirectUri = stateParsed.redirectUri
    } catch (err) {
      console.warn('Failed to parse OAuth state payload:', err)
    }
  }

  // Helper to build redirect URL
  const buildRedirectUrl = (params: Record<string, string>) => {
    const url = new URL(returnUrl, canonicalOrigin)
    if (tableNumber) url.searchParams.set('table', tableNumber)
    if (orderId) url.searchParams.set('orderId', orderId)
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v)
    })
    return url.toString()
  }

  // Handle Meta OAuth error or cancellation
  if (oauthError) {
    console.warn('Facebook OAuth returned error:', oauthError, errorDescription)
    return NextResponse.redirect(buildRedirectUrl({ error: `facebook_oauth_${oauthError}` }))
  }

  if (!code) {
    return NextResponse.redirect(buildRedirectUrl({ error: 'missing_authorization_code' }))
  }

  try {
    // 1. Resolve Meta credentials from DB or environment
    let appId = (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '').trim()
    let appSecret = (process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '').trim()
    let dbRedirectUri: string | null = null

    try {
      const settings = restaurantId
        ? await prisma.feedbackIntegrationSetting.findUnique({ where: { restaurantId } })
        : await prisma.feedbackIntegrationSetting.findFirst()

      if (settings?.facebookAppId) appId = settings.facebookAppId.trim()
      if (settings?.facebookAppSecret) appSecret = settings.facebookAppSecret.trim()
    } catch (dbErr) {
      console.warn('Error reading feedback settings in callback, using env fallback:', dbErr)
    }

    if (!appId || !appSecret) {
      console.error('Missing Meta OAuth app credentials.')
      return NextResponse.redirect(buildRedirectUrl({ error: 'unconfigured_meta_credentials' }))
    }

    // 2. Resolve exact redirect URI
    const redirectUri =
      stateRedirectUri ||
      resolveOAuthRedirectUri(
        request,
        'facebook',
        process.env.META_REDIRECT_URI
      )

    // 3. Exchange authorization code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString(), { method: 'GET' })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('Facebook token exchange failed:', tokenRes.status, errText, 'redirect_uri used:', redirectUri)
      return NextResponse.redirect(buildRedirectUrl({ error: 'token_exchange_failed' }))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.redirect(buildRedirectUrl({ error: 'no_access_token_received' }))
    }

    // 4. Fetch user profile from Facebook Graph API
    const fields = 'id,name,first_name,last_name,email,picture.type(large)'
    const userUrl = `https://graph.facebook.com/v20.0/me?fields=${fields}&access_token=${accessToken}`
    const userRes = await fetch(userUrl)

    if (!userRes.ok) {
      console.error('Failed to fetch userinfo from Facebook:', userRes.status)
      return NextResponse.redirect(buildRedirectUrl({ error: 'failed_fetching_facebook_user' }))
    }

    const fbUser: FacebookUserInfo = await userRes.json()
    const userEmail = fbUser.email || `fb_${fbUser.id}@facebook.user`
    const photoUrl = fbUser.picture?.data?.url || null

    // 5. Resolve default organization for database customer association
    let orgId: string | null = null
    try {
      const org = await prisma.organization.findFirst({ select: { id: true } })
      if (org) orgId = org.id
    } catch (e) {
      console.warn('Could not query organization:', e)
    }

    // 6. Find or create customer record with verified Facebook identity
    let customer = null
    try {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { email: { equals: userEmail, mode: 'insensitive' } },
            { googleSubId: `fb_${fbUser.id}` },
          ],
        },
      })

      if (customer) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            googleSubId: `fb_${fbUser.id}`,
            isGoogleVerified: true,
            name: fbUser.name || customer.name,
            profilePictureUrl: photoUrl || customer.profilePictureUrl,
            customerSource: customer.customerSource || 'facebook_review',
            metadata: {
              ...(typeof customer.metadata === 'object' && customer.metadata !== null ? (customer.metadata as object) : {}),
              lastFacebookLoginAt: new Date().toISOString(),
              reviewPlatform: 'facebook',
            },
          },
        })
      } else {
        customer = await prisma.customer.create({
          data: {
            organizationId: orgId,
            email: userEmail,
            name: fbUser.name || 'Facebook User',
            firstName: fbUser.first_name || '',
            lastName: fbUser.last_name || '',
            profilePictureUrl: photoUrl,
            googleSubId: `fb_${fbUser.id}`,
            isGoogleVerified: true,
            role: 'CUSTOMER',
            customerSource: 'facebook_review',
            metadata: {
              facebookVerifiedAt: new Date().toISOString(),
              reviewPlatform: 'facebook',
            },
          },
        })
      }
    } catch (dbError) {
      console.error('Error upserting customer during Facebook OAuth verification:', dbError)
    }

    // 7. Sign session token for customer
    const customerId = customer?.id || `fb_${fbUser.id}`
    const token = await signCustomerToken({
      customerId,
      email: userEmail,
      role: 'CUSTOMER',
      name: fbUser.name || 'Facebook User',
    })

    // 8. Build successful redirect response with verified customer session cookie
    const targetUrl = buildRedirectUrl({
      google_verified: '1',
      review_platform: 'facebook',
      reviewer_name: fbUser.name || 'Facebook User',
      reviewer_email: userEmail,
      reviewer_photo: photoUrl || '',
      reviewer_sub: fbUser.id,
    })

    const response = NextResponse.redirect(targetUrl)

    const isSecure = canonicalOrigin.startsWith('https:')

    // Set secure customer session cookie (7 days expiry)
    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error: any) {
    console.error('Unexpected error in Facebook OAuth callback:', error)
    return NextResponse.redirect(buildRedirectUrl({ error: 'internal_oauth_error' }))
  }
}
