import type { InstitutionMembership, PlatformRole } from '@/types/platformRoles'

/** Qualité métier (après profil). */
export type UserRole = 'teacher' | 'student'

/** Demande d’affiliation à un établissement (vérification ultérieure — non bloquant). */
export type InstitutionAffiliationStatus = 'pending' | 'verified'

export interface InstitutionAffiliation {
  institutionKey: string
  institutionLabel: string
  status: InstitutionAffiliationStatus
  requestedAt: string
}

/** Parcours académique étudiant (UCC · Droit · L2…) — validation séparée, non bloquante. */
export interface StudentAcademicAffiliation {
  institutionKey: string
  institutionLabel: string
  faculty: string
  promotion: string
  classroomLabel?: string
  classroomId?: string
  status: InstitutionAffiliationStatus
  requestedAt: string
}

/**
 * Rôle de session : `pending` = compte connecté sans profil enseignant/étudiant.
 * La qualité enseignant/étudiant s'obtient en complétant le profil (Swagger).
 */
export type SessionRole = UserRole | 'pending'

export interface User {
  id: string
  email: string
  passwordHash?: string
  apiUserId?: number
  firstName: string
  lastName: string
  role: SessionRole
  /** Qualités dérivées des profils backend. */
  hasTeacherProfile?: boolean
  hasStudentProfile?: boolean
  teacherProfileId?: number
  studentProfileId?: number
  institution?: string
  studentId?: string
  phone?: string
  city?: string
  certified?: boolean
  premium?: boolean
  /** Backend : super admin plateforme (sinon dérivé de certified en démo). */
  platformRole?: PlatformRole
  /** Rôles dans un ou plusieurs établissements partenaires. */
  institutionMemberships?: InstitutionMembership[]
  /** Enseignant rattaché à un établissement (validation en cours ou confirmée). */
  teacherInstitutionAffiliation?: InstitutionAffiliation
  /** Étudiant rattaché à un établissement (validation en cours ou confirmée). */
  studentInstitutionAffiliation?: InstitutionAffiliation
  /** Université + faculté + promotion (ex. UCC, Droit, L2). */
  studentAcademicAffiliation?: StudentAcademicAffiliation
  createdAt: string
}

export interface AuthSession {
  userId: string
  token: string
  expiresAt: string
}

/** Inscription compte principal (sans rôle métier — profil ensuite). */
export interface RegisterAccountPayload {
  email: string
  password: string
  confirmPassword?: string
  firstName: string
  lastName: string
  city?: string
  phone: string
  pseudo?: string
}

export interface RegisterTeacherPayload {
  email: string
  password: string
  confirmPassword?: string
  firstName: string
  lastName: string
  institution?: string
  city?: string
  phone: string
  pseudo?: string
}

export interface RegisterStudentPayload {
  email: string
  password: string
  confirmPassword?: string
  firstName: string
  lastName: string
  studentId: string
  institution?: string
  city?: string
  phone: string
  pseudo?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const ROLE_LABELS: Record<SessionRole, string> = {
  teacher: 'Enseignant',
  student: 'Étudiant',
  pending: 'Compte à compléter',
}
