/**
 * In-Memory Real-Time Notifications Store
 * Tracks kitchen order preparation alerts, new incoming table orders, and cashier invoices
 */

export interface AppNotification {
  id: string
  type: 'order_prepared' | 'new_order' | 'bill_generated' | 'payment_received' | 'alert'
  title: string
  body: string
  time: string
  read: boolean
  createdAt: string
  metadata?: {
    orderNumber?: string
    tableNumber?: string
    billNumber?: string
    amount?: number
  }
}

// Initial live notifications (starts empty; receives real-time kitchen and order alerts)
let notificationsStore: AppNotification[] = []

export function getNotificationsList(limit: number = 20): AppNotification[] {
  return notificationsStore.slice(0, limit)
}

export function addNotification(
  notif: Omit<AppNotification, 'id' | 'createdAt' | 'time' | 'read'>
): AppNotification {
  const newNotif: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    read: false,
    time: 'Just now',
    createdAt: new Date().toISOString(),
  }
  notificationsStore.unshift(newNotif)
  // Cap at 50 notifications
  if (notificationsStore.length > 50) {
    notificationsStore = notificationsStore.slice(0, 50)
  }
  return newNotif
}

export function markAsRead(id?: string): void {
  if (!id || id === 'all') {
    notificationsStore = notificationsStore.map((n) => ({ ...n, read: true }))
  } else {
    notificationsStore = notificationsStore.map((n) => (n.id === id ? { ...n, read: true } : n))
  }
}

export function clearAllNotifications(): void {
  notificationsStore = []
}

