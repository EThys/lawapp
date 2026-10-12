import { apiGet, apiPut } from '@/api/http'
import type { AffiliationRejectRequest, ApiMessageResponse } from '@/api/types'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'

export type AffiliationRequestKind = 'teacher' | 'student' | 'evaluation'

export type AffiliationQueueItem = {
  id: number
  type?: AffiliationRequestKind | string
  status?: string
  label?: string
  userId?: number
  teacherId?: number
  studentPathId?: number
  evaluationId?: number
  requestedAt?: string
  [key: string]: unknown
}

/** GET /api/v1/private/etablissements/{etabId}/affiliation-requests */
export async function listAffiliationRequests(
  etabId: number,
  filters?: { status?: string; type?: AffiliationRequestKind },
): Promise<AffiliationQueueItem[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.type) params.set('type', filters.type)
  const qs = params.toString()
  const path = qs
    ? `private/etablissements/${etabId}/affiliation-requests?${qs}`
    : `private/etablissements/${etabId}/affiliation-requests`
  const data = await apiGet<unknown>(path)
  return unwrapList<AffiliationQueueItem>(data).filter((item) => item && typeof item.id === 'number')
}

function parseQueuePayload(data: unknown): AffiliationQueueItem[] {
  if (Array.isArray(data)) return data as AffiliationQueueItem[]
  const obj = unwrapObject<Record<string, unknown>>(data)
  if (!obj) return []
  for (const key of ['teachers', 'students', 'evaluations', 'items', 'requests', 'session', 'data']) {
    const nested = obj[key]
    if (Array.isArray(nested)) return nested as AffiliationQueueItem[]
  }
  return unwrapList<AffiliationQueueItem>(data)
}

/** Variante tolérante si le backend renvoie des tableaux groupés. */
export async function listAffiliationRequestsGrouped(
  etabId: number,
  filters?: { status?: string },
): Promise<AffiliationQueueItem[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  const qs = params.toString()
  const path = qs
    ? `private/etablissements/${etabId}/affiliation-requests?${qs}`
    : `private/etablissements/${etabId}/affiliation-requests`
  const data = await apiGet<unknown>(path)
  return parseQueuePayload(data)
}

export async function verifyTeacherAffiliation(
  etabId: number,
  affiliationId: number,
): Promise<ApiMessageResponse> {
  return apiPut<ApiMessageResponse>(
    `private/etablissements/${etabId}/teacher-affiliations/${affiliationId}/verify`,
  )
}

export async function rejectTeacherAffiliation(
  etabId: number,
  affiliationId: number,
  body?: AffiliationRejectRequest,
): Promise<ApiMessageResponse> {
  return apiPut<ApiMessageResponse>(
    `private/etablissements/${etabId}/teacher-affiliations/${affiliationId}/reject`,
    body ?? {},
  )
}

export async function verifyStudentPath(
  etabId: number,
  pathId: number,
): Promise<ApiMessageResponse> {
  return apiPut<ApiMessageResponse>(
    `private/etablissements/${etabId}/student-paths/${pathId}/verify`,
  )
}

export async function rejectStudentPath(
  etabId: number,
  pathId: number,
  body?: AffiliationRejectRequest,
): Promise<ApiMessageResponse> {
  return apiPut<ApiMessageResponse>(
    `private/etablissements/${etabId}/student-paths/${pathId}/reject`,
    body ?? {},
  )
}
