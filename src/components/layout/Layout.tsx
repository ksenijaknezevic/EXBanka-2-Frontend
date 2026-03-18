import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { DictionaryProvider } from '@/context/DictionaryContext'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const { isAuthenticated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <DictionaryProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main content column */}
        <div className="flex flex-1 flex-col overflow-hidden md:pl-0">
          <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />

          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </DictionaryProvider>
  )
}
