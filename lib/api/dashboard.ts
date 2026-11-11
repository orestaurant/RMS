/**
 * Dashboard API Service
 * All API calls related to dashboard
 */

import { apiGet } from '@/lib/api/client'
import type {
  DashboardStats,
  DashboardSummary,
  RevenueChartData,
  SidebarCounts,
  RestaurantStatus,
  TopDish,
  InventoryAlert,
} from '@/types/dashboard'
import type { SuccessResponse } from '@/types/api'

/**
 * Get dynamic dashboard statistics directly from PostgreSQL
 */
export async function getDashboardStats(
  branchId?: string
): Promise<DashboardStats> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''
  const response = await apiGet<SuccessResponse<DashboardStats>>(
    `/dashboard/stats${query}`
  )

  if (!response.success) {
    throw new Error(response.message || 'Failed to fetch dashboard stats')
  }

  return response.data
}

/**
 * Get dashboard summary statistics
 */
export async function getDashboardSummary(
  branchId: string
): Promise<DashboardSummary> {
  const response = await apiGet<SuccessResponse<DashboardSummary>>(
    `/dashboard/summary?branchId=${branchId}&date=today`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}

/**
 * Get revenue chart data
 */
export async function getRevenueChart(
  branchId: string,
  range: 'today' | 'week' = 'today'
): Promise<RevenueChartData> {
  const response = await apiGet<SuccessResponse<RevenueChartData>>(
    `/dashboard/revenue-chart?branchId=${branchId}&range=${range}`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}

/**
 * Get sidebar badge counts
 */
export async function getSidebarCounts(branchId: string): Promise<SidebarCounts> {
  const response = await apiGet<SuccessResponse<SidebarCounts>>(
    `/dashboard/sidebar-counts?branchId=${branchId}`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}

/**
 * Get current restaurant status
 */
export async function getRestaurantStatus(branchId: string): Promise<RestaurantStatus> {
  const response = await apiGet<SuccessResponse<RestaurantStatus>>(
    `/restaurants/current-status?branchId=${branchId}`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}

/**
 * Get notifications
 */
export async function getNotifications(limit: number = 10) {
  const { apiGet } = await import('@/lib/api/client')
  const response = await apiGet<any>(
    `/notifications?limit=${limit}`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data.notifications
}

/**
 * Get top dishes today
 */
export async function getTopDishes(branchId: string): Promise<TopDish[]> {
  const response = await apiGet<SuccessResponse<TopDish[]>>(
    `/dashboard/top-dishes?branchId=${branchId}`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}

/**
 * Get inventory alerts
 */
export async function getInventoryAlerts(branchId: string): Promise<InventoryAlert[]> {
  const response = await apiGet<SuccessResponse<InventoryAlert[]>>(
    `/dashboard/inventory-alerts?branchId=${branchId}`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}

