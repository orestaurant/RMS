import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authenticateAdmin } from '@/lib/admin-auth'

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

    // Soft delete by marking inactive or deletedAt
    await prisma.user.update({
      where: { id },
      data: {
        status: 'inactive',
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `User ${user.name || user.email} has been deactivated.`,
    })
  } catch (error: any) {
    console.error('DELETE /api/admin/users/[id] error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to remove user', error: error.message },
      { status: 500 }
    )
  }
}
