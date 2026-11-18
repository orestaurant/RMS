/**
 * /api/integrations/aggregators
 * Multi-Tenant BYOK (Bring Your Own Keys) Food Aggregator Integration Management.
 * Allows each restaurant/client to configure their own Zomato, Swiggy, and Uber Eats API keys and secrets.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthContext } from '@/api/middleware/auth'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { AggregatorEnum } from '@prisma/client'

// Helper to mask sensitive keys for secure UI display
function maskSecret(val?: string | null): string {
  if (!val) return ''
  if (val.length <= 6) return '******'
  return `${val.substring(0, 3)}****${val.substring(val.length - 3)}`
}

export async function GET(request: NextRequest) {
  try {
    const authContext = extractAuthContext(request)
    const restaurantId = request.nextUrl.searchParams.get('restaurantId') || authContext.restaurantId
    const origin = request.nextUrl.origin || 'https://restosphere.app'

    const integrations = await prisma.aggregatorIntegration.findMany({
      where: {
        restaurantId,
        deletedAt: null,
      },
    })

    const supportedAggregators: Array<{
      type: AggregatorEnum
      name: string
      icon: string
      portalName: string
    }> = [
      { type: 'zomato', name: 'Zomato', icon: '🔴', portalName: 'Zomato Merchant Partner' },
      { type: 'swiggy', name: 'Swiggy', icon: '🟠', portalName: 'Swiggy Partner Central' },
      { type: 'uber_eats', name: 'Uber Eats', icon: '🟢', portalName: 'Uber Eats Restaurant Manager' },
      { type: 'ondc', name: 'ONDC', icon: '🔵', portalName: 'ONDC Open Network' },
    ]

    const result = supportedAggregators.map((agg) => {
      const match = integrations.find((i) => i.aggregatorType === agg.type)
      const webhookUrl = `${origin}/api/integrations/webhook/${agg.type}?restaurantId=${restaurantId}`

      return {
        type: agg.type,
        name: agg.name,
        icon: agg.icon,
        portalName: agg.portalName,
        isConfigured: Boolean(match?.apiKey || match?.restaurantIdOnAggregator),
        isActive: match ? match.isActive : false,
        status: match?.status || 'unconfigured',
        restaurantIdOnAggregator: match?.restaurantIdOnAggregator || '',
        apiKeyMasked: maskSecret(match?.apiKey),
        hasSecret: Boolean(match?.apiSecret),
        commissionPercentage: match?.commissionPercentage ? Number(match.commissionPercentage) : null,
        webhookUrl: match?.webhookUrl || webhookUrl,
        lastSyncAt: match?.lastSyncAt ? match.lastSyncAt.toISOString() : null,
        syncError: match?.syncError || null,
      }
    })

    return NextResponse.json(
      successResponse(result, 'Aggregator integrations loaded successfully'),
      {
        headers: {
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching aggregator integrations:', error)
    return NextResponse.json(errorResponse('Failed to load aggregator integrations', 'SERVER_ERROR'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const authContext = extractAuthContext(request)
    const body = await request.json().catch(() => ({}))
    const {
      aggregatorType,
      restaurantIdOnAggregator,
      apiKey,
      apiSecret,
      commissionPercentage,
      isActive = true,
      restaurantId: reqRestaurantId,
    } = body

    if (!aggregatorType) {
      return NextResponse.json(errorResponse('aggregatorType is required (zomato, swiggy, uber_eats)', 'MISSING_PARAM'), {
        status: 400,
      })
    }

    const normType = String(aggregatorType).toLowerCase() as AggregatorEnum
    if (!['zomato', 'swiggy', 'uber_eats', 'ondc'].includes(normType)) {
      return NextResponse.json(errorResponse('Invalid aggregatorType', 'INVALID_PARAM'), { status: 400 })
    }

    const restaurantId = reqRestaurantId || authContext.restaurantId
    const organizationId = authContext.organizationId
    const origin = request.nextUrl.origin || 'https://restosphere.app'
    const generatedWebhookUrl = `${origin}/api/integrations/webhook/${normType}?restaurantId=${restaurantId}`

    // Upsert integration record for this specific restaurant
    const existing = await prisma.aggregatorIntegration.findFirst({
      where: {
        restaurantId,
        aggregatorType: normType,
      },
    })

    const dataToSave: any = {
      restaurantId,
      organizationId,
      aggregatorType: normType,
      restaurantIdOnAggregator: restaurantIdOnAggregator || existing?.restaurantIdOnAggregator,
      isActive: Boolean(isActive),
      status: isActive ? 'active' : 'inactive',
      webhookUrl: generatedWebhookUrl,
      commissionPercentage: commissionPercentage !== undefined ? Number(commissionPercentage) : existing?.commissionPercentage,
      lastSyncAt: new Date(),
      syncError: null,
    }

    // Only update keys if provided (don't overwrite with blank if user only toggled status)
    if (apiKey && !apiKey.includes('****')) {
      dataToSave.apiKey = apiKey.trim()
    }
    if (apiSecret && !apiSecret.includes('****')) {
      dataToSave.apiSecret = apiSecret.trim()
    }

    const saved = existing
      ? await prisma.aggregatorIntegration.update({
          where: { id: existing.id },
          data: dataToSave,
        })
      : await prisma.aggregatorIntegration.create({
          data: {
            ...dataToSave,
            apiKey: apiKey || null,
            apiSecret: apiSecret || null,
          },
        })

    return NextResponse.json(
      successResponse(
        {
          id: saved.id,
          aggregatorType: saved.aggregatorType,
          restaurantIdOnAggregator: saved.restaurantIdOnAggregator,
          isActive: saved.isActive,
          status: saved.status,
          webhookUrl: saved.webhookUrl,
          apiKeyMasked: maskSecret(saved.apiKey),
          responseTimeMs: Date.now() - startTime,
        },
        `${saved.aggregatorType.toUpperCase()} credentials saved successfully. Auto-sync active.`
      )
    )
  } catch (error: any) {
    console.error('Error saving aggregator integration:', error)
    return NextResponse.json(errorResponse(error?.message || 'Failed to save integration', 'INTEGRATION_SAVE_ERROR'), {
      status: 500,
    })
  }
}
