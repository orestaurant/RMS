import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/api/utils/responses'
import {
  getKitchenStation,
  getItemCuisine,
  registerActiveLiveOrder,
  getRealTimeLiveOrders,
} from '@/lib/kds-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationFilter = searchParams.get('station')
    const statusFilter = searchParams.get('status') || 'all'

    let formattedTickets: any[] = []

    // 1. Fetch real active orders from PostgreSQL via Prisma
    try {
      const liveStatuses: any[] = [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'PENDING',
        'PREPARING',
      ]

      const dbOrders = await prisma.order.findMany({
        where: {
          status: { in: liveStatuses as any },
          deletedAt: null,
        },
        include: {
          table: true,
          items: {
            include: {
              menuItem: {
                include: {
                  category: true,
                },
              },
            },
          },
          createdBy: true,
          customer: true,
          kitchenTickets: {
            include: {
              items: true,
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
        formattedTickets = dbOrders.map((order) => {
          const rawStatus = (order.status || 'pending').toLowerCase()
          let normalizedStatus: 'pending' | 'accepted' | 'cooking' | 'ready' | 'served' = 'pending'
          if (rawStatus === 'confirmed') normalizedStatus = 'accepted'
          else if (rawStatus === 'preparing') normalizedStatus = 'cooking'
          else if (rawStatus === 'ready') normalizedStatus = 'ready'
          else if (rawStatus === 'served' || rawStatus === 'completed') normalizedStatus = 'served'
          else normalizedStatus = 'pending'

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
            tableNumber: order.table?.tableNumber || 'Takeaway',
            source: order.source?.toLowerCase() || 'dine_in',
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
      }
    } catch (dbErr) {
      console.warn('PostgreSQL orders lookup fallback:', (dbErr as any)?.message)
    }

    // 2. If PostgreSQL had no orders or is disconnected, check real-time session orders
    const fallbackOrders = getRealTimeLiveOrders()
    if (formattedTickets.length === 0 && fallbackOrders.length > 0) {
      formattedTickets = fallbackOrders
    }

    // Calculate dynamic batch cooking aggregation (PRD: "Batch cooking groups same dishes across orders")
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

    // Filter tickets if station or status specified
    let filteredTickets = formattedTickets
    if (statusFilter !== 'all') {
      filteredTickets = filteredTickets.filter((t) => t.status === statusFilter)
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
      })
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
      tableNumber: body.tableNumber || 'Table 1',
      source: body.source || 'qr_order',
      waiter: body.waiter || 'Staff',
      customerName: body.customerName || 'Customer',
      status: body.status || 'pending',
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
