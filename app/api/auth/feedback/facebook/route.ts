/**
 * GET /api/auth/feedback/facebook
 * Initiates the Meta (Facebook) OAuth 2.0 flow for Customer Feedback & Review Verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolveOAuthRedirectUri } from '@/lib/oauth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const returnUrl = searchParams.get('returnUrl') || '/customer/feedback'
    const tableNumber = searchParams.get('table') || searchParams.get('tableNumber') || ''
    const orderId = searchParams.get('orderId') || ''
    const restaurantId = searchParams.get('restaurantId') || ''

    // 1. Fetch Meta/Facebook credentials from database or fall back to environment variables
    let appId = (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '').trim()

    if (restaurantId) {
      try {
        const settings = await prisma.feedbackIntegrationSetting.findUnique({
          where: { restaurantId },
        })
        if (settings?.facebookAppId) {
          appId = settings.facebookAppId.trim()
        }
      } catch (dbErr) {
        console.warn('Could not load feedback settings from DB, using env fallback:', dbErr)
      }
    }

    if (!appId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Meta App ID is not configured. Please set META_APP_ID in settings or environment.',
        },
        { status: 500 }
      )
    }

    // 2. Resolve canonical redirect URI (automatically handles production vs localhost & proxy headers)
    const redirectUri = resolveOAuthRedirectUri(
      request,
      'facebook',
      process.env.META_REDIRECT_URI
    )

    // 3. Prepare OAuth state with metadata to preserve context across Facebook redirect
    const statePayload = {
      returnUrl,
      tableNumber,
      orderId,
      restaurantId,
      platform: 'facebook',
      redirectUri,
      timestamp: Date.now(),
    }
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

    // 3. Build Facebook OAuth authorization URL
    const facebookAuthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth')
    facebookAuthUrl.searchParams.set('client_id', appId)
    facebookAuthUrl.searchParams.set('redirect_uri', redirectUri)
    facebookAuthUrl.searchParams.set('response_type', 'code')
    facebookAuthUrl.searchParams.set('scope', 'public_profile,email')
    facebookAuthUrl.searchParams.set('state', state)

    return NextResponse.redirect(facebookAuthUrl.toString())
  } catch (error: any) {
    console.error('Facebook OAuth initialization error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to initiate Facebook sign-in', error: error?.message },
      { status: 500 }
    )
  }
}
