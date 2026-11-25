import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authenticateAdmin } from '@/lib/admin-auth'
import {
  DEFAULT_NOTE_POINTS,
  getCachedNotePoints,
  invalidateNotePointsServerCache,
  sanitizeNotePoints,
  setCachedNotePoints,
} from '@/lib/note-points'

async function resolveTargetRestaurant(restaurantIdParam?: string | null, organizationId?: string | null) {
  if (restaurantIdParam) {
    const found = await prisma.restaurant.findFirst({
      where: { id: restaurantIdParam, deletedAt: null },
      select: { id: true, organizationId: true, name: true },
    })
    if (found) return found
  }

  if (organizationId) {
    const byOrg = await prisma.restaurant.findFirst({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, organizationId: true, name: true },
    })
    if (byOrg) return byOrg
  }

  return prisma.restaurant.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, organizationId: true, name: true },
  })
}

function extractNotePointsFromSettings(aiSetupData: unknown): string[] | null {
  if (!aiSetupData || typeof aiSetupData !== 'object' || Array.isArray(aiSetupData)) {
    return null
  }
  const raw = (aiSetupData as Record<string, unknown>).notePoints
  if (!Array.isArray(raw)) return null
  return sanitizeNotePoints(raw)
}

/**
 * GET /api/settings/note-points?restaurantId=<optional>
 * Publicly readable for customer Drive-In / Highway ordering and staff views.
 * Uses a 60s in-memory TTL cache for sub-millisecond hot responses.
 */
export async function GET(request: NextRequest) {
  try {
    const restaurantIdParam = request.nextUrl.searchParams.get('restaurantId')?.trim() || null
    const cacheKey = restaurantIdParam || 'default'

    const cached = getCachedNotePoints(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          notePoints: cached.notePoints,
          restaurantId: cached.restaurantId,
          cached: true,
        },
      })
    }

    const restaurant = await resolveTargetRestaurant(restaurantIdParam)
    if (!restaurant) {
      setCachedNotePoints(cacheKey, DEFAULT_NOTE_POINTS, null)
      return NextResponse.json({
        success: true,
        data: {
          notePoints: DEFAULT_NOTE_POINTS,
          restaurantId: null,
        },
      })
    }

    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: restaurant.id },
      select: { aiSetupData: true },
    })

    const configured = extractNotePointsFromSettings(settings?.aiSetupData)
    const notePoints = configured && configured.length > 0 ? configured : DEFAULT_NOTE_POINTS

    setCachedNotePoints(cacheKey, notePoints, restaurant.id)
    if (restaurant.id !== cacheKey) {
      setCachedNotePoints(restaurant.id, notePoints, restaurant.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        notePoints,
        restaurantId: restaurant.id,
      },
    })
  } catch (error) {
    console.error('Error fetching note points:', error)
    return NextResponse.json({
      success: true,
      data: {
        notePoints: DEFAULT_NOTE_POINTS,
        restaurantId: null,
        fallback: true,
      },
    })
  }
}

/**
 * PUT /api/settings/note-points
 * Admin-only endpoint to update restaurant-specific Highway / Drive-In local note points.
 */
export async function PUT(request: NextRequest) {
  try {
    const { auth, errorResponse } = await authenticateAdmin(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, message: errorResponse?.message || 'Unauthorized' },
        { status: errorResponse?.status || 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const restaurantIdParam = typeof body?.restaurantId === 'string' ? body.restaurantId.trim() : null
    const notePoints = sanitizeNotePoints(body?.notePoints)

    if (notePoints.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one valid note point is required.' },
        { status: 400 }
      )
    }

    const restaurant = await resolveTargetRestaurant(restaurantIdParam, auth.organizationId)
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'No active restaurant found for this account.' },
        { status: 404 }
      )
    }

    const existingSettings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: restaurant.id },
      select: { id: true, aiSetupData: true },
    })

    const prevData =
      existingSettings?.aiSetupData &&
      typeof existingSettings.aiSetupData === 'object' &&
      !Array.isArray(existingSettings.aiSetupData)
        ? (existingSettings.aiSetupData as Record<string, unknown>)
        : {}

    const updatedSetupData = {
      ...prevData,
      notePoints,
      notePointsUpdatedAt: new Date().toISOString(),
    }

    await prisma.restaurantSettings.upsert({
      where: { restaurantId: restaurant.id },
      update: {
        aiSetupData: updatedSetupData,
      },
      create: {
        restaurantId: restaurant.id,
        organizationId: restaurant.organizationId,
        aiSetupData: updatedSetupData,
      },
    })

    invalidateNotePointsServerCache(restaurant.id)
    setCachedNotePoints(restaurant.id, notePoints, restaurant.id)
    setCachedNotePoints('default', notePoints, restaurant.id)

    return NextResponse.json({
      success: true,
      message: 'Local note points updated successfully.',
      data: {
        notePoints,
        restaurantId: restaurant.id,
      },
    })
  } catch (error: any) {
    console.error('Error updating note points:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update note points.' },
      { status: 500 }
    )
  }
}
