import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listTeachers,
  getMyTeacherProfile,
  registerTeacherProfile,
  validateTeacherAccount,
  type TeacherMatchHint,
} from '@/api/teachers'
import type { TeacherRecord, TeacherRequest } from '@/api/types'
import { extractApiError } from '@/api/client'
import { isApiEnabled, USER_KEY } from '@/config/features'
import { DEMO_DEFAULT_INSTITUTION_LABEL } from '@/config/demoDefaults'
import type { User } from '@/types/auth'
import { extractTeacherFromProfile, loadStoredMemberProfile } from '@/utils/memberProfile'

function hintFromStorage(): TeacherMatchHint {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return {}
    const u = JSON.parse(raw) as User
    return {
      userId: u.apiUserId,
      email: u.email,
      teacherId: u.teacherProfileId,
    }
  } catch {
    return {}
  }
}

export const useTeacherStore = defineStore('teachers', () => {
  const myProfile = ref<TeacherRecord | null>(null)
  const teachers = ref<TeacherRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadMyProfile(hint?: TeacherMatchHint): Promise<TeacherRecord | null> {
    if (!isApiEnabled()) return null
    loading.value = true
    error.value = null
    try {
      const mergedHint = { ...hintFromStorage(), ...hint }
      const fromStored = extractTeacherFromProfile(loadStoredMemberProfile())
      if (fromStored?.teacherId) {
        myProfile.value = fromStored
      }

      const fromApi = await getMyTeacherProfile(mergedHint)
      if (fromApi?.teacherId) {
        myProfile.value = fromApi
        return myProfile.value
      }

      if (myProfile.value?.teacherId) return myProfile.value

      // Fallback : qualité déjà acquise côté session (après onboarding),
      // même si la liste protégée ne renvoie pas encore le match.
      if (mergedHint.teacherId) {
        myProfile.value = {
          teacherId: mergedHint.teacherId,
          departement: fromStored?.departement,
          gender: fromStored?.gender,
          justificatif: fromStored?.justificatif,
          typeTeacherId: fromStored?.typeTeacherId,
        }
        return myProfile.value
      }

      return null
    } catch (e) {
      error.value = extractApiError(e)
      return myProfile.value
    } finally {
      loading.value = false
    }
  }

  async function loadAllTeachers(): Promise<TeacherRecord[]> {
    if (!isApiEnabled()) return []
    loading.value = true
    error.value = null
    try {
      teachers.value = await listTeachers()
      return teachers.value
    } catch (e) {
      error.value = extractApiError(e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function createProfile(
    payload?: Partial<TeacherRequest>,
  ): Promise<{ ok: true; profile?: TeacherRecord } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    loading.value = true
    error.value = null
    try {
      const body: TeacherRequest = {
        departement: payload?.departement?.trim() || DEMO_DEFAULT_INSTITUTION_LABEL,
        gender: payload?.gender?.trim() || 'N/A',
        justificatif: payload?.justificatif?.trim() || undefined,
        typeTeacherId: payload?.typeTeacherId,
        etablissement: payload?.etablissement,
      }
      const created = await registerTeacherProfile(body)
      const teacherId = created.teacher?.teacherId ?? 0

      myProfile.value =
        (await getMyTeacherProfile({
          ...hintFromStorage(),
          teacherId: teacherId || hintFromStorage().teacherId,
        })) ??
        created.teacher ??
        (teacherId
          ? {
              teacherId,
              typeTeacherId: body.typeTeacherId,
              departement: body.departement,
              justificatif: body.justificatif,
              gender: body.gender,
            }
          : null)

      return { ok: true, profile: myProfile.value ?? undefined }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  async function validateTeacher(
    teacherId: number,
    state: boolean,
  ): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    if (!teacherId || teacherId < 1) {
      return { ok: false, error: 'Identifiant enseignant invalide.' }
    }
    loading.value = true
    error.value = null
    try {
      const res = await validateTeacherAccount(teacherId, state)
      await loadAllTeachers()
      return { ok: true, message: res.message ?? (state ? 'Enseignant validé.' : 'Validation retirée.') }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  return {
    myProfile,
    teachers,
    loading,
    error,
    loadMyProfile,
    loadAllTeachers,
    createProfile,
    validateTeacher,
  }
})
