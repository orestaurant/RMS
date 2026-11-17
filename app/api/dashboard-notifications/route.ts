import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const roleParam = request.nextUrl.searchParams.get('role')?.toUpperCase()
    const recipientIdParam = request.nextUrl.searchParams.get('recipientId')
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '30'), 100)

    // Attempt to identify authenticated user from cookie if params not passed
    let sessionUser: any = null
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (token) {
      sessionUser = await verifyJWT(token).catch(() => null)
    }

    const currentRole = roleParam || (sessionUser?.role ? String(sessionUser.role).toUpperCase() : null)
    const currentRecipientId = recipientIdParam || sessionUser?.userId || null

    const whereClause: any = {}

    if (currentRole === 'VENDOR') {
      // For vendor, filter by recipientRole = 'VENDOR' and recipientId
      whereClause.recipientRole = 'VENDOR'
      if (currentRecipientId) {
        whereClause.recipientId = currentRecipientId
      }
    } else if (currentRole === 'INVENTORY_MANAGER') {
      whereClause.recipientRole = 'INVENTORY_MANAGER'
    }

    if (unreadOnly) {
      whereClause.isRead = false
    }

    const notifications = await prisma.dashboardNotification.findMany({
      where: whereClause,
      include: {
        rawMaterial: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            minThreshold: true,
            weight: true,
            weightUnit: true,
            location: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.dashboardNotification.count({
      where: {
        ...whereClause,
        isRead: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching dashboard notifications:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch dashboard notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, id, vendorNotes } = body

    if (!action) {
      return NextResponse.json({ success: false, message: 'Action is required' }, { status: 400 })
    }

    // 1. Mark as Read
    if (action === 'mark_read') {
      if (!id || id === 'all') {
        const role = body.role?.toUpperCase()
        const recipientId = body.recipientId
        const whereUpdate: any = {}
        if (role) whereUpdate.recipientRole = role
        if (recipientId) whereUpdate.recipientId = recipientId

        await prisma.dashboardNotification.updateMany({
          where: whereUpdate,
          data: { isRead: true },
        })

        return NextResponse.json({ success: true, message: 'All notifications marked as read' })
      }

      await prisma.dashboardNotification.update({
        where: { id },
        data: { isRead: true },
      })

      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    // 2. Vendor Acknowledge & Initiate Restock
    if (action === 'acknowledge' || action === 'initiate_restock') {
      if (!id) {
        return NextResponse.json({ success: false, message: 'Notification id is required' }, { status: 400 })
      }

      const notif = await prisma.dashboardNotification.findUnique({
        where: { id },
        include: {
          rawMaterial: true,
          recipient: true,
        },
      })

      if (!notif) {
        return NextResponse.json({ success: false, message: 'Notification not found' }, { status: 404 })
      }

      const acknowledgedAt = new Date().toISOString()
      const existingMeta = (notif.metadata as Record<string, any>) || {}

      const updatedMeta = {
        ...existingMeta,
        acknowledgedAt,
        vendorNotes: vendorNotes || 'Vendor acknowledged restock request. Shipment preparation initiated.',
        status: 'RESTOCK_INITIATED',
      }

      // Update the vendor notification
      const updatedNotif = await prisma.dashboardNotification.update({
        where: { id },
        data: {
          status: 'RESTOCK_INITIATED',
          isRead: true,
          metadata: updatedMeta,
        },
      })

      // Notify the Inventory Manager that the vendor has acknowledged & initiated restock
      const invManager = await prisma.user.findFirst({
        where: {
          role: { in: ['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
          status: 'active',
        },
        select: { id: true },
      })

      const materialName = notif.rawMaterial?.name || existingMeta.materialName || 'Raw Material'
      const vendorName = notif.recipient?.name || existingMeta.vendorName || 'Vendor'

      await prisma.dashboardNotification.create({
        data: {
          recipientId: invManager?.id || null,
          recipientRole: 'INVENTORY_MANAGER',
          type: 'LOW_STOCK_ALERT',
          title: `✅ Restock Initiated by ${vendorName}`,
          message: `${vendorName} has acknowledged and initiated restocking for ${materialName} at ${notif.rawMaterial?.location || existingMeta.location || 'Warehouse'}.`,
          rawMaterialId: notif.rawMaterialId,
          metadata: {
            ...updatedMeta,
            vendorName,
            materialName,
          },
          status: 'RESTOCK_INITIATED',
          isRead: false,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Restock request acknowledged and initiated successfully',
        data: updatedNotif,
      })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error handling notification action:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to process notification action' },
      { status: 500 }
    )
  }
}
