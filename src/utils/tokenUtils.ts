import { jwtDecode } from 'jwt-decode'
import type { AuthUser, JwtPayload, UserType } from '@/types'

/**
 * Parses user_type from backend JWT which may be a number (1/2/3),
 * a full string ("USER_TYPE_ADMIN"), or a short string ("ADMIN").
 */
function parseUserType(raw: unknown): UserType | null {
  if (typeof raw === 'number') {
    switch (raw) {
      case 1: return 'ADMIN'
      case 2: return 'EMPLOYEE'
      case 3: return 'CLIENT'
    }
  }
  if (typeof raw === 'string') {
    const upper = raw.toUpperCase()
    if (upper.includes('ADMIN')) return 'ADMIN'
    if (upper.includes('EMPLOYEE')) return 'EMPLOYEE'
    if (upper.includes('CLIENT')) return 'CLIENT'
  }
  return null
}

/**
 * Decode a JWT access token and extract the AuthUser payload.
 * Returns null if the token is invalid or corrupted.
 */
export function decodeAccessToken(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token)

    if (!payload.sub || !payload.email) {
      return null
    }

    const userType = parseUserType(payload.user_type)
    if (!userType) {
      return null
    }

    return {
      id: String(payload.sub),
      email: payload.email,
      userType,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    }
  } catch {
    return null
  }
}

/**
 * Returns true if the JWT token is expired.
 * Adds a 10-second buffer to account for clock drift.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token)
    if (!exp) return true
    return Date.now() >= (exp - 10) * 1000
  } catch {
    return true
  }
}
