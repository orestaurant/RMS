'use client'

import { create } from 'zustand'
import type { OrderItem, PaymentMethod } from './mock-data'

// ── UI Store ──────────────────────────────────────────────────────────────

interface UIStore {
  sidebarCollapsed: boolean
  commandOpen: boolean
  activeModule: string
  theme: 'dark' | 'light' | 'system'
  setSidebarCollapsed: (v: boolean) => void
  setCommandOpen: (v: boolean) => void
  setActiveModule: (v: string) => void
  setTheme: (v: 'dark' | 'light' | 'system') => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  commandOpen: false,
  activeModule: 'dashboard',
  theme: 'dark',
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setCommandOpen: (v) => set({ commandOpen: v }),
  setActiveModule: (v) => set({ activeModule: v }),
  setTheme: (v) => set({ theme: v }),
}))

// ── POS Cart Store ────────────────────────────────────────────────────────

interface POSStore {
  selectedTableId: string | null
  cartItems: OrderItem[]
  discount: number
  paymentMethod: PaymentMethod
  notes: string
  setSelectedTable: (id: string | null) => void
  addItem: (item: Omit<OrderItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  setDiscount: (v: number) => void
  setPaymentMethod: (v: PaymentMethod) => void
  setNotes: (v: string) => void
  clearCart: () => void
  getSubtotal: () => number
  getTax: () => number
  getTotal: () => number
}

export const usePOSStore = create<POSStore>((set, get) => ({
  selectedTableId: null,
  cartItems: [],
  discount: 0,
  paymentMethod: 'cash',
  notes: '',

  setSelectedTable: (id) => set({ selectedTableId: id }),

  addItem: (item) => {
    const existing = get().cartItems.find((i) => i.menuItemId === item.menuItemId)
    if (existing) {
      set((s) => ({
        cartItems: s.cartItems.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }))
    } else {
      set((s) => ({
        cartItems: [...s.cartItems, { ...item, id: `ci-${Date.now()}` }],
      }))
    }
  },

  removeItem: (id) =>
    set((s) => ({ cartItems: s.cartItems.filter((i) => i.id !== id) })),

  updateQuantity: (id, qty) => {
    if (qty <= 0) {
      get().removeItem(id)
      return
    }
    set((s) => ({
      cartItems: s.cartItems.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    }))
  },

  setDiscount: (v) => set({ discount: v }),
  setPaymentMethod: (v) => set({ paymentMethod: v }),
  setNotes: (v) => set({ notes: v }),
  clearCart: () => set({ cartItems: [], discount: 0, notes: '' }),

  getSubtotal: () =>
    get().cartItems.reduce((s, i) => s + i.price * i.quantity, 0),

  getTax: () => {
    const subtotal = get().getSubtotal()
    const discount = get().discount
    return Math.round((subtotal - discount) * 0.05)
  },

  getTotal: () => {
    const subtotal = get().getSubtotal()
    const discount = get().discount
    const tax = get().getTax()
    return subtotal - discount + tax
  },
}))
