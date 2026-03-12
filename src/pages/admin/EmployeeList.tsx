import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Search, Edit2, UserX, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import { listEmployees, toggleEmployeeActive } from '@/services/employeeService'
import { useAuthStore } from '@/store/authStore'
import type { Employee, ListEmployeesRequest } from '@/types'

interface FilterValues {
  email: string
  first_name: string
  last_name: string
  position: string
}

const PAGE_SIZE = 10

export default function EmployeeList() {
  const navigate = useNavigate()
  const { hasPermission } = useAuthStore()
  const canManageUsers = hasPermission('MANAGE_USERS')

  const [employees, setEmployees] = useState<Employee[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Tracks which employee id is currently being toggled (null = none)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { register, handleSubmit, getValues } = useForm<FilterValues>({
    defaultValues: { email: '', first_name: '', last_name: '', position: '' },
  })

  const fetchEmployees = useCallback(
    async (filters: Partial<FilterValues>, currentPage: number) => {
      setLoading(true)
      setError(null)
      try {
        const req: ListEmployeesRequest = {
          page: currentPage,
          size: PAGE_SIZE,
          ...(filters.email?.trim() ? { email: filters.email.trim() } : {}),
          ...(filters.first_name?.trim() ? { first_name: filters.first_name.trim() } : {}),
          ...(filters.last_name?.trim() ? { last_name: filters.last_name.trim() } : {}),
          ...(filters.position?.trim() ? { position: filters.position.trim() } : {}),
        }
        const res = await listEmployees(req)
        setEmployees(res.employees)
        setHasMore(res.hasMore)
      } catch {
        setError('Sistem je trenutno nedostupan, nemoguće učitati listu zaposlenih.')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchEmployees({}, 1)
  }, [fetchEmployees])

  const onSearch = (filters: FilterValues) => {
    setPage(1)
    fetchEmployees(filters, 1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchEmployees(getValues(), newPage)
  }

  const handleToggleActive = async (emp: Employee) => {
    setTogglingId(emp.id)
    setError(null)
    try {
      const updated = await toggleEmployeeActive(emp.id, !emp.is_active)
      setEmployees((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, is_active: updated.is_active } : e))
      )
    } catch {
      setError('Greška pri promeni statusa zaposlenog.')
    } finally {
      setTogglingId(null)
    }
  }

  const showPagination = page > 1 || hasMore

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lista korisnika</h1>
        {canManageUsers && (
          <Button variant="primary" size="md" onClick={() => navigate('/admin/employees/new')}>
            Novi korisnik
          </Button>
        )}
      </div>

      {/* Filters */}
      <form onSubmit={handleSubmit(onSearch)} className="card mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Email" type="email" placeholder="email@banka.ba" {...register('email')} />
          <Input label="Ime" placeholder="Ime" {...register('first_name')} />
          <Input label="Prezime" placeholder="Prezime" {...register('last_name')} />
          <Input label="Pozicija" placeholder="Pozicija" {...register('position')} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="primary" loading={loading} leftIcon={<Search className="h-4 w-4" />}>
            Pretraži
          </Button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center text-gray-500 w-full">
            <p className="font-medium">Nema rezultata za traženi kriterijum</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ime i prezime</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tip</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pozicija</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Telefon</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className={[
                    'hover:bg-gray-50',
                    emp.user_type === 'EMPLOYEE' ? 'cursor-pointer' : '',
                  ].join(' ')}
                  onClick={() => {
                    if (emp.user_type === 'EMPLOYEE') {
                      navigate(`/admin/employees/${emp.id}/edit`)
                    }
                  }}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      emp.user_type === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700',
                    ].join(' ')}>
                      {emp.user_type === 'ADMIN' ? 'Admin' : 'Zaposleni'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.position}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        emp.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600',
                      ].join(' ')}
                    >
                      {emp.is_active ? 'Aktivan' : 'Neaktivan'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {canManageUsers && (
                        <>
                          {emp.user_type === 'EMPLOYEE' && (
                            <button
                              title="Izmeni zaposlenog"
                              onClick={() => navigate(`/admin/employees/${emp.id}/edit`)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {emp.user_type === 'EMPLOYEE' && (
                            <button
                              title={emp.is_active ? 'Deaktiviraj nalog' : 'Aktiviraj nalog'}
                              disabled={togglingId === emp.id}
                              onClick={() => handleToggleActive(emp)}
                              className={[
                                'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
                                emp.is_active
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50',
                                togglingId === emp.id ? 'opacity-50 cursor-wait' : '',
                              ].join(' ')}
                            >
                              {togglingId === emp.id ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : emp.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Strana {page}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Prethodna
            </Button>
            <span className="font-medium">{page}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasMore}
              onClick={() => handlePageChange(page + 1)}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Sledeća
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
