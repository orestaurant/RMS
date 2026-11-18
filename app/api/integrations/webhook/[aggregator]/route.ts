/**
 * POST /api/integrations/webhook/[aggregator]
 * Real-time order synchronization webhook for Zomato, Swiggy, Uber Eats, and ONDC.
 * Uses restaurant's registered credentials to validate and immediately ingest delivery orders into KDS & POS.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { invalidateKDSCache, invalidateLiveOrdersCache } from '@/lib/kds-utils'
import { AggregatorEnum } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ aggregator: string }> }
) {
  const startTime = Date.now()
  try {
    const { aggregator } = await params
    const normAggregator = aggregator.toLowerCase() as AggregatorEnum
    const restaurantId = request.nextUrl.searchParams.get('restaurantId')

    const payload = await request.json().catch(() => ({}))

    // If no restaurantId in query param, attempt to resolve from payload metadata
    const targetRestaurantId =
      restaurantId ||
      payload?.restaurantId ||
      payload?.restaurant_id ||
      payload?.outlet_id ||
      payload?.merchant_id

    if (!targetRestaurantId) {
      return NextResponse.json({ success: false, message: 'Missing restaurant identifier' }, { status: 400 })
    }

    // Verify client integration configuration
    const integration = await prisma.aggregatorIntegration.findFirst({
      where: {
        OR: [
          { restaurantId: targetRestaurantId },
          { restaurantIdOnAggregator: String(targetRestaurantId) },
        ],
        aggregatorType: normAggregator,
        isActive: true,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            organizationId: true,
            branches: { select: { id: true }, take: 1 },
          },
        },
      },
    })

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          message: `No active ${normAggregator.toUpperCase()} integration found for restaurant ${targetRestaurantId}. Please configure API keys in Admin Dashboard.`,
        },
        { status: 404 }
      )
    }

    const restaurant = integration.restaurant
    const branchId = restaurant.branches[0]?.id

    if (!branchId) {
      return NextResponse.json({ success: false, message: 'No branch found for restaurant' }, { status: 400 })
    }

    // Parse Order Details from Zomato/Swiggy standard payload format
    const externalOrderId =
      payload.orderId ||
      payload.order_id ||
      payload.id ||
      `EXT-${normAggregator.toUpperCase()}-${Date.now().toString().slice(-6)}`
    const customerName = payload.customer?.name || payload.customer_name || 'Online Guest'
    const customerPhone = payload.customer?.phone || payload.customer_phone || ''
    const deliveryAddress = payload.delivery_address || payload.deliveryAddress || 'Online Delivery'
    const items = Array.isArray(payload.items) ? payload.items : []
    const totalAmount = Number(payload.order_total || payload.orderTotal || payload.total || 0)
    const subtotal = Number(payload.subtotal || totalAmount * 0.95)
    const taxAmount = Number(payload.tax || totalAmount - subtotal)

    const orderNumber = `${normAggregator.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`

    // Create Order & AggregatorOrder in database
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Create Internal Order
      const newOrder = await tx.order.create({
        data: {
          restaurantId: restaurant.id,
          organizationId: restaurant.organizationId,
          branchId,
          orderNumber,
          source: normAggregator.toUpperCase(),
          orderType: 'takeaway',
          status: 'accepted',
          subtotal,
          taxAmount,
          totalAmount,
          total: totalAmount,
          notes: `External: ${externalOrderId} | ${payload.instructions || ''}`.trim(),
          deliveryInstructions: deliveryAddress,
          createdAt: new Date(),
        },
      })

      // 2. Create AggregatorOrder link
      const aggOrder = await tx.aggregatorOrder.create({
        data: {
          orderId: newOrder.id,
          restaurantId: restaurant.id,
          organizationId: restaurant.organizationId,
          branchId,
          aggregatorType: normAggregator,
          externalOrderId: String(externalOrderId),
          customerName,
          customerPhone,
          deliveryAddress,
          orderTotal: totalAmount,
          orderStatus: 'accepted',
          syncStatus: 'synced',
          rawPayload: payload,
          lastSyncAt: new Date(),
        },
      })

      // 3. Create items if present
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            organizationId: restaurant.organizationId,
            menuItemId: item.menuItemId || item.id || '00000000-0000-0000-0000-000000000000',
            itemName: item.name || item.itemName || 'Aggregator Item',
            basePrice: Number(item.price || item.unit_price || 0),
            quantity: Number(item.quantity || 1),
            itemTotal: Number(item.price || 0) * Number(item.quantity || 1),
            specialInstructions: item.notes || item.customizations || null,
            status: 'pending',
          },
        })
      }

      return { newOrder, aggOrder }
    })

    // Real-time synchronization: Invalidate KDS Cache and live orders cache
    invalidateKDSCache()
    invalidateLiveOrdersCache()

    // Update integration last sync timestamp
    await prisma.aggregatorIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date(), syncError: null },
    })

    return NextResponse.json({
      success: true,
      message: `Order ${orderNumber} from ${normAggregator.toUpperCase()} successfully ingested and pushed to KDS`,
      data: {
        orderId: createdOrder.newOrder.id,
        orderNumber,
        externalOrderId,
        totalAmount,
        responseTimeMs: Date.now() - startTime,
      },
    })
  } catch (error: any) {
    console.error('Error processing aggregator webhook:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Webhook processing failed' }, { status: 500 })
  }
}
