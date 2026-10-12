import { apiGet, apiPost } from '@/api/http'
import type { ApiMessageResponse, TeacherAffiliationRequest } from '@/api/types'
import { unwrapObject } from '@/utils/apiHelpers'

/** GET /api/v1/protected/teachers/me/institution-affiliation */
export async function getMyTeacherInstitutionAffiliation(): Promise<unknown> {
  return apiGet<unknown>('protected/teachers/me/institution-affiliation')
}

/** POST /api/v1/protected/teachers/me/institution-affiliation */
export async function requestMyTeacherInstitutionAffiliation(
  payload: TeacherAffiliationRequest,
): Promise<ApiMessageResponse & Record<string, unknown>> {
  const raw = await apiPost<unknown>('protected/teachers/me/institution-affiliation', payload)
  return (unwrapObject(raw) ?? raw ?? {}) as ApiMessageResponse & Record<string, unknown>
}
