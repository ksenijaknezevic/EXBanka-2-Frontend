// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserType = 'ADMIN' | 'EMPLOYEE' | 'CLIENT'

export interface Permission {
  id: string
  name: string        // mapped from backend permissionCode
  description?: string
}

export interface JwtPayload {
  sub: string            // user id
  email: string
  user_type: string      // "ADMIN" | "EMPLOYEE" | "CLIENT" in JWT
  permissions: string[]  // permission codes
  exp: number
  iat: number
}

// ─── Auth Service contracts ───────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

// Backend (gRPC-Gateway) returns camelCase
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: string
}

export interface RefreshTokenRequest {
  refresh_token: string
}

// Backend returns camelCase for refresh too
export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface SetPasswordRequest {
  token: string
  new_password: string
}

// ─── Employee Service contracts ──────────────────────────────────────────────

/**
 * Unified frontend Employee type – normalized from backend camelCase response.
 */
export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string           // mapped from backend phoneNumber
  position: string
  department: string
  address: string
  username: string
  date_of_birth: string   // YYYY-MM-DD, mapped from backend birthDate (unix ms string)
  gender: string          // "MALE" | "FEMALE" | "OTHER"
  is_active: boolean
  user_type: UserType     // mapped from backend userType string enum
  permissions: string[]
}

export interface ListEmployeesRequest {
  page: number
  size: number            // sent as page_size to backend
  email?: string
  first_name?: string
  last_name?: string
  position?: string
}

export interface ListEmployeesResponse {
  employees: Employee[]
  hasMore: boolean
}

export interface GetEmployeeByIdRequest {
  id: string
}

export interface CreateEmployeeRequest {
  first_name: string
  last_name: string
  date_of_birth: string   // YYYY-MM-DD from form
  gender: string          // "MALE" | "FEMALE"
  email: string
  phone: string
  address: string
  username: string
  position: string
  department: string
  is_active: boolean
  permissions: string[]
  user_type?: UserType    // defaults to EMPLOYEE on backend when omitted
}

export interface UpdateEmployeeRequest {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  email: string
  phone: string
  address: string
  username: string
  position: string
  department: string
  is_active: boolean
  permissions: string[]
}

// ─── gRPC/HTTP status codes ───────────────────────────────────────────────────

export enum GrpcStatus {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  UNAUTHENTICATED = 16,
  RESOURCE_EXHAUSTED = 8,
  UNAVAILABLE = 14,
  INTERNAL = 13,
}

export interface GrpcError {
  code: GrpcStatus
  message: string
}

// ─── App state ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  userType: UserType
  permissions: string[]
}
