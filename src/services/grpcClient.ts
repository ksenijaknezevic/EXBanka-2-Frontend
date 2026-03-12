/**
 * REST API client for the EXBanka backend (gRPC-Gateway HTTP/JSON API).
 *
 * All requests go through the Vite proxy at /api → http://localhost:8082.
 * gRPC-Gateway returns camelCase JSON; int64 fields come as strings.
 */

import { useAuthStore, getRefreshToken, saveRefreshToken } from '@/store/authStore'
import { mapGrpcError } from '@/utils/grpcErrorMapper'
import { GrpcStatus } from '@/types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

interface CallOptions {
  skipAuth?: boolean
  _isRefresh?: boolean
}

let _isRefreshing = false
let _refreshPromise: Promise<string | null> | null = null

async function apiRequest<Res>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  opts: CallOptions = {}
): Promise<Res> {
  const { accessToken } = useAuthStore.getState()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (!opts.skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const code: number =
      typeof errorBody.code === 'number'
        ? errorBody.code
        : mapHttpToGrpcCode(response.status)
    const rawMessage: string = errorBody.message ?? ''

    if (code === GrpcStatus.UNAUTHENTICATED && !opts._isRefresh && !opts.skipAuth) {
      const newToken = await attemptTokenRefresh()
      if (newToken) {
        return apiRequest<Res>(method, path, body, opts)
      }
      useAuthStore.getState().clearAuth()
      sessionStorage.setItem('session_expired', '1')
      window.location.href = '/login'
    }

    const { message } = mapGrpcError(code, rawMessage)
    const err = new Error(message) as Error & { grpcCode: number }
    err.grpcCode = code
    throw err
  }

  return response.json() as Promise<Res>
}

function mapHttpToGrpcCode(httpStatus: number): number {
  switch (httpStatus) {
    case 400: return GrpcStatus.INVALID_ARGUMENT
    case 401: return GrpcStatus.UNAUTHENTICATED
    case 403: return GrpcStatus.PERMISSION_DENIED
    case 404: return GrpcStatus.NOT_FOUND
    case 409: return GrpcStatus.ALREADY_EXISTS
    case 503: return GrpcStatus.UNAVAILABLE
    default: return GrpcStatus.UNKNOWN
  }
}

export async function apiGet<Res>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  opts: CallOptions = {}
): Promise<Res> {
  let fullPath = path
  if (params) {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    if (entries.length > 0) {
      const query = entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      fullPath += `?${query}`
    }
  }
  return apiRequest<Res>('GET', fullPath, undefined, opts)
}

export async function apiPost<Req, Res>(
  path: string,
  body: Req,
  opts: CallOptions = {}
): Promise<Res> {
  return apiRequest<Res>('POST', path, body, opts)
}

export async function apiPut<Req, Res>(
  path: string,
  body: Req,
  opts: CallOptions = {}
): Promise<Res> {
  return apiRequest<Res>('PUT', path, body, opts)
}

export async function apiPatch<Req, Res>(
  path: string,
  body: Req,
  opts: CallOptions = {}
): Promise<Res> {
  return apiRequest<Res>('PATCH', path, body, opts)
}

export async function apiDelete<Res>(
  path: string,
  opts: CallOptions = {}
): Promise<Res> {
  return apiRequest<Res>('DELETE', path, undefined, opts)
}

const MAX_REFRESH_RETRIES = 2

async function attemptTokenRefresh(attempt = 0): Promise<string | null> {
  if (_isRefreshing && _refreshPromise) {
    return _refreshPromise
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  _isRefreshing = true
  _refreshPromise = (async () => {
    try {
      // Backend returns camelCase: { accessToken, refreshToken }
      const res = await apiPost<
        { refresh_token: string },
        { accessToken: string; refreshToken: string }
      >(
        '/refresh-token',
        { refresh_token: refreshToken },
        { skipAuth: true, _isRefresh: true }
      )
      useAuthStore.getState().setAccessToken(res.accessToken)
      if (res.refreshToken) {
        saveRefreshToken(res.refreshToken)
      }
      return res.accessToken
    } catch (_err) {
      if (attempt < MAX_REFRESH_RETRIES) {
        return attemptTokenRefresh(attempt + 1)
      }
      useAuthStore.getState().clearAuth()
      sessionStorage.setItem('session_expired', '1')
      window.location.href = '/login'
      return null
    } finally {
      _isRefreshing = false
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

export { saveRefreshToken }
