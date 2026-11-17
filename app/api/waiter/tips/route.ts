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
        organizationId: true,
      },
    })

    const waiterDisplayName =
      waiterUser?.name ||
      `${waiterUser?.firstName || ''} ${waiterUser?.lastName || ''}`.trim() ||
      'Staff Member'

    // Tip ledger is strictly for staff with role WAITER (e.g. Chefs and other staff do not see waiter tips)
    const userRole = String(waiterUser?.role || '').toLowerCase()
    if (userRole && userRole !== 'waiter') {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Tip ledger is only applicable for Waiter staff',
      })
    }

    // Auto-sync & heal orphaned tips from bills with tipAmount > 0
    try {
      const unlinkedBills = await prisma.bill.findMany({
        where: {
          tipAmount: { gt: 0 },
          OR: [
            { waiterId: targetWaiterId },
            {
              waiterId: null,
              ...(waiterUser?.organizationId ? { organizationId: waiterUser.organizationId } : {}),
            },
          ],
          tip: null,
        },
        take: 25,
      })

      if (unlinkedBills.length > 0) {
        for (const b of unlinkedBills) {
          const isPaidBill = b.status === 'PAID' || b.paymentStatus === 'completed'
          const tipAmt = Number(b.tipAmount || 0)
          if (tipAmt <= 0) continue

          await prisma.$transaction([
            prisma.bill.update({
              where: { id: b.id },
              data: { waiterId: targetWaiterId },
            }),
            prisma.tip.upsert({
              where: { billId: b.id },
              create: {
                billId: b.id,
                waiterId: targetWaiterId,
                restaurantId: b.restaurantId,
                branchId: b.branchId,
                organizationId: b.organizationId || waiterUser?.organizationId || '',
                amount: tipAmt,
                status: isPaidBill ? 'SETTLED' : 'PENDING',
              },
              update: {
                waiterId: targetWaiterId,
                amount: tipAmt,
                status: isPaidBill ? 'SETTLED' : 'PENDING',
              },
            }),
          ]).catch(() => {})
        }
      }
    } catch (syncErr) {
      console.warn('Orphaned tip auto-sync skipped:', syncErr)
    }

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

    // Start of today in IST (UTC+5:30) and local timezone
    const now = new Date()
    const istOffsetMs = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffsetMs)
    const istMidnight = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()))
    const startOfTodayUtc = new Date(istMidnight.getTime() - istOffsetMs)
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const effectiveTodayStart = startOfTodayUtc < localMidnight ? startOfTodayUtc : localMidnight

    let todayTipsTotal = 0
    let allTimeTipsTotal = 0
    let pendingTipsTotal = 0

    const formattedTips = tips.map((t) => {
      const amt = Number(t.amount || 0)
      const tipDate = new Date(t.createdAt)

      if (t.status === 'SETTLED') {
        allTimeTipsTotal += amt
        if (tipDate >= effectiveTodayStart) {
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

