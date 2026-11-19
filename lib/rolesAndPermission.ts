/**
 * Role-Based Access Control (RBAC) & Manager Bypass Utility for Waiter Portal
 * RestoSphere Restaurant Management OS
 */

export type AppRole =
  | 'WAITER'
  | 'CHEF'
  | 'MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'CASHIER'
  | 'STAFF'
  | 'CUSTOMER'
  | 'DJ'

export type WaiterPermission =
  | 'canApplyDiscount'
  | 'canBypassManager'
  | 'canAddDish'
  | 'canSplitBill'
  | 'canBypassLiveOrder'
  | 'canDeleteTable'
  | 'canApplyCoverCharge'
  | 'canApplyPenalty'
  | 'canEditDishAvailability'
  | 'canVerifyHighwayPayment'

// Default role permissions matrix
const ROLE_PERMISSIONS: Record<string, Record<WaiterPermission, boolean>> = {
  SUPER_ADMIN: {
    canApplyDiscount: true,
    canBypassManager: true,
    canAddDish: true,
    canSplitBill: true,
    canBypassLiveOrder: true,
    canDeleteTable: true,
    canApplyCoverCharge: true,
    canApplyPenalty: true,
    canEditDishAvailability: true,
    canVerifyHighwayPayment: true,
  },
  ADMIN: {
    canApplyDiscount: true,
    canBypassManager: true,
    canAddDish: true,
    canSplitBill: true,
    canBypassLiveOrder: true,
    canDeleteTable: true,
    canApplyCoverCharge: true,
    canApplyPenalty: true,
    canEditDishAvailability: true,
    canVerifyHighwayPayment: true,
  },
  MANAGER: {
    canApplyDiscount: true,
    canBypassManager: true,
    canAddDish: true,
    canSplitBill: true,
    canBypassLiveOrder: true,
    canDeleteTable: true,
    canApplyCoverCharge: true,
    canApplyPenalty: true,
    canEditDishAvailability: true,
    canVerifyHighwayPayment: true,
  },
  WAITER: {
    canApplyDiscount: false, // requires manager bypass unless manager is not logged in
    canBypassManager: false, // controlled by manager bypass toggle
    canAddDish: true,
    canSplitBill: true,
    canBypassLiveOrder: true,
    canDeleteTable: false,
    canApplyCoverCharge: true,
    canApplyPenalty: false, // requires manager bypass
    canEditDishAvailability: true,
    canVerifyHighwayPayment: true,
  },
  STAFF: {
    canApplyDiscount: false,
    canBypassManager: false,
    canAddDish: false,
    canSplitBill: true,
    canBypassLiveOrder: true,
    canDeleteTable: false,
    canApplyCoverCharge: false,
    canApplyPenalty: false,
    canEditDishAvailability: false,
    canVerifyHighwayPayment: true,
  },
  DJ: {
    canApplyDiscount: false,
    canBypassManager: false,
    canAddDish: false,
    canSplitBill: false,
    canBypassLiveOrder: false,
    canDeleteTable: false,
    canApplyCoverCharge: false,
    canApplyPenalty: false,
    canEditDishAvailability: false,
    canVerifyHighwayPayment: false,
  },
}

// In-memory overrides for dynamic admin dashboard updates (ultra-fast zero-latency cache)
const customRoleOverrides: Record<string, Partial<Record<WaiterPermission, boolean>>> = {}
const branchManagerBypassState: Record<string, boolean> = {}

export function setRolePermissionOverride(role: string, permission: WaiterPermission, enabled: boolean) {
  const normRole = role.toUpperCase()
  if (!customRoleOverrides[normRole]) {
    customRoleOverrides[normRole] = {}
  }
  customRoleOverrides[normRole][permission] = enabled
}

export function getRolePermissionsMatrix(): Record<string, Record<WaiterPermission, boolean>> {
  const result: Record<string, Record<WaiterPermission, boolean>> = {}
  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    result[role] = {
      ...ROLE_PERMISSIONS[role],
      ...(customRoleOverrides[role] || {}),
    }
  }
  return result
}

export function setBranchManagerBypass(branchId: string, enabled: boolean) {
  branchManagerBypassState[branchId] = enabled
}

export function isBranchManagerBypassActive(branchId?: string): boolean {
  if (!branchId) return false
  return Boolean(branchManagerBypassState[branchId])
}

/**
 * Check if a role has a specific permission.
 * If managerBypass is enabled or manager is not logged in, allows override for critical waiter actions.
 */
export function checkPermission(
  role: string | undefined | null,
  permission: WaiterPermission,
  options?: {
    isManagerBypassActive?: boolean
    isManagerLoggedIn?: boolean
    branchId?: string
  }
): boolean {
  const normRole = String(role || 'WAITER').toUpperCase()

  // Admins & Managers always have full access
  if (['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'MANAGER', 'RESTAURANT_OWNER'].includes(normRole)) {
    return true
  }

  // Check branch-level bypass
  if (options?.branchId && branchManagerBypassState[options.branchId]) {
    return true
  }

  // Automatic Fallback: If no manager is currently logged in, grant waiter override controls
  if (options?.isManagerLoggedIn === false) {
    return true
  }

  // Manual Manager Bypass toggle active
  if (options?.isManagerBypassActive) {
    return true
  }

  // Check custom override first, else fallback to default matrix
  if (customRoleOverrides[normRole]?.[permission] !== undefined) {
    return Boolean(customRoleOverrides[normRole]![permission])
  }

  const roleRules = ROLE_PERMISSIONS[normRole] || ROLE_PERMISSIONS.WAITER
  return !!roleRules[permission]
}
