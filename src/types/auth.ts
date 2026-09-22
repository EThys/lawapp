/** Qualité métier (après profil). */
export type UserRole = 'teacher' | 'student'

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
