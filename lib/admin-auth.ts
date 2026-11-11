import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/auth'

export interface AdminAuthContext {
  userId: string
  email: string
  name: string
  role: string
  organizationId?: string | null
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
        organizationId: true,
      },
    })

    if (!user) {
      return {
        auth: null,
        errorResponse: { message: 'Unauthorized: Admin account not found', status: 401 },
      }
    }

    const roleUpper = String(user.role).toUpperCase()
    const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN'

    if (!isAdmin) {
      return {
        auth: null,
        errorResponse: { message: 'Forbidden: Only administrators can access this resource', status: 403 },
      }
    }

    if (user.status !== 'active') {
      return {
        auth: null,
        errorResponse: { message: 'Forbidden: Your admin account is currently inactive', status: 403 },
      }
    }

    return {
      auth: {
        userId: user.id,
        email: user.email,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
        role: user.role,
        organizationId: user.organizationId,
      },
    }
  } catch (error: any) {
    console.error('authenticateAdmin error:', error)
    return {
      auth: null,
      errorResponse: { message: 'Authentication error occurred', status: 500 },
    }
  }
}

