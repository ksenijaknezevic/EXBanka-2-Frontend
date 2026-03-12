import { Link } from 'react-router-dom'
import { Users, UserPlus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function AdminPortal() {
  const { user } = useAuthStore()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin portal</h1>
        <p className="text-gray-500 mt-1">Dobrodošli, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/employees"
          className="card flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
            <Users className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Lista zaposlenih</h3>
            <p className="text-sm text-gray-500">Pregled i upravljanje zaposlenima</p>
          </div>
        </Link>

        <Link
          to="/admin/employees/new"
          className="card flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <UserPlus className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Novi zaposleni</h3>
            <p className="text-sm text-gray-500">Kreiranje novog naloga</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
