import type { UserType } from '@/types'

export function getHomeForRole(userType?: UserType): string {
  switch (userType) {
    case 'ADMIN':
      return '/admin'
    case 'EMPLOYEE':
      return '/employee'
    case 'CLIENT':
      return '/client'
    default:
      return '/login'
  }
}
