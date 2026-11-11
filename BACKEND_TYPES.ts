// Restaurant OS SaaS Platform - Backend TypeScript Types

// ========================================
// 1. RESTAURANTS & LOCATIONS
// ========================================

export interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  timezone: string;
  currency: string;
  ownerId: string;
  subscriptionPlan: 'basic' | 'professional' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'suspended';
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  logoUrl: string;
  website: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatingHours {
  id: string;
  restaurantId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday, 6 = Sunday
  openingTime: string; // HH:MM format
  closingTime: string;
  isClosed: boolean;
}

// ========================================
// 2. TABLES MANAGEMENT
// ========================================

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  section: 'indoor' | 'outdoor' | 'vip' | 'beach';
  capacity: number;
  status: TableStatus;
  waiterId: string | null;
  guestCount: number;
  occupiedSince: Date | null;
  reservationId: string | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';

export interface UpdateTableRequest {
  status?: TableStatus;
  guestCount?: number;
  waiterId?: string;
  occupiedSince?: Date;
  notes?: string;
}

// ========================================
// 3. MENU MANAGEMENT
// ========================================

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  preparationTime: number; // in minutes
  imageUrl: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  calories: number;
  isAvailable: boolean;
  displayOrder: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMenuItemRequest {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  preparationTime: number;
  imageUrl: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  calories: number;
  tags: string[];
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  cost?: number;
  preparationTime?: number;
  imageUrl?: string;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  calories?: number;
  isAvailable?: boolean;
  tags?: string[];
}

// ========================================
// 4. ORDERS & ORDER ITEMS
// ========================================

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  tableId: string | null;
  customerId: string | null;
  waiterId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  subtotal: number;
  tax: number;
  discount: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export type OrderStatus = 'pending' | 'accepted' | 'cooking' | 'ready' | 'served' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem?: MenuItem;
  quantity: number;
  unitPrice: number;
  specialInstructions: string;
  status: OrderItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderItemStatus = 'pending' | 'accepted' | 'cooking' | 'ready' | 'served' | 'cancelled';

export interface CreateOrderRequest {
  tableId?: string;
  customerId?: string;
  items: CreateOrderItemRequest[];
  notes?: string;
}

export interface CreateOrderItemRequest {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  notes?: string;
}

export interface UpdateOrderItemRequest {
  status?: OrderItemStatus;
}

// ========================================
// 5. RESERVATIONS
// ========================================

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string;
  reservationNumber: string;
  tableId: string | null;
  reservationTime: Date;
  partySize: number;
  status: ReservationStatus;
  specialRequests: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'no_show' | 'cancelled';

export interface CreateReservationRequest {
  customerId: string;
  reservationTime: Date;
  partySize: number;
  specialRequests?: string;
  notes?: string;
}

export interface UpdateReservationRequest {
  reservationTime?: Date;
  partySize?: number;
  status?: ReservationStatus;
  specialRequests?: string;
  notes?: string;
}

// ========================================
// 6. BILLING & PAYMENTS
// ========================================

export interface Bill {
  id: string;
  restaurantId: string;
  orderId: string;
  billNumber: string;
  tableId: string | null;
  customerId: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  transactionId: string;
  createdAt: Date;
  completedAt: Date | null;
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'check';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface CreateBillRequest {
  orderId: string;
  paymentMethod?: PaymentMethod;
  discount?: number;
}

export interface CreatePaymentRequest {
  billId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
}

export interface DailyRevenue {
  date: Date;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  paymentBreakdown: Record<PaymentMethod, number>;
  tax: number;
  discount: number;
}

// ========================================
// 7. INVENTORY MANAGEMENT
// ========================================

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string; // grams, ml, pieces, kg, liter
  reorderLevel: number;
  cost: number;
  supplierId: string;
  lastRestockDate: Date;
  expiryDate: Date;
  notes: string;
  status: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type InventoryStatus = 'in-stock' | 'low-stock' | 'critical' | 'out-of-stock';

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  type: 'restock' | 'usage' | 'adjustment' | 'waste';
  quantity: number;
  referenceId: string; // order_id, bill_id, etc.
  notes: string;
  createdBy: string;
  createdAt: Date;
}

export interface CreateInventoryItemRequest {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  cost: number;
  supplierId: string;
  expiryDate?: Date;
  notes?: string;
}

export interface UpdateInventoryItemRequest {
  quantity?: number;
  reorderLevel?: number;
  cost?: number;
  expiryDate?: Date;
  notes?: string;
}

export interface CreateReorderRequest {
  quantity: number;
  supplierId: string;
  expectedDelivery: Date;
}

export interface Supplier {
  id: string;
  restaurantId: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// 8. STAFF MANAGEMENT
// ========================================

export interface Staff {
  id: string;
  restaurantId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  department: StaffDepartment;
  status: StaffStatus;
  salary: number;
  joinDate: Date;
  leaveBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffRole = 'Head Chef' | 'Sous Chef' | 'Line Cook' | 'Waiter' | 'Server' | 'Manager' | 'Admin';
export type StaffDepartment = 'Kitchen' | 'Service' | 'Management';
export type StaffStatus = 'active' | 'inactive' | 'on_leave' | 'off_duty';

export interface StaffShift {
  id: string;
  staffId: string;
  shiftDate: Date;
  startTime: string; // HH:MM format
  endTime: string;
  breakDuration: number; // in minutes
  notes: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  attendanceDate: Date;
  checkInTime: Date;
  checkOutTime: Date;
  status: 'present' | 'absent' | 'late' | 'leave' | 'half_day';
  notes: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  department: StaffDepartment;
  salary: number;
  joinDate: Date;
}

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  department?: StaffDepartment;
  status?: StaffStatus;
  salary?: number;
}

// ========================================
// 9. CUSTOMERS & CRM
// ========================================

export interface Customer {
  id: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tier: CustomerTier;
  totalSpent: number;
  totalVisits: number;
  lastVisit: Date;
  loyaltyPoints: number;
  preferences: string[];
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  pointsChange: number;
  reason: string;
  createdAt: Date;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  preferences?: string[];
  notes?: string;
}

export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tier?: CustomerTier;
  preferences?: string[];
  notes?: string;
}

export interface AddLoyaltyPointsRequest {
  points: number;
  reason: string;
}

// ========================================
// 10. USERS & AUTHENTICATION
// ========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  lastLogin: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'owner' | 'manager' | 'staff';

export interface UserSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  restaurantName: string;
}

// ========================================
// 11. ANALYTICS & REPORTS
// ========================================

export interface DailyAnalytics {
  date: Date;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalCustomers: number;
  totalTablesUsed: number;
  peakHours: string;
  topDishId: string;
}

export interface TableAnalytics {
  tableId: string;
  tableNumber: number;
  utilizationRate: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  turnovers: number;
  peakHours: string[];
}

export interface SalesReport {
  fromDate: Date;
  toDate: Date;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  growth: number;
  dailyBreakdown: DailyAnalytics[];
}

export interface MenuAnalytics {
  menuItemId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  profitMargin: number;
  popularity: number; // percentage
}

// ========================================
// 12. SETTINGS & CONFIGURATION
// ========================================

export interface RestaurantSettings {
  restaurantId: string;
  notificationsEmail: boolean;
  notificationsSms: boolean;
  notificationsPush: boolean;
  backupDaily: boolean;
  backupWeekly: boolean;
  taxPercentage: number;
  serviceChargePercentage: number;
  defaultPaymentMethod: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSettingsRequest {
  notificationsEmail?: boolean;
  notificationsSms?: boolean;
  notificationsPush?: boolean;
  backupDaily?: boolean;
  backupWeekly?: boolean;
  taxPercentage?: number;
  serviceChargePercentage?: number;
  defaultPaymentMethod?: PaymentMethod;
}

// ========================================
// 13. API RESPONSE TYPES
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details: ErrorDetail[];
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ========================================
// 14. WEBHOOK EVENTS
// ========================================

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: Record<string, any>;
  timestamp: Date;
}

export type WebhookEventType = 
  | 'order.created'
  | 'order.status_changed'
  | 'reservation.created'
  | 'reservation.confirmed'
  | 'bill.created'
  | 'bill.paid'
  | 'inventory.low_stock'
  | 'customer.created'
  | 'staff.checked_in'
  | 'staff.checked_out';

// ========================================
// 15. QUERY FILTERS
// ========================================

export interface OrderFilters {
  status?: OrderStatus;
  tableId?: string;
  customerId?: string;
  waiterId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ReservationFilters {
  status?: ReservationStatus;
  fromDate?: Date;
  toDate?: Date;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface InventoryFilters {
  category?: string;
  search?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface CustomerFilters {
  tier?: CustomerTier;
  search?: string;
  minSpent?: number;
  page?: number;
  limit?: number;
}
