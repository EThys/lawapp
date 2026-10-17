import { v1Get, v1Post, apiPut } from '@/api/http'
import type {
  TeacherRecord,
  TeacherRequest,
  ValidationAccountTeacher,
  ApiMessageResponse,
} from '@/api/types'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Normalise un enseignant (liste protégée ou réponse création). */
export function normalizeTeacherRecord(raw: unknown): TeacherRecord | null {
  if (!isRecord(raw)) return null

  const teacherIdRaw = raw.teacherId ?? raw.id
  const teacherId =
    typeof teacherIdRaw === 'number'
      ? teacherIdRaw
      : Number.parseInt(String(teacherIdRaw ?? ''), 10)
  if (!Number.isFinite(teacherId) || teacherId <= 0) return null

  let typeTeacherId: number | undefined
  if (typeof raw.typeTeacherId === 'number') typeTeacherId = raw.typeTeacherId
  else if (typeof raw.typeTeacher === 'number') typeTeacherId = raw.typeTeacher
  else if (isRecord(raw.typeTeacher) && typeof raw.typeTeacher.id === 'number') {
    typeTeacherId = raw.typeTeacher.id
  }

  const departement =
    typeof raw.departement === 'string'
      ? raw.departement
      : typeof raw.department === 'string'
        ? raw.department
        : undefined

  const gender =
    typeof raw.gender === 'string'
      ? raw.gender
      : typeof raw.sexe === 'string'
        ? raw.sexe
        : typeof raw.genre === 'string'
          ? raw.genre
          : undefined

  const justificatif =
    raw.justificatif != null
      ? String(raw.justificatif)
      : raw.justification != null
        ? String(raw.justification)
        : undefined

  return {
    teacherId,
    typeTeacherId,
    departement: departement?.trim() || undefined,
    gender: gender?.trim() || undefined,
    justificatif: justificatif?.trim() || undefined,
    userId: typeof raw.userId === 'number' ? raw.userId : undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    username: typeof raw.username === 'string' ? raw.username : undefined,
  }
}

function unwrapTeachers(data: unknown): TeacherRecord[] {
  return unwrapList<unknown>(data)
    .map((item) => normalizeTeacherRecord(item))
    .filter((t): t is TeacherRecord => !!t)
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
  const direct = normalizeTeacherRecord(data)
  if (direct) return direct

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['teacher', 'data', 'session', 'result']) {
      const nested = obj[key]
      const fromNested = normalizeTeacherRecord(nested)
      if (fromNested) return fromNested
    }
    return normalizeTeacherRecord(obj)
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
