import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Classroom, Promotion } from '@/api/types'
import { isApiEnabled } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/students'
import { useClassroomStore, mapClassroomToCourse } from '@/stores/classrooms'
import { useCourseStore } from '@/stores/courses'
import { useCatalogStore } from '@/stores/catalog'
import { usePlatformGovernanceStore } from '@/stores/platformGovernance'
import {
  etablissementSelectOptions,
  findDefaultSelectableEtablissement,
  isEtablissementKeySelectable,
} from '@/utils/referentielOptions'
import { missingFieldsMessage } from '@/utils/form'

export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'N/A', label: 'Non précisé' },
] as const

export const useStudentProfilePageStore = defineStore('studentProfilePage', () => {
  const ready = ref(!isApiEnabled())
  const saving = ref(false)
  const error = ref('')
  const success = ref('')

  const promotions = ref<Promotion[]>([])
  const classrooms = ref<Classroom[]>([])
  const promotionId = ref('')
  const classroomId = ref('')
  const etablissementId = ref('')
  const matricule = ref('')
  const gender = ref('')

  const etablissementOptions = computed(() => {
    const catalog = useCatalogStore()
    const governance = usePlatformGovernanceStore()
    return etablissementSelectOptions(catalog.etablissements, (id) => governance.getFlags(id))
  })

  const promotionOptions = computed(() =>
    promotions.value
      .filter((p) => p.active !== false)
      .map((p) => ({ value: String(p.id), label: p.name?.trim() || `Promotion ${p.id}` })),
  )

  const classroomOptions = computed(() =>
    classrooms.value
      .filter((c) => c.active !== false)
      .map((c) => ({
        value: String(c.id),
        label: c.description?.trim()
          ? `${c.name?.trim() || `Salle ${c.id}`} — ${c.description.trim()}`
          : c.name?.trim() || `Salle ${c.id}`,
      })),
  )

  const promotionLabel = computed(() => {
    const id = promotionId.value
    if (!id) return 'Non renseigné'
    return promotionOptions.value.find((o) => o.value === id)?.label ?? `Promotion #${id}`
  })

  const classroomLabel = computed(() => {
    const id = classroomId.value
    if (!id) return 'Non renseigné'
    return classroomOptions.value.find((o) => o.value === id)?.label ?? `Salle #${id}`
  })

  const etablissementLabel = computed(() => {
    const id = etablissementId.value
    if (!id) return 'Non renseigné'
    return etablissementOptions.value.find((o) => o.value === id)?.label ?? `Établissement #${id}`
  })

  function hydrateFromStudent(source: {
    matricule?: string
    gender?: string
    promotionId?: number
    etablissementId?: number
  } | null | undefined) {
    if (!source) return
    if (source.matricule?.trim()) matricule.value = source.matricule.trim()
    if (source.gender?.trim()) gender.value = source.gender.trim()
    if (source.promotionId) promotionId.value = String(source.promotionId)
    if (source.etablissementId) etablissementId.value = String(source.etablissementId)
  }

  function syncPromotionFromClassroom(selectedClassroomId: string) {
    if (!selectedClassroomId || promotionId.value) return
    const room = classrooms.value.find((c) => String(c.id) === selectedClassroomId)
    const hay = `${room?.name ?? ''} ${room?.description ?? ''}`.toUpperCase()
    const match = promotions.value.find((p) => {
      const name = (p.name ?? '').trim().toUpperCase()
      if (!name) return false
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`).test(hay)
    })
    if (match) promotionId.value = String(match.id)
  }

  function setClassroomId(value: string) {
    classroomId.value = value
    syncPromotionFromClassroom(value)
  }

  async function bootstrap() {
    const auth = useAuthStore()
    const studentStore = useStudentStore()
    const classroomStore = useClassroomStore()

    if (!matricule.value && auth.currentUser?.studentId) {
      matricule.value = auth.currentUser.studentId
    }
    hydrateFromStudent(auth.studentProfile)

    if (!isApiEnabled()) {
      ready.value = true
      return
    }

    ready.value = false
    try {
      const catalog = useCatalogStore()
      if (!catalog.etablissements.length || !catalog.promotions.length) {
        await catalog.syncAll()
      }
      promotions.value = catalog.promotions
      classrooms.value = await classroomStore.syncAll()

      const governance = usePlatformGovernanceStore()
      if (!etablissementId.value) {
        const etab = findDefaultSelectableEtablissement(catalog.etablissements, (id) =>
          governance.getFlags(id),
        )
        if (etab) etablissementId.value = String(etab.id)
      }

      await studentStore.loadMyProfile({
        userId: auth.currentUser?.apiUserId,
        email: auth.currentUser?.email,
        matricule: auth.currentUser?.studentId,
        studentId: auth.currentUser?.studentProfileId ?? auth.studentProfile?.studentId,
      })
      hydrateFromStudent(studentStore.myProfile ?? auth.studentProfile)
    } finally {
      ready.value = true
    }
  }

  async function createProfile(): Promise<{ ok: true } | { ok: false; error: string }> {
    error.value = ''
    success.value = ''

    const auth = useAuthStore()
    const studentStore = useStudentStore()
    const classroomStore = useClassroomStore()
    const courseStore = useCourseStore()
    const catalog = useCatalogStore()
    const governance = usePlatformGovernanceStore()

    const userId = auth.currentUser?.apiUserId
    if (!userId) {
      error.value = 'Session utilisateur invalide. Reconnectez-vous.'
      return { ok: false, error: error.value }
    }

    if (classroomId.value && !promotionId.value) {
      syncPromotionFromClassroom(classroomId.value)
    }

    const missing: string[] = []
    if (!promotionId.value) missing.push('Promotion')
    if (!classroomId.value) missing.push('Salle')
    if (
      etablissementId.value &&
      isApiEnabled() &&
      !isEtablissementKeySelectable(
        etablissementId.value,
        catalog.etablissements,
        (id) => governance.getFlags(id),
      )
    ) {
      error.value = 'Choisissez un établissement disponible dans la liste.'
      return { ok: false, error: error.value }
    }
    if (missing.length) {
      error.value = missingFieldsMessage(missing)
      return { ok: false, error: error.value }
    }

    saving.value = true
    try {
      const result = await studentStore.createProfile({
        userId,
        promotionId: Number(promotionId.value),
        etablissementId: etablissementId.value ? Number(etablissementId.value) : undefined,
        matricule: matricule.value.trim() || undefined,
        gender: gender.value.trim() || undefined,
      })
      if (!result.ok) {
        error.value = result.error
        return result
      }

      const join = await classroomStore.addUser(Number(classroomId.value), userId)
      const room = classrooms.value.find((c) => String(c.id) === classroomId.value)
      if (room && auth.currentUser) {
        const mapped = mapClassroomToCourse(room)
        courseStore.upsertApiCourse(mapped)
        courseStore.enrollStudent(mapped.id, auth.currentUser.id)
      }

      auth.grantQuality('student', result.profile)
      if (!join.ok) {
        success.value = 'Profil créé. Inscription à la salle : ' + join.error
      } else {
        success.value = 'Profil étudiant créé et salle rejointe. Votre qualité étudiant est active.'
      }
      return { ok: true }
    } finally {
      saving.value = false
    }
  }

  return {
    ready,
    saving,
    error,
    success,
    promotionId,
    classroomId,
    etablissementId,
    matricule,
    gender,
    promotions,
    classrooms,
    etablissementOptions,
    promotionOptions,
    classroomOptions,
    promotionLabel,
    classroomLabel,
    etablissementLabel,
    setClassroomId,
    bootstrap,
    createProfile,
  }
})
