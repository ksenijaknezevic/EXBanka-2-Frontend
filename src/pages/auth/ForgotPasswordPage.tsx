import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, ArrowLeft } from 'lucide-react'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { resetPassword } from '@/services/authService'
import { GrpcStatus } from '@/types'

const schema = z.object({
  email: z.string().min(1, 'Email je obavezan').email('Unesite ispravan email'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' })

  const onSubmit = async (values: FormValues) => {
    try {
      await resetPassword({ email: values.email.trim() })
      setSubmitted(true)
    } catch (err) {
      const e = err as Error & { grpcCode?: number }
      const isUnavailable =
        e.grpcCode === GrpcStatus.UNAVAILABLE || e.grpcCode === GrpcStatus.DEADLINE_EXCEEDED

      if (isUnavailable) {
        // Network error – let user retry (don't show false success)
        toast.error('Sistem je trenutno nedostupan, pokušajte ponovo kasnije.')
        return
      }
      // For any other backend error, always show success (security:
      // never reveal whether the email exists in the system)
      setSubmitted(true)
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
          {submitted ? (
            <div className="text-center py-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mx-auto mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email poslan</h2>
              <p className="text-sm text-gray-600 mb-6">
                Poslali smo Vam link za resetovanje lozinke, proverite email.
              </p>
              <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-800">
                Povratak na prijavu
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Zaboravili ste lozinku?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Unesite Vašu email adresu i poslat ćemo Vam link za resetovanje.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <Input
                  label="Email adresa"
                  type="email"
                  autoComplete="email"
                  placeholder="korisnik@banka.ba"
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  Pošalji link za reset
                </Button>
              </form>

              <div className="mt-4 flex justify-center">
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Nazad na prijavu
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
