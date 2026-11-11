/**
 * GET /api/notifications?limit=10
 * Get notifications for current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getMockAuthContext } from '@/api/middleware/auth'
import { successResponse, errorResponse } from '@/api/utils/responses'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '10'),
      100
    )

    // TODO: Extract real auth context from JWT token
    const authContext = getMockAuthContext()

    // Fetch notifications for current user
    const notifications = await prisma.notification.findMany({
      where: {
        organizationId: authContext.organizationId,
        userId: authContext.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        notificationType: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    // Format for response
    const formattedNotifications = notifications.map((notif) => ({
      id: notif.id,
      type: notif.notificationType,
      title: notif.title,
      body: notif.message,
      time: getTimeAgo(notif.createdAt),
      read: notif.isRead,
      createdAt: notif.createdAt,
    }))

    return NextResponse.json(successResponse({ notifications: formattedNotifications }))
  } catch (error: any) {
    console.error('Error fetching notifications:', error)

    return NextResponse.json(
      errorResponse(error.message, 'NOTIFICATIONS_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * Helper to format time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
