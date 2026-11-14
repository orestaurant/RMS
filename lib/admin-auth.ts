import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

export interface AdminAuthContext {
  userId: string
  email: string
  name: string
  role: string
  isSuperAdmin: boolean
  organizationId?: string | null
}

// In-memory cache for validated admin sessions (30s TTL)
// Drastically speeds up admin API endpoints by eliminating repeated DB roundtrips for session lookups
interface CachedAdminAuth {
  auth: AdminAuthContext
  expiresAt: number
}

const adminAuthCache = new Map<string, CachedAdminAuth>()

export function invalidateAdminAuthCache(userId?: string): void {
  if (userId) {
    adminAuthCache.delete(userId)
  } else {
    adminAuthCache.clear()
  }
}

export async function authenticateAdmin(
  request: NextRequest
): Promise<{ auth: AdminAuthContext | null; errorResponse?: { message: string; status: number } }> {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    const sessionToken = token || bearerToken

    if (!sessionToken) {
      return {
        auth: null,
        errorResponse: { message: 'Unauthorized: Admin authentication session is required', status: 401 },
      }
    }

    const payload = await verifyJWT(sessionToken)
    if (!payload || !payload.userId) {
      return {
        auth: null,
        errorResponse: { message: 'Unauthorized: Invalid or expired session token', status: 401 },
      }
    }

    // Fast-path: Return cached authenticated admin context if still valid
    const cached = adminAuthCache.get(payload.userId)
    if (cached && Date.now() < cached.expiresAt) {
      return { auth: cached.auth }
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        deletedAt: true,
        organizationId: true,
      },
    })

    if (!user || user.deletedAt) {
      adminAuthCache.delete(payload.userId)
      return {
        auth: null,
        errorResponse: { message: 'Unauthorized: Admin account not found or has been deactivated', status: 401 },
      }
    }

    const roleUpper = String(user.role).toUpperCase()
    const isSuperAdmin =
      roleUpper === 'SUPER_ADMIN' ||
      roleUpper === 'SUPERADMIN' ||
      user.role === 'super_admin'
    const isAdmin = roleUpper === 'ADMIN' || isSuperAdmin

    if (!isAdmin) {
      adminAuthCache.delete(payload.userId)
      return {
        auth: null,
        errorResponse: { message: 'Forbidden: Only administrators can access this resource', status: 403 },
      }
    }

    if (user.status !== 'active') {
      adminAuthCache.delete(payload.userId)
      return {
        auth: null,
        errorResponse: { message: 'Forbidden: Your admin account is currently inactive', status: 403 },
      }
    }

    const authContext: AdminAuthContext = {
      userId: user.id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || (isSuperAdmin ? 'Super Admin' : 'Admin'),
      role: user.role,
      isSuperAdmin,
      organizationId: user.organizationId,
    }

    // Store in cache for 30 seconds
    adminAuthCache.set(user.id, {
      auth: authContext,
      expiresAt: Date.now() + 30_000,
    })

    return { auth: authContext }
  } catch (error: any) {
    console.error('authenticateAdmin error:', error)
    return {
      auth: null,
      errorResponse: { message: 'Authentication error occurred', status: 500 },
    }
  }
}

