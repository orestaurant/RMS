/**
 * POST /api/orders
 * Create a new order from POS or QR ordering
 * 
 * Request body:
 * {
 *   branchId: string,
 *   tableId?: string,
 *   customerId?: string,
 *   orderType: 'dine_in' | 'takeaway' | 'delivery',
 *   items: [
 *     {
 *       menuItemId: string,
 *       variantId?: string,
 *       quantity: number,
 *       modifiers?: [{ modifierId, modifierName, price }],
 *       specialInstructions?: string
 *     }
 *   ],
 *   discount?: number,
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMockAuthContext } from '@/api/middleware/auth'
import { extractTenantContext } from '@/api/middleware/tenant'
import { successResponse, errorResponse } from '@/api/utils/responses'
import { ValidationError } from '@/api/utils/errors'
import { createPOSOrder } from '@/api/services/pos.orders.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      branchId,
      tableId,
      customerId,
      orderType,
      items,
      discount,
      notes,
    } = body

    // Validate required fields
    if (!branchId) throw new ValidationError('branchId is required')
    if (!orderType) throw new ValidationError('orderType is required')
    if (!items || items.length === 0) throw new ValidationError('items is required')

    const authContext = getMockAuthContext()
    const tenantContext = extractTenantContext(authContext)

    // Create order
    const order = await createPOSOrder({
      branchId,
      organizationId: tenantContext.organizationId,
      restaurantId: tenantContext.restaurantId,
      userId: authContext.userId,
      orderType: orderType as any,
      tableId,
      customerId,
      items,
      discount,
      notes,
    })

    return NextResponse.json(
      successResponse({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        items: order.items.length,
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating order:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        errorResponse(error.message, error.code),
        { status: 400 }
      )
    }

    return NextResponse.json(
      errorResponse(error.message || 'Failed to create order', 'ORDER_CREATE_ERROR'),
      { status: 500 }
    )
  }
}
