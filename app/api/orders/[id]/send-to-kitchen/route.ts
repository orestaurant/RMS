/**
 * POST /api/orders/[id]/send-to-kitchen
 * Send an order to kitchen for preparation
 * Creates kitchen tickets and updates order status
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'
import { invalidateKDSCache } from '@/lib/kds-utils'

async function generateKitchenTicketNumber(
  branchId: string,
  organizationId: string
): Promise<string> {
  const today = new Date()
  const date = today.toISOString().split('T')[0].replace(/-/g, '')

  const count = await prisma.kitchenTicket.count({
    where: {
      branchId,
      organizationId,
      createdAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    },
  })

  return `KT-${date}-${String(count + 1).padStart(4, '0')}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    if (!orderId) {
      throw new ValidationError('orderId is required')
    }

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    })

    if (!order) {
      throw new ValidationError('Order not found')
    }

    // Validate order status
    if (order.status !== 'confirmed') {
      throw new ValidationError(
        `Only confirmed orders can be sent to kitchen. Current status: ${order.status}`
      )
    }

    // Get default kitchen section (or first available)
    const kitchenSection = await prisma.kitchenSection.findFirst({
      where: {
        branchId: order.branchId,
        organizationId: tenantContext.organizationId,
        deletedAt: null,
      },
    })

    if (!kitchenSection) {
      throw new ValidationError('No kitchen section found for this branch')
    }

    // Generate kitchen ticket number
    const ticketNumber = await generateKitchenTicketNumber(
      order.branchId,
      tenantContext.organizationId
    )

    // Create kitchen ticket with items
    const kitchenTicket = await prisma.kitchenTicket.create({
      data: {
        organizationId: tenantContext.organizationId,
        branchId: order.branchId,
        restaurantId: order.restaurantId,
        orderId: order.id,
        kitchenSectionId: kitchenSection.id,
        ticketNumber,
        status: 'pending',
        tableNumber: order.table ? order.table.tableNumber : 'Takeaway',
        customerName: 'POS Order',
        specialInstructions: order.notes || null,
        priority: 0,
        // Create ticket items
        items: {
          create: order.items.map((item) => ({
            orderItemId: item.id,
            organizationId: tenantContext.organizationId,
            itemName: item.itemName,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || null,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'preparing',
      },
    })

    // Invalidate KDS fast cache so Kitchen Screen instantly receives new order
    invalidateKDSCache()

    return NextResponse.json(
      successResponse({
        ticketId: kitchenTicket.id,
        ticketNumber: kitchenTicket.ticketNumber,
        itemCount: kitchenTicket.items.length,
        status: 'sent_to_kitchen',
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error sending order to kitchen:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(
        error.message || 'Failed to send order to kitchen',
        'KITCHEN_ERROR'
      ),
      { status: 500 }
    )
  }
}
