import { create } from 'zustand'
import type { AuthUser, Permission } from '@/types'

interface AuthState {
  // Access token lives in memory only (never in localStorage/sessionStorage)
  accessToken: string | null
  user: AuthUser | null
  // Permissions codebook (šifarnik) fetched once after admin login
  permissionsCodebook: Permission[]

  // Setters
  setAccessToken: (token: string) => void
  setUser: (user: AuthUser) => void
  setPermissionsCodebook: (permissions: Permission[]) => void
  clearAuth: () => void

  // Helpers
  isAuthenticated: () => boolean
  hasPermission: (permissionName: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  permissionsCodebook: [],

  setAccessToken: (token) => set({ accessToken: token }),

  setUser: (user) => set({ user }),

  setPermissionsCodebook: (permissions) => set({ permissionsCodebook: permissions }),

  clearAuth: () => {
    // Clear in-memory state
    set({ accessToken: null, user: null, permissionsCodebook: [] })
    // Clear refresh token from session storage
    sessionStorage.removeItem('refresh_token')
  },

  isAuthenticated: () => {
    const { accessToken, user } = get()
    return accessToken !== null && user !== null
  },

  hasPermission: (permissionName) => {
    const { user } = get()
    if (!user) return false
    // ADMIN always has all permissions
    if (user.userType === 'ADMIN') return true
    return user.permissions.includes(permissionName)
  },
}))

// ─── Session storage helpers ─────────────────────────────────────────────────

export const REFRESH_TOKEN_KEY = 'refresh_token'

export function saveRefreshToken(token: string): void {
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

export function removeRefreshToken(): void {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}
