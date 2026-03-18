import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  CreditCard,
  ArrowLeftRight,
  X,
  Banknote,
  SendHorizontal,
  UserCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  label: string
  to: string
  icon?: React.ReactNode
  roles: string[]
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  // ── Admin ──────────────────────────────────────────────────────────────
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
  // ── Employee ───────────────────────────────────────────────────────────
  {
    label: 'Moj portal',
    to: '/employee',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'Kreiraj korisnika',
    to: '/employee/clients/new',
    icon: <UserPlus className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'Kreiraj račun',
    to: '/employee/accounts/new',
    icon: <CreditCard className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  // ── Client (text-only, no icons per spec) ──────────────────────────────
  { label: 'Početna',    to: '/client',           roles: ['CLIENT'] },
  { label: 'Računi',     to: '/client/accounts',  roles: ['CLIENT'] },
  // NOTE: Plaćanja is rendered as a collapsible submenu below — not here
  { label: 'Menjačnica', to: '/client/exchange',  roles: ['CLIENT'] },
  { label: 'Kartice',    to: '/client/cards',     roles: ['CLIENT'] },
  { label: 'Krediti',    to: '/client/loans',     roles: ['CLIENT'] },
]

const PAYMENT_SUB_ITEMS = [
  { label: 'Novo plaćanje',      to: '/client/payments/new',        icon: <SendHorizontal className="h-4 w-4" /> },
  { label: 'Prenos',             to: '/client/payments/transfer',   icon: <ArrowLeftRight className="h-4 w-4" /> },
  { label: 'Primaoci plaćanja',  to: '/client/payments/recipients', icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Pregled plaćanja',   to: '/client/payments/history',    icon: <ClipboardList className="h-4 w-4" /> },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, clearAuth, hasPermission } = useAuthStore()
  const location = useLocation()

  const isClient = user?.userType === 'CLIENT'
  const isOnPayments = location.pathname.startsWith('/client/payments')

  const [paymentOpen, setPaymentOpen] = useState(isOnPayments)

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!user?.userType || !item.roles.includes(user.userType)) return false
    if (item.permission && !hasPermission(item.permission)) return false
    return true
  })

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={[
          'flex h-screen w-64 flex-col bg-primary-900 text-white z-30 flex-shrink-0',
          'fixed md:static',
          'transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo + mobile close */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary-800">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-primary-300" />
            <span className="text-lg font-bold tracking-tight">EXBanka</span>
          </div>
          <button
            onClick={onMobileClose}
            className="md:hidden text-primary-400 hover:text-white transition-colors"
            aria-label="Zatvori meni"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info (non-client roles only) */}
        {user && !isClient && (
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
              onClick={onMobileClose}
              className={({ isActive }) =>
                [
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isClient ? '' : 'gap-3',
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white',
                ].join(' ')
              }
            >
              {item.icon && item.icon}
              {item.label}
            </NavLink>
          ))}

          {/* ── Plaćanja collapsible submenu (CLIENT only) ── */}
          {isClient && (
            <div>
              <button
                onClick={() => setPaymentOpen((v) => !v)}
                className={[
                  'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isOnPayments
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Plaćanja
                </div>
                {paymentOpen
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </button>

              {paymentOpen && (
                <div className="mt-1 space-y-0.5 pl-3">
                  {PAYMENT_SUB_ITEMS.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-700 text-white'
                            : 'text-primary-300 hover:bg-primary-800 hover:text-white',
                        ].join(' ')
                      }
                    >
                      {sub.icon}
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Logout (non-client roles; client uses header dropdown) */}
        {!isClient && (
          <div className="px-3 py-4 border-t border-primary-800">
            <button
              onClick={() => {
                clearAuth()
                window.location.href = '/login'
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-300 hover:bg-primary-800 hover:text-white transition-colors"
            >
              <ArrowLeftRight className="h-5 w-5 rotate-90" />
              Odjavi se
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
