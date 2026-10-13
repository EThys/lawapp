import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  User,
  AuthSession,
  UserRole,
  SessionRole,
  RegisterAccountPayload,
  RegisterTeacherPayload,
  RegisterStudentPayload,
  LoginPayload,
  InstitutionAffiliation,
  StudentAcademicAffiliation,
} from '@/types/auth'
import { hashPassword, validateEmail, validatePassword, validateCdPhone, phoneForApi } from '@/utils/auth'
import { generateId } from '@/utils/helpers'
import { DEMO_DEFAULT_INSTITUTION_LABEL } from '@/config/demoDefaults'
import {
  isApiEnabled,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  INTENDED_ROLE_KEY,
} from '@/config/features'
import { loginApi, registerApi, changePasswordApi, recoverUserApi, certifyUserApi, deleteAccountApi, refreshTokenApi } from '@/api/auth'
import { updateActiveWorkspace } from '@/api/me'
import { resetForgottenPassword as resetForgottenPasswordApi } from '@/api/passwordReset'
import { fetchSessionMe } from '@/api/me'
import { submitMyAcademicPath } from '@/api/academicPath'
import { requestMyTeacherInstitutionAffiliation } from '@/api/teacherAffiliation'
import { listPromotions } from '@/api/catalog'
import { extractApiError } from '@/api/client'
import { getMyTeacherProfile } from '@/api/teachers'
import { getMyStudentProfile } from '@/api/students'
import {
  academicPathFromApiPayload,
  mergeSessionMeIntoUser,
  teacherAffiliationFromApiPayload,
} from '@/utils/sessionMeMapper'
import type { BackendLoginResponse, BackendMemberProfile } from '@/api/types'
import type { StudentRecord, TeacherRecord } from '@/api/types'
import {
  clearMemberProfile,
  extractStudentFromProfile,
  extractTeacherFromProfile,
  loadStoredMemberProfile,
  mergeStoredStudentProfile,
  mergeStoredTeacherProfile,
  normalizeMemberProfile,
  applyProfileSnapshot,
  qualitiesFromMemberProfile,
  clearRoleIntent,
  rememberActiveRole,
  readLastActiveRole,
  saveMemberProfile,
  saveProfileSnapshot,
} from '@/utils/memberProfile'
import {
  clearPendingRegistrationRole,
  consumePendingRegistrationRole,
  readPendingRegistrationRole,
  readPendingRegistrationRoles,
} from '@/utils/verificationSession'

const USERS_KEY = 'lawapp_users'
const SESSION_KEY = 'lawapp_session'

export type LoginResult =
  | { ok: true; role: SessionRole; needsProfile: boolean }
  | { ok: false; error: string }

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
  if (isApiEnabled()) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null
    try {
      const raw = localStorage.getItem(USER_KEY)
      if (!raw) return null
      const user = JSON.parse(raw) as User
      return { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }
    } catch {
      return null
    }
  }

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
  if (!isApiEnabled()) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  }
}

function rehydrateApiUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as User
    return parsed?.id ? parsed : null
  } catch {
    return null
  }
}

function mapBackendUser(data: BackendLoginResponse, extras: Partial<User> = {}): User {
  const u = data.member.user
  return {
    id: String(u.userId),
    apiUserId: u.userId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: 'pending',
    studentId: u.username,
    phone: u.phone,
    city: u.city,
    certified: u.certified ?? u.isCertified,
    premium: u.premium ?? u.isPremium,
    institution: DEMO_DEFAULT_INSTITUTION_LABEL,
    createdAt: new Date().toISOString(),
    hasTeacherProfile: false,
    hasStudentProfile: false,
    ...extras,
  }
}

/**
 * Déduit enseignant / étudiant depuis l'API (à chaque connexion) :
 * 1. `POST /auth/login` → `member.profile` (priorité, géré avant cet appel)
 * 2. `GET /api/v1/protected/teachers` → filtre userId / e-mail
 * 3. `GET /api/v1/protected/students` → filtre userId / e-mail
 */
export async function resolveUserQualities(base: User): Promise<User> {
  const intended =
    readLastActiveRole() ?? (localStorage.getItem(INTENDED_ROLE_KEY) as UserRole | null)
  const teacher = await getMyTeacherProfile({
    userId: base.apiUserId,
    email: base.email,
    teacherId: base.teacherProfileId,
  })
  const student = await getMyStudentProfile({
    userId: base.apiUserId,
    email: base.email,
    matricule: base.studentId,
    studentId: base.studentProfileId,
  })

  const hasTeacherProfile = !!teacher?.teacherId
  const hasStudentProfile = !!student?.studentId

  let role: SessionRole = 'pending'
  if (hasTeacherProfile && hasStudentProfile) {
    role = intended === 'student' ? 'student' : 'teacher'
  } else if (hasTeacherProfile) {
    role = 'teacher'
  } else if (hasStudentProfile) {
    role = 'student'
  }

  return {
    ...base,
    role,
    hasTeacherProfile,
    hasStudentProfile,
    teacherProfileId: teacher?.teacherId ?? base.teacherProfileId,
    studentProfileId: student?.studentId ?? base.studentProfileId,
    studentId: student?.matricule ?? base.studentId,
  }
}

/** Cible post-auth : espace métier ou complétion de profil. */
export function postAuthHome(
  role: SessionRole,
  options?: {
    intended?: UserRole | null
    redirect?: string | null
    hasTeacherProfile?: boolean
    hasStudentProfile?: boolean
    email?: string | null
    pendingRegistrationRole?: UserRole | null
    pendingRegistrationRoles?: UserRole[]
  },
): string {
  if (options?.redirect) return options.redirect
  if (role === 'teacher') return '/teacher'
  if (role === 'student') return '/student'

  const hasTeacher = options?.hasTeacherProfile
  const hasStudent = options?.hasStudentProfile

  if (hasTeacher && !hasStudent) return '/teacher'
  if (hasStudent && !hasTeacher) return '/student'

  const preferred =
    options?.intended ??
    readLastActiveRole() ??
    (localStorage.getItem(INTENDED_ROLE_KEY) as UserRole | null)

  if (hasTeacher && hasStudent) {
    return preferred === 'student' ? '/student' : '/teacher'
  }

  const pendingRoles =
    options?.pendingRegistrationRoles?.length
      ? options.pendingRegistrationRoles
      : readPendingRegistrationRoles(options?.email ?? undefined)
  const registrationRole =
    options?.pendingRegistrationRole ??
    readPendingRegistrationRole(options?.email ?? undefined)

  if (hasTeacher && pendingRoles.includes('student')) return '/student'
  if (hasStudent && pendingRoles.includes('teacher')) return '/teacher'

  if (pendingRoles.length > 1) return '/onboarding/profile'
  if (registrationRole === 'teacher' || pendingRoles[0] === 'teacher') return '/teacher'
  if (registrationRole === 'student' || pendingRoles[0] === 'student') return '/student'

  return '/onboarding/profile'
}

export const useAuthStore = defineStore('auth', () => {
  const users = ref<User[]>(loadUsers())
  const session = ref<AuthSession | null>(loadSession())
  const apiUser = ref<User | null>(isApiEnabled() ? rehydrateApiUser() : null)
  const memberProfile = ref<BackendMemberProfile | null>(
    isApiEnabled() ? loadStoredMemberProfile() : null,
  )
  const loading = ref(false)
  const qualitiesReady = ref(!isApiEnabled())

  const currentUser = computed(() => {
    if (isApiEnabled()) return apiUser.value
    if (!session.value) return null
    return users.value.find((u) => u.id === session.value!.userId) ?? null
  })

  const teacherProfile = computed(() => extractTeacherFromProfile(memberProfile.value))
  const studentProfile = computed(() => extractStudentFromProfile(memberProfile.value))

  const isAuthenticated = computed(() => !!currentUser.value)

  const hasTeacherQuality = computed(
    () =>
      !!currentUser.value?.hasTeacherProfile ||
      !!currentUser.value?.teacherProfileId ||
      !!teacherProfile.value?.teacherId,
  )
  const hasStudentQuality = computed(
    () =>
      !!currentUser.value?.hasStudentProfile ||
      !!currentUser.value?.studentProfileId ||
      !!studentProfile.value?.studentId,
  )

  const activeWorkspace = computed((): UserRole | null => {
    const u = currentUser.value
    if (!u) return null
    if (u.role === 'teacher' && hasTeacherQuality.value) return 'teacher'
    if (u.role === 'student' && hasStudentQuality.value) return 'student'
    if (hasTeacherQuality.value && !hasStudentQuality.value) return 'teacher'
    if (hasStudentQuality.value && !hasTeacherQuality.value) return 'student'
    const last = readLastActiveRole()
    if (last === 'teacher' && hasTeacherQuality.value) return 'teacher'
    if (last === 'student' && hasStudentQuality.value) return 'student'
    if (hasTeacherQuality.value) return 'teacher'
    if (hasStudentQuality.value) return 'student'
    return null
  })

  const canSwitchWorkspace = computed(
    () => hasTeacherQuality.value && hasStudentQuality.value,
  )

  /** Au moins un espace actif : afficher le switch (activation de l’autre si besoin). */
  const showWorkspaceSwitcher = computed(
    () => hasTeacherQuality.value || hasStudentQuality.value,
  )

  /** Accès à l’espace enseignant (profil ou session). */
  const isTeacher = computed(
    () => hasTeacherQuality.value || currentUser.value?.role === 'teacher',
  )
  /** Accès à l’espace étudiant (profil ou session). */
  const isStudent = computed(
    () => hasStudentQuality.value || currentUser.value?.role === 'student',
  )
  const needsProfile = computed(() => {
    if (!isApiEnabled()) return false
    const u = currentUser.value
    if (!u) return false
    return !u.hasTeacherProfile && !u.hasStudentProfile
  })
  const isCertified = computed(() => currentUser.value?.certified === true)

  function updateStoredUser(partial: Partial<User>) {
    if (!apiUser.value) return
    apiUser.value = { ...apiUser.value, ...partial }
    localStorage.setItem(USER_KEY, JSON.stringify(apiUser.value))
  }

  function patchCurrentUser(partial: Partial<User>) {
    if (isApiEnabled()) {
      updateStoredUser(partial)
      return
    }
    const u = currentUser.value
    if (!u) return
    const idx = users.value.findIndex((x) => x.id === u.id)
    if (idx < 0) return
    users.value[idx] = { ...users.value[idx], ...partial }
    persistUsers()
  }

  function parseEtablissementId(institutionKey: string): number | null {
    const n = Number.parseInt(institutionKey.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  async function refreshSessionProfile(): Promise<User | null> {
    if (!isApiEnabled() || !apiUser.value) return apiUser.value
    try {
      const me = await fetchSessionMe()
      const merged = mergeSessionMeIntoUser(apiUser.value, me)
      apiUser.value = merged
      localStorage.setItem(USER_KEY, JSON.stringify(merged))
      saveProfileSnapshot(merged)
      return merged
    } catch {
      return apiUser.value
    }
  }

  async function requestTeacherInstitutionAffiliation(
    institutionKey: string,
    institutionLabel: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!currentUser.value) return { ok: false, error: 'Non connecté.' }
    const key = institutionKey.trim()
    const label = institutionLabel.trim()
    if (!key || !label) return { ok: false, error: 'Établissement invalide.' }

    if (isApiEnabled()) {
      const etabId = parseEtablissementId(key)
      if (etabId == null) {
        return {
          ok: false,
          error: 'Choisissez un établissement dans la liste API (identifiant numérique).',
        }
      }
      try {
        const res = await requestMyTeacherInstitutionAffiliation({ etablissementId: etabId })
        const fromApi = teacherAffiliationFromApiPayload(res)
        if (fromApi) {
          patchCurrentUser({ teacherInstitutionAffiliation: fromApi })
        } else {
          patchCurrentUser({
            teacherInstitutionAffiliation: {
              institutionKey: key,
              institutionLabel: label,
              status: 'pending',
              requestedAt: new Date().toISOString(),
            },
          })
        }
        await refreshSessionProfile()
        return { ok: true }
      } catch (e) {
        return { ok: false, error: extractApiError(e) }
      }
    }

    const affiliation: InstitutionAffiliation = {
      institutionKey: key,
      institutionLabel: label,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    patchCurrentUser({ teacherInstitutionAffiliation: affiliation })
    return { ok: true }
  }

  function requestStudentInstitutionAffiliation(
    institutionKey: string,
    institutionLabel: string,
  ): { ok: true } | { ok: false; error: string } {
    if (!currentUser.value) return { ok: false, error: 'Non connecté.' }
    const key = institutionKey.trim()
    const label = institutionLabel.trim()
    if (!key || !label) return { ok: false, error: 'Établissement invalide.' }
    const affiliation: InstitutionAffiliation = {
      institutionKey: key,
      institutionLabel: label,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    patchCurrentUser({ studentInstitutionAffiliation: affiliation })
    return { ok: true }
  }

  async function requestStudentAcademicAffiliation(input: {
    institutionKey: string
    institutionLabel: string
    faculty: string
    promotion: string
    classroomLabel?: string
    classroomId?: string
    facultyId?: number
    promotionId?: number
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!currentUser.value) return { ok: false, error: 'Non connecté.' }
    const faculty = input.faculty.trim()
    const promotion = input.promotion.trim()
    if (!input.institutionKey.trim() || !faculty || !promotion) {
      return { ok: false, error: 'Université, faculté et promotion sont requis.' }
    }

    if (isApiEnabled()) {
      const etabId = parseEtablissementId(input.institutionKey)
      if (etabId == null) {
        return {
          ok: false,
          error: 'Choisissez un établissement dans la liste API (identifiant numérique).',
        }
      }
      let promotionId = input.promotionId
      if (promotionId == null) {
        try {
          const promos = await listPromotions()
          const match = promos.find(
            (p) => p.name?.trim().toLowerCase() === promotion.toLowerCase(),
          )
          promotionId = match?.id
        } catch {
          /* fallback facultyName only */
        }
      }
      try {
        const res = await submitMyAcademicPath({
          etablissementId: etabId,
          ...(input.facultyId != null ? { facultyId: input.facultyId } : { facultyName: faculty }),
          ...(promotionId != null ? { promotionId } : {}),
          ...(input.classroomId
            ? { classroomId: Number.parseInt(input.classroomId, 10) || undefined }
            : {}),
        })
        const fromApi = academicPathFromApiPayload(res)
        const affiliation: StudentAcademicAffiliation = fromApi ?? {
          institutionKey: input.institutionKey.trim(),
          institutionLabel: input.institutionLabel.trim(),
          faculty,
          promotion,
          classroomLabel: input.classroomLabel?.trim() || undefined,
          classroomId: input.classroomId?.trim() || undefined,
          status: 'pending',
          requestedAt: new Date().toISOString(),
        }
        patchCurrentUser({
          studentAcademicAffiliation: affiliation,
          studentInstitutionAffiliation: {
            institutionKey: affiliation.institutionKey,
            institutionLabel: affiliation.institutionLabel,
            status: affiliation.status,
            requestedAt: affiliation.requestedAt,
          },
        })
        await refreshSessionProfile()
        return { ok: true }
      } catch (e) {
        return { ok: false, error: extractApiError(e) }
      }
    }

    const affiliation: StudentAcademicAffiliation = {
      institutionKey: input.institutionKey.trim(),
      institutionLabel: input.institutionLabel.trim(),
      faculty,
      promotion,
      classroomLabel: input.classroomLabel?.trim() || undefined,
      classroomId: input.classroomId?.trim() || undefined,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    patchCurrentUser({
      studentAcademicAffiliation: affiliation,
      studentInstitutionAffiliation: {
        institutionKey: affiliation.institutionKey,
        institutionLabel: affiliation.institutionLabel,
        status: 'pending',
        requestedAt: affiliation.requestedAt,
      },
    })
    return { ok: true }
  }

  function setMemberProfile(profile: BackendMemberProfile | null) {
    memberProfile.value = profile
    saveMemberProfile(profile)
  }

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

  function persistApiSession(user: User, token: string, refreshToken?: string) {
    apiUser.value = user
    session.value = {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    }
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  async function setActiveWorkspace(role: UserRole): Promise<boolean> {
    const u = currentUser.value
    if (!u) return false
    if (role === 'teacher' && !hasTeacherQuality.value) return false
    if (role === 'student' && !hasStudentQuality.value) return false

    if (isApiEnabled()) {
      updateStoredUser({ role })
      try {
        await updateActiveWorkspace(role)
      } catch {
        /* localStorage + user.role restent la source de vérité si l’API échoue */
      }
    } else {
      const idx = users.value.findIndex((x) => x.id === u.id)
      if (idx < 0) return false
      users.value[idx] = { ...users.value[idx], role }
      persistUsers()
    }
    rememberActiveRole(role)
    saveProfileSnapshot({ ...u, role })
    return true
  }

  /** Aligner le rôle de session sur la route (sans navigation). */
  function applyWorkspaceFromRoute(role: UserRole) {
    if (!currentUser.value) return
    if (role === 'teacher' && !hasTeacherQuality.value) return
    if (role === 'student' && !hasStudentQuality.value) return
    const current = currentUser.value.role
    if (current === role) return
    setActiveWorkspace(role)
  }

  /** Après création d'un profil, active la qualité et persiste le profil métier. */
  function grantQuality(kind: UserRole, profile?: TeacherRecord | StudentRecord | number) {
    const isFirstQuality =
      kind === 'teacher' ? !hasTeacherQuality.value : !hasStudentQuality.value

    const persistLocalQuality = (partial: Partial<User>) => {
      if (isApiEnabled()) {
        if (!apiUser.value) return
        const sessionRole =
          apiUser.value.role === 'teacher' || apiUser.value.role === 'student'
            ? apiUser.value.role
            : kind
        updateStoredUser({
          ...partial,
          role: sessionRole,
        })
      } else {
        const u = currentUser.value
        if (!u) return
        const idx = users.value.findIndex((x) => x.id === u.id)
        if (idx < 0) return
        const prev = users.value[idx]
        const sessionRole =
          prev.role === 'teacher' || prev.role === 'student' ? prev.role : kind
        users.value[idx] = {
          ...prev,
          ...partial,
          role: sessionRole,
        }
        persistUsers()
      }
    }

    if (isApiEnabled() && !apiUser.value) return
    if (kind === 'teacher') {
      const teacher =
        typeof profile === 'object' && profile && 'teacherId' in profile
          ? (profile as TeacherRecord)
          : teacherProfile.value
            ? { ...teacherProfile.value, teacherId: typeof profile === 'number' ? profile : teacherProfile.value.teacherId }
            : typeof profile === 'number'
              ? { teacherId: profile }
              : null
      if (teacher?.teacherId) {
        setMemberProfile(mergeStoredTeacherProfile(teacher))
      }
      persistLocalQuality({
        hasTeacherProfile: true,
        teacherProfileId:
          teacher?.teacherId ??
          (typeof profile === 'number' ? profile : apiUser.value?.teacherProfileId),
        institution:
          teacher && 'departement' in teacher
            ? teacher.departement ?? apiUser.value?.institution
            : apiUser.value?.institution,
      })
    } else {
      const student =
        typeof profile === 'object' && profile && 'studentId' in profile
          ? (profile as StudentRecord)
          : studentProfile.value
            ? { ...studentProfile.value, studentId: typeof profile === 'number' ? profile : studentProfile.value.studentId }
            : typeof profile === 'number'
              ? { studentId: profile }
              : null
      if (student?.studentId) {
        setMemberProfile(mergeStoredStudentProfile(student))
      }
      persistLocalQuality({
        hasStudentProfile: true,
        studentProfileId:
          student?.studentId ??
          (typeof profile === 'number' ? profile : apiUser.value?.studentProfileId),
        studentId:
          student && 'matricule' in student
            ? student.matricule ?? apiUser.value?.studentId
            : apiUser.value?.studentId,
      })
    }
    const email = currentUser.value?.email
    if (email) {
      consumePendingRegistrationRole(email, kind)
    } else {
      clearPendingRegistrationRole()
    }
    if (isFirstQuality) {
      rememberActiveRole(kind)
      setActiveWorkspace(kind)
    }
  }

  async function refreshQualities(): Promise<User | null> {
    if (!isApiEnabled() || !apiUser.value) {
      qualitiesReady.value = true
      return apiUser.value
    }
    try {
      await refreshSessionProfile()
      // Priorité au profil login persisté ; compléter via listes API si besoin.
      let resolved = applyProfileSnapshot(
        qualitiesFromMemberProfile(apiUser.value!, memberProfile.value ?? loadStoredMemberProfile()),
      )
      if (!resolved.hasTeacherProfile && !resolved.hasStudentProfile) {
        resolved = await resolveUserQualities(resolved)
      } else if (!resolved.hasTeacherProfile || !resolved.hasStudentProfile) {
        // Enrichir l'autre qualité éventuelle sans écraser celle du login.
        const fromApi = await resolveUserQualities(resolved)
        resolved = {
          ...resolved,
          hasTeacherProfile: resolved.hasTeacherProfile || fromApi.hasTeacherProfile,
          hasStudentProfile: resolved.hasStudentProfile || fromApi.hasStudentProfile,
          teacherProfileId: resolved.teacherProfileId ?? fromApi.teacherProfileId,
          studentProfileId: resolved.studentProfileId ?? fromApi.studentProfileId,
          role:
            resolved.role !== 'pending'
              ? resolved.role
              : fromApi.role,
        }
      }
      resolved = applyProfileSnapshot(resolved)
      apiUser.value = resolved
      localStorage.setItem(USER_KEY, JSON.stringify(resolved))
      saveProfileSnapshot(resolved)
      const needsProfile = !resolved.hasTeacherProfile && !resolved.hasStudentProfile
      if (needsProfile) {
        clearRoleIntent()
      } else {
        clearPendingRegistrationRole()
        if (resolved.role === 'teacher' || resolved.role === 'student') {
          rememberActiveRole(resolved.role)
        }
      }
      return resolved
    } finally {
      qualitiesReady.value = true
    }
  }

  async function registerViaApi(
    payload: RegisterAccountPayload,
    pseudoHint?: string,
  ): Promise<{ ok: true; message?: string; requiresVerification?: boolean } | { ok: false; error: string }> {
    const email = payload.email.trim().toLowerCase()
    if (!validateEmail(email)) return { ok: false, error: 'Adresse e-mail invalide.' }
    const pwdError = validatePassword(payload.password)
    if (pwdError) return { ok: false, error: pwdError }
    const confirm = payload.confirmPassword ?? payload.password
    if (payload.password !== confirm) {
      return { ok: false, error: 'Les mots de passe ne correspondent pas.' }
    }

    const phoneError = validateCdPhone(payload.phone ?? '')
    if (phoneError) return { ok: false, error: phoneError }

    loading.value = true
    try {
      const data = await registerApi({
        email,
        password: payload.password,
        confirmPassword: confirm,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        city: payload.city?.trim() || 'Kinshasa',
        phone: phoneForApi(payload.phone ?? ''),
        pseudo: payload.pseudo?.trim() || pseudoHint?.trim() || email.split('@')[0],
      })

      return {
        ok: true,
        message: data.message ?? 'Compte créé. Vérifiez votre e-mail pour le code de validation.',
        requiresVerification: true,
      }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      loading.value = false
    }
  }

  /** Compte principal sans rôle : la qualité vient de /onboarding/profile. */
  async function registerAccount(
    payload: RegisterAccountPayload,
  ): Promise<{ ok: true; message?: string; requiresVerification?: boolean } | { ok: false; error: string }> {
    if (isApiEnabled()) return registerViaApi(payload)

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

    const user: User = {
      id: generateId(),
      email,
      passwordHash: await hashPassword(payload.password),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      role: 'pending',
      phone: payload.phone,
      city: payload.city?.trim() || 'Kinshasa',
      createdAt: new Date().toISOString(),
    }

    users.value.push(user)
    persistUsers()

    const newSession = createSession(user.id)
    session.value = newSession
    saveSession(newSession)

    return { ok: true, requiresVerification: false }
  }

  async function registerTeacher(
    payload: RegisterTeacherPayload,
  ): Promise<{ ok: true; message?: string; requiresVerification?: boolean } | { ok: false; error: string }> {
    if (isApiEnabled()) return registerViaApi(payload)

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

    const user: User = {
      id: generateId(),
      email,
      passwordHash: await hashPassword(payload.password),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      role: 'teacher',
      hasTeacherProfile: true,
      institution: institution || DEMO_DEFAULT_INSTITUTION_LABEL,
      createdAt: new Date().toISOString(),
    }

    users.value.push(user)
    persistUsers()

    const newSession = createSession(user.id)
    session.value = newSession
    saveSession(newSession)

    return { ok: true }
  }

  async function registerStudent(
    payload: RegisterStudentPayload,
  ): Promise<{ ok: true; message?: string; requiresVerification?: boolean } | { ok: false; error: string }> {
    if (isApiEnabled()) {
      return registerViaApi(
        { ...payload, pseudo: payload.pseudo ?? payload.studentId },
        payload.studentId,
      )
    }

    const email = payload.email.trim().toLowerCase()

    if (!validateEmail(email)) return { ok: false, error: 'Adresse e-mail invalide.' }
    const pwdError = validatePassword(payload.password)
    if (pwdError) return { ok: false, error: pwdError }
    if (!payload.firstName.trim() || !payload.lastName.trim()) {
      return { ok: false, error: 'Le prénom et le nom sont requis.' }
    }
    if (!payload.studentId.trim()) {
      return { ok: false, error: "L'identifiant étudiant est requis." }
    }
    if (users.value.some((u) => u.email === email)) {
      return { ok: false, error: 'Un compte existe déjà avec cette adresse e-mail.' }
    }

    const institution = payload.institution?.trim()

    const user: User = {
      id: generateId(),
      email,
      passwordHash: await hashPassword(payload.password),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      role: 'student',
      hasStudentProfile: true,
      studentId: payload.studentId.trim(),
      institution: institution || DEMO_DEFAULT_INSTITUTION_LABEL,
      createdAt: new Date().toISOString(),
    }

    users.value.push(user)
    persistUsers()

    const newSession = createSession(user.id)
    session.value = newSession
    saveSession(newSession)

    return { ok: true }
  }

  async function loginViaApi(payload: LoginPayload): Promise<LoginResult> {
    loading.value = true
    try {
      const data = await loginApi(payload.email, payload.password)
      localStorage.setItem(TOKEN_KEY, data.token)

      const profile = normalizeMemberProfile(data.member.profile)
      setMemberProfile(profile)

      const base = mapBackendUser(data)
      let fromLogin = qualitiesFromMemberProfile(base, profile)
      fromLogin = applyProfileSnapshot(fromLogin)

      // Si le login n'embarque pas encore de qualité, tenter les listes API.
      let resolved = fromLogin
      if (!fromLogin.hasTeacherProfile && !fromLogin.hasStudentProfile) {
        resolved = await resolveUserQualities(fromLogin)
      } else if (fromLogin.role === 'pending') {
        resolved = await resolveUserQualities(fromLogin)
      }
      resolved = applyProfileSnapshot(resolved)
      persistApiSession(resolved, data.token, data.refresh_token)
      saveProfileSnapshot(resolved)
      await refreshSessionProfile()
      if (apiUser.value) resolved = apiUser.value
      const needsProfile = !resolved.hasTeacherProfile && !resolved.hasStudentProfile
      if (needsProfile) {
        clearRoleIntent()
      } else {
        clearPendingRegistrationRole()
        if (resolved.role === 'teacher' || resolved.role === 'student') {
          rememberActiveRole(resolved.role)
        }
      }
      qualitiesReady.value = true

      return {
        ok: true,
        role: resolved.role,
        needsProfile,
      }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      loading.value = false
    }
  }

  async function login(payload: LoginPayload): Promise<LoginResult> {
    if (isApiEnabled()) return loginViaApi(payload)

    const email = payload.email.trim().toLowerCase()
    const user = users.value.find((u) => u.email === email)

    if (!user) return { ok: false, error: 'Identifiants incorrects.' }

    const hash = await hashPassword(payload.password)
    if (hash !== user.passwordHash) return { ok: false, error: 'Identifiants incorrects.' }

    const newSession = createSession(user.id)
    session.value = newSession
    saveSession(newSession)

    return {
      ok: true,
      role: user.role,
      needsProfile: false,
    }
  }

  function logout() {
    session.value = null
    apiUser.value = null
    memberProfile.value = null
    qualitiesReady.value = !isApiEnabled()
    saveSession(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    clearMemberProfile()
  }

  async function changePassword(
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    const pwdError = validatePassword(newPassword)
    if (pwdError) return { ok: false, error: pwdError }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: 'Les mots de passe ne correspondent pas.' }
    }
    loading.value = true
    try {
      const res = await changePasswordApi(newPassword)
      const message = res?.message ?? 'Mot de passe modifié. Reconnectez-vous.'
      logout()
      return { ok: true, message }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      loading.value = false
    }
  }

  async function resetPasswordAfterOtp(
    identifier: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    const id = identifier.trim()
    const otp = code.trim()
    if (!id) return { ok: false, error: 'Adresse e-mail manquante.' }
    if (!otp) return { ok: false, error: 'Code de vérification manquant. Revenez à l’étape précédente.' }
    const pwdError = validatePassword(newPassword)
    if (pwdError) return { ok: false, error: pwdError }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: 'Les mots de passe ne correspondent pas.' }
    }
    loading.value = true
    try {
      const res = await resetForgottenPasswordApi({
        identifier: id,
        code: otp,
        newPassword,
        confirmPassword,
      })
      const message = res?.message ?? 'Mot de passe réinitialisé. Vous pouvez vous connecter.'
      logout()
      return { ok: true, message }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount(): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    loading.value = true
    try {
      const res = await deleteAccountApi()
      const message = res?.message ?? 'Compte supprimé.'
      logout()
      return { ok: true, message }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      loading.value = false
    }
  }

  async function recoverUser(
    userId: number,
  ): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    if (!userId || userId < 1) {
      return { ok: false, error: 'Identifiant utilisateur invalide.' }
    }
    loading.value = true
    try {
      const res = await recoverUserApi(userId)
      return { ok: true, message: res?.message ?? 'Compte récupéré.' }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      loading.value = false
    }
  }

  async function certifyUser(
    userId: number,
    state: boolean,
  ): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    if (!userId || userId < 1) {
      return { ok: false, error: 'Identifiant utilisateur invalide.' }
    }
    loading.value = true
    try {
      const res = await certifyUserApi(userId, state)
      if (currentUser.value?.apiUserId === userId) {
        updateStoredUser({ certified: state })
      }
      return { ok: true, message: res?.message ?? (state ? 'Utilisateur certifié.' : 'Certification retirée.') }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      loading.value = false
    }
  }

  async function refreshSession(): Promise<boolean> {
    if (!isApiEnabled()) return false
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refresh) return false
    try {
      const data = await refreshTokenApi(refresh)
      const accessToken = data.accessToken ?? data.token
      if (!accessToken) return false
      localStorage.setItem(TOKEN_KEY, accessToken)
      if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      if (session.value) {
        session.value = { ...session.value, token: accessToken }
      }
      return true
    } catch {
      return false
    }
  }

  function getUserById(id: string): User | undefined {
    if (isApiEnabled() && apiUser.value?.id === id) return apiUser.value
    return users.value.find((u) => u.id === id)
  }

  function searchStudents(query: string, limit = 8): User[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return users.value
      .filter((u) => {
        if (u.role !== 'student' && !u.hasStudentProfile) return false
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase()
        return (
          u.email.includes(q) ||
          fullName.includes(q) ||
          (u.studentId?.toLowerCase().includes(q) ?? false)
        )
      })
      .slice(0, limit)
  }

  function homePath(redirect?: string | null): string {
    const u = currentUser.value
    return postAuthHome(u?.role ?? 'pending', {
      intended: readLastActiveRole() ?? (localStorage.getItem(INTENDED_ROLE_KEY) as UserRole | null),
      redirect,
      hasTeacherProfile: u?.hasTeacherProfile,
      hasStudentProfile: u?.hasStudentProfile,
      email: u?.email,
      pendingRegistrationRole: readPendingRegistrationRole(u?.email),
      pendingRegistrationRoles: readPendingRegistrationRoles(u?.email),
    })
  }

  // Réhydratation silencieuse des qualités au démarrage (session existante).
  if (isApiEnabled() && apiUser.value) {
    void refreshQualities()
  }

  return {
    users,
    session,
    currentUser,
    memberProfile,
    teacherProfile,
    studentProfile,
    isAuthenticated,
    hasTeacherQuality,
    hasStudentQuality,
    activeWorkspace,
    canSwitchWorkspace,
    showWorkspaceSwitcher,
    isTeacher,
    isStudent,
    needsProfile,
    isCertified,
    loading,
    qualitiesReady,
    registerAccount,
    registerTeacher,
    registerStudent,
    login,
    logout,
    changePassword,
    resetPasswordAfterOtp,
    deleteAccount,
    recoverUser,
    certifyUser,
    refreshSession,
    refreshSessionProfile,
    refreshQualities,
    grantQuality,
    setActiveWorkspace,
    applyWorkspaceFromRoute,
    requestTeacherInstitutionAffiliation,
    requestStudentInstitutionAffiliation,
    requestStudentAcademicAffiliation,
    setMemberProfile,
    homePath,
    getUserById,
    searchStudents,
  }
})
