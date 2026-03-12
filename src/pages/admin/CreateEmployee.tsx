import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import ErrorMessage from '@/components/common/ErrorMessage'
import { createEmployee } from '@/services/employeeService'
import { useAuthStore } from '@/store/authStore'
import { GrpcStatus } from '@/types'

const schema = z.object({
  user_type: z.enum(['EMPLOYEE', 'ADMIN'], { required_error: 'Tip korisnika je obavezan' }),
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

export default function CreateEmployee() {
  const navigate = useNavigate()
  const { permissionsCodebook } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { user_type: 'EMPLOYEE', is_active: true, permissions: [] },
  })

  const watchedPermissions = watch('permissions') ?? []
  const watchedUserType = watch('user_type')
  const isAdmin = watchedUserType === 'ADMIN'

  const togglePermission = (permName: string) => {
    const current = watchedPermissions
    setValue(
      'permissions',
      current.includes(permName) ? current.filter((p) => p !== permName) : [...current, permName],
      { shouldDirty: true }
    )
  }

  const onSubmit = async (values: FormValues) => {
    setError(null)
    setEmailError(null)
    setUsernameError(null)

    try {
      await createEmployee(values)
      const msg =
        values.user_type === 'ADMIN'
          ? 'Administrator uspješno kreiran. Email za aktivaciju je poslan.'
          : 'Zaposleni uspješno kreiran. Email za aktivaciju je poslan.'
      toast.success(msg)
      navigate('/admin/employees', { replace: true })
    } catch (err) {
      const e = err as Error & { grpcCode?: number }

      if (e.grpcCode === GrpcStatus.ALREADY_EXISTS) {
        if (e.message.toLowerCase().includes('username')) {
          setUsernameError('Korisničko ime je već zauzeto.')
        } else {
          setEmailError('Nalog sa ovom email adresom već postoji.')
        }
        return
      }

      setError(e.message ?? 'Greška pri kreiranju. Pokušajte ponovo.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/employees')}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Novi korisnik</h1>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* ── Tip korisnika ─────────────────────────────────────────────── */}
        <div className="card mb-4">
          <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b mb-4">Tip korisnika</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="EMPLOYEE"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                {...register('user_type')}
              />
              <span className="text-sm font-medium text-gray-700">Zaposleni</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="ADMIN"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                {...register('user_type')}
              />
              <span className="text-sm font-medium text-gray-700">Administrator</span>
            </label>
          </div>
          {errors.user_type && (
            <p role="alert" className="mt-1 text-xs text-red-600">{errors.user_type.message}</p>
          )}

          {isAdmin && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
              <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Administrator dobija sve permisije automatski na osnovu tipa naloga. Permisije se ne dodjeljuju pojedinačno.</span>
            </div>
          )}
        </div>

        {/* ── Lični podaci ──────────────────────────────────────────────── */}
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
              <select className="input-base" {...register('gender')}>
                <option value="">-- Odaberite --</option>
                <option value="MALE">Muški</option>
                <option value="FEMALE">Ženski</option>
              </select>
              {errors.gender && (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.gender.message}</p>
              )}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b pt-4">Posao</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Korisničko ime" error={usernameError ?? errors.username?.message} {...register('username')} />
            <Input label="Pozicija" error={errors.position?.message} {...register('position')} />
            <Input label="Departman" error={errors.department?.message} {...register('department')} />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              id="is_active"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              {...register('is_active')}
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Aktivan radni odnos (podrazumevano aktivan)
            </label>
          </div>

          {/* Permissions — hidden for ADMIN */}
          {!isAdmin && permissionsCodebook.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b pt-4">Permisije</h2>
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

        <div className="mt-4 flex items-center gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/employees')}>
            Odustani
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
            {isAdmin ? 'Kreiraj administratora' : 'Kreiraj zaposlenog'}
          </Button>
        </div>
      </form>
    </div>
  )
}
