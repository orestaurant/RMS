/**
 * Orders Types and DTOs
 */

export interface OrderItem {
  name: string
  quantity: number
}

export interface LiveOrder {
  id: string
  orderNumber: string
  tableNumber: string | null
  status: string
  items: OrderItem[]
  totalAmount: number
  createdAt: Date
  waiterName: string | null
}

export interface LiveOrdersResponse {
  activeCount: number
  orders: LiveOrder[]
}

export type OrderStatus =
  | 'pending'
  | 'awaiting_waiter_approval'
  | 'confirmed'
  | 'sent_to_kitchen'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'cancelled'
  | 'refunded'
