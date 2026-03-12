import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '@/store/authStore'
import { Navigate } from 'react-router-dom'

export default function Layout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
