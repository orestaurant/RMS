export type NotificationCategory =
  | 'ready'
  | 'order'
  | 'bill'
  | 'payment'
  | 'kitchen'
  | 'dj'
  | 'inventory'
  | 'reservation'
  | 'alert'

export interface NotificationLike {
  id: string | number
  type?: string
  title?: string
  body?: string
  read?: boolean
  time?: string
  createdAt?: string
  metadata?: {
    orderId?: string
    orderNumber?: string
    tableNumber?: string
    billNumber?: string
    billId?: string
    amount?: number
    customerId?: string | null
    itemsSummary?: string | null
    materialName?: string
    sku?: string
    actionUrl?: string
  }
}

export interface NotificationTarget {
  href: string
  pathname: string
  label: string
  badgeText: string
  category: NotificationCategory
  notifId?: string
  orderKey?: string
  tableNumber?: string
  billNumber?: string
  openModal?: boolean
}

function extractOrderKey(notif: NotificationLike): string | undefined {
  const meta = notif.metadata
  if (meta?.orderNumber) return String(meta.orderNumber).replace(/^#/, '').trim()
  if (meta?.orderId) return String(meta.orderId).trim()

  const text = `${notif.title || ''} ${notif.body || ''}`
  const hashMatch = text.match(/#([A-Z0-9]+-[A-Z0-9-]+|[A-Z0-9]{4,})/i)
  if (hashMatch?.[1]) return hashMatch[1].trim()

  return undefined
}

function extractBillNumber(notif: NotificationLike): string | undefined {
  const meta = notif.metadata
  if (meta?.billNumber) return String(meta.billNumber).replace(/^#/, '').trim()

  const text = `${notif.title || ''} ${notif.body || ''}`
  const invMatch = text.match(/\b(INV-[A-Z0-9-]+)\b/i)
  if (invMatch?.[1]) return invMatch[1].trim()

  return undefined
}

function extractTableNumber(notif: NotificationLike): string | undefined {
  const meta = notif.metadata
  if (meta?.tableNumber) return String(meta.tableNumber).trim()

  const text = `${notif.title || ''} ${notif.body || ''}`
  const tblMatch = text.match(/\bTable\s*([A-Za-z0-9-]+)\b/i)
  if (tblMatch?.[1]) return tblMatch[1].trim()

  return undefined
}

export function normalizeTableKey(val?: string | number | null): string {
  const s = String(val || '').trim().toLowerCase()
  if (!s) return ''
  const digits = s.replace(/[^0-9]/g, '')
  if (digits) return digits
  return s.replace(/^table\s*/i, '').trim()
}

export function resolveNotificationTarget(
  notif: NotificationLike,
  options: { isCustomer: boolean; roleUpper?: string }
): NotificationTarget {
  const roleUpper = String(options.roleUpper || '').toUpperCase().trim()
  const type = String(notif.type || 'alert').toLowerCase()
  const titleLower = String(notif.title || '').toLowerCase()
  const bodyLower = String(notif.body || '').toLowerCase()
  const combined = `${titleLower} ${bodyLower}`

  const orderKey = extractOrderKey(notif)
  const billNumber = extractBillNumber(notif)
  const tableNumber = extractTableNumber(notif)

  if (notif.metadata?.actionUrl) {
    const actionUrl = notif.metadata.actionUrl
    return {
      href: actionUrl,
      pathname: actionUrl.split('?')[0],
      label: 'Open',
      badgeText: 'Alert',
      category: 'alert',
      orderKey,
      tableNumber,
      billNumber,
    }
  }

  // Customer Portal Routing
  if (options.isCustomer) {
    if (orderKey) {
      return {
        href: `/customer-orders?receipt=${encodeURIComponent(orderKey)}`,
        pathname: '/customer-orders',
        label: 'Track Order',
        badgeText: type === 'order_prepared' ? 'Ready' : 'Order',
        category: type === 'order_prepared' ? 'ready' : 'order',
        orderKey,
        tableNumber,
        openModal: true,
      }
    }
    return {
      href: '/customer-orders',
      pathname: '/customer-orders',
      label: 'All Orders',
      badgeText: 'Update',
      category: 'order',
      tableNumber,
    }
  }

  // Vendor Portal Routing: all vendor alerts open the Vendor Restock Center
  if (roleUpper === 'VENDOR') {
    const notifId = String(notif.id)
    return {
      href: `/vendor/dashboard?notif=${encodeURIComponent(notifId)}`,
      pathname: '/vendor/dashboard',
      label: 'Open Restock',
      badgeText: 'Restock',
      category: 'inventory',
      notifId,
    }
  }

  // Staff / Chef / Waiter / Admin Routing
  // 1. DJ Song Requests
  if (combined.includes('song request') || combined.includes('now playing') || combined.includes('dj booth')) {
    const isDjOrAdmin = roleUpper === 'DJ' || roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN'
    const targetPath = isDjOrAdmin ? '/dj' : '/tables'
    return {
      href: targetPath,
      pathname: targetPath,
      label: isDjOrAdmin ? 'Open DJ Booth' : 'View Tables',
      badgeText: 'DJ Booth',
      category: 'dj',
      tableNumber,
    }
  }

  // 2. Inventory / Low Stock Alerts
  if (combined.includes('low inventory') || combined.includes('restock') || notif.metadata?.materialName) {
    const invPath = roleUpper === 'INVENTORY_MANAGER' ? '/inventory-manager/inventory' : '/inventory'
    const q = notif.metadata?.materialName || notif.metadata?.sku || ''
    return {
      href: q ? `${invPath}?search=${encodeURIComponent(q)}` : invPath,
      pathname: invPath,
      label: 'Check Stock',
      badgeText: 'Stock',
      category: 'inventory',
    }
  }

  // 3. Pending Bill Request / Party Thrower / Table Bill Settlement -> Open Bill modal on Tables
  if (
    combined.includes('pending bill requested') ||
    combined.includes('bill requested') ||
    combined.includes('party thrower')
  ) {
    const params = new URLSearchParams()
    if (tableNumber) params.set('table', tableNumber)
    params.set('openBill', '1')
    return {
      href: `/tables?${params.toString()}`,
      pathname: '/tables',
      label: 'Open Table Bill',
      badgeText: 'Bill Req',
      category: 'bill',
      tableNumber,
      billNumber,
      openModal: true,
    }
  }

  // 4. Generated Invoice / Payment Received -> Billing Management View (opens invoice)
  if (
    type === 'bill_generated' ||
    type === 'payment_received' ||
    billNumber ||
    combined.includes('invoice #') ||
    combined.includes('payment received')
  ) {
    const params = new URLSearchParams()
    if (billNumber) params.set('bill', billNumber)
    if (tableNumber) params.set('table', tableNumber)
    params.set('open', '1')
    return {
      href: `/billing?${params.toString()}`,
      pathname: '/billing',
      label: type === 'payment_received' ? 'View Payment' : 'Open Invoice',
      badgeText: type === 'payment_received' ? 'Paid' : 'Invoice',
      category: type === 'payment_received' ? 'payment' : 'bill',
      billNumber,
      tableNumber,
      openModal: true,
    }
  }

  // 5. Reservations
  if (combined.includes('reservation') || combined.includes('booked table')) {
    return {
      href: '/reservations',
      pathname: '/reservations',
      label: 'Reservations',
      badgeText: 'Booking',
      category: 'reservation',
      tableNumber,
    }
  }

  // 6. Order Prepared / New Order -> Kitchen Display for Chef, Live Orders (+ auto-open details) for Waiter/Admin
  if (type === 'order_prepared' || type === 'new_order' || orderKey || combined.includes('order #')) {
    if (roleUpper === 'CHEF') {
      const params = new URLSearchParams()
      if (orderKey) params.set('order', orderKey)
      return {
        href: `/kitchen${params.toString() ? `?${params.toString()}` : ''}`,
        pathname: '/kitchen',
        label: 'Open in KDS',
        badgeText: 'Kitchen',
        category: 'kitchen',
        orderKey,
        tableNumber,
      }
    }

    const params = new URLSearchParams()
    if (orderKey) params.set('order', orderKey)
    params.set('open', '1')
    const isPrepared = type === 'order_prepared' || combined.includes('prepared')
    return {
      href: `/orders?${params.toString()}`,
      pathname: '/orders',
      label: isPrepared ? 'Serve Order' : 'View Order',
      badgeText: isPrepared ? 'Ready' : 'New Order',
      category: isPrepared ? 'ready' : 'order',
      orderKey,
      tableNumber,
      openModal: true,
    }
  }

  // 7. Table Fallback if a tableNumber was detected
  if (tableNumber) {
    return {
      href: `/tables?table=${encodeURIComponent(tableNumber)}`,
      pathname: '/tables',
      label: 'View Table',
      badgeText: 'Table',
      category: 'alert',
      tableNumber,
    }
  }

  return {
    href: '/orders',
    pathname: '/orders',
    label: 'Live Orders',
    badgeText: 'Alert',
    category: 'alert',
  }
}
