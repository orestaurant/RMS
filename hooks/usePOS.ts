/**
 * Custom hooks for POS Terminal
 * Handles data fetching from backend APIs with loading, error, and retry states
 */

import { useState, useEffect, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for fetching POS menu items and categories
 */
export interface MenuItem {
  id: string
  name: string
  description: string
  category: string
  price: number
  image: string
  isVeg: boolean
  isAvailable: boolean
  gst: number
  rating: number
  prepTime: number
  variants: Array<{ id: string; name: string; price: number }>
  modifiers: Array<{
    id: string
    name: string
    isMultiSelect: boolean
    options: Array<{ id: string; name: string; price: number }>
  }>
  tags: string[]
}

export interface MenuCategory {
  id: string
  label: string
  icon: string
}

export interface UsePOSMenuReturn {
  categories: MenuCategory[]
  items: MenuItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const posMenuClientCache: Record<string, { categories: MenuCategory[]; items: MenuItem[] }> = {}

export function usePOSMenu(branchId: string): UsePOSMenuReturn {
  const cached = branchId ? posMenuClientCache[branchId] : null
  const [categories, setCategories] = useState<MenuCategory[]>(cached?.categories || [])
  const [items, setItems] = useState<MenuItem[]>(cached?.items || [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  const fetchMenu = useCallback(async (silent = false) => {
    if (!branchId) return

    try {
      if (!silent && !posMenuClientCache[branchId]) {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(`/api/pos/menu?branchId=${branchId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch menu')
      }

      const fetchedCategories = data.data.categories || []
      const fetchedItems = data.data.items || []

      setCategories(fetchedCategories)
      setItems(fetchedItems)

      posMenuClientCache[branchId] = {
        categories: fetchedCategories,
        items: fetchedItems,
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load menu')
      if (!posMenuClientCache[branchId]) {
        setCategories([])
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchMenu(!!posMenuClientCache[branchId])
  }, [branchId, fetchMenu])

  return { categories, items, loading, error, refetch: () => fetchMenu(false) }
}

// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for fetching POS tables
 */
export interface POSTable {
  id: string
  tableNumber: string
  capacity: number
  section: string | null
  status: string
}

export interface UsePOSTablesReturn {
  tables: POSTable[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePosTables(branchId: string): UsePOSTablesReturn {
  const [tables, setTables] = useState<POSTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
    if (!branchId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/pos/tables?branchId=${branchId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tables')
      }

      // Response structure: { data: { data: [...], meta: {...} } }
      setTables(data.data?.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load tables')
      setTables([])
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchTables()
  }, [branchId, fetchTables])

  return { tables, loading, error, refetch: fetchTables }
}

// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for searching customers
 */
export interface Customer {
  id: string
  phone: string
  firstName: string | null
  lastName: string | null
  email: string | null
}

export interface UseCustomerSearchReturn {
  results: Customer[]
  loading: boolean
  error: string | null
  search: (query: string) => Promise<void>
}

export function useCustomerSearch(): UseCustomerSearchReturn {
  const [results, setResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/pos/customers/search?query=${encodeURIComponent(query)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to search customers')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, loading, error, search }
}

// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for creating orders
 */
export interface CreateOrderItem {
  menuItemId: string
  variantId?: string
  quantity: number
  modifiers?: Array<{ modifierId: string; modifierName: string; price: number }>
  specialInstructions?: string
}

export interface UseCreateOrderReturn {
  loading: boolean
  error: string | null
  success: boolean
  orderId: string | null
  orderNumber: string | null
  createOrder: (request: {
    branchId: string
    tableId?: string
    customerId?: string
    orderType: 'dine_in' | 'takeaway' | 'delivery'
    items: CreateOrderItem[]
    discount?: number
    notes?: string
  }) => Promise<void>
}

export function useCreateOrder(): UseCreateOrderReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const createOrder = useCallback(async (request: any) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order')
      }

      setOrderId(data.data.id)
      setOrderNumber(data.data.orderNumber)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to create order')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, success, orderId, orderNumber, createOrder }
}

// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for creating bills
 */
export interface UseCreateBillReturn {
  loading: boolean
  error: string | null
  success: boolean
  billId: string | null
  billNumber: string | null
  totalAmount: number | null
  createBill: (request: { orderId: string; discount?: number }) => Promise<void>
}

export function useCreateBill(): UseCreateBillReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [billId, setBillId] = useState<string | null>(null)
  const [billNumber, setBillNumber] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState<number | null>(null)

  const createBill = useCallback(async (request: any) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bill')
      }

      setBillId(data.data.id)
      setBillNumber(data.data.billNumber)
      setTotalAmount(data.data.totalAmount)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to create bill')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, success, billId, billNumber, totalAmount, createBill }
}

// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for recording payments
 */
export interface UseCreatePaymentReturn {
  loading: boolean
  error: string | null
  success: boolean
  paymentId: string | null
  recordPayment: (request: {
    billId: string
    amount: number
    paymentMethod: string
    referenceNumber?: string
    transactionId?: string
    notes?: string
  }) => Promise<void>
}

export function useCreatePayment(): UseCreatePaymentReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const recordPayment = useCallback(async (request: any) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record payment')
      }

      setPaymentId(data.data.paymentId)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to record payment')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, success, paymentId, recordPayment }
}

// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for sending orders to kitchen
 */
export interface UseSendOrderToKitchenReturn {
  loading: boolean
  error: string | null
  success: boolean
  ticketNumber: string | null
  sendToKitchen: (orderId: string) => Promise<void>
}

export function useSendOrderToKitchen(): UseSendOrderToKitchenReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)

  const sendToKitchen = useCallback(async (orderId: string) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch(`/api/orders/${orderId}/send-to-kitchen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send order to kitchen')
      }

      setTicketNumber(data.data.ticketNumber)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send order to kitchen')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, success, ticketNumber, sendToKitchen }
}
