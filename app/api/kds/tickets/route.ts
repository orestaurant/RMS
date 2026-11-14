import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import {
  getKitchenStation,
  getItemCuisine,
  registerActiveLiveOrder,
  getRealTimeLiveOrders,
  normalizeKdsStatus,
  getKDSCache,
  setKDSCache,
} from '@/lib/kds-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationFilter = searchParams.get('station')
    const statusFilter = searchParams.get('status') || 'all'

    // 1. High-speed in-memory cache check (sub-5ms response for real-time polling)
    const cached = getKDSCache(2500)
    if (cached) {
      let filteredTickets = cached.tickets
      if (statusFilter !== 'all') {
        filteredTickets = filteredTickets.filter((t: any) =>
          t.status === statusFilter || normalizeKdsStatus(t.status) === statusFilter
        )
      }
      if (stationFilter && stationFilter !== 'All') {
        filteredTickets = filteredTickets.filter((t: any) =>
          t.items.some((i: any) => i.station === stationFilter)
        )
      }

      return NextResponse.json(
        successResponse({
          tickets: filteredTickets,
          counts: cached.counts,
          batchItems: cached.batchItems,
          stations: cached.stations,
          syncedAt: cached.syncedAt,
        }),
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-KDS-Cache': 'HIT',
          },
        }
      )
    }

    let formattedTickets: any[] = []

    // 2. Fetch real active orders from PostgreSQL via Prisma using lean SELECT fields
    try {
      const activeLiveStatuses: any[] = [
        'pending',
        'PENDING',
        'accepted',
        'ACCEPTED',
        'confirmed',
        'preparing',
        'PREPARING',
        'ready',
        'READY',
      ]

      const dbOrders = await prisma.order.findMany({
        where: {
          deletedAt: null,
          status: { in: activeLiveStatuses as any },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          source: true,
          notes: true,
          createdAt: true,
          table: {
            select: {
              tableNumber: true,
              section: true,
            },
          },
          createdBy: {
            select: {
              name: true,
              firstName: true,
            },
          },
          customer: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              specialInstructions: true,
              status: true,
              menuItem: {
                select: {
                  category: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 100,
      })

      if (dbOrders && dbOrders.length > 0) {
        const now = Date.now()
        formattedTickets = dbOrders
          .map((order) => {
            const normalizedStatus = normalizeKdsStatus(order.status)
            // If already served or cancelled, exclude completely from active kitchen queue
            if (normalizedStatus === 'served') return null

            const minutesAgo = Math.max(
              0,
              Math.floor((now - new Date(order.createdAt).getTime()) / 60000)
            )

            let priority: 'normal' | 'high' | 'urgent' = 'normal'
            if (minutesAgo > 20) priority = 'urgent'
            else if (minutesAgo > 15) priority = 'high'

            const custName = order.customer
              ? (order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Customer')
              : undefined

            const ticketItems = order.items.map((i) => {
              const rawCat = (i.menuItem as any)?.category?.name
              const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
              const catName = rawCat && !isUuid(rawCat) ? rawCat : undefined
              return {
                id: i.id,
                name: i.itemName,
                quantity: i.quantity,
                notes: i.specialInstructions || undefined,
                station: getKitchenStation(i.itemName, catName),
                cuisine: getItemCuisine(i.itemName, catName),
                completed: i.status === 'ready' || i.status === 'served',
              }
            })

            const ticketCuisines = Array.from(new Set(ticketItems.map((ti) => ti.cuisine)))

            return {
              id: order.orderNumber || `ORD-${order.id.slice(0, 4)}`,
              fullId: order.id,
              orderNumber: order.orderNumber || `ORD-${order.id.slice(0, 4)}`,
              tableNumber: order.table?.tableNumber || 'Takeaway',
              tableName: order.table?.section ? `Table ${order.table.tableNumber} (${order.table.section})` : undefined,
              source: (order.source?.toLowerCase() || 'dine_in') as any,
              waiter: order.createdBy?.name || order.createdBy?.firstName || 'Staff',
              customerName: custName,
              status: normalizedStatus,
              priority,
              ticketTime: minutesAgo,
              createdAt: order.createdAt.toISOString(),
              specialNotes: order.notes || undefined,
              cuisines: ticketCuisines,
              items: ticketItems,
            }
          })
          .filter(Boolean) as any[]
      }
    } catch (dbErr) {
      console.warn('PostgreSQL orders lookup fallback:', (dbErr as any)?.message)
    }

    // 3. Merge fallback real-time live orders, strictly preventing duplicates
    const fallbackOrders = getRealTimeLiveOrders()
    for (const fo of fallbackOrders) {
      const normalizedStatus = normalizeKdsStatus(fo.status)
      if (normalizedStatus === 'served') continue

      const alreadyExists = formattedTickets.some(
        (t) =>
          (t.fullId && fo.fullId && t.fullId === fo.fullId) ||
          (t.orderNumber && fo.orderNumber && t.orderNumber === fo.orderNumber) ||
          t.id === fo.id
      )
      if (!alreadyExists) {
        formattedTickets.push({
          ...fo,
          status: normalizedStatus,
        })
      }
    }

    // 4. Calculate dynamic batch cooking aggregation
    const batchMap = new Map<
      string,
      {
        name: string
        totalQuantity: number
        station: string
        orders: Array<{ id: string; tableNumber: string | number; quantity: number }>
      }
    >()

    for (const ticket of formattedTickets) {
      if (
        ticket.status === 'accepted' ||
        ticket.status === 'cooking' ||
        ticket.status === 'pending'
      ) {
        for (const item of ticket.items) {
          if (!item.completed) {
            const existing = batchMap.get(item.name)
            if (existing) {
              existing.totalQuantity += item.quantity
              existing.orders.push({
                id: ticket.id,
                tableNumber: ticket.tableNumber,
                quantity: item.quantity,
              })
            } else {
              batchMap.set(item.name, {
                name: item.name,
                totalQuantity: item.quantity,
                station: item.station || getKitchenStation(item.name),
                orders: [
                  {
                    id: ticket.id,
                    tableNumber: ticket.tableNumber,
                    quantity: item.quantity,
                  },
                ],
              })
            }
          }
        }
      }
    }

    const batchItems = Array.from(batchMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    )

    // Compute status counts
    const counts = {
      all: formattedTickets.length,
      pending: formattedTickets.filter((t) => t.status === 'pending').length,
      accepted: formattedTickets.filter((t) => t.status === 'accepted').length,
      cooking: formattedTickets.filter((t) => t.status === 'cooking').length,
      ready: formattedTickets.filter((t) => t.status === 'ready').length,
      served: formattedTickets.filter((t) => t.status === 'served').length,
    }

    const stations = [
      'All',
      'Grill & Tandoor',
      'Main Kitchen',
      'Beverages / Bar',
      'Desserts',
    ]

    // Save to server fast cache for subsequent queries
    setKDSCache({
      tickets: formattedTickets,
      counts,
      batchItems,
      stations,
      syncedAt: new Date().toISOString(),
    })

    // Filter tickets if station or status specified
    let filteredTickets = formattedTickets
    if (statusFilter !== 'all') {
      filteredTickets = filteredTickets.filter((t) =>
        t.status === statusFilter || normalizeKdsStatus(t.status) === statusFilter
      )
    }
    if (stationFilter && stationFilter !== 'All') {
      filteredTickets = filteredTickets.filter((t) =>
        t.items.some((i: any) => i.station === stationFilter)
      )
    }

    return NextResponse.json(
      successResponse({
        tickets: filteredTickets,
        counts,
        batchItems,
        stations,
        syncedAt: new Date().toISOString(),
      }),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-KDS-Cache': 'MISS',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching KDS tickets:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to fetch KDS tickets', 'KDS_ERROR'),
      { status: 500 }
    )
  }
}

// POST: Add new customer/POS ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newTicket = {
      id: body.id || `ORD-${String(Math.floor(100 + Math.random() * 900))}`,
      fullId: body.fullId || `ord-gen-${Date.now()}`,
      orderNumber: body.orderNumber || body.id || `ORD-${String(Math.floor(100 + Math.random() * 900))}`,
      tableNumber: body.tableNumber || 'Table 1',
      source: body.source || 'qr_order',
      waiter: body.waiter || 'Staff',
      customerName: body.customerName || 'Customer',
      status: normalizeKdsStatus(body.status || 'pending'),
      priority: body.priority || 'normal',
      createdAt: body.createdAt || new Date().toISOString(),
      specialNotes: body.specialNotes || undefined,
      items: (body.items || []).map((it: any) => ({
        id: it.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: it.name || it.itemName,
        quantity: it.quantity || 1,
        notes: it.notes || it.specialInstructions,
        station: it.station || getKitchenStation(it.name || it.itemName),
        completed: it.completed || false,
      })),
    }

    registerActiveLiveOrder(newTicket)

    return NextResponse.json(successResponse(newTicket), { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      errorResponse(err.message, 'CREATE_TICKET_ERROR'),
      { status: 400 }
    )
  }
}
