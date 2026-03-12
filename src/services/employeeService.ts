import { apiGet, apiPost, apiPut, apiPatch } from './grpcClient'
import type {
  Employee,
  ListEmployeesRequest,
  ListEmployeesResponse,
  GetEmployeeByIdRequest,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  UserType,
} from '@/types'

// ─── Backend response types (camelCase — gRPC-Gateway default) ────────────────

interface BackendUser {
  id: string            // int64 comes as string in proto3 JSON
  email: string
  firstName: string
  lastName: string
  birthDate: string     // int64 as string: unix ms
  gender: string        // "GENDER_MALE" | "GENDER_FEMALE" | "GENDER_OTHER" | "GENDER_UNSPECIFIED"
  phoneNumber: string
  address: string
  userType: string      // "USER_TYPE_ADMIN" | "USER_TYPE_EMPLOYEE" | "USER_TYPE_CLIENT"
  isActive: boolean
  createdAt: string | null
}

interface BackendEmployee {
  user: BackendUser
  username: string
  position: string
  department: string
  permissions: string[]
}

// ─── Enum mapping ─────────────────────────────────────────────────────────────

function mapGender(g: string): string {
  if (g.includes('MALE')) return 'MALE'
  if (g.includes('FEMALE')) return 'FEMALE'
  if (g.includes('OTHER')) return 'OTHER'
  return ''
}

function genderToProtoNum(g: string): number {
  switch (g) {
    case 'MALE': return 1
    case 'FEMALE': return 2
    default: return 3
  }
}

function mapUserType(t: string): UserType {
  if (t.includes('ADMIN')) return 'ADMIN'
  if (t.includes('EMPLOYEE')) return 'EMPLOYEE'
  if (t.includes('CLIENT')) return 'CLIENT'
  return 'EMPLOYEE'
}

// Proto UserType enum string (gateway/protojson unmarshals this reliably)
function userTypeToProtoValue(t: string | undefined): string {
  if (t === 'ADMIN') return 'USER_TYPE_ADMIN'
  if (t === 'CLIENT') return 'USER_TYPE_CLIENT'
  return 'USER_TYPE_EMPLOYEE'
}

/** unix ms string/number → YYYY-MM-DD */
function unixMsToDate(ms: string | number): string {
  const n = typeof ms === 'string' ? parseInt(ms, 10) : ms
  if (!n) return ''
  return new Date(n).toISOString().split('T')[0]
}

/** YYYY-MM-DD → unix ms (number) */
function dateToUnixMs(dateStr: string): number {
  if (!dateStr) return 0
  return new Date(dateStr).getTime()
}

function mapBackendEmployee(be: BackendEmployee): Employee {
  return {
    id: String(be.user.id),
    first_name: be.user.firstName,
    last_name: be.user.lastName,
    email: be.user.email,
    phone: be.user.phoneNumber,
    position: be.position,
    department: be.department,
    address: be.user.address,
    username: be.username,
    date_of_birth: unixMsToDate(be.user.birthDate),
    gender: mapGender(be.user.gender),
    is_active: be.user.isActive,
    user_type: mapUserType(be.user.userType),
    permissions: be.permissions ?? [],
  }
}

// ─── Service functions ─────────────────────────────────────────────────────────

export async function listEmployees(
  request: ListEmployeesRequest
): Promise<ListEmployeesResponse> {
  const params: Record<string, string | number | undefined> = {
    page: request.page,
    page_size: request.size,
    email: request.email || undefined,
    first_name: request.first_name || undefined,
    last_name: request.last_name || undefined,
    position: request.position || undefined,
  }

  const res = await apiGet<{ employees: BackendEmployee[] | null }>('/employee', params)
  const employees = (res.employees ?? []).map(mapBackendEmployee)

  return { employees, hasMore: employees.length >= request.size }
}

export async function getEmployeeById(request: GetEmployeeByIdRequest): Promise<Employee> {
  const res = await apiGet<{ employee: BackendEmployee }>(`/employee/${request.id}`)
  return mapBackendEmployee(res.employee)
}

export async function createEmployee(request: CreateEmployeeRequest): Promise<Employee> {
  const body = {
    email: request.email,
    first_name: request.first_name,
    last_name: request.last_name,
    birth_date: dateToUnixMs(request.date_of_birth),
    gender: genderToProtoNum(request.gender),
    phone_number: request.phone,
    address: request.address,
    username: request.username,
    position: request.position,
    department: request.department,
    is_active: request.is_active,
    permissions: request.user_type === 'ADMIN' ? [] : request.permissions,
    userType: userTypeToProtoValue(request.user_type),
  }

  // Backend returns { id: number, email: string } on create
  const res = await apiPost<typeof body, { id: number; email: string }>('/employee', body)
  const resolvedType: UserType = request.user_type === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE'

  return {
    id: String(res.id),
    email: res.email,
    first_name: request.first_name,
    last_name: request.last_name,
    phone: request.phone,
    position: request.position,
    department: request.department,
    address: request.address,
    username: request.username,
    date_of_birth: request.date_of_birth,
    gender: request.gender,
    is_active: request.is_active,
    user_type: resolvedType,
    permissions: resolvedType === 'ADMIN' ? [] : request.permissions,
  }
}

export async function updateEmployee(request: UpdateEmployeeRequest): Promise<Employee> {
  const body = {
    id: Number(request.id),
    email: request.email,
    first_name: request.first_name,
    last_name: request.last_name,
    birth_date: dateToUnixMs(request.date_of_birth),
    gender: genderToProtoNum(request.gender),
    phone_number: request.phone,
    address: request.address,
    position: request.position,
    department: request.department,
    is_active: request.is_active,
    permissions: request.permissions,
  }

  const res = await apiPut<typeof body, { employee: BackendEmployee }>(
    `/employee/${request.id}`,
    body
  )
  return mapBackendEmployee(res.employee)
}

/**
 * Toggles is_active for any user (EMPLOYEE or ADMIN) via PATCH /employee/{id}/active.
 * Returns the updated is_active; the caller should merge into list state.
 */
export async function toggleEmployeeActive(
  id: string,
  newActiveState: boolean
): Promise<{ id: string; is_active: boolean }> {
  const res = await apiPatch<
    { is_active: boolean },
    { isActive: boolean }
  >(`/employee/${id}/active`, { is_active: newActiveState })
  return { id, is_active: res.isActive }
}
