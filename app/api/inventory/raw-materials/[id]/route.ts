import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import QRCode from 'qrcode'
import { checkAndTriggerLowStockAlert } from '@/lib/inventory-alerts'
import { invalidateInventoryLookupCache, syncMenuAvailabilityFromInventory } from '@/lib/inventory-deduction'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const material = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
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

    // Also generate SVG version on-the-fly if needed for SVG download
    const qrPayload = JSON.stringify({
      id: material.id,
      sku: material.sku,
      name: material.name,
      location: material.location,
      weight: `${material.weight} ${material.weightUnit}`,
      minThreshold: material.minThreshold,
    })

    const svgQr = await QRCode.toString(qrPayload, {
      type: 'svg',
      margin: 2,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...material,
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

    const existing = await prisma.rawMaterial.findUnique({
      where: { id },
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

    const updateData: any = {
      quantity: newQuantity,
    }

    if (name && typeof name === 'string' && name.trim()) {
      updateData.name = name.trim()
    }
    if (weight !== undefined && !isNaN(Number(weight))) {
      updateData.weight = Math.max(0, Number(weight))
    }
    if (weightUnit && typeof weightUnit === 'string') {
      updateData.weightUnit = weightUnit
    }
    if (location && typeof location === 'string' && location.trim()) {
      updateData.location = location.trim()
    }
    if (minThreshold !== undefined && !isNaN(Number(minThreshold))) {
      updateData.minThreshold = Math.max(0, Number(minThreshold))
    }
    if (vendorId && typeof vendorId === 'string') {
      updateData.vendorId = vendorId
    }

    // Refresh QR code if name, location, or weight changed
    if (updateData.name || updateData.location || updateData.weight || updateData.weightUnit) {
      const qrPayload = JSON.stringify({
        id: existing.id,
        sku: existing.sku,
        name: updateData.name || existing.name,
        location: updateData.location || existing.location,
        weight: `${updateData.weight ?? existing.weight} ${updateData.weightUnit || existing.weightUnit}`,
        minThreshold: updateData.minThreshold ?? existing.minThreshold,
      })
      updateData.qrCodeData = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320,
      })
    }

    const updated = await prisma.rawMaterial.update({
      where: { id },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Automated trigger check: drops below minThreshold
    const alertResult = await checkAndTriggerLowStockAlert(updated)
    invalidateInventoryLookupCache()
    await syncMenuAvailabilityFromInventory().catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Raw material updated successfully',
      data: updated,
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
    const { id } = await params
    await prisma.rawMaterial.delete({
      where: { id },
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
