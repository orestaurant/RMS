/**
 * Orders API Service
 * All API calls related to orders
 */

import { apiGet } from '@/lib/api/client'
import type { LiveOrdersResponse } from '@/types/orders'
import type { SuccessResponse } from '@/types/api'

/**
 * Get active live orders
 */
export async function getLiveOrders(branchId: string): Promise<LiveOrdersResponse> {
  const response = await apiGet<SuccessResponse<LiveOrdersResponse>>(
    `/orders/live?branchId=${branchId}&status=active`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}

/**
 * Get tables for a branch
 */
export async function getTables(branchId: string) {
  const response = await apiGet<any>(
    `/tables?branchId=${branchId}`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}
