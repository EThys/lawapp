import { apiGet } from '@/api/http'
import type { FacultyRecord } from '@/api/types'
import { unwrapList } from '@/utils/apiHelpers'
function normalizeFaculty(item: FacultyRecord): FacultyRecord {
  const active = item.active ?? item.isActive
  return active === undefined ? item : { ...item, active }
}

/** GET /api/v1/public/faculties — facultés (optionnellement filtrées par établissement). */
export async function listFaculties(etablissementId?: number): Promise<FacultyRecord[]> {
  const params = new URLSearchParams()
  if (etablissementId != null) params.set('etablissementId', String(etablissementId))
  const qs = params.toString()
  const path = qs ? `public/faculties?${qs}` : 'public/faculties'
  const data = await apiGet<unknown>(path, true)
  return unwrapList<FacultyRecord>(data)
    .filter((f) => f && (f.id != null || f.name))
    .map(normalizeFaculty)
}
