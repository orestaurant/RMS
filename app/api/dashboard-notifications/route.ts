import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

export async function GET(request: NextRequest) {
  try {
    const roleParam = request.nextUrl.searchParams.get('role')?.toUpperCase().trim()
    const recipientIdParam = request.nextUrl.searchParams.get('recipientId')?.trim() || null
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
    const parsedLimit = parseInt(request.nextUrl.searchParams.get('limit') || '40', 10)
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 40, 1), 100)

    // Attempt to identify authenticated user from cookie if params not passed
    let sessionUser: any = null
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (token) {
      sessionUser = await verifyJWT(token).catch(() => null)
    }

    const sessionRole = sessionUser?.role ? String(sessionUser.role).toUpperCase().trim() : null
    const currentRole = roleParam || sessionRole

    const whereClause: any = {}

    if (currentRole === 'VENDOR') {
      whereClause.recipientRole = 'VENDOR'
      // Enforce vendor isolation for logged-in VENDOR users; allow explicit recipientId filter for admins
      const effectiveRecipientId =
        sessionRole === 'VENDOR' ? sessionUser?.userId || recipientIdParam : recipientIdParam
      if (effectiveRecipientId) {
        whereClause.recipientId = effectiveRecipientId
      }
    } else if (
      currentRole === 'INVENTORY_MANAGER' ||
      currentRole === 'ADMIN' ||
      currentRole === 'SUPER_ADMIN' ||
      currentRole === 'SUPERADMIN'
    ) {
      whereClause.recipientRole = 'INVENTORY_MANAGER'
    }

    if (unreadOnly) {
      whereClause.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.dashboardNotification.findMany({
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
      }),
      prisma.dashboardNotification.count({
        where: {
          ...whereClause,
          isRead: false,
        },
      }),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications,
          unreadCount,
        },
      },
      { headers: NO_CACHE_HEADERS }
    )
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
      plannedQuantity,
      committedQuantity,
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
    const sessionRole = sessionUser?.role ? String(sessionUser.role).toUpperCase().trim() : null

    // 1. Mark as Read
    if (action === 'mark_read') {
      if (!id || id === 'all') {
        const requestedRole = body.role?.toUpperCase().trim()
        const effectiveRole =
          sessionRole === 'VENDOR'
            ? 'VENDOR'
            : requestedRole || (sessionRole === 'INVENTORY_MANAGER' ? 'INVENTORY_MANAGER' : undefined)
        const effectiveRecipientId =
          sessionRole === 'VENDOR' ? sessionUser?.userId || body.recipientId : body.recipientId

        const whereUpdate: any = { isRead: false }
        if (effectiveRole) whereUpdate.recipientRole = effectiveRole
        if (effectiveRecipientId) whereUpdate.recipientId = effectiveRecipientId

        await prisma.dashboardNotification.updateMany({
          where: whereUpdate,
          data: { isRead: true },
        })

        return NextResponse.json({ success: true, message: 'All notifications marked as read' })
      }

      const whereSingle: any = { id }
      if (sessionRole === 'VENDOR' && sessionUser?.userId) {
        whereSingle.recipientId = sessionUser.userId
      }

      const result = await prisma.dashboardNotification.updateMany({
        where: whereSingle,
        data: { isRead: true },
      })

      if (result.count === 0) {
        return NextResponse.json({ success: false, message: 'Notification not found' }, { status: 404 })
      }

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

    type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

    // Update existing manager notifications in 1 query; create only if none exist
    const syncManagerNotification = async (
      tx: TxClient,
      status: string,
      title: string,
      message: string,
      metadata: Record<string, any>
    ) => {
      if (!notif.rawMaterialId) return

      const updated = await tx.dashboardNotification.updateMany({
        where: {
          rawMaterialId: notif.rawMaterialId,
          recipientRole: 'INVENTORY_MANAGER',
          status: { not: 'RESTOCK_COMPLETED' },
        },
        data: {
          status,
          title,
          message,
          metadata,
          isRead: false,
        },
      })

      if (updated.count === 0) {
        const invManager = await tx.user.findFirst({
          where: {
            role: { in: ['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
            status: 'active',
          },
          select: { id: true },
        })

        await tx.dashboardNotification.create({
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

    // Sync vendor notifications when manager confirms delivery
    const syncVendorNotification = async (
      tx: TxClient,
      status: string,
      title: string,
      message: string,
      metadata: Record<string, any>
    ) => {
      if (!notif.rawMaterialId) return

      await tx.dashboardNotification.updateMany({
        where: {
          rawMaterialId: notif.rawMaterialId,
          recipientRole: 'VENDOR',
          status: { not: 'RESTOCK_COMPLETED' },
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

    // Shared atomic transition helper for Stages 1-3 (Vendor workflow actions)
    const runVendorStageTransition = async (params: {
      status: string
      metaPatch: Record<string, any>
      managerTitle: string
      managerMessage: string
      successMessage: string
    }) => {
      const updatedMeta = {
        ...existingMeta,
        ...params.metaPatch,
        status: params.status,
        materialName,
        vendorName,
      }

      const updatedNotif = await prisma.$transaction(async (tx) => {
        const updated = await tx.dashboardNotification.update({
          where: { id },
          data: {
            status: params.status,
            isRead: true,
            metadata: updatedMeta,
          },
        })

        await syncManagerNotification(
          tx,
          params.status,
          params.managerTitle,
          params.managerMessage,
          updatedMeta
        )

        return updated
      })

      return NextResponse.json({
        success: true,
        message: params.successMessage,
        data: updatedNotif,
      })
    }

    // 2. STAGE 1: Vendor Accepts Request -> Status: RESTOCK_IN_PROGRESS
    if (action === 'acknowledge' || action === 'initiate_restock' || action === 'accept_request') {
      const rawPlanned = plannedQuantity ?? committedQuantity ?? deliveredQuantity ?? quantity
      let parsedPlanned: number | undefined =
        existingMeta.plannedQuantity !== undefined && Number.isFinite(Number(existingMeta.plannedQuantity))
          ? Number(existingMeta.plannedQuantity)
          : undefined

      if (rawPlanned !== undefined && rawPlanned !== null && String(rawPlanned).trim() !== '') {
        const num = Number(rawPlanned)
        if (!Number.isFinite(num) || num <= 0) {
          return NextResponse.json(
            { success: false, message: 'Please provide a valid quantity to deliver greater than 0' },
            { status: 400 }
          )
        }
        parsedPlanned = num
      }

      const qtyText = parsedPlanned !== undefined ? `${parsedPlanned} ${weightUnit}` : null
      const trimmedNotes = typeof vendorNotes === 'string' ? vendorNotes.trim() : ''

      return runVendorStageTransition({
        status: 'RESTOCK_IN_PROGRESS',
        metaPatch: {
          acknowledgedAt: new Date().toISOString(),
          ...(parsedPlanned !== undefined ? { plannedQuantity: parsedPlanned } : {}),
          vendorNotes:
            trimmedNotes ||
            (qtyText
              ? `Accepted request to deliver ${qtyText}. Preparation in progress.`
              : 'Vendor acknowledged restock request. Order preparation in progress.'),
        },
        managerTitle: `⏳ Request In Progress: ${materialName}`,
        managerMessage: qtyText
          ? `${vendorName} accepted the restock request for ${materialName} and will deliver ${qtyText}. Preparation is now in progress.`
          : `${vendorName} accepted the restock request for ${materialName}. Restock preparation is now in progress.`,
        successMessage: qtyText
          ? `Restock request accepted for ${qtyText}. Status updated to Request In Progress.`
          : 'Restock request accepted. Status updated to Request In Progress.',
      })
    }

    // 3. STAGE 2: Vendor Marks In Transit -> Status: RESTOCK_IN_TRANSIT
    if (action === 'mark_in_transit' || action === 'in_transit') {
      const plannedQty =
        existingMeta.plannedQuantity !== undefined && Number.isFinite(Number(existingMeta.plannedQuantity))
          ? Number(existingMeta.plannedQuantity)
          : undefined
      const qtyText = plannedQty !== undefined ? ` (${plannedQty} ${weightUnit})` : ''

      return runVendorStageTransition({
        status: 'RESTOCK_IN_TRANSIT',
        metaPatch: {
          inTransitAt: new Date().toISOString(),
          transitNotes:
            (typeof vendorNotes === 'string' && vendorNotes.trim()) ||
            `Shipment${qtyText} dispatched by vendor and currently on the way.`,
        },
        managerTitle: `🚚 Restock In Transit: ${materialName}`,
        managerMessage: `${vendorName} has dispatched the order for ${materialName}${qtyText}. Restock is currently in transit to ${location}.`,
        successMessage: 'Shipment dispatched! Status updated to Restock In Transit.',
      })
    }

    // 4. STAGE 3: Vendor Marks Delivered -> Status: RESTOCK_DELIVERED
    if (action === 'mark_delivered' || action === 'delivered') {
      const rawDelivered = deliveredQuantity ?? quantity
      const suppliedQty =
        rawDelivered !== undefined && Number.isFinite(Number(rawDelivered)) && Number(rawDelivered) > 0
          ? Number(rawDelivered)
          : Number(existingMeta.deliveredQuantity || existingMeta.plannedQuantity || existingMeta.minThreshold || 20)

      return runVendorStageTransition({
        status: 'RESTOCK_DELIVERED',
        metaPatch: {
          deliveredAt: new Date().toISOString(),
          deliveredQuantity: suppliedQty,
          vendorNotes:
            (typeof vendorNotes === 'string' && vendorNotes.trim()) ||
            `Vendor delivered replenishment (${suppliedQty} ${weightUnit}). Awaiting inventory confirmation.`,
        },
        managerTitle: `📦 Restock Delivered: ${materialName}`,
        managerMessage: `${vendorName} has marked ${materialName} (${suppliedQty} ${weightUnit}) as delivered at ${location}. Please confirm receipt to update stock.`,
        successMessage: 'Order marked as delivered! Inventory Manager will verify and confirm stock receipt.',
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
      if (notif.status === 'RESTOCK_COMPLETED') {
        return NextResponse.json(
          { success: false, message: 'This restock delivery has already been confirmed and completed.' },
          { status: 400 }
        )
      }

      const completedAt = new Date().toISOString()

      const currentStock = notif.rawMaterial
        ? Number(notif.rawMaterial.quantity)
        : Number(existingMeta.currentQuantity || 0)
      let qtyToAdd = 0

      if (restockQuantity !== undefined && Number.isFinite(Number(restockQuantity))) {
        qtyToAdd = Math.max(0, Number(restockQuantity))
      } else if (deliveredQuantity !== undefined && Number.isFinite(Number(deliveredQuantity))) {
        qtyToAdd = Math.max(0, Number(deliveredQuantity))
      } else if (existingMeta.deliveredQuantity && Number.isFinite(Number(existingMeta.deliveredQuantity))) {
        qtyToAdd = Number(existingMeta.deliveredQuantity)
      } else if (existingMeta.plannedQuantity && Number.isFinite(Number(existingMeta.plannedQuantity))) {
        qtyToAdd = Number(existingMeta.plannedQuantity)
      } else if (quantity !== undefined && Number.isFinite(Number(quantity))) {
        qtyToAdd = Math.max(0, Number(quantity) - currentStock)
      } else {
        const minThresh = notif.rawMaterial ? Number(notif.rawMaterial.minThreshold) : 10
        qtyToAdd = Math.max(10, minThresh * 2 - currentStock)
      }

      if (qtyToAdd <= 0) {
        return NextResponse.json(
          { success: false, message: 'Received quantity must be greater than 0 to complete restock.' },
          { status: 400 }
        )
      }

      const newTotalStock = currentStock + qtyToAdd

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

      const { updatedRawMaterial, updatedNotif } = await prisma.$transaction(async (tx) => {
        let rawMat = null
        if (notif.rawMaterialId) {
          rawMat = await tx.rawMaterial.update({
            where: { id: notif.rawMaterialId },
            data: {
              quantity: newTotalStock,
              updatedAt: new Date(),
            },
          })

          if (materialSku) {
            await tx.inventoryItem.updateMany({
              where: { sku: materialSku },
              data: {
                quantity: newTotalStock,
                quantityInStock: newTotalStock,
              },
            })
          }
        }

        const completedNotif = await tx.dashboardNotification.update({
          where: { id },
          data: {
            status: 'RESTOCK_COMPLETED',
            isRead: true,
            title: `✅ Restock Completed: ${materialName}`,
            message: `Restock delivery confirmed! +${qtyToAdd} ${weightUnit} added to inventory. Current stock level: ${newTotalStock} ${weightUnit}.`,
            metadata: updatedMeta,
          },
        })

        if (notif.recipientRole === 'VENDOR') {
          await syncManagerNotification(
            tx,
            'RESTOCK_COMPLETED',
            `✅ Restock Completed: ${materialName}`,
            `Restock delivery confirmed! +${qtyToAdd} ${weightUnit} added to inventory. Current stock: ${newTotalStock} ${weightUnit}.`,
            updatedMeta
          )
        } else {
          await syncVendorNotification(
            tx,
            'RESTOCK_COMPLETED',
            `✅ Restock Completed: ${materialName}`,
            `Inventory Manager confirmed receipt of ${materialName}! +${qtyToAdd} ${weightUnit} updated in warehouse stock. Thank you!`,
            updatedMeta
          )
        }

        return { updatedRawMaterial: rawMat, updatedNotif: completedNotif }
      })

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
