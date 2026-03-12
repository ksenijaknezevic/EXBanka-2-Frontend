import { GrpcStatus } from '@/types'

interface MappedError {
  message: string
  /** true when the user session is no longer valid */
  isUnauthenticated: boolean
  /** true when the server is unreachable */
  isUnavailable: boolean
}

/**
 * Maps a raw gRPC error (code + message from backend) to a user-facing
 * string.  System/internal details are never shown directly.
 */
export function mapGrpcError(code: number, _rawMessage?: string): MappedError {
  const isUnauthenticated = code === GrpcStatus.UNAUTHENTICATED
  const isUnavailable =
    code === GrpcStatus.UNAVAILABLE || code === GrpcStatus.DEADLINE_EXCEEDED

  let message: string

  switch (code) {
    case GrpcStatus.UNAUTHENTICATED:
      message = 'Vaša sesija je istekla. Molimo prijavite se ponovo.'
      break
    case GrpcStatus.UNAVAILABLE:
    case GrpcStatus.DEADLINE_EXCEEDED:
      message = 'Sistem je trenutno nedostupan, molimo pokušajte kasnije.'
      break
    case GrpcStatus.PERMISSION_DENIED:
      message = 'Nemate ovlašćenja za ovu akciju.'
      break
    case GrpcStatus.NOT_FOUND:
      message = 'Traženi resurs nije pronađen.'
      break
    case GrpcStatus.ALREADY_EXISTS:
      message = 'Resurs sa ovim podacima već postoji.'
      break
    case GrpcStatus.INVALID_ARGUMENT:
      message = _rawMessage?.trim() || 'Uneseni podaci nisu ispravni. Proverite unos.'
      break
    default:
      message = 'Došlo je do greške. Molimo pokušajte ponovo.'
  }

  return { message, isUnauthenticated, isUnavailable }
}
