import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createClassroom,
  addClassroomUser,
  listAllClassrooms,
  listMyClassrooms,
  getClassroomById,
  listClassroomUsers,
} from '@/api/classrooms'
import type { Classroom, ClassroomUser } from '@/api/types'
import type { ClassroomKind, Course } from '@/types/course'
import { extractApiError } from '@/api/client'
import { isApiEnabled } from '@/config/features'
import { getClassroomKind, setClassroomKind } from '@/utils/classroomKind'
import { useCourseStore } from '@/stores/courses'

/** Enregistre la salle API dans le store local (présence WiFi, inscriptions, etc.). */
export function persistClassroomAsLocalCourse(
  classroom: Classroom,
  members: ClassroomUser[] = [],
  teacher: { id: string; displayName: string },
): Course & { apiId: number; isFromApi: true } {
  const mapped = mapClassroomToCourse(classroom, members, teacher.displayName)
  const courseStore = useCourseStore()
  // Toujours l’id de session (auth.currentUser.id) pour présence / tunnel local.
  return courseStore.upsertApiCourse({
    ...mapped,
    teacherId: teacher.id.trim(),
  }) as Course & { apiId: number; isFromApi: true }
}

export function mapClassroomToCourse(
  classroom: Classroom,
  members: ClassroomUser[] = [],
  teacherName = 'Enseignant',
): Course & { apiId: number; isFromApi: true } {
  return {
    id: String(classroom.id),
    apiId: classroom.id,
    isFromApi: true,
    teacherId: String(classroom.ownerId ?? ''),
    teacherName,
    name: classroom.name?.trim() || `Classe #${classroom.id}`,
    subject: classroom.description?.trim() || 'Général',
    roomKind: getClassroomKind(classroom.id),
    enrollmentCode: `CL${classroom.id}`,
    enrollmentPublishedAt: classroom.createdAt ?? new Date().toISOString(),
    enrollmentSharedAt: null,
    studentUserIds: members
      .filter((m) => m.active !== false && m.userId != null)
      .map((m) => String(m.userId)),
    createdAt: classroom.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const useClassroomStore = defineStore('classrooms', () => {
  const classrooms = ref<Classroom[]>([])
  const myClassrooms = ref<Classroom[]>([])
  const current = ref<Classroom | null>(null)
  const currentUsers = ref<ClassroomUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const myCourses = computed(() =>
    myClassrooms.value.map((c) => mapClassroomToCourse(c, [], 'Enseignant')),
  )

  async function syncMine(): Promise<Classroom[]> {
    if (!isApiEnabled()) return []
    loading.value = true
    error.value = null
    try {
      myClassrooms.value = await listMyClassrooms()
      return myClassrooms.value
    } catch (e) {
      error.value = extractApiError(e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function syncAll(): Promise<Classroom[]> {
    if (!isApiEnabled()) return []
    loading.value = true
    error.value = null
    try {
      classrooms.value = await listAllClassrooms()
      return classrooms.value
    } catch (e) {
      error.value = extractApiError(e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id: number): Promise<Classroom | null> {
    if (!isApiEnabled()) return null
    loading.value = true
    error.value = null
    try {
      current.value = await getClassroomById(id)
      currentUsers.value = current.value ? await listClassroomUsers(id) : []
      return current.value
    } catch (e) {
      error.value = extractApiError(e)
      current.value = null
      currentUsers.value = []
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(
    name: string,
    description?: string,
    roomKind: ClassroomKind = 'university_class',
  ): Promise<{ ok: true; classroom: Classroom } | { ok: false; error: string }> {
    if (!isApiEnabled()) return { ok: false, error: 'Mode API requis.' }
    const trimmed = name.trim()
    if (!trimmed) return { ok: false, error: 'Le nom de la classe est requis.' }

    loading.value = true
    error.value = null
    try {
      let created = await createClassroom({
        name: trimmed,
        description: description?.trim() || undefined,
      })
      await syncMine()
      if (!created?.id) {
        created =
          myClassrooms.value.find((c) => c.name?.toLowerCase() === trimmed.toLowerCase()) ??
          myClassrooms.value[0] ??
          null
      } else if (!myClassrooms.value.some((c) => c.id === created!.id)) {
        myClassrooms.value.unshift(created)
      }
      if (!created?.id) {
        return { ok: false, error: 'Classe créée, mais réponse serveur incomplète.' }
      }
      setClassroomKind(created.id, roomKind)
      current.value = created
      return { ok: true, classroom: created }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  async function addUser(
    classroomId: number,
    userId: number,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isApiEnabled()) return { ok: false, error: 'Mode API requis.' }
    if (!classroomId || !userId) return { ok: false, error: 'Identifiants invalides.' }

    loading.value = true
    error.value = null
    try {
      await addClassroomUser({ classroomId, userId })
      const members = await listClassroomUsers(classroomId)
      if (current.value?.id === classroomId) {
        currentUsers.value = members
      }
      return { ok: true }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  function getMappedCourse(
    id: number,
    teacher?: { id: string; displayName: string },
  ): (Course & { apiId: number; isFromApi: true }) | null {
    const classroom =
      current.value?.id === id
        ? current.value
        : myClassrooms.value.find((c) => c.id === id) ??
          classrooms.value.find((c) => c.id === id)
    if (!classroom) return null
    const members = current.value?.id === id ? currentUsers.value : []
    if (teacher?.id) {
      return persistClassroomAsLocalCourse(classroom, members, teacher)
    }
    return mapClassroomToCourse(classroom, members)
  }

  return {
    classrooms,
    myClassrooms,
    current,
    currentUsers,
    loading,
    error,
    myCourses,
    syncMine,
    syncAll,
    fetchById,
    create,
    addUser,
    getMappedCourse,
  }
})
