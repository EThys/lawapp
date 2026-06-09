export type UserRole = 'teacher' | 'student'

export interface User {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  role: UserRole
  institution?: string
  studentId?: string
  createdAt: string
}

export interface AuthSession {
  userId: string
  token: string
  expiresAt: string
}

export interface RegisterTeacherPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  institution?: string
}

export interface RegisterStudentPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  studentId: string
  institution?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const ROLE_LABELS: Record<UserRole, string> = {
  teacher: 'Enseignant',
  student: 'Étudiant',
}
