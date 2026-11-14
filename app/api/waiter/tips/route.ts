/**
 * GET /api/waiter/tips
 * Fetches tip analytics and itemized history for the logged-in waiter (or queried waiterId)
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryWaiterId = searchParams.get('waiterId')

    let targetWaiterId = queryWaiterId

    // If no waiterId in query, attempt to read from session token
    if (!targetWaiterId) {
      const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
      if (sessionToken) {
        const payload = await verifyJWT(sessionToken)
        if (payload?.userId) {
          targetWaiterId = payload.userId
        }
      }
    }

    // If still no waiterId, find the first active user with role WAITER
    if (!targetWaiterId) {
      const firstWaiter = await prisma.user.findFirst({
        where: {
          role: { in: ['waiter', 'WAITER'] },
          status: 'active',
        },
      })
      if (firstWaiter) {
        targetWaiterId = firstWaiter.id
      }
    }

    if (!targetWaiterId) {
      return NextResponse.json({
        success: true,
        data: {
          waiter: null,
          todayTipsTotal: 0,
          allTimeTipsTotal: 0,
          pendingTipsTotal: 0,
          tipsCount: 0,
          recentTips: [],
        },
      })
    }

    // Fetch waiter details
    const waiterUser = await prisma.user.findUnique({
      where: { id: targetWaiterId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
      },
    })

    const waiterDisplayName =
      waiterUser?.name ||
      `${waiterUser?.firstName || ''} ${waiterUser?.lastName || ''}`.trim() ||
      'Staff Member'

    // Fetch tips records for this waiter
    const tips = await prisma.tip.findMany({
      where: {
        waiterId: targetWaiterId,
      },
      include: {
        bill: {
          include: {
            table: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Start of today in UTC / local
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    let todayTipsTotal = 0
    let allTimeTipsTotal = 0
    let pendingTipsTotal = 0

    const formattedTips = tips.map((t) => {
      const amt = Number(t.amount || 0)
      const tipDate = new Date(t.createdAt)

      if (t.status === 'SETTLED') {
        allTimeTipsTotal += amt
        if (tipDate >= startOfToday) {
          todayTipsTotal += amt
        }
      } else {
        pendingTipsTotal += amt
      }

      return {
        id: t.id,
        amount: amt,
        status: t.status, // 'PENDING' | 'SETTLED'
        billNumber: t.bill?.billNumber || 'INV-000',
        tableNumber: t.bill?.table?.tableNumber || 'Table',
        time: t.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        waiter: {
          id: targetWaiterId,
          name: waiterDisplayName,
          phone: waiterUser?.phone || '',
        },
        todayTipsTotal: Math.round(todayTipsTotal * 100) / 100,
        allTimeTipsTotal: Math.round(allTimeTipsTotal * 100) / 100,
        pendingTipsTotal: Math.round(pendingTipsTotal * 100) / 100,
        tipsCount: tips.length,
        recentTips: formattedTips,
      },
    })
  } catch (error: any) {
    console.error('Error in /api/waiter/tips:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch waiter tips' },
      { status: 500 }
    )
  }
}

