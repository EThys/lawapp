import type { UserRole } from '@/types/auth'

const STORAGE_KEY = 'lawapp_otp_identifier'
const CREDENTIALS_KEY = 'lawapp_pending_login_credentials'
const REGISTRATION_ROLE_KEY = 'lawapp_registration_role'

export interface PendingRegistrationRole {
  email: string
  /** @deprecated préférer `roles` */
  role?: UserRole
  roles?: UserRole[]
  /** Choix à l’inscription, repris à la création du profil métier. */
  gender?: string
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

function normalizeRegistrationRoles(parsed: PendingRegistrationRole): UserRole[] {
  const fromList = (parsed.roles ?? []).filter(
    (r): r is UserRole => r === 'teacher' || r === 'student',
  )
  if (fromList.length) return [...new Set(fromList)]
  if (parsed.role === 'teacher' || parsed.role === 'student') return [parsed.role]
  return []
}

/** Qualité(s) choisie(s) à l'inscription — jusqu'à création des profils métier. */
export function persistRegistrationRoles(
  email: string,
  roles: UserRole[],
  extra?: { gender?: string },
) {
  const unique = [...new Set(roles.filter((r) => r === 'teacher' || r === 'student'))]
  if (!unique.length && !extra?.gender?.trim()) return
  try {
    const payload: PendingRegistrationRole = {
      email: email.trim().toLowerCase(),
      roles: unique.length ? unique : undefined,
      role: unique.length === 1 ? unique[0] : undefined,
    }
    const gender = extra?.gender?.trim()
    if (gender) payload.gender = gender
    sessionStorage.setItem(REGISTRATION_ROLE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

export function readPendingRegistrationGender(email?: string | null): string | null {
  try {
    const raw = sessionStorage.getItem(REGISTRATION_ROLE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingRegistrationRole
    const expected = email?.trim().toLowerCase()
    if (expected && parsed.email !== expected) return null
    const g = parsed.gender?.trim()
    return g || null
  } catch {
    return null
  }
}

/** @deprecated utiliser `persistRegistrationRoles` */
export function persistRegistrationRole(email: string, role: UserRole) {
  persistRegistrationRoles(email, [role])
}

export function readPendingRegistrationRoles(email?: string | null): UserRole[] {
  try {
    const raw = sessionStorage.getItem(REGISTRATION_ROLE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PendingRegistrationRole
    const roles = normalizeRegistrationRoles(parsed)
    if (!roles.length) return []
    const expected = email?.trim().toLowerCase()
    if (expected && parsed.email !== expected) return []
    return roles
  } catch {
    return []
  }
}

export function readPendingRegistrationRole(email?: string | null): UserRole | null {
  const roles = readPendingRegistrationRoles(email)
  return roles[0] ?? null
}

/** Retire une qualité déjà complétée ; efface la session si plus rien en attente. */
export function consumePendingRegistrationRole(email: string, role: UserRole) {
  const roles = readPendingRegistrationRoles(email).filter((r) => r !== role)
  if (!roles.length) {
    clearPendingRegistrationRole()
    return
  }
  persistRegistrationRoles(email, roles)
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
