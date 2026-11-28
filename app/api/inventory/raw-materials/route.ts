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

const RAW_MATERIAL_LIST_SELECT = {
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

async function getRequestRole(request: NextRequest): Promise<string> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = token ? await verifyJWT(token).catch(() => null) : null
  return normalizeRole(session?.role)
}

export async function GET(request: NextRequest) {
  try {
    const exactSku = request.nextUrl.searchParams.get('sku')?.trim()
    if (exactSku) {
      const material = await prisma.rawMaterial.findUnique({
        where: { sku: exactSku },
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          weight: true,
          weightUnit: true,
          location: true,
          minThreshold: true,
          updatedAt: true,
          vendor: {
            select: {
              name: true,
            },
          },
        },
      })

      if (!material) {
        return NextResponse.json(
          { success: false, message: 'Raw material product not found' },
          { status: 404 }
        )
      }

      const qty = Number(material.quantity)
      const threshold = Number(material.minThreshold)
      return NextResponse.json({
        success: true,
        data: {
          id: material.id,
          name: material.name,
          sku: material.sku,
          quantity: qty,
          weight: Number(material.weight),
          weightUnit: material.weightUnit,
          location: material.location,
          minThreshold: threshold,
          vendorName: material.vendor?.name || 'Unassigned',
          status: qty === 0 ? 'critical' : qty <= threshold ? 'low-stock' : 'in-stock',
          updatedAt: material.updatedAt,
        },
      })
    }

    const isChef = (await getRequestRole(request)) === 'CHEF'
    const search = request.nextUrl.searchParams.get('search')?.toLowerCase().trim() || ''
    const statusFilter = request.nextUrl.searchParams.get('status')?.trim() || 'all'
    const vendorFilter = isChef ? 'all' : request.nextUrl.searchParams.get('vendorId')?.trim() || 'all'

    const allMaterials = await prisma.rawMaterial.findMany({
      select: isChef
        ? {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            weight: true,
            weightUnit: true,
            location: true,
            minThreshold: true,
            createdAt: true,
            updatedAt: true,
          }
        : RAW_MATERIAL_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    })

    let lowStockCount = 0
    let outOfStockCount = 0
    let inStockCount = 0

    const enriched = allMaterials.map((item: any) => {
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

      if (isChef) {
        const { vendorId: _vId, qrCodeData: _qr, vendor: _vendor, ...chefSafeItem } = item
        return {
          ...chefSafeItem,
          status,
        }
      }

      return {
        ...item,
        status,
        vendorName: item.vendor?.name || 'Unassigned',
      }
    })

    const filtered = enriched.filter((item: any) => {
      if (search) {
        const matchesName = item.name.toLowerCase().includes(search)
        const matchesSku = item.sku.toLowerCase().includes(search)
        const matchesLocation = item.location.toLowerCase().includes(search)
        const matchesVendor = !isChef && (item.vendorName || '').toLowerCase().includes(search)
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

      if (!isChef && vendorFilter !== 'all' && item.vendorId !== vendorFilter) {
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
    if ((await getRequestRole(request)) === 'CHEF') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Chefs are not permitted to add raw materials' },
        { status: 403 }
      )
    }

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

    // Compact URL payload keeps QR modules large and scannable on mobile & handheld scanners
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const protoHeader = request.headers.get('x-forwarded-proto') || 'http'
    const resolvedOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (hostHeader ? `${protoHeader}://${hostHeader}` : request.nextUrl.origin)
    const qrPayload = buildRawMaterialQrUrl({
      origin: resolvedOrigin,
      sku,
      name: name.trim(),
    })

    const qrCodeData = await QRCode.toDataURL(qrPayload, RAW_MATERIAL_QR_OPTIONS)

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

    // Automated Low-Inventory Check; defer Menu Availability Sync post-response
    invalidateInventoryLookupCache()
    const alertResult = await checkAndTriggerLowStockAlert({
      ...material,
      vendorName: material.vendor?.name || null,
    })
    after(() => {
      syncMenuAvailabilityFromInventory().catch(() => {})
    })

    const { qrCodeData: _omittedQr, ...materialWithoutQr } = material

    return NextResponse.json({
      success: true,
      message: 'Raw material created successfully',
      data: {
        ...materialWithoutQr,
        vendorName: material.vendor?.name || 'Unassigned',
        status:
          Number(material.quantity) === 0
            ? 'critical'
            : Number(material.quantity) <= Number(material.minThreshold)
            ? 'low-stock'
            : 'in-stock',
      },
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
