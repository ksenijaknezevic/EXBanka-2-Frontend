import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserType } from '@/types'
import { getHomeForRole } from './helpers'

interface PrivateRouteProps {
  /** If provided, only users with this role can access the route */
  requiredRole?: UserType
}

/**
 * Route guard.
 * - No session → redirect to /login
 * - Wrong role  → redirect to user's home page (silent block, no error)
 */
export default function PrivateRoute({ requiredRole }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user?.userType !== requiredRole) {
    // Silently redirect to the correct home page for the user's role
    return <Navigate to={getHomeForRole(user?.userType)} replace />
  }

  return <Outlet />
}
