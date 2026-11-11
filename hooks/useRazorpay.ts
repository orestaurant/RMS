'use client'

import { useCallback, useState } from 'react'

export interface RazorpayCheckoutOptions {
  billId: string
  amount: number
  billNumber: string
  onSuccess: (response: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) => Promise<void>
  onFailure: (error: any) => void
}

export interface UseRazorpayReturn {
  initiateCheckout: (options: RazorpayCheckoutOptions) => Promise<void>
  loading: boolean
  error: string | null
}

declare global {
  interface Window {
    Razorpay: any
  }
}

/**
 * Hook for Razorpay payment integration
 */
export function useRazorpay(): UseRazorpayReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Razorpay script
  const loadRazorpayScript = useCallback(async () => {
    if (window.Razorpay) {
      return true
    }

    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }, [])

  const initiateCheckout = useCallback(
    async (options: RazorpayCheckoutOptions) => {
      try {
        setLoading(true)
        setError(null)

        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript()
        if (!scriptLoaded) {
          throw new Error('Failed to load Razorpay checkout')
        }

        // Create Razorpay order
        const orderResponse = await fetch('/api/payments/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billId: options.billId,
            amount: options.amount,
          }),
        })

        if (!orderResponse.ok) {
          const data = await orderResponse.json()
          throw new Error(data.error || 'Failed to create Razorpay order')
        }

        const orderData = await orderResponse.json()
        const { razorpayOrderId, razorpayKey } = orderData.data

        // Initialize Razorpay checkout
        const checkout = new window.Razorpay({
          key: razorpayKey,
          order_id: razorpayOrderId,
          amount: options.amount * 100, // Convert to paise
          currency: 'INR',
          name: 'Restaurant POS',
          description: `Payment for Bill ${options.billNumber}`,
          handler: async (response: any) => {
            try {
              // Verify payment on server
              const verifyResponse = await fetch('/api/payments/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  billId: options.billId,
                }),
              })

              if (!verifyResponse.ok) {
                const data = await verifyResponse.json()
                throw new Error(data.error || 'Payment verification failed')
              }

              // Call success callback
              await options.onSuccess(response)
            } catch (err: any) {
              setError(err.message)
              options.onFailure(err)
            }
          },
          prefill: {
            name: '',
            email: '',
            contact: '',
          },
          theme: {
            color: '#3b82f6', // Primary blue
          },
          modal: {
            ondismiss: () => {
              setError('Payment cancelled by user')
              options.onFailure(new Error('Payment cancelled'))
            },
          },
        })

        // Open checkout
        checkout.open()
      } catch (err: any) {
        setError(err.message)
        options.onFailure(err)
      } finally {
        setLoading(false)
      }
    },
    [loadRazorpayScript]
  )

  return { initiateCheckout, loading, error }
}
