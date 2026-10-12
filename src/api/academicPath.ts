import { apiGet, apiPost } from '@/api/http'
import type { AcademicPathRequest, ApiMessageResponse } from '@/api/types'
import { unwrapObject } from '@/utils/apiHelpers'

/** GET /api/v1/protected/students/me/academic-path */
export async function getMyAcademicPath(): Promise<unknown> {
  return apiGet<unknown>('protected/students/me/academic-path')
}

/** POST /api/v1/protected/students/me/academic-path */
export async function submitMyAcademicPath(
  payload: AcademicPathRequest,
): Promise<ApiMessageResponse & Record<string, unknown>> {
  const raw = await apiPost<unknown>('protected/students/me/academic-path', payload)
  return (unwrapObject(raw) ?? raw ?? {}) as ApiMessageResponse & Record<string, unknown>
}
