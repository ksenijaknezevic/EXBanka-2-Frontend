import { apiPost, apiGet } from './grpcClient'
import type {
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  SetPasswordRequest,
  Permission,
} from '@/types'

export async function login(request: LoginRequest): Promise<LoginResponse> {
  return apiPost<LoginRequest, LoginResponse>('/login', request, { skipAuth: true })
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await apiPost<{ email: string }, { message: string }>(
    '/auth/forgot-password',
    { email: request.email },
    { skipAuth: true }
  )
}

export async function setPassword(request: SetPasswordRequest): Promise<void> {
  await apiPost<{ token: string; new_password: string }, { message: string }>(
    '/auth/reset-password',
    {
      token: request.token,
      new_password: request.new_password,
    },
    { skipAuth: true }
  )
}

export async function activateAccount(request: {
  token: string
  new_password: string
  confirm_password: string
}): Promise<void> {
  await apiPost<typeof request, { message: string }>(
    '/activate',
    request,
    { skipAuth: true }
  )
}

/** Fetches the permissions codebook – called once after admin login */
export async function getPermissionsCodebook(): Promise<Permission[]> {
  // Backend returns: { permissions: [{ id: number, permissionCode: string }] }
  const res = await apiGet<{
    permissions: Array<{ id: number; permissionCode: string }>
  }>('/permissions')
  return (res.permissions ?? []).map((p) => ({
    id: String(p.id),
    name: p.permissionCode,
  }))
}
