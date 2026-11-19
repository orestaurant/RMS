/**
 * OAuth Utility Functions
 * Centralized, production-resilient canonical origin and redirect URI resolver.
 * Handles reverse proxies, HTTPS enforcement, and strictly matches production redirect URIs:
 * - Google:   https://rms-nu-mauve.vercel.app/api/auth/callback/google
 * - Facebook: https://rms-nu-mauve.vercel.app/api/auth/callback/facebook
 */

import { NextRequest } from 'next/server'

/**
 * Resolves the true public canonical origin of the application.
 * Automatically handles reverse proxies (Nginx, Cloudflare, AWS, Vercel, Railway, Render),
 * SSL termination, and prevents hardcoded localhost leaks in production.
 */
export function getCanonicalOrigin(request: NextRequest): string {
  // 1. Check standard proxy headers
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  // Check if current host is localhost or loopback
  const isLocalHost =
    !forwardedHost ||
    forwardedHost.includes('localhost') ||
    forwardedHost.includes('127.0.0.1') ||
    forwardedHost.startsWith('192.168.') ||
    forwardedHost.startsWith('10.')

  // In production or on non-localhost domains, ALWAYS enforce https protocol (required by Google OAuth 2.0)
  const protocol = isLocalHost ? (forwardedProto || 'http') : 'https'

  if (forwardedHost) {
    return `${protocol}://${forwardedHost}`
  }

  // 2. Fallback to explicit production domain environment variables if available
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`
  }

  return request.nextUrl.origin
}

/**
 * Robustly resolves the redirect URI for OAuth flows (Google, Facebook/Meta).
 * - Matches the registered production callbacks:
 *   Google:   https://rms-nu-mauve.vercel.app/api/auth/callback/google
 *   Facebook: https://rms-nu-mauve.vercel.app/api/auth/callback/facebook
 * - Normalizes any legacy `/api/auth/feedback/...` paths to `/api/auth/callback/...`
 * - Preserves state consistency between auth initiation & code exchange.
 * - Prevents stale or localhost URIs when running on a production domain.
 * - Enforces HTTPS in production (mandatory for Google OAuth 2.0).
 */
export function resolveOAuthRedirectUri(
  request: NextRequest,
  provider: 'google' | 'facebook',
  configuredUri?: string | null
): string {
  const origin = getCanonicalOrigin(request)
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1')
  const canonicalPath =
    provider === 'google'
      ? '/api/auth/callback/google'
      : '/api/auth/callback/facebook'

  const candidate = (configuredUri || '').trim()

  if (candidate) {
    try {
      // If candidate is a relative path
      if (candidate.startsWith('/')) {
        if (candidate.includes('/feedback/')) {
          return `${origin}${canonicalPath}`
        }
        return `${origin}${candidate}`
      }

      const parsed = new URL(candidate)
      const candIsLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'

      // In production, ignore localhost or legacy feedback paths from DB / old env
      if (!isLocal && (candIsLocal || parsed.pathname.includes('/feedback/'))) {
        return `${origin}${canonicalPath}`
      }

      // In production, ensure https is used
      if (!isLocal && parsed.protocol === 'http:') {
        parsed.protocol = 'https:'
      }

      // If pathname in candidate has legacy /feedback/, normalize to canonical path
      if (parsed.pathname.includes('/feedback/')) {
        parsed.pathname = canonicalPath
      }

      return parsed.toString()
    } catch {
      // Invalid URL format, fall through to default
    }
  }

  return `${origin}${canonicalPath}`
}
