import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { authenticateAdmin } from '@/lib/admin-auth'
import { UserRoleEnum } from '@prisma/client'

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
 * GET /api/admin/users
 * Fetch paginated, role-filtered users list with search support directly from PostgreSQL via Prisma
 */
export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await authenticateAdmin(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, message: errorResponse?.message || 'Unauthorized' },
        { status: errorResponse?.status || 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const search = searchParams.get('search')?.trim() || ''
    const roleFilter = searchParams.get('role')?.trim() || ''
    const statusFilter = searchParams.get('status')?.trim() || ''

    const where: any = {}

    // Search filter across name, firstName, lastName, email, phone
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Role filter
    if (roleFilter && roleFilter.toUpperCase() !== 'ALL') {
      where.role = roleFilter as UserRoleEnum
    }

    // Status filter
    if (statusFilter && statusFilter.toLowerCase() !== 'all') {
      where.status = statusFilter.toLowerCase()
    }

    const skip = (page - 1) * limit

    const [users, total, allUsersForStats] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          staffProfile: {
            select: {
              designation: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.user.findMany({
        select: {
          role: true,
          status: true,
        },
      }),
    ])

    // Format users for client consumption
    const formattedUsers = users.map((u) => {
      const displayName =
        u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0]
      return {
        id: u.id,
        name: displayName,
        email: u.email,
        phone: u.phone || 'N/A',
        role: u.role,
        status: u.status === 'active' ? 'active' : 'inactive',
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        designation: u.staffProfile?.designation || null,
      }
    })

    // Compute dynamic aggregate stats from live database
    const stats = {
      total: allUsersForStats.length,
      active: allUsersForStats.filter((u) => u.status === 'active').length,
      inactive: allUsersForStats.filter((u) => u.status !== 'active').length,
      roles: {
        SUPER_ADMIN: allUsersForStats.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'super_admin').length,
        ADMIN: allUsersForStats.filter((u) => u.role === 'ADMIN').length,
        WAITER: allUsersForStats.filter((u) => u.role === 'WAITER' || u.role === 'waiter').length,
        COUNTER_MANAGER: allUsersForStats.filter((u) => u.role === 'COUNTER_MANAGER').length,
        CHEF: allUsersForStats.filter((u) => u.role === 'CHEF' || u.role === 'chef').length,
        INVENTORY_MANAGER: allUsersForStats.filter((u) => u.role === 'INVENTORY_MANAGER').length,
        VENDOR: allUsersForStats.filter((u) => u.role === 'VENDOR').length,
        CUSTOMER: allUsersForStats.filter((u) => u.role === 'CUSTOMER' || u.role === 'customer').length,
      },
    }

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats,
    })
  } catch (error: any) {
    console.error('GET /api/admin/users error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users', error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Secure endpoint to create a new user with an assigned staff role (securely hashing password)
 */
export async function POST(request: NextRequest) {
  try {
    const { auth, errorResponse } = await authenticateAdmin(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, message: errorResponse?.message || 'Unauthorized' },
        { status: errorResponse?.status || 401 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const { name, fullName, email, phone, password, role, status = 'active' } = body
    const finalName = (name || fullName || '').trim()
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPhone = (phone || '').trim()
    const cleanPassword = String(password || '').trim()
    const cleanRole = String(role || '').toUpperCase()

    // Validation
    if (!finalName) {
      return NextResponse.json(
        { success: false, message: 'Full Name is required' },
        { status: 400 }
      )
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'A valid email address is required' },
        { status: 400 }
      )
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 4 characters long' },
        { status: 400 }
      )
    }

    if (!ALLOWED_ROLES.includes(cleanRole as any)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid role selected. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Role Hierarchy: Only Super Admin can assign or create an Admin (or Super Admin) account
    if (cleanRole === 'ADMIN' || cleanRole === 'SUPER_ADMIN') {
      if (!auth.isSuperAdmin) {
        return NextResponse.json(
          {
            success: false,
            message: 'Forbidden: Only Super Admin can assign or create Admin accounts. Operational Admin can only assign staff roles.',
          },
          { status: 403 }
        )
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'A user with this email address already exists' },
        { status: 409 }
      )
    }

    // Securely hash password
    const hashedPassword = await bcrypt.hash(cleanPassword, 10)

    // Resolve organization, restaurant, and branch context
    let orgId = auth.organizationId
    if (!orgId) {
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } })
      orgId = firstOrg?.id || null
    }

    const firstRestaurant = await prisma.restaurant.findFirst({ select: { id: true } })
    const firstBranch = await prisma.branch.findFirst({ select: { id: true } })

    // Split name into first and last name if needed
    const nameParts = finalName.split(' ')
    const firstName = nameParts[0] || 'Staff'
    const lastName = nameParts.slice(1).join(' ') || ''

    // 1. Create user in PostgreSQL via Prisma
    const newUser = await prisma.user.create({
      data: {
        name: finalName,
        firstName,
        lastName,
        email: cleanEmail,
        phone: cleanPhone || null,
        password: hashedPassword,
        passwordHash: hashedPassword,
        role: cleanRole as UserRoleEnum,
        status: status === 'inactive' ? 'inactive' : 'active',
        organizationId: orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    // 2. For operational staff roles, attach staff profile safely
    const isStaffRole = ['WAITER', 'COUNTER_MANAGER', 'CHEF', 'INVENTORY_MANAGER', 'VENDOR'].includes(cleanRole)
    if (isStaffRole && orgId && firstRestaurant) {
      try {
        const empSuffix = `${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`
        await prisma.staffProfile.create({
          data: {
            userId: newUser.id,
            organizationId: orgId,
            restaurantId: firstRestaurant.id,
            employeeId: `EMP-${empSuffix}`,
            designation: cleanRole.replace(/_/g, ' '),
            status: status === 'inactive' ? 'inactive' : 'active',
            ...(firstBranch
              ? {
                  branchAssignments: {
                    create: {
                      organizationId: orgId,
                      restaurantId: firstRestaurant.id,
                      branchId: firstBranch.id,
                      isActive: true,
                    },
                  },
                }
              : {}),
          },
        })
      } catch (staffErr) {
        console.warn('Optional staffProfile creation skipped:', (staffErr as any)?.message)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `${cleanRole === 'ADMIN' ? 'Admin' : 'Staff'} user created successfully`,
        user: newUser,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/admin/users error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create user', error: error.message },
      { status: 500 }
    )
  }
}
