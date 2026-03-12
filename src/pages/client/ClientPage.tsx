import { useAuthStore } from '@/store/authStore'
import { Landmark, Mail, Clock } from 'lucide-react'

export default function ClientPage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Klijentski portal</h1>

      {/* Profile card */}
      <div className="card flex items-start gap-4">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 shrink-0">
          <Landmark className="h-6 w-6 text-primary-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 mb-1">Prijavljeni ste kao</p>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-900 truncate">{user?.email}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400 uppercase tracking-wide">Klijent</p>
        </div>
      </div>

      {/* Coming soon */}
      <div className="card text-center py-12">
        <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <h2 className="text-base font-semibold text-gray-700 mb-1">Uskoro dostupno</h2>
        <p className="text-sm text-gray-500">
          Upravljanje računima, transakcije i ostale funkcionalnosti biće dostupne u narednoj fazi.
        </p>
      </div>
    </div>
  )
}
