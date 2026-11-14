/**
 * POST & GET /api/orders
 * Unified handler for Table QR Dine-In Ordering & POS Terminal Orders
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  registerActiveLiveOrder,
  getKitchenStation,
  getRealTimeLiveOrders,
  invalidateKDSCache,
  invalidateLiveOrdersCache,
} from '@/lib/kds-utils'
import { Prisma } from '@prisma/client'
import {
  invalidateDashboardStatsCache,
  getCachedBranchMeta,
  setCachedBranchMeta,
} from '@/lib/dashboard-cache'

// High-speed in-memory caches to eliminate redundant Neon DB round-trips over Singapore link
const inMemoryTableCache = new Map<string, { id: string; tableNumber: string }>()
const inMemoryMenuItemCache = new Map<string, { id: string; name: string; basePrice: number; isAvailable: boolean; categoryName?: string; cachedAt: number }>()
const MENU_ITEM_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * GET /api/orders
 * Query orders by tableNumber, status, or branchId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableNumber = searchParams.get('table') || searchParams.get('tableNumber')
    const tableId = searchParams.get('tableId')
    const status = searchParams.get('status')
    const role = (searchParams.get('role') || '').toLowerCase().trim()
    const branchId = searchParams.get('branchId')
    const limit = parseInt(searchParams.get('limit') || '30')

    const where: any = { deletedAt: null }

    let tableVariants: string[] = []
    if (tableNumber) {
      const cleanTable = String(tableNumber).trim()
      const cleanNum = cleanTable.replace(/[^0-9]/g, '')
      tableVariants = Array.from(
        new Set([
          cleanTable,
          cleanNum,
          `Table ${cleanTable}`,
          `Table ${cleanNum}`,
          `T${cleanNum}`,
          cleanTable.toLowerCase(),
        ])
      ).filter(Boolean)

      where.OR = [
        { table: { tableNumber: { in: tableVariants } } },
        ...(tableId ? [{ tableId }] : []),
        ...tableVariants.map((tv) => ({
          metadata: { path: ['tableNumber'], equals: tv },
        })),
      ]

      // For customer table queries: only show active unserved orders OR orders created during current dining session (last 12h)
      if (!role) {
        const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
        where.AND = [
          {
            OR: [
              {
                status: {
                  in: [
                    'pending',
                    'PENDING',
                    'accepted',
                    'ACCEPTED',
                    'confirmed',
                    'preparing',
                    'PREPARING',
                    'ready',
                    'READY',
                  ],
                },
              },
              { createdAt: { gte: sessionCutoff } },
            ],
          },
        ]
      }
    } else if (tableId) {
      where.tableId = tableId
      if (!role) {
        const sessionCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
        where.AND = [
          {
            OR: [
              {
                status: {
                  in: [
                    'pending',
                    'PENDING',
                    'accepted',
                    'ACCEPTED',
                    'confirmed',
                    'preparing',
                    'PREPARING',
                    'ready',
                    'READY',
                  ],
                },
              },
              { createdAt: { gte: sessionCutoff } },
            ],
          },
        ]
      }
    }

    // Role-based active queue filtering for Waiter and Chef dashboards
    if (role === 'waiter') {
      where.status = {
        in: [
          'pending',
          'PENDING',
          'accepted',
          'ACCEPTED',
          'confirmed',
          'preparing',
          'PREPARING',
          'ready',
          'READY',
        ],
      }
    } else if (role === 'chef') {
      where.status = {
        in: [
          'pending',
          'PENDING',
          'accepted',
          'ACCEPTED',
          'confirmed',
          'preparing',
          'PREPARING',
          'ready',
          'READY',
        ],
      }
    } else if (status) {
      where.status = status
    }

    if (branchId) {
      where.branchId = branchId
    }

    let orders: any[] = []
    try {
      orders = await prisma.order.findMany({
        where,
        include: {
          table: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 50),
      })
    } catch (dbErr) {
      console.warn('Orders findMany DB error, using fallback:', dbErr)
    }

    let formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tableNumber: o.table?.tableNumber || (o.metadata as any)?.tableNumber || 'Unknown',
      orderType: o.orderType,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount || o.total || 0),
      createdAt: o.createdAt,
      notes: o.notes || (o.metadata as any)?.notes || null,
      isLocationLocked: Boolean(o.isLocationLocked ?? (o.metadata as any)?.isLocationLocked),
      vehicleNumber: o.vehicleNumber ?? (o.metadata as any)?.vehicleNumber ?? null,
      landmarkNote: o.landmarkNote ?? (o.metadata as any)?.landmarkNote ?? null,
      customerLat: o.customerLat !== null && o.customerLat !== undefined ? Number(o.customerLat) : ((o.metadata as any)?.customerLat !== undefined ? Number((o.metadata as any).customerLat) : null),
      customerLng: o.customerLng !== null && o.customerLng !== undefined ? Number(o.customerLng) : ((o.metadata as any)?.customerLng !== undefined ? Number((o.metadata as any).customerLng) : null),
      locationAccuracy: o.locationAccuracy !== null && o.locationAccuracy !== undefined ? Number(o.locationAccuracy) : ((o.metadata as any)?.locationAccuracy !== undefined ? Number((o.metadata as any).locationAccuracy) : null),
      locationCapturedAt: o.locationCapturedAt ?? (o.metadata as any)?.locationCapturedAt ?? null,
      items: o.items.map((i: any) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.itemName,
        price: Number(i.basePrice || 0),
        quantity: i.quantity,
        total: Number(i.itemTotal || (i.basePrice * i.quantity) || 0),
        notes: i.specialInstructions || null,
        specialInstructions: i.specialInstructions || null,
      })),
    }))

    // If DB returned no orders for table, merge from in-memory fallback
    if (tableVariants.length > 0) {
      const liveFallbacks = getRealTimeLiveOrders().filter((lo: any) => {
        const tbl = String(lo.tableNumber || '').trim().toLowerCase()
        return tableVariants.some((tv) => tbl.includes(tv.toLowerCase()) || tv.toLowerCase().includes(tbl))
      })

      for (const fb of liveFallbacks) {
        if (!formatted.some((f) => f.id === fb.id || f.id === fb.fullId || f.orderNumber === fb.id)) {
          formatted.unshift({
            id: fb.fullId || fb.id,
            orderNumber: fb.id,
            tableNumber: fb.tableNumber,
            orderType: 'dine_in',
            status: fb.status === 'cooking' ? 'preparing' : fb.status === 'accepted' ? 'confirmed' : fb.status,
            paymentStatus: 'pending',
            totalAmount: (fb.items || []).reduce((s: number, it: any) => s + (it.price || 150) * it.quantity, 0),
            createdAt: fb.createdAt || new Date().toISOString(),
            notes: fb.specialNotes || fb.notes || null,
            isLocationLocked: Boolean(fb.isLocationLocked),
            vehicleNumber: fb.vehicleNumber || null,
            landmarkNote: fb.landmarkNote || null,
            customerLat: fb.customerLat ?? null,
            customerLng: fb.customerLng ?? null,
            locationAccuracy: fb.locationAccuracy ?? null,
            locationCapturedAt: fb.locationCapturedAt ?? null,
            items: (fb.items || []).map((it: any) => ({
              id: it.id,
              menuItemId: it.id,
              name: it.name,
              price: it.price || 150,
              quantity: it.quantity,
              total: (it.price || 150) * it.quantity,
              notes: it.notes || it.specialInstructions || null,
              specialInstructions: it.specialInstructions || it.notes || null,
            })),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/orders
 * Place dine-in QR orders or POS orders with full validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const {
      tableNumber,
      tableId: providedTableId,
      items,
      totalAmount: clientTotalAmount,
      orderType = 'dine_in',
      notes = '',
      customerId = null,
      isLocationLocked = false,
      vehicleNumber = null,
      landmarkNote = null,
      customerLat = null,
      customerLng = null,
      locationAccuracy = null,
      locationCapturedAt = null,
    } = body

    const requestedStatus = body.status || body.requestedStatus || 'pending'

    const parsedLat = customerLat !== null && customerLat !== undefined && !isNaN(Number(customerLat)) ? Number(customerLat) : null
    const parsedLng = customerLng !== null && customerLng !== undefined && !isNaN(Number(customerLng)) ? Number(customerLng) : null
    const parsedAccuracy = locationAccuracy !== null && locationAccuracy !== undefined && !isNaN(Number(locationAccuracy)) ? Number(locationAccuracy) : null
    const parsedCapturedAt = locationCapturedAt ? new Date(locationCapturedAt) : (parsedLat !== null ? new Date() : null)
    const parsedVehicle = vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : null
    const parsedLandmark = landmarkNote ? String(landmarkNote).trim() : null
    const parsedLocked = Boolean(isLocationLocked)

    let branchId = body.branchId

    // 1. Validate Items array (Cart cannot be empty)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cart cannot be empty. Please select at least one item.' },
        { status: 400 }
      )
    }

    // 2. Validate Table Number for Dine-In
    const isDineIn = orderType === 'dine_in'
    const resolvedTableNumber = tableNumber !== undefined && tableNumber !== null && String(tableNumber).trim() !== ''
      ? String(tableNumber).trim()
      : null

    if (isDineIn && !resolvedTableNumber && !providedTableId) {
      return NextResponse.json(
        { success: false, message: 'Table number is required for dine-in orders' },
        { status: 400 }
      )
    }

    // 3. Resolve Branch, Restaurant, and Organization context (with fast memory cache)
    let branch: any = getCachedBranchMeta(branchId)
    if (!branch) {
      if (branchId) {
        branch = await prisma.branch.findUnique({
          where: { id: branchId },
          select: { id: true, organizationId: true, restaurantId: true, name: true },
        })
      }
      if (!branch) {
        branch = await prisma.branch.findFirst({
          orderBy: { isPrimary: 'desc' },
          select: { id: true, organizationId: true, restaurantId: true, name: true },
        })
      }
      if (!branch) {
        const restaurant = await prisma.restaurant.findFirst()
        if (!restaurant) {
          return NextResponse.json(
            { success: false, message: 'No restaurant or branch configured in database' },
            { status: 500 }
          )
        }
        branch = await prisma.branch.create({
          data: {
            restaurantId: restaurant.id,
            organizationId: restaurant.organizationId,
            name: 'Main Branch',
            address: 'Main Dining Hall',
            isPrimary: true,
          },
          select: { id: true, organizationId: true, restaurantId: true, name: true },
        })
      }
      if (branch && !branchId) {
        setCachedBranchMeta(branch)
      }
    }

    const organizationId = branch.organizationId
    const restaurantId = branch.restaurantId
    branchId = branch.id

    // 4. Resolve Table & 5. Fetch Menu Items concurrently (with high-speed memory caching)
    let tableId = providedTableId || null
    let finalTableNumber = resolvedTableNumber || '1'

    let tablePromise: Promise<any> | null = null

    if (isDineIn) {
      if (tableId && !resolvedTableNumber) {
        const cached = inMemoryTableCache.get(`${branchId}:id:${tableId}`)
        if (cached) {
          finalTableNumber = cached.tableNumber
        } else {
          tablePromise = prisma.restaurantTable.findUnique({
            where: { id: tableId },
            select: { id: true, tableNumber: true },
          })
        }
      } else if (resolvedTableNumber && !tableId) {
        const tableCacheKey = `${branchId}:${resolvedTableNumber}`
        const cached = inMemoryTableCache.get(tableCacheKey)
        if (cached) {
          tableId = cached.id
          finalTableNumber = cached.tableNumber
        } else {
          tablePromise = prisma.restaurantTable.findFirst({
            where: {
              branchId,
              tableNumber: resolvedTableNumber,
              deletedAt: null,
            },
            select: { id: true, tableNumber: true },
          })
        }
      }
    }

    // Check memory cache for menu items
    const itemIds = items.map((i: any) => i.menuItemId).filter(Boolean)
    const nowMs = Date.now()
    const uncachedItemIds = itemIds.filter((id: string) => {
      const cached = inMemoryMenuItemCache.get(id)
      return !cached || nowMs - cached.cachedAt > MENU_ITEM_CACHE_TTL
    })

    const menuItemsPromise = uncachedItemIds.length > 0
      ? prisma.menuItem.findMany({
          where: {
            id: { in: uncachedItemIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            basePrice: true,
            isAvailable: true,
            category: { select: { name: true } },
          },
        })
      : Promise.resolve([])

    // Run table lookup & missing menu items lookup in parallel!
    const [resolvedTableData, freshMenuItems] = await Promise.all([
      tablePromise || Promise.resolve(null),
      menuItemsPromise,
    ])

    // Update in-memory menu items cache
    if (freshMenuItems && Array.isArray(freshMenuItems)) {
      for (const m of freshMenuItems) {
        inMemoryMenuItemCache.set(m.id, {
          id: m.id,
          name: m.name,
          basePrice: Number(m.basePrice),
          isAvailable: m.isAvailable !== false,
          categoryName: m.category?.name,
          cachedAt: nowMs,
        })
      }
    }

    // Update in-memory table cache or create table if missing
    if (resolvedTableData) {
      tableId = resolvedTableData.id
      finalTableNumber = resolvedTableData.tableNumber
      inMemoryTableCache.set(`${branchId}:${finalTableNumber}`, resolvedTableData)
      inMemoryTableCache.set(`${branchId}:id:${tableId}`, resolvedTableData)
    } else if (isDineIn && resolvedTableNumber && !tableId) {
      try {
        const newTable = await prisma.restaurantTable.create({
          data: {
            branchId,
            restaurantId,
            organizationId,
            tableNumber: resolvedTableNumber,
            capacity: 4,
            section: 'dining',
            status: 'occupied',
          },
          select: { id: true, tableNumber: true },
        })
        tableId = newTable.id
        finalTableNumber = newTable.tableNumber
        inMemoryTableCache.set(`${branchId}:${finalTableNumber}`, newTable)
        inMemoryTableCache.set(`${branchId}:id:${tableId}`, newTable)
      } catch (tblErr) {
        console.warn('Could not create table record:', tblErr)
      }
    }

    // Mark table occupied non-blockingly
    if (tableId) {
      prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'occupied' },
      }).catch(() => {})
    }

    // Check item availability
    for (const reqItem of items) {
      const cached = inMemoryMenuItemCache.get(reqItem.menuItemId)
      if (cached && cached.isAvailable === false) {
        return NextResponse.json(
          {
            success: false,
            message: `"${cached.name}" is currently out of stock and cannot be ordered.`,
          },
          { status: 400 }
        )
      }
    }

    // 6. Build Order Items data & calculate totals
    let calculatedSubtotal = 0
    const orderItemsCreateData: any[] = []

    for (const it of items) {
      const dbItem = inMemoryMenuItemCache.get(it.menuItemId)
      const qty = Math.max(1, parseInt(it.quantity || '1') || 1)
      const name = it.name || dbItem?.name || 'Menu Item'
      const clientPrice = parseFloat(it.price || 0) || 0
      const dbPrice = dbItem ? Number(dbItem.basePrice) : 0
      const price = clientPrice > 0 ? clientPrice : dbPrice
      const itemTotal = price * qty

      calculatedSubtotal += itemTotal

      orderItemsCreateData.push({
        organizationId,
        menuItemId: it.menuItemId,
        variantId: it.variantId || null,
        itemName: name,
        basePrice: price,
        quantity: qty,
        itemTotal,
        specialInstructions: it.specialInstructions || null,
      })
    }

    // 5% GST tax calculation
    const taxRate = 0.05
    const taxAmount = Math.round(calculatedSubtotal * taxRate * 100) / 100
    const finalTotal = Math.round((calculatedSubtotal + taxAmount) * 100) / 100

    // 7. Generate Unique Order Number
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`

    // 8. Newly placed orders must start as 'pending' so they appear in KDS 'Incoming' queue
    const finalStatus = 'pending'

    // 9. Persist Order in database
    const order = await prisma.order.create({
      data: {
        organizationId,
        branchId,
        restaurantId,
        orderNumber,
        orderType: isDineIn ? 'dine_in' : 'takeaway',
        status: finalStatus as any,
        paymentStatus: 'pending',
        tableId,
        customerId: customerId || null,
        subtotal: new Prisma.Decimal(calculatedSubtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(finalTotal),
        total: new Prisma.Decimal(finalTotal),
        notes: notes || null,
        source: body.source || 'QR_MENU',
        isLocationLocked: parsedLocked,
        vehicleNumber: parsedVehicle,
        landmarkNote: parsedLandmark,
        customerLat: parsedLat,
        customerLng: parsedLng,
        locationAccuracy: parsedAccuracy,
        locationCapturedAt: parsedCapturedAt,
        metadata: {
          tableNumber: finalTableNumber,
          customerName: body.customerName || (parsedVehicle ? `Car Guest (${parsedVehicle})` : 'Table Guest'),
          placedVia: body.source === 'POS' ? 'POS_TERMINAL' : 'QR_SELF_ORDER',
          subtotal: calculatedSubtotal,
          taxAmount,
          isLocationLocked: parsedLocked,
          vehicleNumber: parsedVehicle,
          landmarkNote: parsedLandmark,
          customerLat: parsedLat,
          customerLng: parsedLng,
          locationAccuracy: parsedAccuracy,
          locationCapturedAt: parsedCapturedAt ? parsedCapturedAt.toISOString() : null,
        },
        items: {
          create: orderItemsCreateData,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        isLocationLocked: true,
        vehicleNumber: true,
        landmarkNote: true,
        customerLat: true,
        customerLng: true,
        locationAccuracy: true,
        locationCapturedAt: true,
      },
    })

    // Invalidate dashboard stats cache, KDS cache, and live orders cache immediately
    invalidateDashboardStatsCache(branchId)
    invalidateKDSCache()
    invalidateLiveOrdersCache()

    // 10. Register immediately into KDS live queue for kitchen display
    try {
      registerActiveLiveOrder({
        id: order.orderNumber,
        fullId: order.id,
        tableNumber: parsedVehicle ? `🚗 ${parsedVehicle}` : `Table ${finalTableNumber}`,
        source: body.source === 'POS' ? 'pos' : 'qr_order',
        waiter: body.waiter || (body.source === 'POS' ? 'POS Staff' : 'QR Self-Order'),
        customerName: body.customerName || (parsedVehicle ? `Car (${parsedVehicle})` : `Guest (${finalTableNumber})`),
        status: 'pending',
        priority: 'normal',
        createdAt: order.createdAt.toISOString(),
        specialNotes: notes || undefined,
        isLocationLocked: parsedLocked,
        vehicleNumber: parsedVehicle,
        landmarkNote: parsedLandmark,
        customerLat: parsedLat,
        customerLng: parsedLng,
        locationAccuracy: parsedAccuracy,
        locationCapturedAt: parsedCapturedAt ? parsedCapturedAt.toISOString() : null,
        items: orderItemsCreateData.map((i: any) => {
          const dbItem = inMemoryMenuItemCache.get(i.menuItemId)
          return {
            id: i.menuItemId,
            name: i.itemName,
            quantity: i.quantity,
            station: getKitchenStation(
              i.itemName,
              dbItem?.categoryName
            ),
            completed: false,
          }
        }),
      })
    } catch (kdsErr) {
      console.warn('Could not register in KDS live queue:', kdsErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Order placed successfully!',
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          tableNumber: finalTableNumber,
          status: order.status,
          subtotal: calculatedSubtotal,
          taxAmount,
          totalAmount: finalTotal,
          itemsCount: orderItemsCreateData.length,
          createdAt: order.createdAt,
          isLocationLocked: order.isLocationLocked,
          vehicleNumber: order.vehicleNumber,
          landmarkNote: order.landmarkNote,
          customerLat: order.customerLat,
          customerLng: order.customerLng,
          locationAccuracy: order.locationAccuracy,
          locationCapturedAt: order.locationCapturedAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to place order. Please try again.',
      },
      { status: 500 }
    )
  }
}
