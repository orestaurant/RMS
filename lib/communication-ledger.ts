/**
 * Communication Ledger & Notification Dispatcher
 * Tracks WhatsApp, SMS, and Call logs, plus order preparation alerts
 */

export interface CommunicationLog {
  id: string
  recipientName: string
  recipientPhone: string
  channel: 'whatsapp' | 'sms' | 'call'
  event: 'order_prepared' | 'bill_invoice' | 'order_confirmed' | 'table_reservation' | 'payment_receipt'
  orderNumber?: string
  tableNumber?: string
  message: string
  status: 'delivered' | 'sent' | 'connected'
  cost?: number
  timestamp: string
}

let communicationLedger: CommunicationLog[] = [
  {
    id: 'COMM-1001',
    recipientName: 'Rahul Verma',
    recipientPhone: '+91 98765 43210',
    channel: 'whatsapp',
    event: 'bill_invoice',
    orderNumber: 'ORD-20261112-4821',
    tableNumber: 'Table 4',
    message: 'Dear Rahul, thank you for dining at Spice Garden! Your e-invoice #BILL-20261112-0041 for ₹1,850 is ready. Scan UPI to pay: https://spicegarden.com/bill/4821',
    status: 'delivered',
    cost: 0.15,
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'COMM-1002',
    recipientName: 'Ananya Sen',
    recipientPhone: '+91 91234 56789',
    channel: 'sms',
    event: 'order_prepared',
    orderNumber: 'ORD-20261112-9102',
    tableNumber: 'Table 2',
    message: 'Spice Garden: Your food order #ORD-20261112-9102 is prepared fresh and being served to Table 2. Bon Appétit!',
    status: 'delivered',
    cost: 0.12,
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'COMM-1003',
    recipientName: 'Vikram Malhotra',
    recipientPhone: '+91 99887 76655',
    channel: 'call',
    event: 'table_reservation',
    tableNumber: 'VIP-1',
    message: 'Automated Table Reservation Confirmation Call: Table reserved for 4 guests tonight at 8:30 PM.',
    status: 'connected',
    cost: 0.45,
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'COMM-1004',
    recipientName: 'Priya Sharma',
    recipientPhone: '+91 98220 11223',
    channel: 'whatsapp',
    event: 'order_prepared',
    orderNumber: 'ORD-20261112-3310',
    tableNumber: 'Table 8',
    message: 'Hello Priya, your order items (Butter Chicken, Garlic Naan) are prepared and leaving kitchen for Table 8!',
    status: 'delivered',
    cost: 0.15,
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
  },
  {
    id: 'COMM-1005',
    recipientName: 'Sanjay Kapoor',
    recipientPhone: '+91 97654 32109',
    channel: 'sms',
    event: 'payment_receipt',
    orderNumber: 'ORD-20261112-1144',
    tableNumber: 'Table 1',
    message: 'Spice Garden: Payment of ₹2,420 received via UPI QR. Invoice #BILL-20261112-0038 generated. Thank you!',
    status: 'delivered',
    cost: 0.12,
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
]

export function logCommunication(entry: Omit<CommunicationLog, 'id' | 'timestamp'>): CommunicationLog {
  const newEntry: CommunicationLog = {
    ...entry,
    id: `COMM-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toISOString(),
  }
  communicationLedger.unshift(newEntry)
  return newEntry
}

export function getCommunicationLedger(): CommunicationLog[] {
  return communicationLedger
}

/**
 * Trigger order prepared notification for waitstaff and customer
 */
export function triggerOrderPreparedAlert(order: {
  orderNumber: string
  tableNumber: string
  customerName?: string
  customerPhone?: string
}) {
  const customerName = order.customerName || `Guest (${order.tableNumber})`
  const customerPhone = order.customerPhone || '+91 98765 00000'

  // Log WhatsApp alert
  const wa = logCommunication({
    recipientName: customerName,
    recipientPhone: customerPhone,
    channel: 'whatsapp',
    event: 'order_prepared',
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber,
    message: `Dear ${customerName}, your delicious food for ${order.tableNumber} (Order #${order.orderNumber}) is freshly prepared and is being served to your table right now! Enjoy your meal.`,
    status: 'delivered',
    cost: 0.15,
  })

  // Log SMS alert
  const sms = logCommunication({
    recipientName: customerName,
    recipientPhone: customerPhone,
    channel: 'sms',
    event: 'order_prepared',
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber,
    message: `Spice Garden: Order #${order.orderNumber} is PREPARED and ready to serve at ${order.tableNumber}.`,
    status: 'delivered',
    cost: 0.12,
  })

  return { wa, sms }
}

/**
 * Generate a ready-to-share WhatsApp link for instant bill dispatch
 */
export function generateWhatsAppBillLink(
  phone: string,
  billNumber: string,
  totalAmount: number,
  tableNumber: string
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const message = encodeURIComponent(
    `🧾 *Spice Garden Restaurant - E-Bill*\n\n` +
    `Invoice: *${billNumber}*\n` +
    `Table: *${tableNumber}*\n` +
    `Grand Total: *₹${totalAmount.toFixed(2)}*\n\n` +
    `Pay instantly via UPI QR or at the counter.\n` +
    `Thank you for dining with us! Visit again. 🍽️`
  )
  return `https://wa.me/${cleanPhone ? (cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`) : ''}?text=${message}`
}

