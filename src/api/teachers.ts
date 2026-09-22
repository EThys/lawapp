import { v1Get, v1Post, apiPut } from '@/api/http'
import type {
  TeacherRecord,
  TeacherRequest,
  ValidationAccountTeacher,
  ApiMessageResponse,
} from '@/api/types'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'

function unwrapTeachers(data: unknown): TeacherRecord[] {
  return unwrapList<TeacherRecord>(data).filter((t) => t && typeof t.teacherId === 'number')
}

/** GET /v1/protected/teachers — liste des enseignants (Swagger teacher-controller). */
export async function listTeachers(): Promise<TeacherRecord[]> {
  const data = await v1Get<unknown>('protected/teachers')
  return unwrapTeachers(data)
}

export type TeacherMatchHint = {
  userId?: number | null
  email?: string | null
  username?: string | null
  teacherId?: number | null
}

function matchesTeacher(t: TeacherRecord, hint: TeacherMatchHint): boolean {
  if (hint.teacherId != null && t.teacherId === hint.teacherId) return true
  if (hint.userId != null && t.userId != null && t.userId === hint.userId) return true
  const email = hint.email?.trim().toLowerCase()
  if (email && t.email?.trim().toLowerCase() === email) return true
  const username = hint.username?.trim().toLowerCase()
  if (username && t.username?.trim().toLowerCase() === username) return true
  return false
}

/** Profil enseignant du compte connecté (filtre sur la liste protégée). */
export async function getMyTeacherProfile(hint: TeacherMatchHint = {}): Promise<TeacherRecord | null> {
  try {
    const list = await listTeachers()
    return list.find((t) => matchesTeacher(t, hint)) ?? null
  } catch {
    return null
  }
}

function parseTeacherFromCreateResponse(data: unknown): TeacherRecord | null {
  const direct = unwrapObject<TeacherRecord>(data)
  if (direct && typeof direct.teacherId === 'number') return direct

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['teacher', 'data', 'session', 'result']) {
      const nested = obj[key]
      const fromNested = unwrapObject<TeacherRecord>(nested)
      if (fromNested && typeof fromNested.teacherId === 'number') return fromNested
    }
    const rawId = obj.teacherId ?? obj.id
    const teacherId =
      typeof rawId === 'number' ? rawId : Number.parseInt(String(rawId ?? ''), 10)
    if (teacherId > 0) {
      return {
        teacherId,
        typeTeacherId: typeof obj.typeTeacherId === 'number' ? obj.typeTeacherId : undefined,
        departement: typeof obj.departement === 'string' ? obj.departement : undefined,
        justificatif: typeof obj.justificatif === 'string' ? obj.justificatif : undefined,
        gender: typeof obj.gender === 'string' ? obj.gender : undefined,
      }
    }
  }
  return null
}

/**
 * POST /v1/private/teachers — création profil enseignant.
 * Renvoie le Teacher extrait de la réponse si possible.
 */
export async function registerTeacherProfile(
  payload: TeacherRequest,
): Promise<{ message?: string; teacher: TeacherRecord | null; raw: ApiMessageResponse }> {
  const raw = await v1Post<ApiMessageResponse>('private/teachers', payload)
  return {
    message: raw.message,
    teacher: parseTeacherFromCreateResponse(raw),
    raw,
  }
}

/** PUT /api/v1/protected/teachers/validation — validation compte enseignant. */
export async function validateTeacherAccount(
  teacherId: number,
  state: boolean,
): Promise<ApiMessageResponse> {
  const body: ValidationAccountTeacher = { teacherId, state }
  return apiPut<ApiMessageResponse>('protected/teachers/validation', body)
}
