import { useAuthStore } from '@/store/authStore'
import { User, ShieldCheck, Mail } from 'lucide-react'

const PERMISSION_LABELS: Record<string, string> = {
  ADMIN_PERMISSION: 'Administrator',
  MANAGE_USERS: 'Upravljanje korisnicima',
  VIEW_EMPLOYEES: 'Pregled zaposlenih',
  CONTRACT_SIGNING: 'Potpisivanje ugovora',
  STOCK_TRADING: 'Trgovanje akcijama',
  VIEW_ACCOUNTS: 'Pregled računa',
  MANAGE_ACCOUNTS: 'Upravljanje računima',
}

export default function EmployeePage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dobrodošli</h1>

      {/* Profile card */}
      <div className="card flex items-start gap-4">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 shrink-0">
          <User className="h-6 w-6 text-primary-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 mb-1">Prijavljeni ste kao</p>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-900 truncate">{user?.email}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400 uppercase tracking-wide">Zaposleni</p>
        </div>
      </div>

      {/* Permissions */}
      {user && user.permissions.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-800">Vaše permisije</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
              >
                {PERMISSION_LABELS[perm] ?? perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {user && user.permissions.length === 0 && (
        <div className="card text-center py-8 text-gray-500">
          <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nemate dodijeljene permisije. Kontaktirajte administratora.</p>
        </div>
      )}
    </div>
  )
}
