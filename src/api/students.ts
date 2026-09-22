import { apiGet, apiPost } from '@/api/http'
import type { ApiMessageResponse, StudentDetailDto, StudentRecord, StudentRequest } from '@/api/types'
import { unwrapList } from '@/utils/apiHelpers'

function unwrapStudents(data: unknown): StudentDetailDto[] {
  return unwrapList<StudentDetailDto>(data).filter(
    (s) => s && typeof s.studentId === 'number',
  )
}

export type ListStudentsFilters = {
  promotionId?: number
  etablissementId?: number
}

/** GET /api/v1/protected/students — liste enrichie (profil + user + promo + établissement). */
export async function listStudents(
  filters: ListStudentsFilters = {},
): Promise<StudentDetailDto[]> {
  const params = new URLSearchParams()
  if (filters.promotionId != null) params.set('promotionId', String(filters.promotionId))
  if (filters.etablissementId != null) {
    params.set('etablissementId', String(filters.etablissementId))
  }
  const qs = params.toString()
  const path = qs ? `protected/students?${qs}` : 'protected/students'
  const data = await apiGet<unknown>(path)
  return unwrapStudents(data)
}

/** GET /api/v1/protected/students/{id} */
export async function getStudentById(id: number): Promise<StudentDetailDto | null> {
  try {
    const data = await apiGet<unknown>(`protected/students/${id}`)
    const list = unwrapStudents(data)
    if (list.length) return list[0] ?? null
    if (data && typeof data === 'object' && 'studentId' in (data as object)) {
      return data as StudentDetailDto
    }
    return null
  } catch {
    return null
  }
}

export function studentDisplayName(
  s: Pick<StudentDetailDto, 'firstName' | 'lastName' | 'email' | 'matricule' | 'userId'>,
): string {
  const full = `${s.lastName ?? ''} ${s.firstName ?? ''}`.trim()
  if (full) return full
  if (s.matricule?.trim()) return s.matricule.trim()
  if (s.email?.trim()) return s.email.trim()
  if (s.userId != null) return `Étudiant #${s.userId}`
  return 'Étudiant'
}

/** Filtre local par nom / prénom / e-mail / matricule. */
export function filterStudentsByName(
  students: StudentDetailDto[],
  query: string,
  limit = 12,
): StudentDetailDto[] {
  const q = query.trim().toLowerCase()
  if (!q) return students.slice(0, limit)
  return students
    .filter((s) => {
      const full = `${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase()
      const rev = `${s.lastName ?? ''} ${s.firstName ?? ''}`.toLowerCase()
      return (
        full.includes(q) ||
        rev.includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.matricule?.toLowerCase().includes(q) ?? false) ||
        (s.phone?.toLowerCase().includes(q) ?? false)
      )
    })
    .slice(0, limit)
}

export type StudentMatchHint = {
  userId?: number | null
  email?: string | null
  matricule?: string | null
  studentId?: number | null
}

function matchesStudent(s: StudentRecord, hint: StudentMatchHint): boolean {
  if (hint.studentId != null && s.studentId === hint.studentId) return true
  if (hint.userId != null && s.userId != null && s.userId === hint.userId) return true
  const email = hint.email?.trim().toLowerCase()
  if (email && s.email?.trim().toLowerCase() === email) return true
  const matricule = hint.matricule?.trim().toLowerCase()
  if (matricule && s.matricule?.trim().toLowerCase() === matricule) return true
  return false
}

/** Profil étudiant du compte connecté (filtre + id mémorisé). */
export async function getMyStudentProfile(
  hint: StudentMatchHint = {},
): Promise<StudentRecord | null> {
  try {
    const list = await listStudents()
    return list.find((s) => matchesStudent(s, hint)) ?? null
  } catch {
    return null
  }
}

/** POST /api/v1/public/students - création profil étudiant (qualité étudiant). */
export async function registerStudentProfile(
  payload: StudentRequest,
): Promise<ApiMessageResponse> {
  return apiPost<ApiMessageResponse>('public/students', payload)
}
