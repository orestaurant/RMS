import { SignJWT, jwtVerify } from 'jose'

export interface JWTPayload {
  userId: string
  email: string
  name: string
  role: string
}

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'rms_super_secret_jwt_key_2026_restaurant_mgmt_auth'
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING)

export const SESSION_COOKIE_NAME = 'admin_session'

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

