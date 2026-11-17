import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import QRCode from 'qrcode'
import { checkAndTriggerLowStockAlert } from '@/lib/inventory-alerts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search')?.toLowerCase().trim() || ''
    const statusFilter = request.nextUrl.searchParams.get('status')?.trim() || 'all'
    const vendorFilter = request.nextUrl.searchParams.get('vendorId')?.trim() || 'all'

    const allMaterials = await prisma.rawMaterial.findMany({
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
      orderBy: { updatedAt: 'desc' },
    })

    let lowStockCount = 0
    let outOfStockCount = 0
    let inStockCount = 0

    const enriched = allMaterials.map((item) => {
      const qty = Number(item.quantity)
      const threshold = Number(item.minThreshold)

      let status: 'in-stock' | 'low-stock' | 'critical'
      if (qty === 0) {
        status = 'critical' // Out of stock
        outOfStockCount++
      } else if (qty <= threshold) {
        status = 'low-stock'
        lowStockCount++
      } else {
        status = 'in-stock'
        inStockCount++
      }

      return {
        ...item,
        status,
        vendorName: item.vendor?.name || 'Unassigned',
      }
    })

    const filtered = enriched.filter((item) => {
      if (search) {
        const matchesName = item.name.toLowerCase().includes(search)
        const matchesSku = item.sku.toLowerCase().includes(search)
        const matchesLocation = item.location.toLowerCase().includes(search)
        const matchesVendor = (item.vendorName || '').toLowerCase().includes(search)
        if (!matchesName && !matchesSku && !matchesLocation && !matchesVendor) return false
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'critical' || statusFilter === 'out-of-stock') {
          if (item.status !== 'critical') return false
        } else if (statusFilter === 'low-stock') {
          if (item.status !== 'low-stock') return false
        } else if (statusFilter === 'in-stock') {
          if (item.status !== 'in-stock') return false
        }
      }

      if (vendorFilter !== 'all' && item.vendorId !== vendorFilter) {
        return false
      }

      return true
    })

    return NextResponse.json({
      success: true,
      data: filtered,
      stats: {
        total: allMaterials.length,
        lowStockCount,
        outOfStockCount,
        inStockCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching raw materials:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch raw materials' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      quantity,
      weight,
      weightUnit = 'kg',
      location,
      minThreshold,
      vendorId,
      sku: userSku,
    } = body

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Raw material name is required' }, { status: 400 })
    }

    if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
      return NextResponse.json({ success: false, message: 'Valid quantity count is required' }, { status: 400 })
    }

    if (weight === undefined || weight === null || isNaN(Number(weight))) {
      return NextResponse.json({ success: false, message: 'Valid weight number is required' }, { status: 400 })
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return NextResponse.json({ success: false, message: 'Warehouse / rack location is required' }, { status: 400 })
    }

    if (minThreshold === undefined || minThreshold === null || isNaN(Number(minThreshold))) {
      return NextResponse.json({ success: false, message: 'Minimum threshold is required' }, { status: 400 })
    }

    if (!vendorId || typeof vendorId !== 'string') {
      return NextResponse.json({ success: false, message: 'Assigned vendor is required' }, { status: 400 })
    }

    // Generate SKU if not provided or format clean
    const sku =
      userSku && typeof userSku === 'string' && userSku.trim()
        ? userSku.trim().toUpperCase()
        : `RM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`

    // Check SKU uniqueness
    const existingSku = await prisma.rawMaterial.findUnique({
      where: { sku },
    })
    if (existingSku) {
      return NextResponse.json({ success: false, message: `SKU '${sku}' already exists. Please provide a unique SKU.` }, { status: 400 })
    }

    const numQty = Math.max(0, Number(quantity))
    const numWeight = Math.max(0, Number(weight))
    const numMinThreshold = Math.max(0, Number(minThreshold))

    // Pre-create structured QR Code data payload
    const qrPayload = JSON.stringify({
      sku,
      name: name.trim(),
      location: location.trim(),
      weight: `${numWeight} ${weightUnit}`,
      minThreshold: numMinThreshold,
      timestamp: new Date().toISOString(),
    })

    const qrCodeData = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })

    // Create raw material record
    const material = await prisma.rawMaterial.create({
      data: {
        name: name.trim(),
        sku,
        quantity: numQty,
        weight: numWeight,
        weightUnit,
        location: location.trim(),
        minThreshold: numMinThreshold,
        qrCodeData,
        vendorId,
      },
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

    // Automated Low-Inventory Check & Trigger
    const alertResult = await checkAndTriggerLowStockAlert(material)

    return NextResponse.json({
      success: true,
      message: 'Raw material created successfully',
      data: material,
      alertResult,
    })
  } catch (error: any) {
    console.error('Error creating raw material:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create raw material' },
      { status: 500 }
    )
  }
}
