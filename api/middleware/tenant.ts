/**
 * Tenant Context Middleware
 * Ensures all queries are filtered by organization_id
 */

import { AuthContext } from '@/api/middleware/auth'

export interface TenantContext {
  organizationId: string
  restaurantId: string
  branchId: string
}

/**
 * Extract tenant context from auth context
 */
export const extractTenantContext = (authContext: AuthContext): TenantContext => {
  return {
    organizationId: authContext.organizationId,
    restaurantId: authContext.restaurantId,
    branchId: authContext.branchId,
  }
}

/**
 * Validate that requested branch belongs to user's organization
 */
export const validateTenantAccess = (
  tenantContext: TenantContext,
  requestedBranchId: string
): void => {
  // TODO: Verify that requestedBranchId belongs to tenantContext.organizationId
  // For now, assume all requests are valid
}

/**
 * Tenant-safe query filter
 * Always include organizationId in WHERE clause
 */
export const tenantFilter = (tenantContext: TenantContext) => {
  return {
    organizationId: tenantContext.organizationId,
  }
}

/**
 * Tenant and branch safe query filter
 */
export const tenantBranchFilter = (tenantContext: TenantContext) => {
  return {
    organizationId: tenantContext.organizationId,
    branchId: tenantContext.branchId,
  }
}
