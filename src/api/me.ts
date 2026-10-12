import { apiGet } from '@/api/http'

/** GET /api/v1/protected/me — profil session (user, teacher, student, affiliations). */
export async function fetchSessionMe(): Promise<unknown> {
  return apiGet<unknown>('protected/me')
}
