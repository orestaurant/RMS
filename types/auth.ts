/**
 * Auth Types and DTOs
 */

export interface AuthUser {
  id: string
  name: string
  role: string
  organizationId: string
  restaurantId: string
  branchId: string
  restaurantName: string
  branchName: string
}

export type UserRole =
  | 'super_admin'
  | 'organization_admin'
  | 'restaurant_owner'
  | 'manager'
  | 'waiter'
  | 'kitchen_staff'
  | 'cashier'
