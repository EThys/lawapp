import type {
  InstitutionAffiliation,
  InstitutionAffiliationStatus,
  StudentAcademicAffiliation,
  User,
} from '@/types/auth'
import type { InstitutionMembership } from '@/types/platformRoles'
import { unwrapObject } from '@/utils/apiHelpers'

function normalizeAffiliationStatus(raw: unknown): InstitutionAffiliationStatus {
  const s = String(raw ?? 'pending').toLowerCase()
  if (s === 'verified' || s === 'approved' || s === 'active') return 'verified'
  return 'pending'
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number.parseInt(v, 10)
  }
  return undefined
}

function mapInstitutionAffiliation(raw: unknown): InstitutionAffiliation | undefined {
  const obj = unwrapObject<Record<string, unknown>>(raw)
  if (!obj) return undefined
  const etabId = pickNumber(obj, 'etablissementId', 'institutionId', 'id')
  const label = pickString(obj, 'label', 'name', 'institutionLabel', 'etablissementName')
  if (!etabId && !label) return undefined
  return {
    institutionKey: etabId != null ? String(etabId) : label,
    institutionLabel: label || (etabId != null ? `Établissement #${etabId}` : ''),
    status: normalizeAffiliationStatus(obj.status),
    requestedAt:
      pickString(obj, 'requestedAt', 'createdAt') || new Date().toISOString(),
  }
}

function mapAcademicPath(raw: unknown): StudentAcademicAffiliation | undefined {
  const obj = unwrapObject<Record<string, unknown>>(raw)
  if (!obj) return undefined
  const etabId = pickNumber(obj, 'etablissementId', 'institutionId')
  const label = pickString(obj, 'label', 'institutionLabel', 'etablissementName')
  const faculty = pickString(obj, 'facultyLabel', 'facultyName', 'faculty')
  const promotion = pickString(obj, 'promotionLabel', 'promotionName', 'promotion')
  if (!etabId && !label && !faculty && !promotion) return undefined
  const classroomId = pickNumber(obj, 'classroomId')
  return {
    institutionKey: etabId != null ? String(etabId) : label,
    institutionLabel: label || (etabId != null ? `Établissement #${etabId}` : ''),
    faculty: faculty || '—',
    promotion: promotion || '—',
    classroomId: classroomId != null ? String(classroomId) : undefined,
    classroomLabel: pickString(obj, 'classroomLabel', 'classroomName') || undefined,
    status: normalizeAffiliationStatus(obj.status),
    requestedAt:
      pickString(obj, 'requestedAt', 'createdAt') || new Date().toISOString(),
  }
}

function mapMemberships(raw: unknown): InstitutionMembership[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: InstitutionMembership[] = []
  for (const item of raw) {
    const obj = unwrapObject<Record<string, unknown>>(item)
    if (!obj) continue
    const etabId = pickNumber(obj, 'etablissementId', 'institutionId')
    const role = pickString(obj, 'role', 'institutionRole')
    if (etabId == null || !role) continue
    out.push({
      etablissementId: etabId,
      etablissementLabel:
        pickString(obj, 'etablissementLabel', 'label', 'name') || `Établissement #${etabId}`,
      role: role as InstitutionMembership['role'],
      active: obj.active !== false,
      grantedAt:
        pickString(obj, 'grantedAt', 'createdAt', 'requestedAt') || new Date().toISOString(),
    })
  }
  return out.length ? out : undefined
}

/** Fusionne GET protected/me dans l'utilisateur front (affiliations, ids profils). */
export function mergeSessionMeIntoUser(base: User, payload: unknown): User {
  const root = unwrapObject<Record<string, unknown>>(payload) ?? {}
  const userNode = unwrapObject<Record<string, unknown>>(root.user) ?? root

  const teacherNode =
    unwrapObject<Record<string, unknown>>(root.teacher) ??
    unwrapObject<Record<string, unknown>>(userNode.teacher)
  const studentNode =
    unwrapObject<Record<string, unknown>>(root.student) ??
    unwrapObject<Record<string, unknown>>(userNode.student)

  const teacherId = teacherNode ? pickNumber(teacherNode, 'teacherId', 'id') : undefined
  const studentId = studentNode ? pickNumber(studentNode, 'studentId', 'id') : undefined

  const teacherAffiliation = mapInstitutionAffiliation(
    teacherNode?.institutionAffiliation ?? teacherNode?.affiliation,
  )
  const academicPath = mapAcademicPath(
    studentNode?.academicPath ?? studentNode?.studentAcademicPath ?? root.academicPath,
  )

  const memberships = mapMemberships(root.institutionMemberships ?? userNode.institutionMemberships)

  const hasTeacherProfile = base.hasTeacherProfile || teacherId != null
  const hasStudentProfile = base.hasStudentProfile || studentId != null

  let role = base.role
  if (role === 'pending') {
    if (hasTeacherProfile && !hasStudentProfile) role = 'teacher'
    else if (hasStudentProfile && !hasTeacherProfile) role = 'student'
  }

  return {
    ...base,
    role,
    hasTeacherProfile,
    hasStudentProfile,
    teacherProfileId: teacherId ?? base.teacherProfileId,
    studentProfileId: studentId ?? base.studentProfileId,
    certified:
      base.certified ??
      (userNode.certified === true || userNode.isCertified === true),
    teacherInstitutionAffiliation: teacherAffiliation ?? base.teacherInstitutionAffiliation,
    studentAcademicAffiliation: academicPath ?? base.studentAcademicAffiliation,
    studentInstitutionAffiliation: academicPath
      ? {
          institutionKey: academicPath.institutionKey,
          institutionLabel: academicPath.institutionLabel,
          status: academicPath.status,
          requestedAt: academicPath.requestedAt,
        }
      : base.studentInstitutionAffiliation,
    institutionMemberships: memberships ?? base.institutionMemberships,
  }
}

export function academicPathFromApiPayload(payload: unknown): StudentAcademicAffiliation | undefined {
  const obj = unwrapObject<Record<string, unknown>>(payload)
  if (!obj) return undefined
  return mapAcademicPath(obj.academicPath ?? obj.path ?? obj)
}

export function teacherAffiliationFromApiPayload(
  payload: unknown,
): InstitutionAffiliation | undefined {
  const obj = unwrapObject<Record<string, unknown>>(payload)
  if (!obj) return undefined
  return mapInstitutionAffiliation(obj.affiliation ?? obj.institutionAffiliation ?? obj)
}
