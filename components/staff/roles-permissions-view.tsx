'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Lock,
  Unlock,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function RolesPermissionsView() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({})
  const [definitions, setDefinitions] = useState<Record<string, any>>({})
  const [isBypassActive, setIsBypassActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/roles-permissions')
      const data = await res.json()
      if (data.success && data.data) {
        setMatrix(data.data.permissionsMatrix || {})
        setDefinitions(data.data.permissionDefinitions || {})
        setIsBypassActive(Boolean(data.data.isBranchManagerBypassActive))
      }
    } catch (err) {
      console.error('Error fetching permissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const handleTogglePermission = async (role: string, permission: string, currentVal: boolean) => {
    const key = `${role}_${permission}`
    setSavingKey(key)
    try {
      const res = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_PERMISSION',
          role,
          permission,
          enabled: !currentVal,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMatrix((prev) => ({
          ...prev,
          [role]: {
            ...prev[role],
            [permission]: !currentVal,
          },
        }))
        setFeedback(`Permission '${permission}' for ${role} updated to ${!currentVal ? 'ALLOWED' : 'DISABLED'}`)
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch (err) {
      console.error('Error toggling permission:', err)
    } finally {
      setSavingKey(null)
    }
  }

  const handleToggleBypass = async () => {
    try {
      const res = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_BRANCH_BYPASS',
          enabled: !isBypassActive,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIsBypassActive(!isBypassActive)
        setFeedback(
          !isBypassActive
            ? 'Manager Bypass ACTIVATED: Waiters can now apply discounts & penalties without PIN'
            : 'Manager Bypass DEACTIVATED: Strict manager verification restored'
        )
        setTimeout(() => setFeedback(null), 4000)
      }
    } catch (err) {
      console.error('Error toggling bypass:', err)
    }
  }

  const displayRoles = ['WAITER', 'STAFF', 'CHEF', 'MANAGER', 'ADMIN']
  const permissionsList = Object.keys(definitions)

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Global Manager Bypass Banner */}
      <Card className="p-5 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isBypassActive ? (
                <Unlock className="size-5 text-amber-500" />
              ) : (
                <Lock className="size-5 text-muted-foreground" />
              )}
              <h3 className="text-base font-bold">Emergency Manager Bypass (Branch Override)</h3>
              <Badge className={isBypassActive ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}>
                {isBypassActive ? 'ACTIVE' : 'OFF'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              When enabled, waitstaff can perform critical operations (applying discounts, non-payment penalties, and adding live batch dishes) without requiring a Manager's PIN. Useful during peak rush hours when the floor manager is busy.
            </p>
          </div>

          <Button
            onClick={handleToggleBypass}
            variant={isBypassActive ? 'destructive' : 'default'}
            className="shrink-0 font-semibold gap-2"
          >
            {isBypassActive ? 'Turn Off Bypass' : 'Enable Branch Bypass'}
          </Button>
        </div>
      </Card>

      {/* Permissions Matrix */}
      <Card className="border-border/80 overflow-hidden">
        <div className="p-4 bg-muted/40 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              Role-Based Access Control (RBAC) Permissions Matrix
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click checkboxes to grant or restrict capabilities per role. All changes apply with zero database latency.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchPermissions} className="gap-1.5 text-xs">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-1/3">Permission & Description</TableHead>
              <TableHead className="w-24">Risk Level</TableHead>
              {displayRoles.map((role) => (
                <TableHead key={role} className="text-center font-bold">
                  {role}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionsList.map((perm) => {
              const def = definitions[perm] || { label: perm, description: '', riskLevel: 'low' }
              return (
                <TableRow key={perm} className="hover:bg-muted/20">
                  <TableCell>
                    <p className="font-semibold text-xs text-foreground">{def.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{def.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-bold px-1.5 py-0 ${
                        def.riskLevel === 'high'
                          ? 'border-rose-500/30 text-rose-500 bg-rose-500/10'
                          : def.riskLevel === 'medium'
                          ? 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                          : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                      }`}
                    >
                      {def.riskLevel}
                    </Badge>
                  </TableCell>
                  {displayRoles.map((role) => {
                    const isAllowed = Boolean(matrix[role]?.[perm])
                    const key = `${role}_${perm}`
                    const isSaving = savingKey === key
                    const isRestrictedRole = role === 'ADMIN' // Admins always have all permissions

                    return (
                      <TableCell key={role} className="text-center">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          disabled={isRestrictedRole || isSaving}
                          onChange={() => handleTogglePermission(role, perm, isAllowed)}
                          className="size-4 rounded accent-primary cursor-pointer disabled:opacity-50"
                          title={isRestrictedRole ? 'Admin has all permissions by default' : `Toggle ${def.label} for ${role}`}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
