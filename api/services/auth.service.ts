/**
 * Authentication Service
 * Handles user authentication and context retrieval
 */

import prisma from '@/lib/prisma'
import { NotFoundError } from '@/api/utils/errors'

export interface UserContext {
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
 * Get current user context (me endpoint)
 * TODO: Replace userId with actual JWT extraction
 */
export const getCurrentUserContext = async (
  userId: string
): Promise<UserContext> => {
  // TODO: Extract from JWT token in real implementation
  // For now, fetch user and related data

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      staffProfile: true,
    },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // TODO: Get user's assigned branches and return first one
  // For now, return hardcoded values (TEMPORARY FOR DEVELOPMENT)

  return {
    id: user.id,
    name: `${user.firstName || 'User'} ${user.lastName || ''}`.trim(),
    role: user.role,
    organizationId: user.organizationId || 'demo-org',
    restaurantId: user.staffProfile?.restaurantId || 'demo-restaurant',
    branchId: 'demo-branch',
    restaurantName: 'Spice Garden', // TODO: Fetch from restaurant table
    branchName: 'Mumbai Central', // TODO: Fetch from branch table
  }
}

/**
 * TODO: Implement JWT token validation
 */
export const validateToken = async (token: string): Promise<string> => {
  // TODO: Verify JWT token and return userId
  return 'dev-user-001'
}

/**
 * TODO: Implement user registration
 */
export const registerUser = async (data: {
  email: string
  password: string
  firstName: string
  lastName: string
}) => {
  // TODO: Implement user registration with password hashing
}

/**
 * TODO: Implement user login
 */
export const loginUser = async (email: string, password: string) => {
  // TODO: Validate credentials and return JWT token
}
