import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authenticateAdmin, invalidateAdminAuthCache } from '@/lib/admin-auth'
import { invalidateUserStatsCache } from '@/lib/admin-cache'

/**
 * GET /api/admin/users/[id]
 * Fetch single user details
 */
export async function GET(
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        staffProfile: {
          select: {
            employeeId: true,
            designation: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('GET /api/admin/users/[id] error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user', error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Safe deletion / deactivation with self-protection guard
 */
export async function DELETE(
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
    if (auth.userId === id) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete your own active Admin account.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const targetRole = String(user.role).toUpperCase()
    if (
      !auth.isSuperAdmin &&
      (targetRole === 'SUPER_ADMIN' || targetRole === 'SUPERADMIN' || targetRole === 'ADMIN')
    ) {
      return NextResponse.json(
        { success: false, message: 'Permission Denied: Only Super Admin can delete Admin accounts.' },
        { status: 403 }
      )
    }

    // Invalidate caches upon deletion/deactivation
    invalidateUserStatsCache()
    invalidateAdminAuthCache(id)

    // Try permanent hard delete first (e.g. if newly created or no cascade-blocking foreign keys)
    try {
      await prisma.user.delete({
        where: { id },
      })
      return NextResponse.json({
        success: true,
        message: `User ${user.name || user.email} has been deleted successfully.`,
      })
    } catch (dbErr: any) {
      console.warn('Permanent delete blocked by linked foreign records; performing soft delete:', dbErr.message)
      // Soft delete by marking inactive and recording deletedAt
      await prisma.user.update({
        where: { id },
        data: {
          status: 'inactive',
          deletedAt: new Date(),
        },
      })
      return NextResponse.json({
        success: true,
        message: `User ${user.name || user.email} has been deactivated and removed.`,
      })
    }
  } catch (error: any) {
    console.error('DELETE /api/admin/users/[id] error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to remove user', error: error.message },
      { status: 500 }
    )
  }
}
