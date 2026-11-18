/**
 * GET /api/auth/feedback/google
 * Initiates the Google OAuth 2.0 flow for Customer Feedback & Review Verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const returnUrl = searchParams.get('returnUrl') || '/customer/feedback'
    const tableNumber = searchParams.get('table') || searchParams.get('tableNumber') || ''
    const orderId = searchParams.get('orderId') || ''
    const restaurantId = searchParams.get('restaurantId') || ''

    // 1. Fetch Google credentials from database or fall back to environment variables
    let clientId = process.env.GOOGLE_CLIENT_ID || ''
    let redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/feedback/google/callback`

    if (restaurantId) {
      try {
        const settings = await prisma.feedbackIntegrationSetting.findUnique({
          where: { restaurantId },
        })
        if (settings?.googleClientId) {
          clientId = settings.googleClientId
        }
        if (settings?.googleRedirectUri) {
          redirectUri = settings.googleRedirectUri
        }
      } catch (dbErr) {
        console.warn('Could not load feedback settings from DB, using env fallback:', dbErr)
      }
    }

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Google Client ID is not configured. Please set GOOGLE_CLIENT_ID in settings or environment.',
        },
        { status: 500 }
      )
    }

    // 2. Prepare OAuth state with metadata to preserve context across Google redirect
    const statePayload = {
      returnUrl,
      tableNumber,
      orderId,
      restaurantId,
      timestamp: Date.now(),
    }
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

    // 3. Build Google OAuth authorization URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('access_type', 'online')
    googleAuthUrl.searchParams.set('state', state)
    googleAuthUrl.searchParams.set('prompt', 'select_account')

    return NextResponse.redirect(googleAuthUrl.toString())
  } catch (error: any) {
    console.error('Google OAuth initialization error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to initiate Google sign-in', error: error?.message },
      { status: 500 }
    )
  }
}
