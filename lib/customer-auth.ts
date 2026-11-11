import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export const CUSTOMER_SESSION_COOKIE = 'customer_session'

export interface CustomerJWTPayload {
  customerId: string
  email: string
  role: 'CUSTOMER'
  name?: string
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

