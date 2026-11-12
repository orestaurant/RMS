import { NextRequest, NextResponse } from 'next/server'
import {
  getCommunicationLedger,
  logCommunication,
  triggerOrderPreparedAlert,
  generateWhatsAppBillLink,
} from '@/lib/communication-ledger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')
    const event = searchParams.get('event')

    let logs = getCommunicationLedger()

    if (channel && channel !== 'all') {
      logs = logs.filter((l) => l.channel === channel)
    }

    if (event && event !== 'all') {
      logs = logs.filter((l) => l.event === event)
    }

    const counts = {
      total: logs.length,
      whatsapp: logs.filter((l) => l.channel === 'whatsapp').length,
      sms: logs.filter((l) => l.channel === 'sms').length,
      call: logs.filter((l) => l.channel === 'call').length,
    }

    return NextResponse.json({
      success: true,
      data: {
        logs,
        counts,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch communication ledger' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, orderNumber, tableNumber, customerName, customerPhone, billNumber, totalAmount } = body

    if (action === 'order_prepared') {
      const result = triggerOrderPreparedAlert({
        orderNumber: orderNumber || 'ORD-LIVE',
        tableNumber: tableNumber || 'Table 1',
        customerName,
        customerPhone,
      })
      return NextResponse.json({
        success: true,
        message: 'Order prepared WhatsApp and SMS alerts logged & dispatched',
        data: result,
      })
    }

    if (action === 'whatsapp_bill_link') {
      const link = generateWhatsAppBillLink(
        customerPhone || '',
        billNumber || 'BILL-001',
        totalAmount || 0,
        tableNumber || 'Table'
      )
      return NextResponse.json({
        success: true,
        data: { link },
      })
    }

    // Default custom log
    const entry = logCommunication(body)
    return NextResponse.json({
      success: true,
      data: entry,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to process communication entry' },
      { status: 500 }
    )
  }
}

