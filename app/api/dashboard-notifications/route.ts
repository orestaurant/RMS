import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const roleParam = request.nextUrl.searchParams.get('role')?.toUpperCase()
    const recipientIdParam = request.nextUrl.searchParams.get('recipientId')
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '40'), 100)

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
      whereClause.recipientRole = 'VENDOR'
      if (currentRecipientId) {
        whereClause.recipientId = currentRecipientId
      }
    } else if (
      currentRole === 'INVENTORY_MANAGER' ||
      currentRole === 'ADMIN' ||
      currentRole === 'SUPER_ADMIN'
    ) {
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
    const {
      action,
      id,
      vendorNotes,
      deliveredQuantity,
      restockQuantity,
      quantity,
    } = body

    if (!action) {
      return NextResponse.json({ success: false, message: 'Action is required' }, { status: 400 })
    }

    // Attempt to identify authenticated session
    let sessionUser: any = null
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (token) {
      sessionUser = await verifyJWT(token).catch(() => null)
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

    // For any restock workflow action, notification ID is required
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

    const existingMeta = (notif.metadata as Record<string, any>) || {}
    const materialName = notif.rawMaterial?.name || existingMeta.materialName || 'Raw Material'
    const materialSku = notif.rawMaterial?.sku || existingMeta.sku || ''
    const location = notif.rawMaterial?.location || existingMeta.location || 'Warehouse'
    const weightUnit = notif.rawMaterial?.weightUnit || existingMeta.weightUnit || 'kg'
    const vendorName = notif.recipient?.name || existingMeta.vendorName || sessionUser?.name || 'Vendor'

    // Helper to find or create the counterpart manager notification
    const syncManagerNotification = async (
      status: string,
      title: string,
      message: string,
      metadata: Record<string, any>
    ) => {
      if (!notif.rawMaterialId) return

      const existingManagerNotifs = await prisma.dashboardNotification.findMany({
        where: {
          rawMaterialId: notif.rawMaterialId,
          recipientRole: 'INVENTORY_MANAGER',
        },
      })

      if (existingManagerNotifs.length > 0) {
        await prisma.dashboardNotification.updateMany({
          where: {
            rawMaterialId: notif.rawMaterialId,
            recipientRole: 'INVENTORY_MANAGER',
          },
          data: {
            status,
            title,
            message,
            metadata,
            isRead: false,
          },
        })
      } else {
        const invManager = await prisma.user.findFirst({
          where: {
            role: { in: ['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
            status: 'active',
          },
          select: { id: true },
        })

        await prisma.dashboardNotification.create({
          data: {
            recipientId: invManager?.id || null,
            recipientRole: 'INVENTORY_MANAGER',
            type: 'LOW_STOCK_ALERT',
            title,
            message,
            rawMaterialId: notif.rawMaterialId,
            metadata,
            status,
            isRead: false,
          },
        })
      }
    }

    // Helper to sync vendor notifications when manager takes an action (e.g. confirm_delivery)
    const syncVendorNotification = async (
      status: string,
      title: string,
      message: string,
      metadata: Record<string, any>
    ) => {
      if (!notif.rawMaterialId) return

      await prisma.dashboardNotification.updateMany({
        where: {
          rawMaterialId: notif.rawMaterialId,
          recipientRole: 'VENDOR',
        },
        data: {
          status,
          title,
          message,
          metadata,
          isRead: false,
        },
      })
    }

    // 2. STAGE 1: Vendor Accepts Request -> Status: RESTOCK_IN_PROGRESS
    if (action === 'acknowledge' || action === 'initiate_restock' || action === 'accept_request') {
      const acknowledgedAt = new Date().toISOString()
      const updatedMeta = {
        ...existingMeta,
        acknowledgedAt,
        vendorNotes: vendorNotes || 'Vendor acknowledged restock request. Order preparation in progress.',
        status: 'RESTOCK_IN_PROGRESS',
        materialName,
        vendorName,
      }

      const updatedNotif = await prisma.dashboardNotification.update({
        where: { id },
        data: {
          status: 'RESTOCK_IN_PROGRESS',
          isRead: true,
          metadata: updatedMeta,
        },
      })

      await syncManagerNotification(
        'RESTOCK_IN_PROGRESS',
        `⏳ Request In Progress: ${materialName}`,
        `${vendorName} accepted the restock request for ${materialName}. Restock preparation is now in progress.`,
        updatedMeta
      )

      return NextResponse.json({
        success: true,
        message: 'Restock request accepted. Status updated to Request In Progress.',
        data: updatedNotif,
      })
    }

    // 3. STAGE 2: Vendor Marks In Transit -> Status: RESTOCK_IN_TRANSIT
    if (action === 'mark_in_transit' || action === 'in_transit') {
      const inTransitAt = new Date().toISOString()
      const updatedMeta = {
        ...existingMeta,
        inTransitAt,
        transitNotes: vendorNotes || 'Shipment dispatched by vendor and currently on the way.',
        status: 'RESTOCK_IN_TRANSIT',
        materialName,
        vendorName,
      }

      const updatedNotif = await prisma.dashboardNotification.update({
        where: { id },
        data: {
          status: 'RESTOCK_IN_TRANSIT',
          isRead: true,
          metadata: updatedMeta,
        },
      })

      await syncManagerNotification(
        'RESTOCK_IN_TRANSIT',
        `🚚 Restock In Transit: ${materialName}`,
        `${vendorName} has dispatched the order for ${materialName}. Restock is currently in transit to ${location}.`,
        updatedMeta
      )

      return NextResponse.json({
        success: true,
        message: 'Shipment dispatched! Status updated to Restock In Transit.',
        data: updatedNotif,
      })
    }

    // 4. STAGE 3: Vendor Marks Delivered -> Status: RESTOCK_DELIVERED
    if (action === 'mark_delivered' || action === 'delivered') {
      const deliveredAt = new Date().toISOString()
      const suppliedQty =
        deliveredQuantity !== undefined && !isNaN(Number(deliveredQuantity))
          ? Number(deliveredQuantity)
          : Number(existingMeta.deliveredQuantity || existingMeta.minThreshold || 20)

      const updatedMeta = {
        ...existingMeta,
        deliveredAt,
        deliveredQuantity: suppliedQty,
        vendorNotes: vendorNotes || `Vendor delivered replenishment (${suppliedQty} ${weightUnit}). Awaiting inventory confirmation.`,
        status: 'RESTOCK_DELIVERED',
        materialName,
        vendorName,
      }

      const updatedNotif = await prisma.dashboardNotification.update({
        where: { id },
        data: {
          status: 'RESTOCK_DELIVERED',
          isRead: true,
          metadata: updatedMeta,
        },
      })

      await syncManagerNotification(
        'RESTOCK_DELIVERED',
        `📦 Restock Delivered: ${materialName}`,
        `${vendorName} has marked ${materialName} (${suppliedQty} ${weightUnit}) as delivered at ${location}. Please confirm receipt to update stock.`,
        updatedMeta
      )

      return NextResponse.json({
        success: true,
        message: `Order marked as delivered! Inventory Manager will verify and confirm stock receipt.`,
        data: updatedNotif,
      })
    }

    // 5. STAGE 4: Inventory Manager Confirms Delivery / Restock Completed -> Status: RESTOCK_COMPLETED
    // AND automatically updates RawMaterial stock in inventory!
    if (
      action === 'confirm_delivery' ||
      action === 'complete_restock' ||
      action === 'mark_completed' ||
      action === 'update_stock'
    ) {
      const completedAt = new Date().toISOString()

      // Determine the quantity to replenish
      const currentStock = notif.rawMaterial ? Number(notif.rawMaterial.quantity) : Number(existingMeta.currentQuantity || 0)
      let qtyToAdd = 0

      if (restockQuantity !== undefined && !isNaN(Number(restockQuantity))) {
        qtyToAdd = Math.max(0, Number(restockQuantity))
      } else if (deliveredQuantity !== undefined && !isNaN(Number(deliveredQuantity))) {
        qtyToAdd = Math.max(0, Number(deliveredQuantity))
      } else if (existingMeta.deliveredQuantity && !isNaN(Number(existingMeta.deliveredQuantity))) {
        qtyToAdd = Number(existingMeta.deliveredQuantity)
      } else if (quantity !== undefined && !isNaN(Number(quantity))) {
        // Direct set quantity
        qtyToAdd = Math.max(0, Number(quantity) - currentStock)
      } else {
        // Sensible default: double the minThreshold or 20
        const minThresh = notif.rawMaterial ? Number(notif.rawMaterial.minThreshold) : 10
        qtyToAdd = Math.max(10, minThresh * 2 - currentStock)
      }

      const newTotalStock = currentStock + qtyToAdd

      // A. AUTOMATIC DATABASE UPDATE: Update raw material quantity in database!
      let updatedRawMaterial = null
      if (notif.rawMaterialId) {
        updatedRawMaterial = await prisma.rawMaterial.update({
          where: { id: notif.rawMaterialId },
          data: {
            quantity: newTotalStock,
            updatedAt: new Date(),
          },
        })

        // Also synchronize any corresponding InventoryItem with the same SKU
        if (materialSku) {
          await prisma.inventoryItem
            .updateMany({
              where: { sku: materialSku },
              data: {
                quantity: newTotalStock,
                quantityInStock: newTotalStock,
              },
            })
            .catch(() => {})
        }
      }

      const updatedMeta = {
        ...existingMeta,
        completedAt,
        deliveredQuantity: qtyToAdd,
        previousStock: currentStock,
        newStock: newTotalStock,
        confirmedBy: sessionUser?.name || 'Inventory Manager',
        status: 'RESTOCK_COMPLETED',
        materialName,
        vendorName,
        vendorNotes: vendorNotes || existingMeta.vendorNotes || 'Restock delivery confirmed and inventory stock updated.',
      }

      // B. Update current notification
      const updatedNotif = await prisma.dashboardNotification.update({
        where: { id },
        data: {
          status: 'RESTOCK_COMPLETED',
          isRead: true,
          title: `✅ Restock Completed: ${materialName}`,
          message: `Restock delivery confirmed! +${qtyToAdd} ${weightUnit} added to inventory. Current stock level: ${newTotalStock} ${weightUnit}.`,
          metadata: updatedMeta,
        },
      })

      // C. Synchronize counterpart notification for the other role
      if (notif.recipientRole === 'VENDOR') {
        await syncManagerNotification(
          'RESTOCK_COMPLETED',
          `✅ Restock Completed: ${materialName}`,
          `Restock delivery confirmed! +${qtyToAdd} ${weightUnit} added to inventory. Current stock: ${newTotalStock} ${weightUnit}.`,
          updatedMeta
        )
      } else {
        await syncVendorNotification(
          'RESTOCK_COMPLETED',
          `✅ Restock Completed: ${materialName}`,
          `Inventory Manager confirmed receipt of ${materialName}! +${qtyToAdd} ${weightUnit} updated in warehouse stock. Thank you!`,
          updatedMeta
        )
      }

      return NextResponse.json({
        success: true,
        message: `Restock completed! Successfully added +${qtyToAdd} ${weightUnit} to inventory. Current stock is now ${newTotalStock} ${weightUnit}.`,
        data: {
          notification: updatedNotif,
          rawMaterial: updatedRawMaterial,
          newStock: newTotalStock,
          addedQuantity: qtyToAdd,
        },
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
