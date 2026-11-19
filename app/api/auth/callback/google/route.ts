/**
 * GET /api/auth/callback/google
 * Handles the OAuth 2.0 callback from Google for Customer Feedback & Review Verification.
 * Production-ready for https://rms-nu-mauve.vercel.app/api/auth/callback/google
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signCustomerToken, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth'
import { getCanonicalOrigin, resolveOAuthRedirectUri } from '@/lib/oauth-utils'

export const dynamic = 'force-dynamic'

interface GoogleUserInfo {
  sub: string
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  email: string
  email_verified?: boolean
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const oauthError = searchParams.get('error')

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

  // Helper to build canonical redirect URL back to the application
  const buildRedirectUrl = (params: Record<string, string>) => {
    const url = new URL(returnUrl, canonicalOrigin)
    if (tableNumber) url.searchParams.set('table', tableNumber)
    if (orderId) url.searchParams.set('orderId', orderId)
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v)
    })
    return url.toString()
  }

  // Handle Google OAuth error or cancellation
  if (oauthError) {
    console.warn('Google OAuth returned error:', oauthError)
    return NextResponse.redirect(buildRedirectUrl({ error: `google_oauth_${oauthError}` }))
  }

  if (!code) {
    return NextResponse.redirect(buildRedirectUrl({ error: 'missing_authorization_code' }))
  }

  try {
    // 1. Resolve Google Client credentials from DB or environment
    let clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    let clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim()
    let dbRedirectUri: string | null = null

    try {
      const settings = restaurantId
        ? await prisma.feedbackIntegrationSetting.findUnique({ where: { restaurantId } })
        : await prisma.feedbackIntegrationSetting.findFirst()

      if (settings?.googleClientId) clientId = settings.googleClientId.trim()
      if (settings?.googleClientSecret) clientSecret = settings.googleClientSecret.trim()
      if (settings?.googleRedirectUri) dbRedirectUri = settings.googleRedirectUri.trim()
    } catch (dbErr) {
      console.warn('Error reading feedback settings in callback, using env fallback:', dbErr)
    }

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth client credentials. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel.')
      return NextResponse.redirect(buildRedirectUrl({ error: 'unconfigured_google_credentials' }))
    }

    // 2. Resolve exact redirect URI:
    // First priority is the exact redirectUri preserved in the signed OAuth state.
    // If not in state, dynamically resolve using canonical production origin.
    const redirectUri =
      stateRedirectUri ||
      resolveOAuthRedirectUri(
        request,
        'google',
        dbRedirectUri || process.env.GOOGLE_REDIRECT_URI
      )

    // 3. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      let errDetail = 'token_exchange_failed'
      try {
        const errJson = await tokenRes.json()
        errDetail = errJson.error_description || errJson.error || errDetail
      } catch {
        const errText = await tokenRes.text()
        errDetail = errText.slice(0, 80) || errDetail
      }
      console.error('Google token exchange failed:', tokenRes.status, errDetail, 'redirect_uri used:', redirectUri)
      return NextResponse.redirect(buildRedirectUrl({ error: `token_exchange_failed_${encodeURIComponent(errDetail.slice(0, 60))}` }))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.redirect(buildRedirectUrl({ error: 'no_access_token_received' }))
    }

    // 4. Fetch user profile from Google UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userRes.ok) {
      console.error('Failed to fetch userinfo from Google:', userRes.status)
      return NextResponse.redirect(buildRedirectUrl({ error: 'failed_fetching_google_user' }))
    }

    const googleUser: GoogleUserInfo = await userRes.json()

    if (!googleUser.email) {
      return NextResponse.redirect(buildRedirectUrl({ error: 'no_email_provided_by_google' }))
    }

    // 5. Resolve default organization for database customer association
    let orgId: string | null = null
    try {
      const org = await prisma.organization.findFirst({ select: { id: true } })
      if (org) orgId = org.id
    } catch (e) {
      console.warn('Could not query organization:', e)
    }

    // 6. Find or create customer record with verified Google identity
    let customer = null
    try {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { email: { equals: googleUser.email, mode: 'insensitive' } },
            { googleSubId: googleUser.sub },
          ],
        },
      })

      if (customer) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            googleSubId: googleUser.sub,
            isGoogleVerified: true,
            name: googleUser.name || customer.name,
            profilePictureUrl: googleUser.picture || customer.profilePictureUrl,
            customerSource: customer.customerSource || 'google_review',
            metadata: {
              ...(typeof customer.metadata === 'object' && customer.metadata !== null ? (customer.metadata as object) : {}),
              lastGoogleLoginAt: new Date().toISOString(),
              googleEmailVerified: googleUser.email_verified,
            },
          },
        })
      } else {
        customer = await prisma.customer.create({
          data: {
            organizationId: orgId,
            email: googleUser.email,
            name: googleUser.name || 'Google User',
            firstName: googleUser.given_name || '',
            lastName: googleUser.family_name || '',
            profilePictureUrl: googleUser.picture || null,
            googleSubId: googleUser.sub,
            isGoogleVerified: true,
            role: 'CUSTOMER',
            customerSource: 'google_review',
            metadata: {
              googleVerifiedAt: new Date().toISOString(),
              googleEmailVerified: googleUser.email_verified,
            },
          },
        })
      }
    } catch (dbError) {
      console.error('Error upserting customer during Google OAuth verification:', dbError)
    }

    // 7. Sign session token for customer
    const customerId = customer?.id || `google_${googleUser.sub}`
    const token = await signCustomerToken({
      customerId,
      email: googleUser.email,
      role: 'CUSTOMER',
      name: googleUser.name || 'Google User',
    })

    // 8. Build successful redirect response with verified customer session cookie
    const targetUrl = buildRedirectUrl({
      google_verified: '1',
      reviewer_name: googleUser.name || 'Google User',
      reviewer_email: googleUser.email,
      reviewer_photo: googleUser.picture || '',
      reviewer_sub: googleUser.sub,
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
    console.error('Unexpected error in Google OAuth callback:', error)
    return NextResponse.redirect(buildRedirectUrl({ error: 'internal_oauth_error' }))
  }
}
