import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, ChevronDown, LogOut, Menu } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getMyProfile } from '@/services/authService'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch first/last name once on mount
  useEffect(() => {
    if (!user) return
    getMyProfile()
      .then((p) => setDisplayName(`${p.first_name} ${p.last_name}`.trim()))
      .catch(() => setDisplayName(user.email))
  }, [user?.email])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-white border-b border-gray-200 shrink-0">
      {/* Left: hamburger for mobile */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Otvori meni"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer for desktop (hamburger not shown) */}
      <div className="hidden md:block" />

      {/* Right: user info + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
        >
          {/* Avatar circle */}
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-700 shrink-0">
            <User className="h-4 w-4" />
          </div>

          {/* Name */}
          <span className="text-sm font-medium text-gray-800 max-w-[160px] truncate">
            {displayName ?? user?.email ?? '…'}
          </span>

          <ChevronDown
            className={[
              'h-4 w-4 text-gray-400 transition-transform duration-150',
              dropdownOpen ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              Odjavi se
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
