import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, Eye, EyeOff } from 'lucide-react'

import Button from '@/components/common/Button'
import ErrorMessage from '@/components/common/ErrorMessage'
import { setPassword } from '@/services/authService'
import { GrpcStatus } from '@/types'

const trimmedPassword = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .min(8, 'Lozinka mora imati najmanje 8 karaktera')
    .max(32, 'Lozinka sme imati najviše 32 karaktera')
    .regex(/[A-Z]/, 'Lozinka mora sadržati najmanje jedno veliko slovo')
    .regex(/[a-z]/, 'Lozinka mora sadržati najmanje jedno malo slovo')
    .regex(/\d.*\d/, 'Lozinka mora sadržati najmanje 2 broja')
)

const schema = z
  .object({
    password: trimmedPassword,
    confirmPassword: z.preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      z.string()
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Lozinke se ne poklapaju',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const token = searchParams.get('token') ?? ''

  useEffect(() => {
    if (!token) {
      setError('Link je nevažeći. Molimo zatražite novi link za resetovanje lozinke.')
    }
  }, [token])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' })

  const onSubmit = async (values: FormValues) => {
    if (!token) return
    setError(null)

    try {
      await setPassword({ token, new_password: values.password })
      toast.success('Lozinka uspješno resetovana. Možete se prijaviti.')
      navigate('/login', { replace: true })
    } catch (err) {
      const e = err as Error & { grpcCode?: number }

      if (
        e.grpcCode === GrpcStatus.UNAVAILABLE ||
        e.grpcCode === GrpcStatus.DEADLINE_EXCEEDED
      ) {
        setError('Sistem je trenutno nedostupan. Pokušajte ponovo.')
        return
      }

      setError('Link je nevažeći ili je istekao. Molimo zatražite novi link za resetovanje lozinke.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">EXBanka</h1>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Resetovanje lozinke</h2>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="w-full">
              <label htmlFor="new-password" className="form-label">
                Nova lozinka
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={['input-base pr-10', errors.password ? 'input-error' : ''].join(' ')}
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Sakrij' : 'Prikaži'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="w-full">
              <label htmlFor="confirm-password" className="form-label">
                Potvrdite lozinku
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={[
                    'input-base pr-10',
                    errors.confirmPassword ? 'input-error' : '',
                  ].join(' ')}
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirm ? 'Sakrij' : 'Prikaži'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={!isValid || isSubmitting || !token}
              className="w-full"
            >
              Resetuj lozinku
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
