import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { listTeacherTypes } from '@/api/catalog'
import type { TeacherType } from '@/api/types'
import { isApiEnabled } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import { useTeacherStore } from '@/stores/teachers'
import { useCatalogStore } from '@/stores/catalog'
import { usePlatformGovernanceStore } from '@/stores/platformGovernance'
import {
  etablissementSelectOptions,
  findDefaultSelectableEtablissement,
  isEtablissementKeySelectable,
} from '@/utils/referentielOptions'
import { mergeTeacherRecords } from '@/utils/teacherProfileMerge'
import { missingFieldsMessage } from '@/utils/form'
import { appToast } from '@/utils/toast'

export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'N/A', label: 'Non précisé' },
] as const

export const useTeacherProfilePageStore = defineStore('teacherProfilePage', () => {
  const ready = ref(!isApiEnabled())
  const saving = ref(false)
  const error = ref('')
  const success = ref('')

  const departement = ref('')
  const gender = ref('')
  const justificatif = ref('')
  const typeTeacherId = ref('')
  const etablisementId = ref('')
  const requestInstitutionValidation = ref(true)
  const teacherTypes = ref<TeacherType[]>([])

  const etablissementOptions = computed(() => {
    const catalog = useCatalogStore()
    const governance = usePlatformGovernanceStore()
    return etablissementSelectOptions(catalog.etablissements, (id) => governance.getFlags(id))
  })

  const teacherTypeOptions = computed(() =>
    teacherTypes.value
      .filter((t) => t.active !== false)
      .map((t) => ({
        value: String(t.id),
        label: t.name?.trim() || `Type ${t.id}`,
      })),
  )

  const typeTeacherLabel = computed(() => {
    const id = typeTeacherId.value
    if (!id) return 'Non renseigné'
    return teacherTypeOptions.value.find((o) => o.value === id)?.label ?? `Type #${id}`
  })

  const selectedEtablissementLabel = computed(() => {
    if (!etablisementId.value) return ''
    return etablissementOptions.value.find((o) => o.value === etablisementId.value)?.label ?? ''
  })

  function hydrateFromTeacher(source: {
    departement?: string
    gender?: string
    justificatif?: string
    typeTeacherId?: number | null
  } | null | undefined) {
    if (!source) return
    if (source.departement?.trim()) departement.value = source.departement.trim()
    if (source.gender?.trim()) gender.value = source.gender.trim()
    if (source.justificatif != null) justificatif.value = String(source.justificatif)
    if (source.typeTeacherId) typeTeacherId.value = String(source.typeTeacherId)
  }

  async function bootstrap() {
    const auth = useAuthStore()
    const teacherStore = useTeacherStore()
    hydrateFromTeacher(auth.teacherProfile)

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
      const types = await listTeacherTypes()
      teacherTypes.value = types

      const governance = usePlatformGovernanceStore()
      if (!etablisementId.value) {
        const etab = findDefaultSelectableEtablissement(catalog.etablissements, (id) =>
          governance.getFlags(id),
        )
        if (etab) etablisementId.value = String(etab.id)
      }

      await teacherStore.loadMyProfile({
        userId: auth.currentUser?.apiUserId,
        email: auth.currentUser?.email,
        teacherId: auth.currentUser?.teacherProfileId ?? auth.teacherProfile?.teacherId,
      })

      hydrateFromTeacher(
        mergeTeacherRecords(teacherStore.myProfile, auth.teacherProfile, auth.teacherProfile),
      )
    } finally {
      ready.value = true
    }
  }

  async function createProfile(): Promise<{ ok: true } | { ok: false; error: string }> {
    error.value = ''
    success.value = ''

    const auth = useAuthStore()
    const teacherStore = useTeacherStore()
    const catalog = useCatalogStore()
    const governance = usePlatformGovernanceStore()

    const missing: string[] = []
    if (!departement.value.trim()) missing.push('Département / faculté')
    if (!gender.value.trim()) missing.push('Genre')
    if (!typeTeacherId.value) missing.push("Type d'enseignant")
    if (!etablisementId.value) missing.push('Établissement')
    if (
      etablisementId.value &&
      isApiEnabled() &&
      !isEtablissementKeySelectable(
        etablisementId.value,
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
      const result = await teacherStore.createProfile({
        departement: departement.value,
        gender: gender.value,
        justificatif: justificatif.value || undefined,
        typeTeacherId: Number(typeTeacherId.value),
        etablissement: [{ etablisementId: Number(etablisementId.value) }],
      })
      if (!result.ok) {
        error.value = result.error
        return result
      }

      const saved = mergeTeacherRecords(result.profile, {
        teacherId: result.profile?.teacherId ?? 0,
        typeTeacherId: Number(typeTeacherId.value) || undefined,
        departement: departement.value.trim(),
        gender: gender.value.trim(),
        justificatif: justificatif.value.trim() || undefined,
      })
      auth.grantQuality('teacher', saved ?? result.profile)
      hydrateFromTeacher(saved ?? result.profile)

      if (requestInstitutionValidation.value && etablisementId.value && selectedEtablissementLabel.value) {
        const aff = await auth.requestTeacherInstitutionAffiliation(
          etablisementId.value,
          selectedEtablissementLabel.value,
        )
        if (!aff.ok) {
          success.value =
            'Profil enseignant créé. La demande d’affiliation n’a pas pu être envoyée : vous pourrez la lancer plus bas sur cette page.'
          appToast.warning(aff.error)
          return { ok: true }
        }
      }

      success.value = 'Profil enseignant créé. Votre qualité enseignant est active.'
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
    departement,
    gender,
    justificatif,
    typeTeacherId,
    etablisementId,
    requestInstitutionValidation,
    teacherTypes,
    etablissementOptions,
    teacherTypeOptions,
    typeTeacherLabel,
    selectedEtablissementLabel,
    hydrateFromTeacher,
    bootstrap,
    createProfile,
  }
})
