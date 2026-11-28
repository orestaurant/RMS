import { NextRequest, NextResponse, after } from 'next/server'
import prisma from '@/lib/prisma'
import QRCode from 'qrcode'
import { checkAndTriggerLowStockAlert } from '@/lib/inventory-alerts'
import {
  RAW_MATERIAL_QR_OPTIONS,
  buildRawMaterialQrUrl,
  invalidateInventoryLookupCache,
  syncMenuAvailabilityFromInventory,
} from '@/lib/inventory-deduction'
import { SESSION_COOKIE_NAME, verifyJWT, normalizeRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const RAW_MATERIAL_SELECT = {
  id: true,
  name: true,
  sku: true,
  quantity: true,
  weight: true,
  weightUnit: true,
  location: true,
  minThreshold: true,
  vendorId: true,
  createdAt: true,
  updatedAt: true,
  vendor: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} as const

function computeStockStatus(quantity: number, minThreshold: number): 'in-stock' | 'low-stock' | 'critical' {
  if (quantity === 0) return 'critical'
  if (quantity <= minThreshold) return 'low-stock'
  return 'in-stock'
}

async function getRequestRole(request: NextRequest): Promise<string> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = token ? await verifyJWT(token).catch(() => null) : null
  return normalizeRole(session?.role)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isChef = (await getRequestRole(request)) === 'CHEF'
    const { id } = await params
    const material = await prisma.rawMaterial.findUnique({
      where: { id },
      include: isChef
        ? undefined
        : {
            vendor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
    })

    if (!material) {
      return NextResponse.json(
        { success: false, message: 'Raw material not found' },
        { status: 404 }
      )
    }

    if (isChef) {
      const { vendorId: _vId, qrCodeData: _qr, ...chefSafeMaterial } = material
      return NextResponse.json({
        success: true,
        data: chefSafeMaterial,
      })
    }

    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const protoHeader = request.headers.get('x-forwarded-proto') || 'http'
    const resolvedOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (hostHeader ? `${protoHeader}://${hostHeader}` : request.nextUrl.origin)

    const qrPayload = buildRawMaterialQrUrl({
      origin: resolvedOrigin,
      sku: material.sku,
      name: material.name,
    })

    const [qrCodeData, svgQr] = await Promise.all([
      QRCode.toDataURL(qrPayload, RAW_MATERIAL_QR_OPTIONS),
      QRCode.toString(qrPayload, {
        type: 'svg',
        errorCorrectionLevel: RAW_MATERIAL_QR_OPTIONS.errorCorrectionLevel,
        margin: RAW_MATERIAL_QR_OPTIONS.margin,
        width: RAW_MATERIAL_QR_OPTIONS.width,
        color: RAW_MATERIAL_QR_OPTIONS.color,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...material,
        qrCodeData,
        svgQr,
      },
    })
  } catch (error: any) {
    console.error('Error fetching raw material:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch raw material' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isChef = (await getRequestRole(request)) === 'CHEF'
    const { id } = await params
    const body = await request.json()
    const {
      name,
      quantity,
      adjustDelta, // optional relative adjust (+5, -2)
      weight,
      weightUnit,
      location,
      minThreshold,
      vendorId,
    } = body

    if (isChef && vendorId !== undefined) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Chefs are not permitted to reassign vendors' },
        { status: 403 }
      )
    }

    const existing = await prisma.rawMaterial.findUnique({
      where: { id },
      select: RAW_MATERIAL_SELECT,
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Raw material not found' },
        { status: 404 }
      )
    }

    let newQuantity = existing.quantity
    if (quantity !== undefined && !isNaN(Number(quantity))) {
      newQuantity = Math.max(0, Number(quantity))
    } else if (adjustDelta !== undefined && !isNaN(Number(adjustDelta))) {
      newQuantity = Math.max(0, existing.quantity + Number(adjustDelta))
    }

    const updateData: Record<string, any> = {}
    if (newQuantity !== existing.quantity) {
      updateData.quantity = newQuantity
    }

    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (trimmedName && trimmedName !== existing.name) {
      updateData.name = trimmedName
    }
    if (weight !== undefined && !isNaN(Number(weight))) {
      const nextWeight = Math.max(0, Number(weight))
      if (nextWeight !== existing.weight) {
        updateData.weight = nextWeight
      }
    }
    if (typeof weightUnit === 'string' && weightUnit && weightUnit !== existing.weightUnit) {
      updateData.weightUnit = weightUnit
    }
    const trimmedLocation = typeof location === 'string' ? location.trim() : ''
    if (trimmedLocation && trimmedLocation !== existing.location) {
      updateData.location = trimmedLocation
    }
    if (minThreshold !== undefined && !isNaN(Number(minThreshold))) {
      const nextThreshold = Math.max(0, Number(minThreshold))
      if (nextThreshold !== existing.minThreshold) {
        updateData.minThreshold = nextThreshold
      }
    }
    if (!isChef && typeof vendorId === 'string' && vendorId && vendorId !== existing.vendorId) {
      updateData.vendorId = vendorId
    }

    // Only regenerate stored QR PNG when product name changed (URL encodes sku + product name)
    if (updateData.name !== undefined) {
      const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host')
      const protoHeader = request.headers.get('x-forwarded-proto') || 'http'
      const resolvedOrigin =
        process.env.NEXT_PUBLIC_APP_URL ||
        (hostHeader ? `${protoHeader}://${hostHeader}` : request.nextUrl.origin)
      const qrPayload = buildRawMaterialQrUrl({
        origin: resolvedOrigin,
        sku: existing.sku,
        name: updateData.name,
      })
      updateData.qrCodeData = await QRCode.toDataURL(qrPayload, RAW_MATERIAL_QR_OPTIONS)
    }

    const hasChanges = Object.keys(updateData).length > 0
    const updated = hasChanges
      ? await prisma.rawMaterial.update({
          where: { id },
          data: updateData,
          select: RAW_MATERIAL_SELECT,
        })
      : existing

    const quantityOrThresholdChanged =
      updateData.quantity !== undefined || updateData.minThreshold !== undefined

    if (hasChanges) {
      invalidateInventoryLookupCache()
    }

    const alertResult = quantityOrThresholdChanged || updateData.vendorId !== undefined
      ? await checkAndTriggerLowStockAlert({
          ...updated,
          vendorName: updated.vendor?.name || null,
        })
      : { triggered: false }

    // Defer full-menu availability sync out of the request critical path
    if (updateData.quantity !== undefined) {
      after(() => {
        syncMenuAvailabilityFromInventory().catch(() => {})
      })
    }

    const status = computeStockStatus(Number(updated.quantity), Number(updated.minThreshold))

    if (isChef) {
      const { vendorId: _vId, vendor: _vendor, ...chefSafeUpdated } = updated
      return NextResponse.json({
        success: true,
        message: 'Raw material updated successfully',
        data: {
          ...chefSafeUpdated,
          status,
        },
        alertResult: { triggered: alertResult.triggered },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Raw material updated successfully',
      data: {
        ...updated,
        vendorName: updated.vendor?.name || 'Unassigned',
        status,
      },
      alertResult,
    })
  } catch (error: any) {
    console.error('Error updating raw material:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update raw material' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if ((await getRequestRole(request)) === 'CHEF') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Chefs are not permitted to delete raw materials' },
        { status: 403 }
      )
    }

    const { id } = await params
    await prisma.rawMaterial.delete({
      where: { id },
    })
    invalidateInventoryLookupCache()
    after(() => {
      syncMenuAvailabilityFromInventory().catch(() => {})
    })
    return NextResponse.json({
      success: true,
      message: 'Raw material deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting raw material:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete raw material' },
      { status: 500 }
    )
  }
}
