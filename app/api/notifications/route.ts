/**
 * GET & POST /api/notifications
 * Live notifications endpoint for TopNavbar bell and kitchen alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  getNotificationsList,
  addNotification,
  markAsRead,
  clearAllNotifications,
  AppNotification,
} from '@/lib/notifications-store'

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '20'),
      50
    )

    let dbNotifs: any[] = []
    try {
      const records = await prisma.notification.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      if (records && records.length > 0) {
        dbNotifs = records.map((notif) => ({
          id: notif.id,
          type: notif.notificationType,
          title: notif.title,
          body: notif.message,
          time: getTimeAgo(notif.createdAt),
          read: notif.isRead,
          createdAt: notif.createdAt.toISOString(),
        }))
      }
    } catch (e) {
      // In sandbox mode or offline DB, gracefully fallback
    }

    const storeNotifs = getNotificationsList(limit)

    // Merge without duplicates
    const allNotifs: AppNotification[] = [...storeNotifs]
    for (const dbn of dbNotifs) {
      if (!allNotifs.some((n) => n.id === dbn.id)) {
        allNotifs.push(dbn)
      }
    }

    // Sort by createdAt descending
    allNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const unreadCount = allNotifs.filter((n) => !n.read).length

    return NextResponse.json({
      success: true,
      data: {
        notifications: allNotifs,
        unreadCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, orderNumber, tableNumber, customerName, itemsSummary, id } = body

    if (action === 'order_prepared') {
      const newNotif = addNotification({
        type: 'order_prepared',
        title: `🔥 Order #${orderNumber} Prepared & Ready!`,
        body: `${tableNumber || 'Table'} — ${itemsSummary || 'Food items are prepared and ready to serve'}. Waitstaff & customer alerted.`,
        metadata: {
          orderNumber,
          tableNumber,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Order prepared notification added',
        data: newNotif,
      })
    }

    if (action === 'mark_read') {
      markAsRead(id)
      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    if (action === 'clear') {
      clearAllNotifications()
      return NextResponse.json({ success: true, message: 'Notifications cleared' })
    }

    if (body.title && body.body) {
      const customNotif = addNotification({
        type: body.type || 'alert',
        title: body.title,
        body: body.body,
        metadata: body.metadata,
      })
      return NextResponse.json({ success: true, data: customNotif })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error adding notification:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to post notification' },
      { status: 500 }
    )
  }
}

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
