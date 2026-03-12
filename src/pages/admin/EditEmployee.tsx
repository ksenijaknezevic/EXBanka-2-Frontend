import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, UserX, UserCheck } from 'lucide-react'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import ErrorMessage from '@/components/common/ErrorMessage'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { getEmployeeById, updateEmployee, toggleEmployeeActive } from '@/services/employeeService'
import { useAuthStore } from '@/store/authStore'
import { useBlockNavigation } from '@/hooks/useBlockNavigation'
import { GrpcStatus } from '@/types'
import type { Employee } from '@/types'

const schema = z.object({
  first_name: z.string().min(1, 'Ime je obavezno'),
  last_name: z.string().min(1, 'Prezime je obavezno'),
  email: z.string().email('Unesite ispravan email'),
  phone: z
    .string()
    .refine((v) => v === '' || /^\+?[0-9]+$/.test(v), 'Dozvoljen je samo + na početku i cifre'),
  position: z.string().min(1, 'Pozicija je obavezna'),
  department: z.string().min(1, 'Departman je obavezan'),
  address: z.string().min(1, 'Adresa je obavezna'),
  username: z.string().min(1, 'Korisničko ime je obavezno'),
  date_of_birth: z
    .string()
    .min(1, 'Datum rodjenja je obavezan')
    .refine((d) => new Date(d) <= new Date(), 'Datum rodjenja ne može biti u budućnosti'),
  gender: z.string().min(1, 'Pol je obavezan'),
  is_active: z.boolean(),
  permissions: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

export default function EditEmployee() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { permissionsCodebook, hasPermission } = useAuthStore()
  const canManageUsers = hasPermission('MANAGE_USERS')

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingActive, setTogglingActive] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Block navigation when there are unsaved changes
  useBlockNavigation(isDirty && !isSubmitting, 'Imate nesačuvane izmene. Da li ste sigurni da želite da napustite stranicu?')

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const emp = await getEmployeeById({ id })

        // Backend blocks ADMIN accounts via GetEmployeeByID — this is a
        // client-side guard to show a friendlier message before the API call
        // if we already know it's an ADMIN (e.g. after initial load failure).
        setEmployee(emp)
        reset({
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: emp.email,
          phone: emp.phone,
          position: emp.position,
          department: emp.department,
          address: emp.address,
          username: emp.username,
          date_of_birth: emp.date_of_birth,
          gender: emp.gender,
          is_active: emp.is_active,
          permissions: emp.permissions,
        })
      } catch (err) {
        const e = err as Error & { grpcCode?: number }
        if (e.grpcCode === GrpcStatus.NOT_FOUND) {
          setLoadError('Zaposleni nije pronađen')
        } else if (e.grpcCode === GrpcStatus.PERMISSION_DENIED) {
          setLoadError('Administrator nalozi se ne mogu menjati kroz ovaj ekran')
        } else {
          setLoadError(e.message)
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, reset])

  const onSubmit = async (values: FormValues) => {
    if (!id || !employee) return
    setSaveError(null)
    setEmailError(null)

    try {
      await updateEmployee({ id, ...values })
      toast.success('Izmene uspješno sačuvane')
      navigate('/admin/employees', { replace: true })
    } catch (err) {
      const e = err as Error & { grpcCode?: number }

      if (e.grpcCode === GrpcStatus.ALREADY_EXISTS) {
        setEmailError('Nalog sa ovom email adresom već postoji.')
        return
      }

      setSaveError(e.message ?? 'Greška pri čuvanju. Pokušajte ponovo.')
    }
  }

  /** Immediately toggle is_active without touching other fields */
  const handleToggleActive = async () => {
    if (!id || !employee) return
    setTogglingActive(true)
    setSaveError(null)

    try {
      const updated = await toggleEmployeeActive(employee.id, !employee.is_active)
      setEmployee((prev) => prev ? { ...prev, is_active: updated.is_active } : prev)
      setValue('is_active', updated.is_active, { shouldDirty: false })
      const msg = updated.is_active ? 'Nalog aktiviran' : 'Nalog deaktiviran'
      toast.success(msg)
    } catch (err) {
      const e = err as Error & { grpcCode?: number }
      setSaveError(e.message ?? 'Greška pri promeni statusa.')
    } finally {
      setTogglingActive(false)
    }
  }

  const watchedPermissions = watch('permissions') ?? []

  const togglePermission = (permName: string) => {
    const current = watchedPermissions
    if (current.includes(permName)) {
      setValue('permissions', current.filter((p) => p !== permName), { shouldDirty: true })
    } else {
      setValue('permissions', [...current, permName], { shouldDirty: true })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto mt-8 text-center">
        <ErrorMessage message={loadError} />
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => navigate('/admin/employees')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Nazad na listu
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/employees')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Izmena: {employee?.first_name} {employee?.last_name}
          </h1>
        </div>

        {/* Deactivate / Activate button — only when user has MANAGE_USERS */}
        {employee && canManageUsers && (
          <Button
            type="button"
            variant={employee.is_active ? 'danger' : 'secondary'}
            loading={togglingActive}
            disabled={togglingActive}
            onClick={handleToggleActive}
            leftIcon={
              employee.is_active
                ? <UserX className="h-4 w-4" />
                : <UserCheck className="h-4 w-4" />
            }
          >
            {employee.is_active ? 'Deaktiviraj nalog' : 'Aktiviraj nalog'}
          </Button>
        )}
      </div>

      {/* Active status badge */}
      {employee && (
        <div className={[
          'mb-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
          employee.is_active
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700',
        ].join(' ')}>
          {employee.is_active ? '● Nalog aktivan' : '● Nalog deaktiviran'}
        </div>
      )}

      {saveError && (
        <div className="mb-4">
          <ErrorMessage message={saveError} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b">Lični podaci</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Ime" error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Prezime" error={errors.last_name?.message} {...register('last_name')} />
            <Input
              label="Email"
              type="email"
              error={emailError ?? errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Telefon"
              placeholder="+381641234567"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input label="Adresa" error={errors.address?.message} {...register('address')} />
            <Input
              label="Datum rođenja"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              error={errors.date_of_birth?.message}
              {...register('date_of_birth')}
            />
            <div>
              <label className="form-label">Pol</label>
              <select
                className="input-base"
                {...register('gender')}
              >
                <option value="">-- Odaberite --</option>
                <option value="MALE">Muški</option>
                <option value="FEMALE">Ženski</option>
              </select>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b pt-4">Posao</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Korisničko ime"
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label="Pozicija"
              error={errors.position?.message}
              {...register('position')}
            />
            <Input
              label="Departman"
              error={errors.department?.message}
              {...register('department')}
            />
          </div>

          {/* Permissions */}
          {permissionsCodebook.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b pt-4">
                Permisije
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {permissionsCodebook.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={watchedPermissions.includes(perm.name)}
                      onChange={() => togglePermission(perm.name)}
                    />
                    {perm.description ?? perm.name}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/employees')}
          >
            Odustani
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Sačuvaj izmene
          </Button>
        </div>
      </form>
    </div>
  )
}
