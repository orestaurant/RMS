/**
 * Authentication Middleware
 * TODO: Implement proper JWT authentication when auth service is ready
 */

import { AuthenticationError } from '@/api/utils/errors'

export interface AuthContext {
  userId: string
  organizationId: string
  restaurantId: string
  branchId: string
  role: string
}

/**
 * Mock auth context for development
 * TODO: Replace with real JWT token validation
 * Currently uses seeded data for testing
 */
export const getMockAuthContext = (): AuthContext => {
  // In development, return a mock user context with real UUIDs from seeded data
  // This should be replaced with JWT token validation in production
  return {
    userId: 'cc72e85d-1e1c-45d8-bd9e-f29c20fa39e7', // Rajesh (admin)
    organizationId: '5e57f7cf-7d9f-4790-b909-1aa7c3a5d66f', // Spice Garden Hotels
    restaurantId: '089c77df-cd5e-4233-b6f1-b35f17631e5b', // Spice Garden
    branchId: 'da3f7b7b-3e87-44cb-a69c-27b3e886922e', // Mumbai Central
    role: 'ADMIN',
  }
}

/**
 * Extract auth context from request
 * TODO: Implement proper JWT extraction from Authorization header
 */
export const extractAuthContext = (req: any): AuthContext => {
  // TODO: Extract JWT token from req.headers.authorization
  // Validate token
  // Return actual user context from database
  
  // For now, return mock context
  return getMockAuthContext()
}

/**
 * Validate that user has access to branch
 */
export const validateBranchAccess = (
  authContext: AuthContext,
  branchId: string
): void => {
  // TODO: Check if user is assigned to this branch
  // For now, allow all
  if (!authContext.userId) {
    throw new AuthenticationError('User not authenticated')
  }
}

/**
 * Validate that user has required role
 */
export const validateRole = (
  authContext: AuthContext,
  requiredRoles: string[]
): void => {
  if (!requiredRoles.includes(authContext.role)) {
    throw new AuthenticationError(
      `User role ${authContext.role} does not have permission`
    )
  }
}
