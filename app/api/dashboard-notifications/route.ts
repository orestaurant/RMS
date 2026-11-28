import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'
import {
  convertQuantityUnit,
  invalidateInventoryLookupCache,
  syncMenuAvailabilityFromInventory,
} from '@/lib/inventory-deduction'

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
    const parsedPage = parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    const page = Math.max(Number.isFinite(parsedPage) ? parsedPage : 1, 1)
    const skip = (page - 1) * limit

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

    const [notifications, totalCount, unreadCount] = await Promise.all([
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
              vendor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
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
        skip,
        take: limit,
      }),
      prisma.dashboardNotification.count({
        where: whereClause,
      }),
      unreadOnly
        ? Promise.resolve(-1)
        : prisma.dashboardNotification.count({
            where: {
              ...whereClause,
              isRead: false,
            },
          }),
    ])

    const resolvedUnreadCount = unreadOnly ? totalCount : unreadCount

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications,
          unreadCount: resolvedUnreadCount,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          },
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
      unit,
      deliveryUnit,
    } = body
    const requestedUnitRaw = unit ?? deliveryUnit

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

    if (
      sessionRole === 'VENDOR' &&
      sessionUser?.userId &&
      notif.recipientRole === 'VENDOR' &&
      notif.recipientId &&
      notif.recipientId !== sessionUser.userId
    ) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: This restock request belongs to another vendor' },
        { status: 403 }
      )
    }

    const existingMeta = (notif.metadata as Record<string, any>) || {}
    const materialName = notif.rawMaterial?.name || existingMeta.materialName || 'Raw Material'
    const materialSku = notif.rawMaterial?.sku || existingMeta.sku || ''
    const location = notif.rawMaterial?.location || existingMeta.location || 'Warehouse'
    const weightUnit = notif.rawMaterial?.weightUnit || existingMeta.weightUnit || 'kg'
    const vendorName = notif.recipient?.name || existingMeta.vendorName || sessionUser?.name || 'Vendor'

    type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

    class TransitionConflictError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'TransitionConflictError'
      }
    }

    const PENDING_STATUSES = ['PENDING', 'ACKNOWLEDGED'] as const
    const IN_PROGRESS_STATUSES = ['RESTOCK_IN_PROGRESS', 'RESTOCK_INITIATED'] as const
    const IN_TRANSIT_STATUSES = ['RESTOCK_IN_TRANSIT'] as const
    const DELIVERED_STATUSES = ['RESTOCK_DELIVERED'] as const

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

    // Shared atomic transition helper for Stages 1-2 (Vendor workflow actions)
    const runVendorStageTransition = async (params: {
      allowedFromStatuses: readonly string[]
      invalidStateMessage: string
      status: string
      metaPatch: Record<string, any>
      managerTitle: string
      managerMessage: string
      successMessage: string
    }) => {
      if (!params.allowedFromStatuses.includes(notif.status)) {
        return NextResponse.json(
          { success: false, message: params.invalidStateMessage },
          { status: 409 }
        )
      }

      const updatedMeta = {
        ...existingMeta,
        ...params.metaPatch,
        status: params.status,
        materialName,
        vendorName,
      }

      try {
        const updatedNotif = await prisma.$transaction(async (tx) => {
          const claim = await tx.dashboardNotification.updateMany({
            where: {
              id,
              status: { in: [...params.allowedFromStatuses] },
            },
            data: {
              status: params.status,
              isRead: true,
              metadata: updatedMeta,
            },
          })

          if (claim.count === 0) {
            throw new TransitionConflictError(params.invalidStateMessage)
          }

          const updated = await tx.dashboardNotification.findUnique({
            where: { id },
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
      } catch (err) {
        if (err instanceof TransitionConflictError) {
          return NextResponse.json(
            { success: false, message: err.message },
            { status: 409 }
          )
        }
        throw err
      }
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

      const selectedUnit =
        typeof requestedUnitRaw === 'string' && requestedUnitRaw.trim()
          ? requestedUnitRaw.trim()
          : existingMeta.plannedUnit || weightUnit
      const qtyText = parsedPlanned !== undefined ? `${parsedPlanned} ${selectedUnit}` : null
      const trimmedNotes = typeof vendorNotes === 'string' ? vendorNotes.trim() : ''

      const acceptConflictMsg = IN_PROGRESS_STATUSES.includes(notif.status as any)
        ? 'This restock request has already been accepted and is in progress.'
        : 'Only pending restock requests can be accepted.'

      return runVendorStageTransition({
        allowedFromStatuses: PENDING_STATUSES,
        invalidStateMessage: acceptConflictMsg,
        status: 'RESTOCK_IN_PROGRESS',
        metaPatch: {
          acknowledgedAt: new Date().toISOString(),
          ...(parsedPlanned !== undefined
            ? { plannedQuantity: parsedPlanned, plannedUnit: selectedUnit }
            : {}),
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
      const plannedUnit = existingMeta.plannedUnit || weightUnit
      const qtyText = plannedQty !== undefined ? ` (${plannedQty} ${plannedUnit})` : ''

      const transitConflictMsg = PENDING_STATUSES.includes(notif.status as any)
        ? 'Please accept the restock request before marking it in transit.'
        : notif.status === 'RESTOCK_IN_TRANSIT'
          ? 'This restock request is already marked as in transit.'
          : 'This restock request has already been delivered.'

      return runVendorStageTransition({
        allowedFromStatuses: IN_PROGRESS_STATUSES,
        invalidStateMessage: transitConflictMsg,
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

    // Shared atomic restock completion helper:
    // Immediately increments RawMaterial + InventoryItem stock and completes both Vendor & Manager alerts.
    const executeAutoRestockCompletion = async (opts: {
      allowedFromStatuses: readonly string[]
      invalidStateMessage: string
      qtyToAdd: number
      inputQty?: number
      inputUnit?: string
      isVendorDelivery: boolean
      notesText?: string
    }) => {
      if (notif.status === 'RESTOCK_COMPLETED') {
        return NextResponse.json(
          { success: false, message: 'This restock delivery has already been completed.' },
          { status: 409 }
        )
      }

      if (!opts.allowedFromStatuses.includes(notif.status)) {
        return NextResponse.json(
          { success: false, message: opts.invalidStateMessage },
          { status: 409 }
        )
      }

      const selectedUnit = opts.inputUnit || weightUnit
      const warehouseQtyToAdd = parseFloat(
        convertQuantityUnit(opts.qtyToAdd, selectedUnit, weightUnit).toFixed(4)
      )
      const displaySuppliedText =
        opts.inputQty !== undefined && selectedUnit !== weightUnit
          ? `${opts.inputQty} ${selectedUnit} (+${warehouseQtyToAdd} ${weightUnit})`
          : `+${warehouseQtyToAdd} ${weightUnit}`

      if (!Number.isFinite(warehouseQtyToAdd) || warehouseQtyToAdd <= 0) {
        return NextResponse.json(
          { success: false, message: 'Restock quantity must be greater than 0.' },
          { status: 400 }
        )
      }

      const completedAt = new Date().toISOString()
      const currentStock = notif.rawMaterial
        ? Number(notif.rawMaterial.quantity)
        : Number(existingMeta.currentQuantity || 0)

      let txResult: {
        updatedRawMaterial: any
        updatedNotif: any
        newTotalStock: number
      }

      try {
        txResult = await prisma.$transaction(async (tx) => {
          // Acquire row-level lock and claim transition before mutating inventory
          const claim = await tx.dashboardNotification.updateMany({
            where: {
              id,
              status: { in: [...opts.allowedFromStatuses] },
            },
            data: {
              status: 'RESTOCK_COMPLETED',
              isRead: true,
            },
          })

          if (claim.count === 0) {
            throw new TransitionConflictError(opts.invalidStateMessage)
          }

          let rawMat = null
          let finalStock = currentStock + warehouseQtyToAdd

          // Resolve target RawMaterial ID (direct link or SKU/name fallback)
          let targetRawMaterialId = notif.rawMaterialId
          if (!targetRawMaterialId && (materialSku || materialName)) {
            const fallbackMat = await tx.rawMaterial.findFirst({
              where: {
                OR: [
                  ...(materialSku ? [{ sku: materialSku }] : []),
                  ...(materialName ? [{ name: { equals: materialName, mode: 'insensitive' as const } }] : []),
                ],
              },
              select: { id: true },
            })
            targetRawMaterialId = fallbackMat?.id || null
          }

          if (targetRawMaterialId) {
            // Atomic increment avoids lost updates under concurrent kitchen deductions
            rawMat = await tx.rawMaterial.update({
              where: { id: targetRawMaterialId },
              data: {
                quantity: { increment: warehouseQtyToAdd },
                updatedAt: new Date(),
              },
            })
            finalStock = Number(rawMat.quantity)

            // Sync matching InventoryItem records in 1 query
            const invOrClauses: any[] = []
            if (rawMat.sku || materialSku) invOrClauses.push({ sku: rawMat.sku || materialSku })
            if (rawMat.name || materialName) {
              invOrClauses.push({ name: { equals: rawMat.name || materialName, mode: 'insensitive' } })
            }

            if (invOrClauses.length > 0) {
              await tx.inventoryItem.updateMany({
                where: {
                  deletedAt: null,
                  OR: invOrClauses,
                },
                data: {
                  quantity: finalStock,
                  quantityInStock: finalStock,
                  updatedAt: new Date(),
                },
              })
            }
          }

          const updatedMeta = {
            ...existingMeta,
            ...(opts.isVendorDelivery ? { deliveredAt: completedAt } : {}),
            completedAt,
            deliveredQuantity: warehouseQtyToAdd,
            deliveredInputQuantity: opts.inputQty ?? opts.qtyToAdd,
            deliveredUnit: selectedUnit,
            previousStock: currentStock,
            newStock: finalStock,
            autoRestocked: opts.isVendorDelivery,
            confirmedBy: opts.isVendorDelivery
              ? `${vendorName} (Auto-Restocked)`
              : sessionUser?.name || 'Inventory Manager',
            status: 'RESTOCK_COMPLETED',
            materialName,
            vendorName,
            vendorNotes:
              opts.notesText ||
              existingMeta.vendorNotes ||
              `Delivered ${displaySuppliedText}. Inventory automatically updated to ${finalStock} ${weightUnit}.`,
          }

          const selfTitle = `✅ Restock Completed: ${materialName}`
          const selfMessage = opts.isVendorDelivery
            ? `Delivered ${displaySuppliedText} of ${materialName}. Warehouse stock automatically updated to ${finalStock} ${weightUnit}.`
            : `Restock delivery confirmed! ${displaySuppliedText} added to inventory. Current stock level: ${finalStock} ${weightUnit}.`

          const completedNotif = await tx.dashboardNotification.update({
            where: { id },
            data: {
              status: 'RESTOCK_COMPLETED',
              isRead: true,
              title: selfTitle,
              message: selfMessage,
              metadata: updatedMeta,
            },
          })

          if (notif.recipientRole === 'VENDOR') {
            // Ensure no duplicate open vendor alerts remain for this material
            if (targetRawMaterialId && notif.recipientId) {
              await tx.dashboardNotification.updateMany({
                where: {
                  id: { not: id },
                  rawMaterialId: targetRawMaterialId,
                  recipientRole: 'VENDOR',
                  recipientId: notif.recipientId,
                  status: { not: 'RESTOCK_COMPLETED' },
                },
                data: {
                  status: 'RESTOCK_COMPLETED',
                  isRead: true,
                  title: selfTitle,
                  message: selfMessage,
                  metadata: updatedMeta,
                },
              })
            }

            await syncManagerNotification(
              tx,
              'RESTOCK_COMPLETED',
              `✅ Auto-Restocked: ${materialName}`,
              `${vendorName} delivered ${displaySuppliedText} of ${materialName} at ${location}. Inventory automatically updated to ${finalStock} ${weightUnit}.`,
              updatedMeta
            )
          } else {
            await syncVendorNotification(
              tx,
              'RESTOCK_COMPLETED',
              `✅ Restock Completed: ${materialName}`,
              `Inventory updated for ${materialName}! ${displaySuppliedText} added to warehouse stock. Thank you!`,
              updatedMeta
            )
          }

          return { updatedRawMaterial: rawMat, updatedNotif: completedNotif, newTotalStock: finalStock }
        })
      } catch (err) {
        if (err instanceof TransitionConflictError) {
          return NextResponse.json(
            { success: false, message: err.message },
            { status: 409 }
          )
        }
        throw err
      }

      const { updatedRawMaterial, updatedNotif, newTotalStock } = txResult

      // Invalidate deduction cache and automatically re-enable any Out-of-Stock dishes
      invalidateInventoryLookupCache()
      await syncMenuAvailabilityFromInventory().catch(() => {})

      return NextResponse.json({
        success: true,
        message: `Delivered ${displaySuppliedText}! Inventory automatically updated to ${newTotalStock} ${weightUnit}.`,
        data: {
          notification: updatedNotif,
          rawMaterial: updatedRawMaterial,
          newStock: newTotalStock,
          addedQuantity: warehouseQtyToAdd,
        },
      })
    }

    // 4. STAGE 3 (Auto-Complete): Vendor Marks Delivered (requires RESTOCK_IN_TRANSIT) -> Automatically updates Inventory & marks RESTOCK_COMPLETED
    if (action === 'mark_delivered' || action === 'delivered') {
      const rawDelivered = deliveredQuantity ?? restockQuantity ?? quantity
      let suppliedQty: number

      if (rawDelivered !== undefined && rawDelivered !== null && String(rawDelivered).trim() !== '') {
        const parsed = Number(rawDelivered)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return NextResponse.json(
            { success: false, message: 'Please provide a valid delivered quantity greater than 0.' },
            { status: 400 }
          )
        }
        suppliedQty = parsed
      } else {
        suppliedQty = Number(
          existingMeta.deliveredQuantity || existingMeta.plannedQuantity || existingMeta.minThreshold || 20
        )
      }

      const selectedUnit =
        typeof requestedUnitRaw === 'string' && requestedUnitRaw.trim()
          ? requestedUnitRaw.trim()
          : existingMeta.deliveredUnit || existingMeta.plannedUnit || weightUnit

      const deliverConflictMsg =
        notif.status === 'RESTOCK_DELIVERED'
          ? 'This restock delivery has already been marked as delivered.'
          : 'Please mark this restock request as In Transit before delivering and updating stock.'

      return executeAutoRestockCompletion({
        allowedFromStatuses: IN_TRANSIT_STATUSES,
        invalidStateMessage: deliverConflictMsg,
        qtyToAdd: suppliedQty,
        inputQty: suppliedQty,
        inputUnit: selectedUnit,
        isVendorDelivery: true,
        notesText: typeof vendorNotes === 'string' && vendorNotes.trim() ? vendorNotes.trim() : undefined,
      })
    }

    // 5. STAGE 4 (Legacy / Manual Confirm Fallback): Confirms any remaining RESTOCK_DELIVERED alerts
    if (
      action === 'confirm_delivery' ||
      action === 'complete_restock' ||
      action === 'mark_completed' ||
      action === 'update_stock'
    ) {
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

      return executeAutoRestockCompletion({
        allowedFromStatuses: DELIVERED_STATUSES,
        invalidStateMessage: 'Supply can only be confirmed after the vendor has delivered the shipment.',
        qtyToAdd,
        isVendorDelivery: false,
        notesText: typeof vendorNotes === 'string' && vendorNotes.trim() ? vendorNotes.trim() : undefined,
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

const MANAGER_DELETE_ROLES = new Set(['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'])

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const sessionUser = token ? await verifyJWT(token).catch(() => null) : null
    const sessionRole = sessionUser?.role ? String(sessionUser.role).toUpperCase().trim() : ''

    if (!MANAGER_DELETE_ROLES.has(sessionRole)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only Inventory Managers can delete request records' },
        { status: 403 }
      )
    }

    let id = request.nextUrl.searchParams.get('id')?.trim() || ''
    if (!id) {
      const body = await request.json().catch(() => null)
      id = typeof body?.id === 'string' ? body.id.trim() : ''
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Request notification id is required' },
        { status: 400 }
      )
    }

    const result = await prisma.dashboardNotification.deleteMany({
      where: {
        id,
        recipientRole: 'INVENTORY_MANAGER',
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, message: 'Request record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Request deleted successfully', id },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: any) {
    console.error('Error deleting dashboard notification:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete request record' },
      { status: 500 }
    )
  }
}
