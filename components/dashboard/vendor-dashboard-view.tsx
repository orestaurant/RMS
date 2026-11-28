'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  AlertTriangle,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Scale,
  RefreshCw,
  Send,
  Truck,
  CheckCheck,
  ShieldAlert,
  PackageCheck,
  Timer,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthContext } from '@/hooks/useAuthContext'
import { cn } from '@/lib/utils'

export interface VendorNotification {
  id: string
  recipientId: string | null
  recipientRole: string
  type: string
  title: string
  message: string
  rawMaterialId: string | null
  metadata: {
    materialName?: string
    sku?: string
    vendorName?: string
    currentQuantity?: number
    minThreshold?: number
    weight?: string
    weightUnit?: string
    location?: string
    acknowledgedAt?: string
    inTransitAt?: string
    deliveredAt?: string
    completedAt?: string
    plannedQuantity?: number
    plannedUnit?: string
    deliveredQuantity?: number
    deliveredInputQuantity?: number
    deliveredUnit?: string
    newStock?: number
    vendorNotes?: string
    transitNotes?: string
    confirmedBy?: string
  }
  status:
    | 'PENDING'
    | 'ACKNOWLEDGED'
    | 'RESTOCK_INITIATED'
    | 'RESTOCK_IN_PROGRESS'
    | 'RESTOCK_IN_TRANSIT'
    | 'RESTOCK_DELIVERED'
    | 'RESTOCK_COMPLETED'
  isRead: boolean
  createdAt: string
  recipient?: {
    id: string
    name: string
    email: string
  } | null
  rawMaterial?: {
    id: string
    name: string
    sku: string
    quantity: number
    minThreshold: number
    weight: number
    weightUnit: string
    location: string
    vendor?: {
      id: string
      name: string
      email: string
    } | null
  } | null
}

export type FilterMode =
  | 'all'
  | 'pending'
  | 'in_progress'
  | 'in_transit'
  | 'delivered'
  | 'completed'
export type StageKey = Exclude<FilterMode, 'all'>
type RestockModalMode = 'accept' | 'deliver'

export const STAGE_CONFIG: Record<
  StageKey,
  {
    kpiTitle: string
    kpiSubtitle: string
    tabLabel: string
    badgeLabel: string
    Icon: React.ElementType
    accentText: string
    borderLeft: string
    badgeClass: string
    kpiRing: string
    kpiIconBg: string
    hoverBorder: string
  }
> = {
  pending: {
    kpiTitle: 'Pending',
    kpiSubtitle: 'Need acknowledgement',
    tabLabel: 'Pending',
    badgeLabel: 'Restock Required',
    Icon: AlertTriangle,
    accentText: 'text-amber-600 dark:text-amber-400',
    borderLeft: 'border-l-4 border-l-amber-500',
    badgeClass: 'bg-amber-600 text-white hover:bg-amber-600 border-transparent',
    kpiRing: 'ring-2 ring-amber-500',
    kpiIconBg: 'bg-amber-500/20 text-amber-600',
    hoverBorder: 'hover:border-amber-500/60',
  },
  in_progress: {
    kpiTitle: 'In Progress',
    kpiSubtitle: 'Preparing supplies',
    tabLabel: 'In Progress',
    badgeLabel: 'Request In Progress',
    Icon: Timer,
    accentText: 'text-sky-600 dark:text-sky-400',
    borderLeft: 'border-l-4 border-l-sky-500',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    kpiRing: 'ring-2 ring-sky-500',
    kpiIconBg: 'bg-sky-500/10 text-sky-600',
    hoverBorder: 'hover:border-sky-500/60',
  },
  in_transit: {
    kpiTitle: 'In Transit',
    kpiSubtitle: 'On the way to restaurant',
    tabLabel: 'In Transit',
    badgeLabel: 'Restock In Transit',
    Icon: Truck,
    accentText: 'text-purple-600 dark:text-purple-400',
    borderLeft: 'border-l-4 border-l-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    kpiRing: 'ring-2 ring-purple-500',
    kpiIconBg: 'bg-purple-500/10 text-purple-600',
    hoverBorder: 'hover:border-purple-500/60',
  },
  delivered: {
    kpiTitle: 'Delivered',
    kpiSubtitle: 'Awaiting manager check',
    tabLabel: 'Delivered',
    badgeLabel: 'Restock Delivered',
    Icon: PackageCheck,
    accentText: 'text-teal-600 dark:text-teal-400',
    borderLeft: 'border-l-4 border-l-teal-500',
    badgeClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
    kpiRing: 'ring-2 ring-teal-500',
    kpiIconBg: 'bg-teal-500/10 text-teal-600',
    hoverBorder: 'hover:border-teal-500/60',
  },
  completed: {
    kpiTitle: 'Completed',
    kpiSubtitle: 'Stock updated in warehouse',
    tabLabel: 'Completed',
    badgeLabel: 'Restock Completed',
    Icon: CheckCircle2,
    accentText: 'text-emerald-600 dark:text-emerald-400',
    borderLeft: 'border-l-4 border-l-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    kpiRing: 'ring-2 ring-emerald-500',
    kpiIconBg: 'bg-emerald-500/10 text-emerald-600',
    hoverBorder: 'hover:border-emerald-500/60',
  },
}

export const STAGE_KEYS: StageKey[] = [
  'pending',
  'in_progress',
  'in_transit',
  'delivered',
  'completed',
]

const VALID_FILTER_MODES = new Set<FilterMode>(['all', ...STAGE_KEYS])

const RESTOCK_MODAL_CONFIG: Record<
  RestockModalMode,
  {
    title: string
    descriptionSuffix: string
    qtyLabel: string
    qtyHint: string
    notesLabel: string
    notesPlaceholder: string
    defaultNotes: string
    submitLabel: string
    submittingLabel: string
    submitBtnClass: string
    iconClass: string
    Icon: React.ElementType
  }
> = {
  accept: {
    title: 'Accept Restock & Confirm Quantity',
    descriptionSuffix:
      'Enter the exact quantity you will deliver so your workers and the Inventory Manager know what to prepare.',
    qtyLabel: 'Quantity to Deliver',
    qtyHint:
      'This committed quantity will be shown on the request card for your workers and synced with the warehouse.',
    notesLabel: 'Dispatch / Worker Notes (Optional)',
    notesPlaceholder: 'e.g. Packing 12 units for morning dispatch.',
    defaultNotes: '',
    submitLabel: 'Accept & Confirm Quantity',
    submittingLabel: 'Accepting...',
    submitBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold',
    iconClass: 'text-emerald-600',
    Icon: Send,
  },
  deliver: {
    title: 'Deliver & Auto-Update Inventory',
    descriptionSuffix:
      'Submitting will automatically add this quantity to the restaurant inventory right away.',
    qtyLabel: 'Delivered / Replenished Quantity',
    qtyHint:
      'This quantity will be added directly to the warehouse inventory as soon as you submit.',
    notesLabel: 'Delivery Notes (Optional)',
    notesPlaceholder: 'e.g. Delivered Batch #441 via delivery truck',
    defaultNotes: 'Shipment delivered and automatically added to warehouse inventory.',
    submitLabel: 'Deliver & Update Stock',
    submittingLabel: 'Updating Stock...',
    submitBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold',
    iconClass: 'text-emerald-600',
    Icon: PackageCheck,
  },
}

export function getStageKey(status: VendorNotification['status']): StageKey {
  if (status === 'RESTOCK_IN_PROGRESS' || status === 'RESTOCK_INITIATED') return 'in_progress'
  if (status === 'RESTOCK_IN_TRANSIT') return 'in_transit'
  if (status === 'RESTOCK_DELIVERED') return 'delivered'
  if (status === 'RESTOCK_COMPLETED') return 'completed'
  return 'pending'
}

export function formatShortTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelativeTime(dateStr: string): string {
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function buildDateSearchText(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const isoDate = d.toISOString().slice(0, 10)
  const localDefault = d.toLocaleDateString()
  const enIn = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const enUs = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const slashDmy = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `${isoDate} ${localDefault} ${enIn} ${enUs} ${slashDmy}`.toLowerCase()
}

export function matchesRestockSearch(notif: VendorNotification, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true

  const materialName = (notif.rawMaterial?.name || notif.metadata?.materialName || '').toLowerCase()
  const sku = (notif.rawMaterial?.sku || notif.metadata?.sku || '').toLowerCase()
  const location = [notif.rawMaterial?.location, notif.metadata?.location]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const vendorName = (
    notif.rawMaterial?.vendor?.name ||
    notif.metadata?.vendorName ||
    notif.recipient?.name ||
    ''
  ).toLowerCase()
  const vendorEmail = (
    notif.rawMaterial?.vendor?.email ||
    notif.recipient?.email ||
    ''
  ).toLowerCase()
  const dateText = [
    notif.createdAt,
    notif.metadata?.acknowledgedAt,
    notif.metadata?.inTransitAt,
    notif.metadata?.deliveredAt,
    notif.metadata?.completedAt,
  ]
    .map(buildDateSearchText)
    .join(' ')

  const searchableText = `${materialName} ${sku} ${location} ${vendorName} ${vendorEmail} ${dateText}`
  const tokens = q.split(/\s+/).filter(Boolean)
  return tokens.every((token) => searchableText.includes(token))
}

function emitVendorNotificationsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rms:vendor-notifications-updated'))
  }
}

export function VendorDashboardView({ mode = 'dashboard' }: { mode?: 'dashboard' | 'requests' }) {
  const router = useRouter()
  const isRequestsMode = mode === 'requests'

  const { auth, loading: authLoading } = useAuthContext()
  const [notifications, setNotifications] = useState<VendorNotification[]>([])
  const [serverUnreadCount, setServerUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(5)

  const [actionModal, setActionModal] = useState<{
    mode: RestockModalMode
    notif: VendorNotification
  } | null>(null)
  const [modalQty, setModalQty] = useState<string>('20')
  const [modalUnit, setModalUnit] = useState<string>('kg')
  const [modalNotes, setModalNotes] = useState<string>('')
  const [submittingModal, setSubmittingModal] = useState(false)

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'error'
    message: string
  } | null>(null)

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchAbortRef = useRef<AbortController | null>(null)

  const showFeedback = useCallback((type: 'success' | 'info' | 'error', message: string) => {
    setFeedback({ type, message })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null)
    }, 4500)
  }, [])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      fetchAbortRef.current?.abort()
    }
  }, [])

  // Apply ?status= filter on requests page
  useEffect(() => {
    if (!isRequestsMode || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get('status') as FilterMode | null
    if (statusParam && VALID_FILTER_MODES.has(statusParam)) {
      setFilterMode(statusParam)
    }
  }, [isRequestsMode])

  const isVendorRole = String(auth?.role || '').toUpperCase() === 'VENDOR'
  const scopedVendorId = isVendorRole && auth?.id ? auth.id : ''

  // Fetch Vendor Notifications with AbortController and cache bypass
  const fetchNotifications = useCallback(async () => {
    if (authLoading) return

    fetchAbortRef.current?.abort()
    const controller = new AbortController()
    fetchAbortRef.current = controller

    try {
      const qs = scopedVendorId ? `&recipientId=${encodeURIComponent(scopedVendorId)}` : ''
      const res = await fetch(`/api/dashboard-notifications?role=VENDOR${qs}&limit=50`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const json = await res.json()
      if (json.success && json.data) {
        setNotifications(json.data.notifications || [])
        setServerUnreadCount(json.data.unreadCount ?? 0)
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Error fetching vendor notifications:', err)
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [authLoading, scopedVendorId])

  // Visibility-aware polling every 10s + focus sync + instant sync when TopNavbar marks items read
  useEffect(() => {
    if (authLoading) return
    fetchNotifications()

    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchNotifications()
      }
    }, 10000)

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchNotifications()
      }
    }

    const handleExternalSync = () => {
      fetchNotifications()
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)
    window.addEventListener('rms:vendor-notifications-updated', handleExternalSync)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      window.removeEventListener('rms:vendor-notifications-updated', handleExternalSync)
    }
  }, [authLoading, fetchNotifications])

  // Single-pass counts + filtered list
  const { stageCounts, filteredNotifications, localUnreadCount } = useMemo(() => {
    const counts: Record<StageKey, number> = {
      pending: 0,
      in_progress: 0,
      in_transit: 0,
      delivered: 0,
      completed: 0,
    }
    const filtered: VendorNotification[] = []
    let unread = 0

    for (const notif of notifications) {
      if (!notif.isRead) unread++
      const stage = getStageKey(notif.status)
      counts[stage]++
      if (filterMode !== 'all' && filterMode !== stage) continue
      if (isRequestsMode && !matchesRestockSearch(notif, searchQuery)) continue
      filtered.push(notif)
    }

    return { stageCounts: counts, filteredNotifications: filtered, localUnreadCount: unread }
  }, [notifications, filterMode, isRequestsMode, searchQuery])

  const unreadCount =
    notifications.length < 50 ? localUnreadCount : Math.max(localUnreadCount, serverUnreadCount)

  const dropdownNotifications = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead)
    const read = notifications.filter((n) => n.isRead)
    return [...unread, ...read].slice(0, 12)
  }, [notifications])

  const handleMarkAsRead = useCallback(
    async (notifId: string, silent = false) => {
      const target = notifications.find((n) => n.id === notifId)
      if (!target || target.isRead) return

      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)))
      setServerUnreadCount((c) => Math.max(0, c - 1))

      try {
        if (!silent) setActingId(notifId)
        const res = await fetch('/api/dashboard-notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', id: notifId }),
        })
        if (!res.ok) throw new Error('Failed')
        emitVendorNotificationsUpdated()
        if (!silent) showFeedback('info', 'Alert marked as read')
      } catch {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, isRead: false } : n))
        )
        setServerUnreadCount((c) => c + 1)
        if (!silent) showFeedback('error', 'Failed to update alert status')
      } finally {
        if (!silent) setActingId(null)
      }
    },
    [notifications, showFeedback]
  )

  const handleMarkAllRead = useCallback(async () => {
    const prevSnapshot = notifications
    const prevUnread = serverUnreadCount

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setServerUnreadCount(0)

    try {
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          id: 'all',
          role: 'VENDOR',
          recipientId: scopedVendorId || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      emitVendorNotificationsUpdated()
      showFeedback('info', 'All alerts marked as read')
    } catch {
      setNotifications(prevSnapshot)
      setServerUnreadCount(prevUnread)
      showFeedback('error', 'Failed to mark alerts as read')
    }
  }, [notifications, serverUnreadCount, scopedVendorId, showFeedback])

  const focusNotification = useCallback(
    (notif: VendorNotification) => {
      setBellOpen(false)
      setFilterMode('all')
      setSearchQuery('')

      const indexInAll = notifications.findIndex((n) => n.id === notif.id)
      setCurrentPage(indexInAll >= 0 ? Math.floor(indexInAll / itemsPerPage) + 1 : 1)

      if (!notif.isRead) {
        handleMarkAsRead(notif.id, true)
      }

      setHighlightedId(notif.id)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 3000)

      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.getElementById(`vendor-notif-${notif.id}`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 60)
      })
    },
    [notifications, itemsPerPage, handleMarkAsRead]
  )

  // Listen for ?notif=<id> URL param or TopNavbar navigation events in requests mode
  useEffect(() => {
    if (!isRequestsMode || notifications.length === 0 || typeof window === 'undefined') return

    const handleNavEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ notifId?: string }>).detail
      if (!detail?.notifId) return
      const match = notifications.find((n) => n.id === detail.notifId)
      if (match) focusNotification(match)
    }

    const params = new URLSearchParams(window.location.search)
    const urlNotifId = params.get('notif')
    if (urlNotifId) {
      const match = notifications.find((n) => n.id === urlNotifId)
      if (match) {
        focusNotification(match)
        params.delete('notif')
        const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
        window.history.replaceState({}, '', cleanUrl)
      }
    }

    window.addEventListener('rms:notification-navigate', handleNavEvent)
    return () => window.removeEventListener('rms:notification-navigate', handleNavEvent)
  }, [isRequestsMode, notifications, focusNotification])

  const handleStageAction = async (
    notifId: string,
    action: 'accept_request' | 'mark_in_transit',
    vendorNotes: string,
    successMessage: string,
    failureMessage: string
  ) => {
    try {
      setActingId(notifId)
      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: notifId, vendorNotes }),
      })
      const json = await res.json()
      if (json.success) {
        if (json.data) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notifId ? { ...n, ...json.data } : n))
          )
        }
        showFeedback('success', successMessage)
        emitVendorNotificationsUpdated()
        fetchNotifications()
      } else {
        showFeedback('error', json.message || failureMessage)
      }
    } catch {
      showFeedback('error', failureMessage)
    } finally {
      setActingId(null)
    }
  }

  const openActionModal = (modeType: RestockModalMode, notif: VendorNotification) => {
    const currentQty = notif.rawMaterial?.quantity ?? notif.metadata?.currentQuantity ?? 0
    const minThreshold = notif.rawMaterial?.minThreshold ?? notif.metadata?.minThreshold ?? 10
    const baseUnit = notif.rawMaterial?.weightUnit || notif.metadata?.weightUnit || 'kg'
    const suggestedQty = Math.max(10, Math.ceil(minThreshold * 2 - currentQty))
    const initialQty = notif.metadata?.plannedQuantity ?? suggestedQty
    const initialUnit =
      modeType === 'accept'
        ? notif.metadata?.plannedUnit || baseUnit
        : notif.metadata?.deliveredUnit || notif.metadata?.plannedUnit || baseUnit

    setActionModal({ mode: modeType, notif })
    setModalQty(String(initialQty))
    setModalUnit(initialUnit)
    setModalNotes(RESTOCK_MODAL_CONFIG[modeType].defaultNotes)
  }

  const handleSubmitActionModal = async () => {
    if (!actionModal) return
    const { mode: modalMode, notif } = actionModal
    const qty = Number(modalQty)
    if (!Number.isFinite(qty) || qty <= 0) {
      showFeedback(
        'error',
        modalMode === 'accept'
          ? 'Please provide a valid quantity to deliver greater than 0'
          : 'Please provide a valid delivered quantity greater than 0'
      )
      return
    }

    const materialName = notif.rawMaterial?.name || notif.metadata?.materialName || 'Raw Material'
    const selectedUnit =
      modalUnit || notif.rawMaterial?.weightUnit || notif.metadata?.weightUnit || 'kg'
    const trimmedNotes = modalNotes.trim()

    try {
      setSubmittingModal(true)
      const payload =
        modalMode === 'accept'
          ? {
              action: 'accept_request',
              id: notif.id,
              plannedQuantity: qty,
              unit: selectedUnit,
              vendorNotes:
                trimmedNotes ||
                `Accepted by ${auth?.name || 'Vendor'} — will deliver ${qty} ${selectedUnit}.`,
            }
          : {
              action: 'mark_delivered',
              id: notif.id,
              deliveredQuantity: qty,
              unit: selectedUnit,
              vendorNotes: trimmedNotes,
            }

      const res = await fetch('/api/dashboard-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        const updatedNotifData = json.data?.notification || json.data
        const updatedRawMat = json.data?.rawMaterial
        if (updatedNotifData || updatedRawMat) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notif.id
                ? {
                    ...n,
                    ...(updatedNotifData || {}),
                    ...(updatedRawMat ? { rawMaterial: { ...n.rawMaterial, ...updatedRawMat } } : {}),
                  }
                : n
            )
          )
        }
        showFeedback(
          'success',
          modalMode === 'accept'
            ? `Accepted "${materialName}" for ${qty} ${selectedUnit}. Status is now Request In Progress.`
            : json.message ||
                `Delivered +${qty} ${selectedUnit} of "${materialName}"! Warehouse inventory updated automatically.`
        )
        setActionModal(null)
        emitVendorNotificationsUpdated()
        fetchNotifications()
      } else {
        showFeedback(
          'error',
          json.message ||
            (modalMode === 'accept' ? 'Failed to accept restock request' : 'Failed to mark restock delivered')
        )
      }
    } catch {
      showFeedback(
        'error',
        modalMode === 'accept' ? 'Error accepting restock request' : 'Error recording delivery'
      )
    } finally {
      setSubmittingModal(false)
    }
  }

  const handleFilterChange = (nextMode: FilterMode) => {
    setFilterMode(nextMode)
    setCurrentPage(1)
  }

  const totalItems = filteredNotifications.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedNotifications = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage
    return filteredNotifications.slice(start, start + itemsPerPage)
  }, [filteredNotifications, safeCurrentPage, itemsPerPage])

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(safeCurrentPage * itemsPerPage, totalItems)
  const recentNotifications = useMemo(() => notifications.slice(0, 5), [notifications])

  const feedbackBanner = feedback ? (
    <div
      className={cn(
        'flex items-center justify-between p-3.5 rounded-xl border text-sm shadow-sm transition-all',
        feedback.type === 'success' &&
          'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium',
        feedback.type === 'info' && 'bg-primary/10 border-primary/20 text-primary',
        feedback.type === 'error' &&
          'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
      )}
    >
      <div className="flex items-center gap-2">
        {feedback.type === 'success' && <CheckCircle2 className="size-4 shrink-0" />}
        {feedback.type === 'info' && <Bell className="size-4 shrink-0" />}
        {feedback.type === 'error' && <AlertTriangle className="size-4 shrink-0" />}
        <span>{feedback.message}</span>
      </div>
      <button
        type="button"
        onClick={() => setFeedback(null)}
        className="text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
      >
        ✕
      </button>
    </div>
  ) : null

  // DASHBOARD MODE (/dashboard): Welcome Banner + KPI Summary Cards + Recent Activity Preview
  if (!isRequestsMode) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {feedbackBanner}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-xs">
              <Truck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vendor Portal &amp; Restock Center</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Logged in as <strong className="text-foreground">{auth?.name || 'Registered Vendor'}</strong>{' '}
                {auth?.email ? `(${auth.email})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true)
                fetchNotifications()
              }}
              disabled={refreshing}
              className="gap-1.5 h-9 text-xs cursor-pointer"
            >
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>

            <Popover
              open={bellOpen}
              onOpenChange={(open) => {
                setBellOpen(open)
                if (open) fetchNotifications()
              }}
            >
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Open vendor restock notifications"
                    className={cn(
                      'flex items-center gap-2 h-9 px-3 rounded-lg border transition-all cursor-pointer',
                      unreadCount > 0
                        ? 'bg-orange-500/10 border-orange-500/40 hover:bg-orange-500/15'
                        : 'bg-muted/60 border-border hover:bg-muted'
                    )}
                  />
                }
              >
                <div className="relative flex items-center justify-center">
                  <Bell
                    className={cn(
                      'size-4 text-foreground',
                      unreadCount > 0 && 'text-orange-500 animate-bounce'
                    )}
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} New Alert${unreadCount > 1 ? 's' : ''}`
                    : 'All Caught Up'}
                </span>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[340px] sm:w-[400px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl gap-0"
              >
                <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 via-muted/40 to-amber-500/10 border-b border-border/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <Bell className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold tracking-tight text-foreground truncate">
                          Vendor Restock Alerts
                        </span>
                        {unreadCount > 0 && (
                          <Badge className="text-[10px] h-4.5 px-1.5 bg-orange-600 text-white border-0 font-bold">
                            {unreadCount} new
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Click any alert to open it in Restock Requests
                      </p>
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-background/70 transition-colors cursor-pointer shrink-0"
                    >
                      <CheckCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[340px] overflow-y-auto divide-y divide-border/50">
                  {dropdownNotifications.length > 0 ? (
                    dropdownNotifications.map((notif) => {
                      const stage = getStageKey(notif.status)
                      const cfg = STAGE_CONFIG[stage]
                      const StageIcon = cfg.Icon
                      const materialName =
                        notif.rawMaterial?.name || notif.metadata?.materialName || 'Raw Material'
                      const sku = notif.rawMaterial?.sku || notif.metadata?.sku

                      return (
                        <div
                          key={notif.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setBellOpen(false)
                            if (!notif.isRead) handleMarkAsRead(notif.id, true)
                            router.push(`/vendor/dashboard?notif=${encodeURIComponent(notif.id)}`)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setBellOpen(false)
                              if (!notif.isRead) handleMarkAsRead(notif.id, true)
                              router.push(`/vendor/dashboard?notif=${encodeURIComponent(notif.id)}`)
                            }
                          }}
                          className={cn(
                            'group w-full text-left flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/60',
                            !notif.isRead
                              ? 'bg-orange-500/[0.06] border-l-2 border-l-orange-500'
                              : 'opacity-85 hover:opacity-100'
                          )}
                        >
                          <div
                            className={cn(
                              'size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                              cfg.kpiIconBg
                            )}
                          >
                            <StageIcon className="size-4" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={cn(
                                  'text-xs leading-snug line-clamp-1',
                                  !notif.isRead ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'
                                )}
                              >
                                {materialName}
                                {sku ? ` (${sku})` : ''}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0 font-mono pt-0.5">
                                {formatRelativeTime(notif.createdAt)}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 font-semibold', cfg.badgeClass)}>
                                {cfg.badgeLabel}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {!notif.isRead && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkAsRead(notif.id)
                                    }}
                                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline cursor-pointer"
                                  >
                                    Mark read
                                  </button>
                                )}
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 opacity-80 group-hover:opacity-100">
                                  View
                                  <ArrowUpRight className="size-3" />
                                </span>
                              </div>
                            </div>
                          </div>

                          {!notif.isRead && (
                            <span className="size-2 rounded-full bg-orange-600 shrink-0 mt-1.5 ring-2 ring-orange-500/20" />
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-10 px-6 text-center space-y-2">
                      <div className="size-10 rounded-2xl bg-muted/70 text-muted-foreground mx-auto flex items-center justify-center">
                        <Bell className="size-4 opacity-60" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">All caught up!</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Low stock restock alerts from warehouse managers will appear here.
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-4 py-2 bg-muted/30 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Restock Sync (10s)
                  </span>
                  {stageCounts.pending > 0 && (
                    <Link
                      href="/vendor/dashboard?status=pending"
                      onClick={() => setBellOpen(false)}
                      className="font-sans font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Filter Pending ({stageCounts.pending})
                    </Link>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              render={<Link href="/vendor/dashboard" />}
              size="sm"
              className="h-9 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs"
            >
              <Truck className="size-4" />
              Restock Requests
              <ArrowRight className="size-3.5 ml-0.5" />
            </Button>
          </div>
        </div>

        {/* KPI Cards for Lifecycle Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {STAGE_KEYS.map((stageKey, idx) => {
            const cfg = STAGE_CONFIG[stageKey]
            const count = stageCounts[stageKey]
            const Icon = cfg.Icon
            const isPendingHighlight = stageKey === 'pending' && count > 0

            return (
              <Card
                key={stageKey}
                onClick={() => router.push(`/vendor/dashboard?status=${stageKey}`)}
                className={cn(
                  'border shadow-xs transition-all cursor-pointer',
                  cfg.hoverBorder,
                  idx === STAGE_KEYS.length - 1 && 'col-span-2 sm:col-span-1',
                  isPendingHighlight
                    ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20'
                    : 'border-border/70'
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-3.5">
                  <CardTitle className={cn('text-[11px] font-semibold uppercase tracking-wider', cfg.accentText)}>
                    {cfg.kpiTitle}
                  </CardTitle>
                  <div
                    className={cn(
                      'p-1.5 rounded-lg',
                      stageKey === 'pending'
                        ? count > 0
                          ? 'bg-amber-500/20 text-amber-600 animate-pulse'
                          : 'bg-muted text-muted-foreground'
                        : cfg.kpiIconBg
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 pt-0">
                  <div className={cn('text-2xl font-bold', cfg.accentText)}>{count}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.kpiSubtitle}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Concise Recent Supply Activity Summary */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Recent Supply Activity</CardTitle>
                <Badge variant="outline" className="text-[11px] bg-muted/60 font-medium gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Summary of your latest warehouse alerts. Open Restock Requests to manage or fulfill orders.
              </CardDescription>
            </div>
            <Button
              render={<Link href="/vendor/dashboard" />}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 shrink-0 self-start sm:self-auto"
            >
              Open All Requests ({notifications.length})
              <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <div className="h-14 rounded-xl bg-muted/60 shimmer w-full" />
                <div className="h-14 rounded-xl bg-muted/60 shimmer w-full" />
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500/80 mb-2" />
                <p className="font-semibold text-sm">All caught up</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No restock alerts have been assigned yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentNotifications.map((notif) => {
                  const stage = getStageKey(notif.status)
                  const cfg = STAGE_CONFIG[stage]
                  const StageIcon = cfg.Icon
                  const materialName =
                    notif.rawMaterial?.name || notif.metadata?.materialName || 'Raw Material'
                  const sku = notif.rawMaterial?.sku || notif.metadata?.sku || 'RM-SKU'
                  const currentQty = notif.rawMaterial?.quantity ?? notif.metadata?.currentQuantity ?? 0
                  const weightUnit = notif.rawMaterial?.weightUnit || notif.metadata?.weightUnit || 'kg'

                  return (
                    <Link
                      key={notif.id}
                      href={`/vendor/dashboard?notif=${encodeURIComponent(notif.id)}`}
                      className={cn(
                        'p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors',
                        cfg.borderLeft
                      )}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{materialName}</span>
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                            {sku}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px] gap-1 px-1.5 py-0', cfg.badgeClass)}>
                            <StageIcon className="size-2.5" />
                            {cfg.badgeLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span>
                            Stock: <strong className="text-foreground">{currentQty} {weightUnit}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatShortTime(notif.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // REQUESTS MODE (/vendor/dashboard): Only Individual Restock Requests (No Dashboard Summaries)
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {feedbackBanner}

      <Card className="border border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Restock Requests
                </CardTitle>
                <Badge variant="outline" className="text-[11px] bg-muted/60 font-medium gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-sync: 10s
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                Individual low-stock restock requests synced directly with warehouse inventory.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <CheckCheck className="size-3.5" />
                  Mark All Read ({unreadCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshing(true)
                  fetchNotifications()
                }}
                disabled={refreshing}
                className="gap-1.5 h-8 px-2.5 text-xs cursor-pointer"
              >
                <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search Bar + Small Inline Status Filters on the Same Row */}
          <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between pt-2 border-t border-border/40">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search material, vendor, place, SKU, or date..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Search restock requests"
                className="pl-8 pr-7 h-8 text-xs bg-background/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 border border-border/50 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                className={cn(
                  'h-7 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer',
                  filterMode === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All ({notifications.length})
              </button>
              {STAGE_KEYS.map((stageKey) => {
                const cfg = STAGE_CONFIG[stageKey]
                return (
                  <button
                    key={stageKey}
                    type="button"
                    onClick={() => handleFilterChange(stageKey)}
                    className={cn(
                      'h-7 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer',
                      filterMode === stageKey
                        ? cn('bg-background shadow-xs', cfg.accentText)
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {cfg.tabLabel} ({stageCounts[stageKey]})
                  </button>
                )
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
              <div className="h-20 rounded-xl bg-muted/60 shimmer w-full" />
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full size-12 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="font-semibold text-base">No matching restock requests</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Try clearing your search query or switching the status filter.'
                  : filterMode === 'pending'
                  ? 'All low-stock items have been accepted. Great job!'
                  : 'No restock requests match the current status filter.'}
              </p>
              {(filterMode !== 'all' || searchQuery) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    handleFilterChange('all')
                  }}
                  className="mt-4 text-xs h-8 cursor-pointer"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {paginatedNotifications.map((notif) => {
                const materialName =
                  notif.rawMaterial?.name || notif.metadata?.materialName || 'Raw Material'
                const sku = notif.rawMaterial?.sku || notif.metadata?.sku || 'RM-SKU'
                const currentQty =
                  notif.rawMaterial?.quantity ?? notif.metadata?.currentQuantity ?? 0
                const minThreshold =
                  notif.rawMaterial?.minThreshold ?? notif.metadata?.minThreshold ?? 10
                const weightUnit = notif.rawMaterial?.weightUnit || notif.metadata?.weightUnit || 'kg'
                const weight =
                  notif.rawMaterial?.weight && notif.rawMaterial?.weightUnit
                    ? `${notif.rawMaterial.weight} ${notif.rawMaterial.weightUnit}`
                    : notif.metadata?.weight || 'Standard'
                const location =
                  notif.rawMaterial?.location || notif.metadata?.location || 'Main Warehouse'
                const resolvedVendor =
                  notif.recipient?.name || notif.metadata?.vendorName || auth?.name || ''

                const stage = getStageKey(notif.status)
                const cfg = STAGE_CONFIG[stage]
                const StageIcon = cfg.Icon
                const isActing = actingId === notif.id

                return (
                  <div
                    key={notif.id}
                    id={`vendor-notif-${notif.id}`}
                    className={cn(
                      'p-4 sm:p-5 transition-all flex flex-col gap-3.5 hover:bg-muted/10',
                      !notif.isRead && 'bg-orange-500/[0.03] dark:bg-orange-950/[0.12]',
                      cfg.borderLeft,
                      highlightedId === notif.id && 'ring-2 ring-orange-500 bg-orange-500/[0.08]'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground tracking-tight">
                          {materialName}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                          {sku}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[11px] gap-1 px-2 font-medium', cfg.badgeClass)}>
                          <StageIcon className="size-3" />
                          {cfg.badgeLabel}
                        </Badge>
                        {(stage === 'in_progress' || stage === 'in_transit') &&
                          notif.metadata?.plannedQuantity && (
                            <Badge
                              variant="outline"
                              className="text-[11px] gap-1 px-2 font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            >
                              <PackageCheck className="size-3" />
                              To Deliver: {notif.metadata.plannedQuantity}{' '}
                              {notif.metadata.plannedUnit || weightUnit}
                            </Badge>
                          )}
                        {!notif.isRead && (
                          <Badge className="text-[10px] bg-orange-500 text-white px-1.5 py-0">
                            Unread
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notif.id)}
                            disabled={isActing}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Mark Read
                          </Button>
                        )}

                        {stage === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionModal('accept', notif)}
                            disabled={isActing}
                            className="h-8 text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 cursor-pointer"
                          >
                            <Send className="size-3.5" />
                            Accept Request
                          </Button>
                        )}

                        {stage === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleStageAction(
                                notif.id,
                                'mark_in_transit',
                                `Restock shipment dispatched by ${resolvedVendor || 'Vendor'}. Goods are currently in transit.`,
                                `"${materialName}" marked as Restock In Transit! Order is on the way to warehouse.`,
                                'Failed to mark restock in transit'
                              )
                            }
                            disabled={isActing}
                            className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs gap-1.5 cursor-pointer"
                          >
                            <Truck className="size-3.5" />
                            {isActing ? 'Dispatching...' : 'Mark In Transit'}
                          </Button>
                        )}

                        {stage === 'in_transit' && (
                          <Button
                            size="sm"
                            onClick={() => openActionModal('deliver', notif)}
                            disabled={isActing}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs gap-1.5 cursor-pointer"
                          >
                            <PackageCheck className="size-3.5" />
                            Deliver &amp; Update Stock
                          </Button>
                        )}

                        {stage === 'delivered' && (
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge
                              variant="outline"
                              className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 px-2.5 py-0.5 font-semibold"
                            >
                              Restock Delivered
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {notif.metadata?.deliveredQuantity
                                ? `${notif.metadata.deliveredQuantity} ${weightUnit} • `
                                : ''}
                              Awaiting Manager Confirmation
                            </span>
                          </div>
                        )}

                        {stage === 'completed' && (
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge
                              variant="outline"
                              className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 font-semibold"
                            >
                              ✓ Restock Completed
                            </Badge>
                            {notif.metadata?.deliveredQuantity && (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                +{notif.metadata.deliveredQuantity} {weightUnit} supplied to stock
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                    {stage !== 'pending' && notif.metadata?.vendorNotes && (
                      <p className="text-[11px] text-foreground/80 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
                        <span className="font-semibold text-muted-foreground">Vendor Note: </span>
                        {notif.metadata.vendorNotes}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-xl border border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <Scale className="size-3.5 text-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Current Stock
                          </div>
                          <div className="font-bold text-foreground">
                            <span className={cn(currentQty <= minThreshold ? 'text-rose-600' : 'text-emerald-600')}>
                              {currentQty}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal ml-1">
                              {weightUnit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <ShieldAlert className="size-3.5 text-amber-500" />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Min Threshold
                          </div>
                          <div className="font-bold text-foreground">
                            {minThreshold}{' '}
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {weightUnit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <Package className="size-3.5 text-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Specification
                          </div>
                          <div className="font-bold text-foreground">{weight}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-background border border-border/50 shrink-0">
                          <MapPin className="size-3.5 text-orange-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Warehouse Location
                          </div>
                          <div className="font-semibold text-foreground break-words" title={location}>
                            {location}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 shrink-0" />
                        Alert received: {formatShortDate(notif.createdAt)} · {formatShortTime(notif.createdAt)}
                      </span>
                      {resolvedVendor && (
                        <span>
                          Vendor: <strong className="text-foreground font-medium">{resolvedVendor}</strong>
                        </span>
                      )}
                      {notif.metadata?.acknowledgedAt && (
                        <span className="text-sky-600 dark:text-sky-400 font-medium">
                          ✓ Accepted at {formatShortTime(notif.metadata.acknowledgedAt)}
                          {notif.metadata?.plannedQuantity
                            ? ` (Qty: ${notif.metadata.plannedQuantity} ${notif.metadata.plannedUnit || weightUnit})`
                            : ''}
                        </span>
                      )}
                      {notif.metadata?.inTransitAt && (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          🚚 In Transit at {formatShortTime(notif.metadata.inTransitAt)}
                        </span>
                      )}
                      {notif.metadata?.deliveredAt && (
                        <span className="text-teal-600 dark:text-teal-400 font-medium">
                          📦 Delivered
                          {notif.metadata?.deliveredQuantity
                            ? ` ${notif.metadata.deliveredQuantity} ${weightUnit}`
                            : ''}{' '}
                          at {formatShortTime(notif.metadata.deliveredAt)}
                        </span>
                      )}
                      {notif.metadata?.completedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✅ Confirmed &amp; Restocked at {formatShortTime(notif.metadata.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalItems > 0 && (
            <div className="p-4 border-t border-border/60 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground font-semibold">{startIndex}</strong> to{' '}
                  <strong className="text-foreground font-semibold">{endIndex}</strong> of{' '}
                  <strong className="text-foreground font-semibold">{totalItems}</strong> requests
                </span>

                <div className="flex items-center gap-1.5 pl-2 border-l border-border/50">
                  <span>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="h-7 text-xs rounded-md border border-input bg-background px-2 py-0 font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage <= 1}
                  title="First Page"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 5) return true
                      if (p === 1 || p === totalPages) return true
                      return Math.abs(p - safeCurrentPage) <= 1
                    })
                    .map((pageNum, idx, arr) => {
                      const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1
                      return (
                        <div key={pageNum} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-1 text-xs text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={safeCurrentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                              'size-8 text-xs p-0 font-medium',
                              safeCurrentPage === pageNum && 'font-bold'
                            )}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        </div>
                      )
                    })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  title="Next Page"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage >= totalPages}
                  title="Last Page"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(() => {
        const modalCfg = actionModal ? RESTOCK_MODAL_CONFIG[actionModal.mode] : null
        const modalNotif = actionModal?.notif ?? null
        const ModalIcon = modalCfg?.Icon ?? PackageCheck
        const baseModalUnit =
          modalNotif?.rawMaterial?.weightUnit || modalNotif?.metadata?.weightUnit || 'kg'
        const unitOptions = Array.from(
          new Set([baseModalUnit, 'kg', 'g', 'L', 'ml', 'pcs'])
        )

        return (
          <Dialog
            open={Boolean(actionModal)}
            onOpenChange={(open) => !open && !submittingModal && setActionModal(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ModalIcon className={cn('size-5', modalCfg?.iconClass)} />
                  {modalCfg?.title}
                </DialogTitle>
                <DialogDescription>
                  Confirm details for{' '}
                  <strong className="text-foreground">
                    {modalNotif?.rawMaterial?.name || modalNotif?.metadata?.materialName}
                  </strong>
                  . {modalCfg?.descriptionSuffix}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-semibold text-foreground">
                      {modalNotif?.rawMaterial?.location ||
                        modalNotif?.metadata?.location ||
                        'Main Warehouse'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Stock in Warehouse:</span>
                    <span className="font-semibold text-foreground">
                      {modalNotif?.rawMaterial?.quantity ??
                        modalNotif?.metadata?.currentQuantity ??
                        0}{' '}
                      {baseModalUnit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minimum Threshold:</span>
                    <span className="font-semibold text-amber-600">
                      {modalNotif?.rawMaterial?.minThreshold ??
                        modalNotif?.metadata?.minThreshold ??
                        10}{' '}
                      {baseModalUnit}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-2.5">
                    <div className="col-span-8 space-y-1.5">
                      <Label htmlFor="restock-modal-qty" className="text-xs font-semibold">
                        {modalCfg?.qtyLabel} ({modalUnit})
                      </Label>
                      <Input
                        id="restock-modal-qty"
                        type="number"
                        min="0.01"
                        step="any"
                        value={modalQty}
                        onChange={(e) => setModalQty(e.target.value)}
                        placeholder="e.g. 20"
                        className="h-10 text-sm font-semibold"
                      />
                    </div>
                    <div className="col-span-4 space-y-1.5">
                      <Label htmlFor="restock-modal-unit" className="text-xs font-semibold">
                        Unit
                      </Label>
                      <div className="relative">
                        <select
                          id="restock-modal-unit"
                          aria-label="Quantity unit"
                          value={modalUnit}
                          onChange={(e) => setModalUnit(e.target.value)}
                          className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{modalCfg?.qtyHint}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="restock-modal-notes" className="text-xs font-semibold">
                    {modalCfg?.notesLabel}
                  </Label>
                  <Input
                    id="restock-modal-notes"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder={modalCfg?.notesPlaceholder}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal(null)}
                  disabled={submittingModal}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitActionModal}
                  disabled={submittingModal}
                  className={modalCfg?.submitBtnClass}
                >
                  {submittingModal ? modalCfg?.submittingLabel : modalCfg?.submitLabel}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
