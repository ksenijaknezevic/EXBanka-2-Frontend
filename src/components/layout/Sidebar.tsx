import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  LogOut,
  Building2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  roles: string[]
  /** If set, item is shown only when user has this permission (in addition to role). */
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Kontrolna tabla',
    to: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Lista zaposlenih',
    to: '/admin/employees',
    icon: <Users className="h-5 w-5" />,
    roles: ['ADMIN'],
    permission: 'MANAGE_USERS',
  },
  {
    label: 'Novi zaposleni',
    to: '/admin/employees/new',
    icon: <UserPlus className="h-5 w-5" />,
    roles: ['ADMIN'],
    permission: 'MANAGE_USERS',
  },
  {
    label: 'Moj portal',
    to: '/employee',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'Klijentski portal',
    to: '/client',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['CLIENT'],
  },
]

export default function Sidebar() {
  const { user, clearAuth, hasPermission } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!user?.userType || !item.roles.includes(user.userType)) return false
    if (item.permission && !hasPermission(item.permission)) return false
    return true
  })

  return (
    <aside className="flex h-screen w-64 flex-col bg-primary-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-800">
        <Building2 className="h-7 w-7 text-primary-300" />
        <span className="text-lg font-bold tracking-tight">EXBanka</span>
      </div>

      {/* User info */}
      {user && (
        <div className="px-6 py-4 border-b border-primary-800">
          <p className="text-xs text-primary-400 uppercase tracking-wider">Prijavljeni kao</p>
          <p className="mt-1 text-sm font-medium truncate">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-primary-700 px-2 py-0.5 text-xs font-medium text-primary-200">
            {user.userType}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/employee' || item.to === '/client'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white',
              ].join(' ')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-primary-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-300 hover:bg-primary-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Odjavi se
        </button>
      </div>
    </aside>
  )
}
