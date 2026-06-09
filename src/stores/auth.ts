import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  User,
  AuthSession,
  UserRole,
  RegisterTeacherPayload,
  RegisterStudentPayload,
  LoginPayload,
} from '@/types/auth'
import { hashPassword, validateEmail, validatePassword } from '@/utils/auth'
import { generateId } from '@/utils/helpers'
import { isInstitutionSelectable, PARTNER_INSTITUTION } from '@/data/universities'

const USERS_KEY = 'lawapp_users'
const SESSION_KEY = 'lawapp_session'

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as User[]) : []
  } catch {
    return []
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function saveSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export const useAuthStore = defineStore('auth', () => {
  const users = ref<User[]>(loadUsers())
  const session = ref<AuthSession | null>(loadSession())

  const currentUser = computed(() => {
    if (!session.value) return null
    return users.value.find((u) => u.id === session.value!.userId) ?? null
  })

  const isAuthenticated = computed(() => !!currentUser.value)
  const isTeacher = computed(() => currentUser.value?.role === 'teacher')
  const isStudent = computed(() => currentUser.value?.role === 'student')

  function persistUsers() {
    saveUsers(users.value)
  }

  function createSession(userId: string): AuthSession {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    return {
      userId,
      token: generateId(),
      expiresAt: expiresAt.toISOString(),
    }
  }

  async function registerTeacher(payload: RegisterTeacherPayload): Promise<{ ok: true } | { ok: false; error: string }> {
    const email = payload.email.trim().toLowerCase()

    if (!validateEmail(email)) return { ok: false, error: 'Adresse e-mail invalide.' }
    const pwdError = validatePassword(payload.password)
    if (pwdError) return { ok: false, error: pwdError }
    if (!payload.firstName.trim() || !payload.lastName.trim()) {
      return { ok: false, error: 'Le prénom et le nom sont requis.' }
    }
    if (users.value.some((u) => u.email === email)) {
      return { ok: false, error: 'Un compte existe déjà avec cette adresse e-mail.' }
    }

    const institution = payload.institution?.trim()
    if (institution && !isInstitutionSelectable(institution)) {
      return { ok: false, error: `Seul l'établissement partenaire (${PARTNER_INSTITUTION}) est disponible pour l'instant.` }
    }

    const user: User = {
      id: generateId(),
      email,
      passwordHash: await hashPassword(payload.password),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      role: 'teacher',
      institution: institution || PARTNER_INSTITUTION,
      createdAt: new Date().toISOString(),
    }

    users.value.push(user)
    persistUsers()

    const newSession = createSession(user.id)
    session.value = newSession
    saveSession(newSession)

    return { ok: true }
  }

  async function registerStudent(payload: RegisterStudentPayload): Promise<{ ok: true } | { ok: false; error: string }> {
    const email = payload.email.trim().toLowerCase()

    if (!validateEmail(email)) return { ok: false, error: 'Adresse e-mail invalide.' }
    const pwdError = validatePassword(payload.password)
    if (pwdError) return { ok: false, error: pwdError }
    if (!payload.firstName.trim() || !payload.lastName.trim()) {
      return { ok: false, error: 'Le prénom et le nom sont requis.' }
    }
    if (!payload.studentId.trim()) {
      return { ok: false, error: 'L\'identifiant étudiant est requis.' }
    }
    if (users.value.some((u) => u.email === email)) {
      return { ok: false, error: 'Un compte existe déjà avec cette adresse e-mail.' }
    }

    const institution = payload.institution?.trim()
    if (institution && !isInstitutionSelectable(institution)) {
      return { ok: false, error: `Seul l'établissement partenaire (${PARTNER_INSTITUTION}) est disponible pour l'instant.` }
    }

    const user: User = {
      id: generateId(),
      email,
      passwordHash: await hashPassword(payload.password),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      role: 'student',
      studentId: payload.studentId.trim(),
      institution: institution || PARTNER_INSTITUTION,
      createdAt: new Date().toISOString(),
    }

    users.value.push(user)
    persistUsers()

    const newSession = createSession(user.id)
    session.value = newSession
    saveSession(newSession)

    return { ok: true }
  }

  async function login(payload: LoginPayload): Promise<{ ok: true; role: UserRole } | { ok: false; error: string }> {
    const email = payload.email.trim().toLowerCase()
    const user = users.value.find((u) => u.email === email)

    if (!user) return { ok: false, error: 'Identifiants incorrects.' }

    const hash = await hashPassword(payload.password)
    if (hash !== user.passwordHash) return { ok: false, error: 'Identifiants incorrects.' }

    const newSession = createSession(user.id)
    session.value = newSession
    saveSession(newSession)

    return { ok: true, role: user.role }
  }

  function logout() {
    session.value = null
    saveSession(null)
  }

  function getUserById(id: string): User | undefined {
    return users.value.find((u) => u.id === id)
  }

  function searchStudents(query: string, limit = 8): User[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return users.value
      .filter((u) => {
        if (u.role !== 'student') return false
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase()
        return (
          u.email.includes(q) ||
          fullName.includes(q) ||
          (u.studentId?.toLowerCase().includes(q) ?? false)
        )
      })
      .slice(0, limit)
  }

  return {
    users,
    session,
    currentUser,
    isAuthenticated,
    isTeacher,
    isStudent,
    registerTeacher,
    registerStudent,
    login,
    logout,
    getUserById,
    searchStudents,
  }
})
