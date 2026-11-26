import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const ACTIVE_ORDER_DB_STATUSES = [
  'pending',
  'PENDING',
  'accepted',
  'ACCEPTED',
  'confirmed',
  'preparing',
  'PREPARING',
  'ready',
  'READY',
  'served',
  'SERVED',
] as const

const NUMERIC_TABLE_PATTERN = /^(?:table\s*|t+|#)?0*(\d+)$/i

export function normalizeTableLookupKey(input?: string | number | null): string {
  const clean = String(input ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!clean) return ''

  const match = clean.match(NUMERIC_TABLE_PATTERN)
  if (match?.[1]) {
    return match[1]
  }
  return clean.toLowerCase()
}

export function buildTableNumberVariants(input: string): string[] {
  const clean = String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!clean) return []

  const variants = new Set<string>([clean, clean.toLowerCase(), clean.toUpperCase()])
  const match = clean.match(NUMERIC_TABLE_PATTERN)

  if (match?.[1]) {
    const num = match[1]
    const padded = num.length === 1 ? `0${num}` : num
    variants.add(num)
    variants.add(padded)
    variants.add(`T${num}`)
    variants.add(`t${num}`)
    variants.add(`T${padded}`)
    variants.add(`Table ${num}`)
    variants.add(`table ${num}`)
    variants.add(`Table ${padded}`)
  }

  return Array.from(variants).filter(Boolean)
}

export function getEffectiveTableStatus(status?: string | null, metadata?: unknown): string {
  const meta =
    metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : null
  const customStatus = meta?.customStatus
  return String(customStatus || status || 'available')
    .trim()
    .toLowerCase()
}

export function isTableAvailableStatus(status?: string | null, metadata?: unknown): boolean {
  return getEffectiveTableStatus(status, metadata) === 'available'
}

export function findMatchingTable<T extends { id?: string; tableNumber: string }>(
  tables: T[],
  tableRef?: string | null,
  tableId?: string | null
): T | undefined {
  if (tableId) {
    const byId = tables.find((t) => t.id === tableId)
    if (byId) return byId
  }

  const cleanRef = String(tableRef ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!cleanRef) return undefined

  const lowerRef = cleanRef.toLowerCase()
  const exactMatch = tables.find((t) => t.tableNumber.trim().toLowerCase() === lowerRef)
  if (exactMatch) return exactMatch

  const normalizedRef = normalizeTableLookupKey(cleanRef)
  if (!normalizedRef) return undefined

  return tables.find((t) => normalizeTableLookupKey(t.tableNumber) === normalizedRef)
}

export function formatUnavailableTableMessage(tableNumber: string, status: string): string {
  const label = tableNumber.toLowerCase().startsWith('table')
    ? tableNumber
    : `Table ${tableNumber}`

  switch (status.toLowerCase()) {
    case 'occupied':
      return `${label} is already occupied. Please select an available table.`
    case 'reserved':
      return `${label} is currently reserved. Please select an available table.`
    case 'cleaning':
      return `${label} is currently being cleaned. Please select an available table.`
    case 'out_of_service':
    case 'maintenance':
      return `${label} is currently unavailable. Please select an available table.`
    default:
      return `${label} is not available for booking right now. Please select an available table.`
  }
}
