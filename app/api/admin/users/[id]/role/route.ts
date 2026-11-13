import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authenticateAdmin, invalidateAdminAuthCache } from '@/lib/admin-auth'
import { UserRoleEnum } from '@prisma/client'
import { invalidateUserStatsCache } from '@/lib/admin-cache'

const ALLOWED_ROLES = [
  'WAITER',
  'COUNTER_MANAGER',
  'CHEF',
  'INVENTORY_MANAGER',
  'VENDOR',
  'ADMIN',
  'SUPER_ADMIN',
  'CUSTOMER',
] as const

/**
 * PATCH /api/admin/users/[id]/role
 * Secure endpoint to update the role and/or status of a specific user.
 * Strictly protected by Admin authorization.
 * Prevents self-demotion or lockout of the active logged-in Admin account.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await authenticateAdmin(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, message: errorResponse?.message || 'Unauthorized' },
        { status: errorResponse?.status || 401 }
      )
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'User ID parameter is required' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const { role, status } = body
    if (!role && !status) {
      return NextResponse.json(
        { success: false, message: 'At least one field (role or status) must be provided for update' },
        { status: 400 }
      )
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Target user not found' },
        { status: 404 }
      )
    }

    // RBAC Safety Rule: Prevent self-demotion or lockout of active Admin / Super Admin
    const isSelf = auth.userId === id
    const cleanRole = role ? String(role).toUpperCase() : undefined
    const cleanStatus = status ? String(status).toLowerCase() : undefined

    const targetRoleUpper = String(targetUser.role).toUpperCase()
    const isTargetSuperAdmin = targetRoleUpper === 'SUPER_ADMIN' || targetRoleUpper === 'SUPERADMIN' || targetUser.role === 'super_admin'
    const isTargetAdmin = targetRoleUpper === 'ADMIN'

    // Hierarchy Guard: Non-superadmin cannot modify a Super Admin
    if (isTargetSuperAdmin && !auth.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden: Only Super Admin can modify a Super Admin account.',
        },
        { status: 403 }
      )
    }

    // Hierarchy Guard: Regular Admin cannot modify or reassign another Admin
    if (isTargetAdmin && !auth.isSuperAdmin && !isSelf) {
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden: Only Super Admin can modify or reassign Admin accounts.',
        },
        { status: 403 }
      )
    }

    // Hierarchy Guard: Only Super Admin can assign ADMIN or SUPER_ADMIN role
    if ((cleanRole === 'ADMIN' || cleanRole === 'SUPER_ADMIN') && !auth.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden: Only Super Admin can assign the Admin role. Operational Admins can assign staff roles.',
        },
        { status: 403 }
      )
    }

    if (isSelf) {
      if (cleanRole && cleanRole !== 'ADMIN' && cleanRole !== 'SUPER_ADMIN') {
        return NextResponse.json(
          {
            success: false,
            message:
              'Security Constraint: You cannot demote your own active Admin account to avoid administrative lockout.',
          },
          { status: 400 }
        )
      }

      if (cleanStatus && cleanStatus === 'inactive') {
        return NextResponse.json(
          {
            success: false,
            message:
              'Security Constraint: You cannot deactivate your own active Admin account to avoid administrative lockout.',
          },
          { status: 400 }
        )
      }
    }

    // Validate role if provided
    if (cleanRole && !ALLOWED_ROLES.includes(cleanRole as any)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid role specified. Allowed roles are: ${ALLOWED_ROLES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (cleanStatus && cleanStatus !== 'active' && cleanStatus !== 'inactive') {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status specified. Must be 'active' or 'inactive'.",
        },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (cleanRole) {
      updateData.role = cleanRole as UserRoleEnum
    }
    if (cleanStatus) {
      updateData.status = cleanStatus
    }

    // Update in PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    })

    // Sync staffProfile if exists
    if (cleanRole || cleanStatus) {
      const profileUpdate: any = {}
      if (cleanRole) {
        profileUpdate.designation = cleanRole.replace(/_/g, ' ')
      }
      if (cleanStatus) {
        profileUpdate.status = cleanStatus
      }

      await prisma.staffProfile
        .updateMany({
          where: { userId: id },
          data: profileUpdate,
        })
        .catch(() => {})
    }

    // Invalidate caches so the updated role/status is reflected immediately across all screens
    invalidateUserStatsCache()
    invalidateAdminAuthCache(id)

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.name || updatedUser.email} updated successfully`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || 'N/A',
        role: updatedUser.role,
        status: updatedUser.status,
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('PATCH /api/admin/users/[id]/role error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update user role/status', error: error.message },
      { status: 500 }
    )
  }
}
