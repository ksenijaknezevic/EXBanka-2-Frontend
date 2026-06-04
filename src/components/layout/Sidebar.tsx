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
  Landmark,
  FileText,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  BarChart2,
  ListOrdered,
  ShieldCheck,
  Receipt,
  Handshake,
  PieChart,
  Wallet,
  Bookmark,
  RefreshCw,
  ScrollText,
  Bell,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useActuaryAccess } from '@/context/ActuaryAccessContext'
import UnreadOffersBadge from '@/components/shared/UnreadOffersBadge'

interface NavItem {
  label: string
  to: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  roles: string[]
  /** Show item only if user has ANY of these permissions */
  permission?: string | string[]
  /** Pass end=true to NavLink so sub-routes don't also highlight this item */
  end?: boolean
  /** Za EMPLOYEE: prikaži samo aktuarima (hartije/portfolio). */
  employeeNeedsActuary?: boolean
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
    end: true,
  },
  {
    label: 'Novi zaposleni',
    to: '/admin/employees/new',
    icon: <UserPlus className="h-5 w-5" />,
    roles: ['ADMIN'],
    permission: 'MANAGE_USERS',
  },
  {
    label: 'Berze',
    to: '/admin/exchanges',
    icon: <TrendingUp className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Hartije od vrednosti',
    to: '/hartije',
    icon: <BarChart2 className="h-5 w-5" />,
    roles: ['ADMIN'],
    end: true,
  },
  // ── Employee ───────────────────────────────────────────────────────────
  {
    label: 'Moj portal',
    to: '/employee',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'Lista klijenata',
    to: '/employee/clients',
    icon: <Users className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
    end: true,
  },
  {
    label: 'Kreiraj korisnika',
    to: '/employee/clients/new',
    icon: <UserPlus className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'Svi računi',
    to: '/employee/accounts',
    icon: <Building2 className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
    end: true,
  },
  {
    label: 'Kreiraj račun',
    to: '/employee/accounts/new',
    icon: <CreditCard className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  // Krediti rendered as collapsible group after this item
  {
    label: 'Upravljanje aktuarima',
    to: '/employee/actuaries',
    icon: <UserCheck className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
    permission: ['SUPERVISOR'],
  },
  {
    label: 'Nalozi (trading)',
    to: '/employee/trading/orders',
    icon: <ShieldCheck className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
    permission: ['SUPERVISOR'],
  },
  {
    label: 'Porez Tracking',
    to: '/employee/trading/tax',
    icon: <Receipt className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
    permission: ['SUPERVISOR'],
  },
  {
    label: 'Audit log',
    to: '/employee/audit-log',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
    permission: ['SUPERVISOR'],
  },
  {
    label: 'Upravljanje aktuarima',
    to: '/admin/actuaries',
    icon: <UserCheck className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Nalozi (trading)',
    to: '/admin/trading/orders',
    icon: <ShieldCheck className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Porez Tracking',
    to: '/admin/trading/tax',
    icon: <Receipt className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Audit log',
    to: '/admin/audit-log',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Berze',
    to: '/employee/exchanges',
    icon: <TrendingUp className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'Hartije od vrednosti',
    to: '/hartije',
    icon: <BarChart2 className="h-5 w-5" />,
    roles: ['EMPLOYEE'],
    end: true,
    employeeNeedsActuary: true,
  },
  {
    label: 'Moji nalozi',
    to: '/hartije/my-orders',
    icon: <ListOrdered className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    employeeNeedsActuary: true,
  },
  {
    label: 'Portfolio',
    to: '/portfolio',
    icon: <Banknote className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    employeeNeedsActuary: true,
  },
  {
    label: 'Trajni nalozi',
    to: '/recurring-orders',
    icon: <RefreshCw className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    employeeNeedsActuary: true,
  },
  {
    label: 'Watchlist',
    to: '/watchlist',
    icon: <Bookmark className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    employeeNeedsActuary: true,
  },
  {
    label: 'Price Alarmi',
    to: '/price-alerts',
    icon: <Bell className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    employeeNeedsActuary: true,
  },

  // ── Celina 4 – EMPLOYEE ───────────────────────────────────────────────
  {
    label: 'OTC Trgovina',
    to: '/otc/trade',
    icon: <Handshake className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    permission: ['SUPERVISOR', 'AGENT'],
    end: true,
  },
  {
    label: 'OTC Ponude i Ugovori',
    to: '/otc',
    icon: <FileText className="h-5 w-5" />,
    badge: <UnreadOffersBadge />,
    roles: ['EMPLOYEE', 'ADMIN'],
    permission: ['SUPERVISOR', 'AGENT'],
    end: true,
  },
  {
    label: 'Istorija pregovora',
    to: '/otc/history',
    icon: <ScrollText className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    permission: ['SUPERVISOR', 'AGENT'],
    end: true,
  },
  {
    label: 'Međubankarska OTC',
    to: '/interbank/otc',
    icon: <Landmark className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    permission: ['SUPERVISOR', 'AGENT'],
    end: true,
  },
  {
    label: 'Fondovi',
    to: '/funds',
    icon: <PieChart className="h-5 w-5" />,
    roles: ['EMPLOYEE', 'ADMIN'],
    end: true,
  },

  // ── Client (text-only, no icons per spec) ──────────────────────────────
  { label: 'Početna',    to: '/client',                                    roles: ['CLIENT'] },
  { label: 'Računi',     to: '/client/accounts',                           roles: ['CLIENT'] },
  // NOTE: Plaćanja is rendered as a collapsible submenu below — not here
  { label: 'Menjačnica', to: '/client/exchange',                           roles: ['CLIENT'] },
  { label: 'Kartice',    to: '/client/cards',                              roles: ['CLIENT'] },
  { label: 'Krediti',    to: '/client/credits',                            roles: ['CLIENT'] },
  { label: 'Berze',      to: '/client/exchanges',                          roles: ['CLIENT'] },
  { label: 'Hartije od vrednosti', to: '/hartije',           roles: ['CLIENT'], end: true },
  { label: 'Moji nalozi',          to: '/hartije/my-orders', roles: ['CLIENT'], permission: 'TRADE_STOCKS' },
  { label: 'Trajni nalozi',         to: '/recurring-orders',   roles: ['CLIENT'] },
  { label: 'Watchlist',            to: '/watchlist',          roles: ['CLIENT'] },
  { label: 'Price Alarmi',         to: '/price-alerts',       roles: ['CLIENT'] },
  { label: 'Moj Portfolio',        to: '/portfolio',          roles: ['CLIENT'] },
  // ── Celina 4 – CLIENT ─────────────────────────────────────────────────
  { label: 'OTC Trgovina',          to: '/otc/trade', roles: ['CLIENT'], end: true },
  {
    label: 'OTC Ponude i Ugovori',
    to: '/otc',
    badge: <UnreadOffersBadge />,
    roles: ['CLIENT'],
    end: true,
  },
  { label: 'Istorija pregovora', to: '/otc/history', roles: ['CLIENT'], end: true },
  { label: 'Međubankarska OTC', to: '/interbank/otc', roles: ['CLIENT'], end: true },
  { label: 'Fondovi', to: '/funds', roles: ['CLIENT'], end: true },
]

const PAYMENT_SUB_ITEMS = [
  { label: 'Novo plaćanje',      to: '/client/payments/new',        icon: <SendHorizontal className="h-4 w-4" /> },
  { label: 'Prenos',             to: '/client/payments/transfer',   icon: <ArrowLeftRight className="h-4 w-4" /> },
  { label: 'Primaoci plaćanja',  to: '/client/payments/recipients', icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Pregled plaćanja',   to: '/client/payments/history',    icon: <ClipboardList className="h-4 w-4" /> },
]

const KREDITI_SUB_ITEMS = [
  { label: 'Zahtevi za kredit', to: '/employee/credits/requests', icon: <FileText className="h-4 w-4" /> },
  { label: 'Svi krediti',       to: '/employee/credits/all',      icon: <Landmark className="h-4 w-4" /> },
]

const PROFIT_BANKE_SUB_ITEMS = [
  { label: 'Profit aktuara',       to: '/bank/actuary-performance', icon: <BarChart2 className="h-4 w-4" /> },
  { label: 'Pozicije u fondovima', to: '/bank/fund-positions',      icon: <Building2 className="h-4 w-4" /> },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, clearAuth, hasPermission } = useAuthStore()
  const { loading: actuaryLoading, canAccessTradingPortals } = useActuaryAccess()
  const location = useLocation()

  const isClient = user?.userType === 'CLIENT'
  const isEmployee = user?.userType === 'EMPLOYEE'
  const isSupervisor = (user?.userType === 'EMPLOYEE' || user?.userType === 'ADMIN') && hasPermission('SUPERVISOR')
  const isOnPayments = location.pathname.startsWith('/client/payments')
  const isOnProfitBanke = location.pathname.startsWith('/bank/')
  const isOnKrediti = location.pathname.startsWith('/employee/credits')

  const [paymentOpen, setPaymentOpen] = useState(isOnPayments)
  const [profitBankeOpen, setProfitBankeOpen] = useState(isOnProfitBanke)
  const [kreditiOpen, setKreditiOpen] = useState(isOnKrediti || isEmployee)

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!user?.userType || !item.roles.includes(user.userType)) return false
    if (item.permission) {
      const perms = Array.isArray(item.permission) ? item.permission : [item.permission]
      if (!perms.some((p) => hasPermission(p))) return false
    }
    if (
      item.employeeNeedsActuary &&
      user.userType === 'EMPLOYEE'
    ) {
      if (actuaryLoading) return false
      if (!canAccessTradingPortals) return false
    }
    return true
  })

  // Split point for EMPLOYEE: insert Krediti collapsible after 'Kreiraj račun'
  const kreditiIdx = isEmployee
    ? visibleItems.findIndex((i) => i.to === '/employee/accounts/new')
    : -1

  const renderNavItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end ?? (item.to === '/admin' || item.to === '/employee' || item.to === '/client')}
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
      <span className="flex-1">{item.label}</span>
      {item.badge && item.badge}
    </NavLink>
  )

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
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-1">
          {/* Items before Krediti group (or all items for non-EMPLOYEE) */}
          {(kreditiIdx >= 0 ? visibleItems.slice(0, kreditiIdx + 1) : visibleItems).map(renderNavItem)}

          {/* Krediti collapsible (EMPLOYEE only) */}
          {kreditiIdx >= 0 && (
            <div>
              <button
                onClick={() => setKreditiOpen((v) => !v)}
                className={[
                  'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isOnKrediti
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5" />
                  Krediti
                </div>
                {kreditiOpen
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </button>

              {kreditiOpen && (
                <div className="mt-1 space-y-0.5 pl-3">
                  {KREDITI_SUB_ITEMS.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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

          {/* Items after Krediti group (EMPLOYEE only) */}
          {kreditiIdx >= 0 && visibleItems.slice(kreditiIdx + 1).map(renderNavItem)}

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

          {/* ── Profit banke collapsible submenu (SUPERVISOR only) ── */}
          {isSupervisor && (
            <div>
              <button
                onClick={() => setProfitBankeOpen((v) => !v)}
                className={[
                  'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isOnProfitBanke
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5" />
                  Profit banke
                </div>
                {profitBankeOpen
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </button>

              {profitBankeOpen && (
                <div className="mt-1 space-y-0.5 pl-3">
                  {PROFIT_BANKE_SUB_ITEMS.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
