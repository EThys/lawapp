import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  filterStudentsByName,
  getMyStudentProfile,
  listStudents,
  registerStudentProfile,
  studentDisplayName,
  type StudentMatchHint,
} from '@/api/students'
import type { StudentDetailDto, StudentRecord, StudentRequest } from '@/api/types'
import { extractApiError } from '@/api/client'
import { isApiEnabled } from '@/config/features'
import { extractStudentFromProfile, loadStoredMemberProfile } from '@/utils/memberProfile'

export const useStudentStore = defineStore('students', () => {
  const myProfile = ref<StudentRecord | null>(null)
  /** Catalogue GET protected/students (recherche salle). */
  const catalog = ref<StudentDetailDto[]>([])
  const loading = ref(false)
  const catalogLoading = ref(false)
  const error = ref<string | null>(null)

  const catalogByUserId = computed(() => {
    const map = new Map<number, StudentDetailDto>()
    for (const s of catalog.value) {
      if (s.userId != null) map.set(s.userId, s)
    }
    return map
  })

  async function loadMyProfile(hint: StudentMatchHint = {}): Promise<StudentRecord | null> {
    if (!isApiEnabled()) return null
    loading.value = true
    error.value = null
    try {
      const fromStored = extractStudentFromProfile(loadStoredMemberProfile())
      if (fromStored?.studentId) {
        myProfile.value = fromStored
        return myProfile.value
      }
      myProfile.value = await getMyStudentProfile(hint)
      return myProfile.value
    } catch (e) {
      error.value = extractApiError(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function syncCatalog(): Promise<StudentDetailDto[]> {
    if (!isApiEnabled()) {
      catalog.value = []
      return []
    }
    catalogLoading.value = true
    error.value = null
    try {
      catalog.value = await listStudents()
      return catalog.value
    } catch (e) {
      error.value = extractApiError(e)
      catalog.value = []
      return []
    } finally {
      catalogLoading.value = false
    }
  }

  function searchByName(query: string, limit = 12): StudentDetailDto[] {
    return filterStudentsByName(catalog.value, query, limit)
  }

  async function createProfile(
    payload: StudentRequest,
  ): Promise<{ ok: true; profile?: StudentRecord } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    loading.value = true
    error.value = null
    try {
      const created = await registerStudentProfile(payload)
      const createdMap = created as Record<string, unknown>
      const nested =
        createdMap.student && typeof createdMap.student === 'object'
          ? (createdMap.student as Record<string, unknown>)
          : createdMap
      const rawId = nested.studentId ?? createdMap.studentId
      const studentId =
        typeof rawId === 'number' ? rawId : Number.parseInt(String(rawId ?? ''), 10) || 0

      myProfile.value =
        (await getMyStudentProfile({
          userId: payload.userId,
          matricule: payload.matricule,
        })) ??
        (studentId
          ? {
              studentId,
              matricule: payload.matricule,
              gender: payload.gender,
              promotionId: payload.promotionId,
              etablissementId: payload.etablissementId,
            }
          : null)

      void syncCatalog()
      return { ok: true, profile: myProfile.value ?? undefined }
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
    catalog,
    catalogByUserId,
    loading,
    catalogLoading,
    error,
    loadMyProfile,
    syncCatalog,
    searchByName,
    studentDisplayName,
    createProfile,
  }
})
