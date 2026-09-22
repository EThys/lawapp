import type { UserRole } from '@/types/auth'

const STORAGE_KEY = 'lawapp_otp_identifier'
const CREDENTIALS_KEY = 'lawapp_pending_login_credentials'
const REGISTRATION_ROLE_KEY = 'lawapp_registration_role'

export interface PendingRegistrationRole {
  email: string
  role: UserRole
}

export interface PendingLoginCredentials {
  email: string
  password: string
}

export function persistPendingVerification(email: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, email.trim())
  } catch {
    // ignore
  }
}

export function readPendingVerification(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)?.trim() || null
  } catch {
    return null
  }
}

export function persistPendingLoginCredentials(email: string, password: string) {
  try {
    sessionStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({ email: email.trim(), password } satisfies PendingLoginCredentials),
    )
  } catch {
    // ignore
  }
}

export function readPendingLoginCredentials(): PendingLoginCredentials | null {
  try {
    const raw = sessionStorage.getItem(CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingLoginCredentials
    if (!parsed?.email?.trim() || !parsed.password) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingLoginCredentials() {
  try {
    sessionStorage.removeItem(CREDENTIALS_KEY)
  } catch {
    // ignore
  }
}

export function clearPendingVerification() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Qualité choisie à l'inscription (session) — jusqu'à création du profil API. */
export function persistRegistrationRole(email: string, role: UserRole) {
  try {
    const payload: PendingRegistrationRole = {
      email: email.trim().toLowerCase(),
      role,
    }
    sessionStorage.setItem(REGISTRATION_ROLE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

export function readPendingRegistrationRole(email?: string | null): UserRole | null {
  try {
    const raw = sessionStorage.getItem(REGISTRATION_ROLE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingRegistrationRole
    if (!parsed?.role || (parsed.role !== 'teacher' && parsed.role !== 'student')) return null
    const expected = email?.trim().toLowerCase()
    if (expected && parsed.email !== expected) return null
    return parsed.role
  } catch {
    return null
  }
}

export function clearPendingRegistrationRole() {
  try {
    sessionStorage.removeItem(REGISTRATION_ROLE_KEY)
  } catch {
    // ignore
  }
}

/** OTP + identifiants temporaires (pas le rôle d'inscription). */
export function clearPendingRegistrationSession() {
  clearPendingVerification()
  clearPendingLoginCredentials()
}
