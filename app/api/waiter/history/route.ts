/**
 * GET /api/waiter/history
 * Date-filtered history for Waiter Portal:
 * - Customer History (order history per guest)
 * - Booking History (reservations & bookings)
 * - Table History (table settlements & turnover)
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'today' // 'today' | 'yesterday' | 'week' | 'custom'
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')
    const search = searchParams.get('search')?.toLowerCase().trim() || ''

    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === 'yesterday') {
      startDate.setDate(now.getDate() - 1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(now.getDate() - 1)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === 'custom' && customStart) {
      startDate = new Date(customStart)
      startDate.setHours(0, 0, 0, 0)
      endDate = customEnd ? new Date(customEnd) : new Date()
      endDate.setHours(23, 59, 59, 999)
    } else {
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    }

    // 1. Fetch Customer Order History
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        items: true,
        customer: true,
        table: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const customerHistory = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.firstName || (o.metadata as any)?.customerName || 'Walk-In Guest',
      customerPhone: o.customer?.phone || (o.metadata as any)?.customerPhone || '—',
      tableNumber: o.table?.tableNumber || (o.metadata as any)?.tableNumber || 'Takeaway',
      totalAmount: Number(o.totalAmount || 0),
      status: o.status,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      itemsSummary: o.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', '),
      createdAt: o.createdAt.toISOString(),
    })).filter((c) =>
      !search ||
      c.customerName.toLowerCase().includes(search) ||
      c.customerPhone.includes(search) ||
      c.tableNumber.toLowerCase().includes(search)
    )

    // 2. Fetch Booking / Reservation History
    const reservations = await prisma.reservation.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        table: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const bookingHistory = reservations.map((r) => ({
      id: r.id,
      guestName: r.guestName,
      guestPhone: r.guestPhone,
      guestCount: r.numberOfGuests,
      tableNumber: r.table?.tableNumber || 'Assigned on arrival',
      reservationTime: r.reservationTime.toISOString(),
      status: r.status,
      notes: r.notes || '',
      createdAt: r.createdAt.toISOString(),
    })).filter((b) =>
      !search ||
      b.guestName.toLowerCase().includes(search) ||
      b.guestPhone.includes(search)
    )

    // 3. Fetch Table Settlements / Billing History
    const bills = await prisma.bill.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        table: true,
        waiter: { select: { name: true, firstName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const tableHistory = bills.map((b) => ({
      id: b.id,
      billNumber: b.billNumber,
      tableNumber: b.table?.tableNumber || 'Table',
      waiterName: b.waiter?.name || b.waiter?.firstName || 'Assigned Waiter',
      grandTotal: Number(b.grandTotal || 0),
      paymentMethod: b.paymentMethod || 'CASH',
      status: b.status,
      paidAt: b.paidAt ? b.paidAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    })).filter((t) =>
      !search ||
      t.tableNumber.toLowerCase().includes(search) ||
      t.billNumber.toLowerCase().includes(search) ||
      t.waiterName.toLowerCase().includes(search)
    )

    return NextResponse.json({
      success: true,
      data: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        customerHistory,
        bookingHistory,
        tableHistory,
        summary: {
          totalOrders: customerHistory.length,
          totalBookings: bookingHistory.length,
          totalBills: tableHistory.length,
          totalRevenue: tableHistory.reduce((s, b) => s + b.grandTotal, 0),
        },
      },
    })
  } catch (error: any) {
    console.error('History API error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
