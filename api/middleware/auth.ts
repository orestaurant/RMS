/**
 * Authentication Middleware
 * Resolves session auth context dynamically from JWT session cookie or header
 */

import { decodeJwt } from 'jose'
import { AuthenticationError } from '@/api/utils/errors'

export interface AuthContext {
  userId: string
  organizationId: string
  restaurantId: string
  branchId: string
  role: string
}

const DEFAULT_ORG_ID = '5e57f7cf-7d9f-4790-b909-1aa7c3a5d66f'
const DEFAULT_RESTAURANT_ID = '089c77df-cd5e-4233-b6f1-b35f17631e5b'
const DEFAULT_BRANCH_ID = 'da3f7b7b-3e87-44cb-a69c-27b3e886922e'

/**
 * Extract auth context dynamically from request
 */
export const extractAuthContext = (req?: any): AuthContext => {
  try {
    let token: string | undefined
    if (req?.cookies?.get) {
      token = req.cookies.get('admin_session')?.value
    } else if (typeof req?.headers?.get === 'function') {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (token) {
      const payload: any = decodeJwt(token)
      if (payload && payload.userId) {
        return {
          userId: payload.userId,
          organizationId: payload.organizationId || DEFAULT_ORG_ID,
          restaurantId: payload.restaurantId || DEFAULT_RESTAURANT_ID,
          branchId: payload.branchId || DEFAULT_BRANCH_ID,
          role: payload.role || 'STAFF',
        }
      }
    }
  } catch (err) {
    // If decode fails, fallback safely
  }

  return getMockAuthContext()
}

/**
 * Context fallback when session token is not present
 */
export const getMockAuthContext = (req?: any): AuthContext => {
  if (req) {
    return extractAuthContext(req)
  }
  return {
    userId: '',
    organizationId: DEFAULT_ORG_ID,
    restaurantId: DEFAULT_RESTAURANT_ID,
    branchId: DEFAULT_BRANCH_ID,
    role: 'STAFF',
  }
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
