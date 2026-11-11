/**
 * Notifications Types and DTOs
 */

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  time: string
  read: boolean
  createdAt: Date
}

export interface NotificationsResponse {
  notifications: Notification[]
}
