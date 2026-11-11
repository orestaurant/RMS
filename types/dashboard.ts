/**
 * Dashboard Types and DTOs
 */

export interface DashboardStats {
  todayRevenue: number
  todayRevenueChangePercent: number
  totalOrders: number
  totalOrdersChange: number
  avgTicket: number
  avgTicketChange: number
  tableOccupancy: number
  tableOccupancyChange: number
  occupiedTables: number
  totalTables: number
  newGuests: number
  newGuestsChange: number
  satisfaction: number
  satisfactionChange: number
  outlet: {
    id: string
    restaurantName: string
    branchName: string
    fullName: string
    isOpen: boolean
    operatingHours: string
    closingTime: string
  }
}

export interface DashboardSummary {
  todayRevenue: number
  todayRevenueChangePercent: number
  totalOrders: number
  totalOrdersChange: number
  averageTicket: number
  averageTicketChangePercent: number
  tableOccupancyPercent: number
  tableOccupancyChangePercent: number
  newGuests: number
  newGuestsChange: number
  satisfactionRating: number | null
  satisfactionChange: number
}

export interface RevenueChartPoint {
  label: string
  revenue: number
  orders: number
}

export interface RevenueChartData {
  range: 'today' | 'week'
  totalRevenue: number
  totalOrders: number
  peakHour: string | null
  points: RevenueChartPoint[]
}

export interface SidebarCounts {
  reservations: number
  liveOrders: number
  inventoryAlerts: number
  posLive: boolean
  kitchenLive: boolean
}

export interface RestaurantStatus {
  isOpen: boolean
  statusLabel: string
  closingTime: string | null
  timezone: string
}

export interface TopDish {
  id: string
  name: string
  orders: number
  revenue: number
  trend: string
  isVeg: boolean
}

export interface InventoryAlert {
  id: string
  item: string
  current: number
  unit: string
  status: 'critical' | 'low'
}
