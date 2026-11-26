/**
 * Shared Phone Number Normalization & WhatsApp Link Utilities
 * Used across Customer Checkout, Bill Generation, Waiter/Admin Settlement, and Communication Ledger.
 */

const DEFAULT_COUNTRY_CODE = '91'

/**
 * Normalize a phone number string for database storage (respecting VarChar(20) limit).
 * Returns null if empty.
 */
export function normalizePhoneForStorage(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  return trimmed.slice(0, 20)
}

/**
 * Format a raw phone input into a clean E.164 digit string (without '+') suitable for https://wa.me/<digits>.
 * Handles:
 * - 10-digit local Indian numbers (e.g. 9876543210 -> 919876543210, even if starting with 91...)
 * - 11-digit numbers with leading 0 (e.g. 09876543210 -> 919876543210)
 * - 12-digit Indian numbers with 91 prefix (e.g. 919876543210 -> 919876543210)
 * - Explicit international numbers starting with '+' or '00' (e.g. +1 415 555 2671 -> 14155552671)
 *
 * Returns null if the number is empty, all-zeros, or invalid length.
 */
export function formatWhatsAppNumber(
  raw?: string | null,
  defaultCountryCode = DEFAULT_COUNTRY_CODE
): string | null {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed) return null

  const hasPlusPrefix = trimmed.startsWith('+')
  const hasDoubleZeroPrefix = trimmed.startsWith('00')

  let digits = trimmed.replace(/[^0-9]/g, '')
  if (!digits || /^0+$/.test(digits)) return null

  if (hasDoubleZeroPrefix && digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (hasPlusPrefix || hasDoubleZeroPrefix) {
    return digits.length >= 8 && digits.length <= 15 ? digits : null
  }

  // Local 11-digit format starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    const local10 = digits.slice(1)
    return /^0+$/.test(local10) ? null : `${defaultCountryCode}${local10}`
  }

  // Standard 10-digit mobile number (always prepend default country code, even if digits start with 91)
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`
  }

  // Already includes default country code (e.g. 91 + 10 digits = 12 digits)
  if (digits.length === 10 + defaultCountryCode.length && digits.startsWith(defaultCountryCode)) {
    return digits
  }

  // General international E.164 digit length without '+'
  if (digits.length >= 11 && digits.length <= 15) {
    return digits
  }

  return null
}

/**
 * Validate whether a phone input can be used for WhatsApp messaging.
 */
export function isValidWhatsAppPhone(raw?: string | null): boolean {
  return formatWhatsAppNumber(raw) !== null
}

/**
 * Format a WhatsApp number for human-readable display (e.g., +91 98765 43210).
 */
export function formatPhoneForDisplay(raw?: string | null): string {
  const waDigits = formatWhatsAppNumber(raw)
  if (!waDigits) return raw?.trim() || ''
  if (waDigits.length === 12 && waDigits.startsWith('91')) {
    return `+91 ${waDigits.slice(2, 7)} ${waDigits.slice(7)}`
  }
  return `+${waDigits}`
}

/**
 * Build a ready-to-open https://wa.me URL.
 * Returns null when no valid phone number is provided (never falls back to a dummy number).
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const waDigits = formatWhatsAppNumber(phone)
  if (!waDigits) return null
  return `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`
}
