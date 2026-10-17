import type {
  BackendMemberProfile,
  BackendStudentSlice,
  BackendTeacherSlice,
} from '@/api/types'
import type { StudentRecord, TeacherRecord } from '@/api/types'
import type { SessionRole, User, UserRole } from '@/types/auth'
import {
  INTENDED_ROLE_KEY,
  LAST_ACTIVE_ROLE_KEY,
  MEMBER_PROFILE_KEY,
  PROFILE_SNAPSHOT_KEY,
} from '@/config/features'

export type ProfileSnapshot = {
  email: string
  hasTeacherProfile: boolean
  hasStudentProfile: boolean
  role: SessionRole
  teacherProfileId?: number
  studentProfileId?: number
}

export function readLastActiveRole(): UserRole | null {
  const v = localStorage.getItem(LAST_ACTIVE_ROLE_KEY)
  return v === 'student' || v === 'teacher' ? v : null
}

export function rememberActiveRole(role: UserRole) {
  localStorage.setItem(LAST_ACTIVE_ROLE_KEY, role)
  localStorage.setItem(INTENDED_ROLE_KEY, role)
}

/** Efface la qualité mémorisée (nouvelle inscription ou changement de compte). */
export function clearRoleIntent() {
  localStorage.removeItem(LAST_ACTIVE_ROLE_KEY)
  localStorage.removeItem(INTENDED_ROLE_KEY)
}

export function clearProfileSnapshot() {
  localStorage.removeItem(PROFILE_SNAPSHOT_KEY)
}

function readProfileSnapshot(): ProfileSnapshot | null {
  try {
    const raw = localStorage.getItem(PROFILE_SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProfileSnapshot
    if (!parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function saveProfileSnapshot(user: User) {
  if (!user.email) return
  const snapshot: ProfileSnapshot = {
    email: user.email.trim().toLowerCase(),
    hasTeacherProfile: !!user.hasTeacherProfile,
    hasStudentProfile: !!user.hasStudentProfile,
    role: user.role,
    teacherProfileId: user.teacherProfileId,
    studentProfileId: user.studentProfileId,
  }
  localStorage.setItem(PROFILE_SNAPSHOT_KEY, JSON.stringify(snapshot))
}

/** Complète les qualités manquantes depuis le dernier login connu (même e-mail). */
export function applyProfileSnapshot(base: User): User {
  const snap = readProfileSnapshot()
  if (!snap) return base
  if (snap.email !== base.email.trim().toLowerCase()) return base

  const hasTeacherProfile = base.hasTeacherProfile || snap.hasTeacherProfile
  const hasStudentProfile = base.hasStudentProfile || snap.hasStudentProfile
  const preferred = readLastActiveRole() ?? (localStorage.getItem(INTENDED_ROLE_KEY) as UserRole | null)

  let role: SessionRole = base.role
  if (role === 'pending') {
    if (hasTeacherProfile && hasStudentProfile) {
      role = preferred === 'student' ? 'student' : preferred === 'teacher' ? 'teacher' : snap.role !== 'pending' ? snap.role : 'teacher'
    } else if (hasTeacherProfile) {
      role = 'teacher'
    } else if (hasStudentProfile) {
      role = 'student'
    }
  }

  return {
    ...base,
    role,
    hasTeacherProfile,
    hasStudentProfile,
    teacherProfileId: base.teacherProfileId ?? snap.teacherProfileId,
    studentProfileId: base.studentProfileId ?? snap.studentProfileId,
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asTeacherSlice(raw: unknown): BackendTeacherSlice | null {
  if (!isRecord(raw)) return null
  // Format login : { teacher: { teacherId, ... } } ou { teacherId, ... }
  if (isRecord(raw.teacher) && (raw.teacherId == null || raw.teacherId === undefined)) {
    return asTeacherSlice(raw.teacher)
  }
  if (typeof raw.teacherId === 'number' || typeof raw.teacherId === 'string') {
    const id = typeof raw.teacherId === 'number' ? raw.teacherId : Number.parseInt(String(raw.teacherId), 10)
    if (!id) return null
    return {
      teacherId: id,
      typeTeacherId:
        raw.typeTeacherId == null
          ? isRecord(raw.typeTeacher) && typeof raw.typeTeacher.id === 'number'
            ? raw.typeTeacher.id
            : typeof raw.typeTeacher === 'number'
              ? raw.typeTeacher
              : null
          : typeof raw.typeTeacherId === 'number'
            ? raw.typeTeacherId
            : Number(raw.typeTeacherId),
      departement: raw.departement != null ? String(raw.departement) : undefined,
      justificatif: raw.justificatif != null ? String(raw.justificatif) : undefined,
      gender: raw.gender != null ? String(raw.gender) : undefined,
    }
  }
  if (isRecord(raw.teacher)) return asTeacherSlice(raw.teacher)
  return null
}

function asStudentSlice(raw: unknown): BackendStudentSlice | null {
  if (!isRecord(raw)) return null
  // Format login : { student: { studentId, ... } } ou { studentId, ... }
  if (isRecord(raw.student) && (raw.studentId == null || raw.studentId === undefined)) {
    return asStudentSlice(raw.student)
  }
  if (typeof raw.studentId === 'number' || typeof raw.studentId === 'string') {
    const id =
      typeof raw.studentId === 'number' ? raw.studentId : Number.parseInt(String(raw.studentId), 10)
    if (!id) return null
    return {
      studentId: id,
      matricule: raw.matricule != null ? String(raw.matricule) : undefined,
      gender: raw.gender != null ? String(raw.gender) : undefined,
      promotionId:
        raw.promotionId == null
          ? undefined
          : typeof raw.promotionId === 'number'
            ? raw.promotionId
            : Number(raw.promotionId),
      etablissementId:
        raw.etablissementId == null
          ? undefined
          : typeof raw.etablissementId === 'number'
            ? raw.etablissementId
            : Number(raw.etablissementId),
    }
  }
  if (isRecord(raw.student)) return asStudentSlice(raw.student)
  return null
}

/** Normalise `member.profile` (objet login ou liste legacy). */
export function normalizeMemberProfile(raw: unknown): BackendMemberProfile | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    // Ancien format tableau : pas de teacher/student métier.
    return null
  }
  if (!isRecord(raw)) return null
  return raw as BackendMemberProfile
}

export function extractTeacherFromProfile(profile: BackendMemberProfile | null): TeacherRecord | null {
  if (!profile) return null
  const slice = asTeacherSlice(profile.teacher)
  if (!slice) return null
  return {
    teacherId: slice.teacherId,
    typeTeacherId: slice.typeTeacherId ?? undefined,
    departement: slice.departement,
    justificatif: slice.justificatif,
    gender: slice.gender,
  }
}

export function extractStudentFromProfile(profile: BackendMemberProfile | null): StudentRecord | null {
  if (!profile) return null
  const slice = asStudentSlice(profile.student)
  if (!slice) return null
  return {
    studentId: slice.studentId,
    matricule: slice.matricule,
    gender: slice.gender,
    promotionId: slice.promotionId,
    etablissementId: slice.etablissementId,
  }
}

export function qualitiesFromMemberProfile(
  base: User,
  profile: BackendMemberProfile | null,
): User {
  const teacher = extractTeacherFromProfile(profile)
  const student = extractStudentFromProfile(profile)
  const preferred =
    readLastActiveRole() ?? (localStorage.getItem(INTENDED_ROLE_KEY) as UserRole | null)

  const hasTeacherProfile = !!teacher?.teacherId || !!base.hasTeacherProfile
  const hasStudentProfile = !!student?.studentId || !!base.hasStudentProfile

  let role: SessionRole = 'pending'
  if (hasTeacherProfile && hasStudentProfile) {
    role = preferred === 'student' ? 'student' : 'teacher'
  } else if (hasTeacherProfile) {
    role = 'teacher'
  } else if (hasStudentProfile) {
    role = 'student'
  } else if (typeof profile?.type === 'number') {
    // Fallback si le backend n'envoie que le code de type.
    // type 3 observé = enseignant sur LawApp.
    if (profile.type === 3) role = 'pending'
  }

  return {
    ...base,
    role,
    hasTeacherProfile,
    hasStudentProfile,
    teacherProfileId: teacher?.teacherId ?? base.teacherProfileId,
    studentProfileId: student?.studentId ?? base.studentProfileId,
    studentId: student?.matricule ?? base.studentId,
    institution: teacher?.departement ?? base.institution,
  }
}

export function loadStoredMemberProfile(): BackendMemberProfile | null {
  try {
    const raw = localStorage.getItem(MEMBER_PROFILE_KEY)
    if (!raw) return null
    return normalizeMemberProfile(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function saveMemberProfile(profile: BackendMemberProfile | null | undefined) {
  if (!profile) {
    localStorage.removeItem(MEMBER_PROFILE_KEY)
    return
  }
  localStorage.setItem(MEMBER_PROFILE_KEY, JSON.stringify(profile))
}

export function clearMemberProfile() {
  localStorage.removeItem(MEMBER_PROFILE_KEY)
}

/** Met à jour le profil stocké après complétion enseignant/étudiant. */
export function mergeStoredTeacherProfile(teacher: TeacherRecord): BackendMemberProfile {
  const current = loadStoredMemberProfile() ?? {}
  const next: BackendMemberProfile = {
    ...current,
    type: typeof current.type === 'number' ? current.type : 3,
    teacher: {
      teacher: {
        teacherId: teacher.teacherId,
        typeTeacherId: teacher.typeTeacherId ?? null,
        departement: teacher.departement,
        justificatif: teacher.justificatif,
        gender: teacher.gender,
      },
    },
  }
  saveMemberProfile(next)
  return next
}

export function mergeStoredStudentProfile(student: StudentRecord): BackendMemberProfile {
  const current = loadStoredMemberProfile() ?? {}
  const next: BackendMemberProfile = {
    ...current,
    type: typeof current.type === 'number' ? current.type : current.type,
    student: {
      student: {
        studentId: student.studentId,
        matricule: student.matricule,
        gender: student.gender,
        promotionId: student.promotionId,
        etablissementId: student.etablissementId,
      },
    },
  }
  saveMemberProfile(next)
  return next
}
