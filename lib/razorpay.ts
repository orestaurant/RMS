/**
 * Razorpay Integration Utilities
 * Handles Razorpay payment gateway operations
 */

import crypto from 'crypto'

export interface RazorpayOrderOptions {
  amount: number // in paise (multiply by 100)
  currency: string
  receipt: string
  notes?: Record<string, string>
}

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: 'created' | 'paid' | 'attempted' | 'cancelled'
  created_at: number
  notes?: Record<string, string>
}

export interface RazorpayPaymentVerification {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(
  options: RazorpayOrderOptions
): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured')
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes,
      payment_capture: 1, // Auto capture
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Razorpay order: ${error}`)
  }

  return response.json()
}

/**
 * Verify Razorpay payment signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keySecret) {
    throw new Error('Razorpay key secret not configured')
  }

  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Fetch Razorpay payment details
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<any> {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured')
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch Razorpay payment: ${error}`)
  }

  return response.json()
}

/**
 * Get Razorpay key ID for frontend
 */
export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) {
    throw new Error('Razorpay key ID not configured')
  }
  return keyId
}

/**
 * Convert rupees to paise (Razorpay expects amount in paise)
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/**
 * Convert paise to rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100
}
