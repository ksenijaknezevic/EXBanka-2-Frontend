import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, Eye, EyeOff } from 'lucide-react'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import ErrorMessage from '@/components/common/ErrorMessage'
import { login, getPermissionsCodebook } from '@/services/authService'
import { useAuthStore, saveRefreshToken } from '@/store/authStore'
import { decodeAccessToken } from '@/utils/tokenUtils'
import { getHomeForRole } from '@/router/helpers'
import { GrpcStatus } from '@/types'

// ─── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  email: z
    .string()
    .min(1, 'Email je obavezan')
    .email('Unesite ispravan email'),
  password: z
    .string()
    .min(8, 'Lozinka mora imati najmanje 8 karaktera')
    .max(32, 'Lozinka sme imati najviše 32 karaktera')
    .regex(/[A-Z]/, 'Lozinka mora sadržati najmanje jedno veliko slovo')
    .regex(/[a-z]/, 'Lozinka mora sadržati najmanje jedno malo slovo')
    .regex(/\d.*\d/, 'Lozinka mora sadržati najmanje 2 broja'),
})

type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAccessToken, setUser, setPermissionsCodebook, clearAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('session_expired')) {
      sessionStorage.removeItem('session_expired')
      setError('Vaša sesija je istekla. Molimo prijavite se ponovo.')
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      const response = await login({
        email: values.email.trim(),
        password: values.password,
      })

      // Store tokens (backend returns camelCase)
      setAccessToken(response.accessToken)
      saveRefreshToken(response.refreshToken)

      // Decode user info
      const user = decodeAccessToken(response.accessToken)
      if (!user) {
        clearAuth()
        setError('Primljeni token je neispravan. Kontaktirajte podršku.')
        return
      }
      setUser(user)

      // If ADMIN – fetch permissions codebook (šifarnik) eagerly
      if (user.userType === 'ADMIN') {
        try {
          const perms = await getPermissionsCodebook()
          setPermissionsCodebook(perms)
        } catch {
          // Non-critical – admin can still use the app
          toast.error('Nije moguće učitati listu permisija. Pokušajte ponovo.')
        }
      }

      navigate(getHomeForRole(user.userType), { replace: true })
    } catch (err) {
      const e = err as Error & { grpcCode?: number }
      if (
        e.grpcCode === GrpcStatus.UNAVAILABLE ||
        e.grpcCode === GrpcStatus.DEADLINE_EXCEEDED
      ) {
        setError('Sistem je trenutno nedostupan. Molimo pokušajte kasnije.')
      } else if (e.grpcCode === GrpcStatus.UNAUTHENTICATED) {
        setError('Pogrešan email ili lozinka. Uverite se da su podaci tačni.')
      } else {
        setError(e.message ?? 'Nešto nije u redu. Pokušajte ponovo.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">EXBanka</h1>
          <p className="mt-1 text-primary-200 text-sm">Interni portal</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Prijava</h2>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Email adresa"
              type="email"
              autoComplete="email"
              placeholder="korisnik@banka.ba"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="w-full">
              <label htmlFor="password" className="form-label">
                Lozinka
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={['input-base pr-10', errors.password ? 'input-error' : ''].join(' ')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Zaboravili ste lozinku?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={!isValid || isSubmitting}
              className="w-full"
            >
              Prijavi se
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
