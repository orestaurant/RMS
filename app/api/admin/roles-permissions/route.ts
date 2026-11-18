/**
 * /api/admin/roles-permissions
 * Controller for Admin Dashboard RBAC (Role-Based Access Control) & Manager Bypass.
 * Allows Admin to configure role permissions, staff roles, and branch-level manager bypass mode.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthContext } from '@/api/middleware/auth'
import { successResponse, errorResponse } from '@/api/utils/responses'
import {
  getRolePermissionsMatrix,
  setRolePermissionOverride,
  setBranchManagerBypass,
  isBranchManagerBypassActive,
  WaiterPermission,
} from '@/lib/rolesAndPermission'

export async function GET(request: NextRequest) {
  try {
    const authContext = extractAuthContext(request)
    const branchId = request.nextUrl.searchParams.get('branchId') || authContext.branchId

    // 1. Fetch live permissions matrix
    const matrix = getRolePermissionsMatrix()

    // 2. Fetch branch manager bypass state
    const isBypassActive = isBranchManagerBypassActive(branchId)

    // 3. Fetch active staff list with roles
    const staff = await prisma.user.findMany({
      where: {
        organizationId: authContext.organizationId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
      orderBy: { role: 'asc' },
    })

    const formattedStaff = staff.map((s) => ({
      id: s.id,
      name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff Member',
      email: s.email,
      phone: s.phone,
      role: s.role,
      status: s.status,
    }))

    const permissionLabels: Record<WaiterPermission, { label: string; description: string; riskLevel: 'low' | 'medium' | 'high' }> = {
      canApplyDiscount: { label: 'Apply Discounts', description: 'Can give flat or percentage discounts on bills', riskLevel: 'high' },
      canBypassManager: { label: 'Manager Bypass', description: 'Can override manager-restricted actions', riskLevel: 'high' },
      canAddDish: { label: 'Add Dishes to Order', description: 'Can add new items or live add-ons to orders', riskLevel: 'low' },
      canSplitBill: { label: 'Split Bills', description: 'Can split table bills by seats or items', riskLevel: 'low' },
      canBypassLiveOrder: { label: 'Bypass Live Grace Window', description: 'Can force-merge orders after 20s lock window', riskLevel: 'medium' },
      canDeleteTable: { label: 'Delete / Reset Table', description: 'Can clear or delete tables from layout', riskLevel: 'high' },
      canApplyCoverCharge: { label: 'Apply Cover Charges', description: 'Can add entry or cover charges to bills', riskLevel: 'medium' },
      canApplyPenalty: { label: 'Apply Non-Payment Penalty', description: 'Can add late payment or walkout penalties', riskLevel: 'high' },
      canEditDishAvailability: { label: 'Toggle 86 / Out of Stock', description: 'Can mark menu items out of stock', riskLevel: 'medium' },
      canVerifyHighwayPayment: { label: 'Verify Highway / Drive-thru Payment', description: 'Can mark express drive-thru bills paid', riskLevel: 'medium' },
    }

    return NextResponse.json(
      successResponse({
        branchId,
        isBranchManagerBypassActive: isBypassActive,
        permissionsMatrix: matrix,
        permissionDefinitions: permissionLabels,
        staff: formattedStaff,
      }),
      {
        headers: {
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=20',
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching roles and permissions:', error)
    return NextResponse.json(errorResponse('Failed to fetch roles & permissions', 'SERVER_ERROR'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = extractAuthContext(request)
    const userRole = (authContext.role || 'STAFF').toUpperCase()

    // Only Admins & Super Admins can alter permissions matrix
    if (!['SUPER_ADMIN', 'ADMIN', 'RESTAURANT_OWNER'].includes(userRole)) {
      return NextResponse.json(
        errorResponse('Forbidden: Only Admins can modify roles and permissions', 'FORBIDDEN'),
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (action === 'TOGGLE_PERMISSION') {
      const { role, permission, enabled } = body
      if (!role || !permission || enabled === undefined) {
        return NextResponse.json(errorResponse('Missing role, permission or enabled state', 'INVALID_PARAM'), {
          status: 400,
        })
      }

      setRolePermissionOverride(role, permission as WaiterPermission, Boolean(enabled))
      return NextResponse.json(
        successResponse(
          { role, permission, enabled: Boolean(enabled) },
          `Permission '${permission}' for role '${role}' updated to ${enabled}`
        )
      )
    }

    if (action === 'SET_BRANCH_BYPASS') {
      const { branchId, enabled } = body
      const targetBranch = branchId || authContext.branchId
      setBranchManagerBypass(targetBranch, Boolean(enabled))

      return NextResponse.json(
        successResponse(
          { branchId: targetBranch, isManagerBypassActive: Boolean(enabled) },
          `Manager Bypass for Branch ${targetBranch} set to ${enabled}`
        )
      )
    }

    if (action === 'UPDATE_STAFF_ROLE') {
      const { staffId, newRole } = body
      if (!staffId || !newRole) {
        return NextResponse.json(errorResponse('staffId and newRole are required', 'MISSING_PARAM'), { status: 400 })
      }

      const updated = await prisma.user.update({
        where: { id: staffId },
        data: { role: newRole.toUpperCase() },
        select: { id: true, name: true, role: true },
      })

      return NextResponse.json(
        successResponse(updated, `Staff member ${updated.name || updated.id} updated to role ${updated.role}`)
      )
    }

    return NextResponse.json(errorResponse('Invalid action specified', 'INVALID_ACTION'), { status: 400 })
  } catch (error: any) {
    console.error('Error updating roles and permissions:', error)
    return NextResponse.json(errorResponse(error?.message || 'Update failed', 'SERVER_ERROR'), { status: 500 })
  }
}
