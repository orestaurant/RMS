import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export const CUSTOMER_SESSION_COOKIE = 'customer_session'
export const REVIEW_SESSION_COOKIE = 'resto_review_session'

export interface CustomerJWTPayload {
  customerId: string
  email: string
  role: 'CUSTOMER'
  name?: string
}

export interface ReviewVerifierPayload {
  sub: string
  email: string
  name: string
  picture?: string
  platform: 'google' | 'facebook'
  verifiedAt: number
}

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'rms_super_secret_jwt_key_2026_restaurant_mgmt_auth'
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING)

export async function signCustomerToken(payload: CustomerJWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyCustomerToken(token: string): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload?.customerId && payload?.role === 'CUSTOMER') {
      return {
        customerId: String(payload.customerId),
        email: String(payload.email),
        role: 'CUSTOMER',
        name: payload.name ? String(payload.name) : undefined,
      }
    }
    return null
  } catch (error) {
    return null
  }
}

export async function getCustomerSession(request: NextRequest): Promise<CustomerJWTPayload | null> {
  const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyCustomerToken(token)
}

export async function signReviewVerifierToken(payload: ReviewVerifierPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyReviewVerifierToken(token: string): Promise<ReviewVerifierPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload?.sub && payload?.platform) {
      return {
        sub: String(payload.sub),
        email: String(payload.email || ''),
        name: String(payload.name || ''),
        picture: payload.picture ? String(payload.picture) : undefined,
        platform: payload.platform === 'facebook' ? 'facebook' : 'google',
        verifiedAt: Number(payload.verifiedAt || Date.now()),
      }
    }
    return null
  } catch (error) {
    return null
  }
}

export async function getReviewVerifierSession(request: NextRequest): Promise<ReviewVerifierPayload | null> {
  const token = request.cookies.get(REVIEW_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyReviewVerifierToken(token)
}

