/**
 * Auth API Service
 * All API calls related to authentication
 */

import { apiGet } from '@/lib/api/client'
import type { AuthUser } from '@/types/auth'
import type { SuccessResponse } from '@/types/api'

export interface AuthUserResponse {
  id: string
  name: string
  role: string
  organizationId: string
  restaurantId: string
  branchId: string
  restaurantName: string
  branchName: string
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUserResponse> {
  const response = await apiGet<SuccessResponse<AuthUserResponse>>(
    `/auth/me`
  )

  if (!response.success) {
    throw new Error(response.message)
  }

  return response.data
}
