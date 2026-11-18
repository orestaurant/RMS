/**
 * /api/integrations/feedback
 * Manages Google, Meta (Facebook), and Instagram Customer Review & Verification Settings.
 * Supports multi-tenant configuration, secret masking, and optional direct review URLs.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthContext } from '@/api/middleware/auth'

export const dynamic = 'force-dynamic'

function maskSecret(val?: string | null): string {
  if (!val) return ''
  if (val.length <= 6) return '••••••••'
  return `${val.substring(0, 3)}••••••••${val.substring(val.length - 2)}`
}

export async function GET(request: NextRequest) {
  try {
    const authContext = extractAuthContext(request)
    const restaurantId = request.nextUrl.searchParams.get('restaurantId') || authContext.restaurantId

    // Try reading settings from DB
    let settings = null
    try {
      settings = await prisma.feedbackIntegrationSetting.findUnique({
        where: { restaurantId },
      })
    } catch (dbErr) {
      console.warn('Could not read feedback settings from DB, using fallback:', dbErr)
    }

    // Fallbacks from environment variables
    const origin = request.nextUrl.origin || 'http://localhost:3000'
    const defaultRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/feedback/google/callback`
    const defaultClientId = process.env.GOOGLE_CLIENT_ID || ''
    const defaultClientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    const defaultGooglePlaceReviewUrl = process.env.GOOGLE_PLACE_REVIEW_URL || ''

    const isGoogleConfigured = Boolean(settings?.googleClientId || defaultClientId)
    const googleClientId = settings?.googleClientId || defaultClientId
    const googleRedirectUri = settings?.googleRedirectUri || defaultRedirectUri
    const googlePlaceReviewUrl = settings?.googlePlaceReviewUrl ?? defaultGooglePlaceReviewUrl
    const isGoogleEnabled = settings?.isGoogleEnabled ?? true

    // Meta (Facebook) placeholder data
    const isFacebookConfigured = Boolean(settings?.facebookPageUrl || settings?.facebookAppId)
    const isFacebookEnabled = settings?.isFacebookEnabled ?? false
    const facebookPageUrl = settings?.facebookPageUrl || ''
    const facebookAppId = settings?.facebookAppId || ''

    // Instagram placeholder data
    const isInstagramConfigured = Boolean(settings?.instagramProfileUrl || settings?.instagramAppId)
    const isInstagramEnabled = settings?.isInstagramEnabled ?? false
    const instagramProfileUrl = settings?.instagramProfileUrl || ''
    const instagramAppId = settings?.instagramAppId || ''

    // Discount settings
    const reviewDiscountPercent = settings?.reviewDiscountPercent ? Number(settings.reviewDiscountPercent) : 10
    const reviewDiscountEnabled = settings?.reviewDiscountEnabled ?? true

    // Compute review statistics
    let stats = {
      totalReviews: 0,
      verifiedGoogleReviews: 0,
      averageRating: 5.0,
      recentReviews: [] as any[],
    }

    try {
      const feedbacks = await prisma.customerFeedback.findMany({
        where: { restaurantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          customerPhotoUrl: true,
          rating: true,
          comment: true,
          isGoogleVerified: true,
          reviewPlatform: true,
          tableNumber: true,
          createdAt: true,
        },
      })

      const totalCount = await prisma.customerFeedback.count({
        where: { restaurantId, deletedAt: null },
      })

      const verifiedCount = await prisma.customerFeedback.count({
        where: { restaurantId, isGoogleVerified: true, deletedAt: null },
      })

      const agg = await prisma.customerFeedback.aggregate({
        where: { restaurantId, deletedAt: null },
        _avg: { rating: true },
      })

      stats = {
        totalReviews: totalCount,
        verifiedGoogleReviews: verifiedCount,
        averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : 5.0,
        recentReviews: feedbacks,
      }
    } catch (e) {
      console.warn('Could not compute review stats:', e)
    }

    return NextResponse.json({
      success: true,
      data: {
        google: {
          clientId: googleClientId,
          clientSecretMasked: maskSecret(settings?.googleClientSecret || defaultClientSecret),
          hasSecret: Boolean(settings?.googleClientSecret || defaultClientSecret),
          redirectUri: googleRedirectUri,
          placeReviewUrl: googlePlaceReviewUrl,
          isEnabled: isGoogleEnabled,
          isConfigured: isGoogleConfigured,
        },
        facebook: {
          pageUrl: facebookPageUrl,
          appId: facebookAppId,
          appSecretMasked: maskSecret(settings?.facebookAppSecret),
          hasSecret: Boolean(settings?.facebookAppSecret),
          isEnabled: isFacebookEnabled,
          isConfigured: isFacebookConfigured,
        },
        instagram: {
          profileUrl: instagramProfileUrl,
          appId: instagramAppId,
          appSecretMasked: maskSecret(settings?.instagramAppSecret),
          hasSecret: Boolean(settings?.instagramAppSecret),
          isEnabled: isInstagramEnabled,
          isConfigured: isInstagramConfigured,
        },
        discount: {
          percentage: reviewDiscountPercent,
          isEnabled: reviewDiscountEnabled,
        },
        stats,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/integrations/feedback:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch review integrations', error: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = extractAuthContext(request)
    const body = await request.json()
    const restaurantId = body.restaurantId || authContext.restaurantId
    const organizationId = authContext.organizationId

    // 1. Fetch existing settings to preserve secrets when masked
    const existing = await prisma.feedbackIntegrationSetting.findUnique({
      where: { restaurantId },
    })

    // Resolve Google client secret
    let googleClientSecret = existing?.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || null
    if (body.googleClientSecret && !body.googleClientSecret.includes('••••')) {
      googleClientSecret = body.googleClientSecret.trim()
    }

    // Resolve Facebook app secret
    let facebookAppSecret = existing?.facebookAppSecret || null
    if (body.facebookAppSecret && !body.facebookAppSecret.includes('••••')) {
      facebookAppSecret = body.facebookAppSecret.trim()
    }

    // Resolve Instagram app secret
    let instagramAppSecret = existing?.instagramAppSecret || null
    if (body.instagramAppSecret && !body.instagramAppSecret.includes('••••')) {
      instagramAppSecret = body.instagramAppSecret.trim()
    }

    const dataToSave = {
      googleClientId: body.googleClientId !== undefined ? body.googleClientId.trim() : existing?.googleClientId,
      googleClientSecret,
      googleRedirectUri: body.googleRedirectUri !== undefined ? body.googleRedirectUri.trim() : existing?.googleRedirectUri,
      googlePlaceReviewUrl: body.googlePlaceReviewUrl !== undefined ? body.googlePlaceReviewUrl.trim() : existing?.googlePlaceReviewUrl,
      isGoogleEnabled: body.isGoogleEnabled !== undefined ? Boolean(body.isGoogleEnabled) : existing?.isGoogleEnabled ?? true,

      facebookPageUrl: body.facebookPageUrl !== undefined ? body.facebookPageUrl.trim() : existing?.facebookPageUrl,
      facebookAppId: body.facebookAppId !== undefined ? body.facebookAppId.trim() : existing?.facebookAppId,
      facebookAppSecret,
      isFacebookEnabled: body.isFacebookEnabled !== undefined ? Boolean(body.isFacebookEnabled) : existing?.isFacebookEnabled ?? false,

      instagramProfileUrl: body.instagramProfileUrl !== undefined ? body.instagramProfileUrl.trim() : existing?.instagramProfileUrl,
      instagramAppId: body.instagramAppId !== undefined ? body.instagramAppId.trim() : existing?.instagramAppId,
      instagramAppSecret,
      isInstagramEnabled: body.isInstagramEnabled !== undefined ? Boolean(body.isInstagramEnabled) : existing?.isInstagramEnabled ?? false,

      reviewDiscountPercent: body.reviewDiscountPercent !== undefined ? Number(body.reviewDiscountPercent) : (existing?.reviewDiscountPercent ? Number(existing.reviewDiscountPercent) : 10.0),
      reviewDiscountEnabled: body.reviewDiscountEnabled !== undefined ? Boolean(body.reviewDiscountEnabled) : existing?.reviewDiscountEnabled ?? true,
    }

    const updated = await prisma.feedbackIntegrationSetting.upsert({
      where: { restaurantId },
      update: dataToSave,
      create: {
        restaurantId,
        organizationId,
        ...dataToSave,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Review and social integrations updated successfully.',
      data: updated,
    })
  } catch (error: any) {
    console.error('Error saving review integration settings:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save review integration settings', error: error?.message },
      { status: 500 }
    )
  }
}
