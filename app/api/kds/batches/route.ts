/**
 * API Route: /api/kds/batches
 * Real-time 20-Second Live Order Add-on & Fair Batch Distribution API
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getLiveBatches,
  startLiveBatch,
  addAddonToBatch,
  markBatchReady,
  markBatchServed,
} from '@/lib/live-batch-manager'
import { getCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const data = getLiveBatches()
    return NextResponse.json(
      {
        success: true,
        serverTime: data.serverTime,
        batches: data.batches,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    console.error('GET /api/kds/batches error:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch live batches' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required (start, addon, ready, served)' },
        { status: 400 }
      )
    }

    // 1. Chef triggers start preparing on an order/dish -> 20s lock window starts
    if (action === 'start') {
      const {
        ticketId,
        orderId,
        orderNumber,
        tableNumber,
        customerName,
        customerId,
        dishName,
        menuItemId,
        quantity,
        station,
        cuisine,
      } = body

      if (!ticketId || !dishName) {
        return NextResponse.json(
          { success: false, message: 'ticketId and dishName are required' },
          { status: 400 }
        )
      }

      const batch = await startLiveBatch({
        ticketId,
        orderId,
        orderNumber: orderNumber || ticketId,
        tableNumber: tableNumber || '1',
        customerName,
        customerId,
        dishName,
        menuItemId,
        quantity: quantity || 1,
        station,
        cuisine,
      })

      return NextResponse.json({
        success: true,
        message: `20-second live add-on window opened for ${batch.dishName}!`,
        batch,
        serverTime: Date.now(),
      })
    }

    // 2. Customer One-Tap +1 Add-on within 20s window
    if (action === 'addon') {
      const { batchId, dishName, tableNumber, customerName, quantity } = body

      // Try reading customer session if available
      const customerSession = await getCustomerSession(request)
      const resolvedCustomerId = customerSession?.customerId || body.customerId || undefined
      const resolvedCustomerName = customerName || customerSession?.name || 'Customer'

      const result = await addAddonToBatch({
        batchId,
        dishName,
        tableNumber: tableNumber || '1',
        customerName: resolvedCustomerName,
        customerId: resolvedCustomerId,
        quantity: quantity || 1,
      })

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            reason: result.reason,
            message: result.message,
            serverTime: Date.now(),
          },
          { status: result.reason === 'LOCKED' ? 409 : 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        batch: result.batch,
        allocation: result.allocation,
        newOrderNumber: result.newOrderNumber,
        serverTime: Date.now(),
      })
    }

    // 3. Chef finishes cooking and marks batch READY -> triggers Fair Batch Distribution
    if (action === 'ready') {
      const { batchId } = body
      if (!batchId) {
        return NextResponse.json(
          { success: false, message: 'batchId is required' },
          { status: 400 }
        )
      }

      const result = await markBatchReady(batchId)
      return NextResponse.json({
        success: result.success,
        message: result.message,
        batch: result.batch,
        distributions: result.distributions,
        serverTime: Date.now(),
      })
    }

    // 4. Waiter serves all allocated dishes
    if (action === 'served') {
      const { batchId } = body
      if (!batchId) {
        return NextResponse.json(
          { success: false, message: 'batchId is required' },
          { status: 400 }
        )
      }

      const result = await markBatchServed(batchId)
      return NextResponse.json({
        success: result.success,
        message: result.message,
        serverTime: Date.now(),
      })
    }

    return NextResponse.json(
      { success: false, message: `Unknown action: ${action}` },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('POST /api/kds/batches error:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Batch action failed' },
      { status: 500 }
    )
  }
}
