import { apiGet, apiPut } from '@/api/http'
import type { HttpError } from '@/api/http'

export type SessionWorkspaceRole = 'teacher' | 'student'

/** GET /api/v1/protected/me — profil session (user, teacher, student, affiliations). */
export async function fetchSessionMe(): Promise<unknown> {
  return apiGet<unknown>('protected/me')
}

function isMissingEndpoint(err: unknown): boolean {
  const status = (err as HttpError)?.status
  return status === 404 || status === 405 || status === 501
}

/**
 * Persiste l’espace actif (enseignant / étudiant) côté serveur.
 * Essaie plusieurs chemins jusqu’à compatibilité backend ; sinon le front garde le localStorage.
 */
export async function updateActiveWorkspace(
  role: SessionWorkspaceRole,
): Promise<'synced' | 'local_only'> {
  const attempts: { path: string; body: Record<string, string> }[] = [
    { path: 'protected/me/active-workspace', body: { role } },
    { path: 'protected/me/workspace', body: { activeRole: role } },
    { path: 'protected/me', body: { activeRole: role } },
  ]
  for (const { path, body } of attempts) {
    try {
      await apiPut<unknown>(path, body)
      return 'synced'
    } catch (err) {
      if (isMissingEndpoint(err)) continue
      throw err
    }
  }
  return 'local_only'
}
