import { apiGet, v1Get } from '@/api/http'
import { unwrapList } from '@/utils/apiHelpers'
import type { UserDto } from '@/api/types'

function unwrapUsers(data: unknown): UserDto[] {
  return unwrapList<UserDto>(data).filter((u) => u && typeof u.userId === 'number')
}

/**
 * GET /api/v1/private/users — liste utilisateurs (Swagger Utilisateur / getAllUserPrivate).
 * Fallback : GET /api/v1/protected/users.
 */
export async function listUsers(): Promise<UserDto[]> {
  try {
    const data = await apiGet<unknown>('private/users')
    const list = unwrapUsers(data)
    if (list.length) return list
  } catch {
    /* fallback protected */
  }
  try {
    const data = await apiGet<unknown>('protected/users')
    return unwrapUsers(data)
  } catch {
    try {
      const data = await v1Get<unknown>('protected/users')
      return unwrapUsers(data)
    } catch {
      return []
    }
  }
}

export function userDisplayName(u: Pick<UserDto, 'firstName' | 'lastName' | 'username' | 'email'>): string {
  const full = `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim()
  if (full) return full
  if (u.username?.trim()) return u.username.trim()
  if (u.email?.trim()) return u.email.trim()
  return 'Utilisateur'
}
