<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeacherStore } from '@/stores/teachers'
import { listTeacherTypes } from '@/api/catalog'
import type { TeacherType } from '@/api/types'
import { isApiEnabled } from '@/config/features'
import { useServerShimmer } from '@/composables/useServerShimmer'
import { useReferentielCatalog } from '@/composables/useReferentielCatalog'
import { isEtablissementKeySelectable } from '@/utils/referentielOptions'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import InstitutionAffiliationCard from '@/components/institution/InstitutionAffiliationCard.vue'
import { AlertCircle, GraduationCap, Shield, Trash2 } from '@lucide/vue'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'
import { appToast } from '@/utils/toast'

const router = useRouter()
const auth = useAuthStore()
const teacherStore = useTeacherStore()

const departement = ref('')
const gender = ref('')
const justificatif = ref('')
const typeTeacherId = ref('')
const etablisementId = ref('')
const teacherTypes = ref<TeacherType[]>([])
const {
  catalog,
  etablissementOptions,
  ensureBaseCatalog,
  defaultSelectableEtablissementId,
  getFlags,
} = useReferentielCatalog()
const error = ref('')
const success = ref('')
const saving = ref(false)
const profileReady = ref(!isApiEnabled())
const requestInstitutionValidation = ref(true)

const showPasswordModal = ref(false)
const showDeleteModal = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const changeError = ref('')
const changeSuccess = ref('')
const changeLoading = ref(false)
const deleteConfirm = ref('')
const deleteError = ref('')
const deleteLoading = ref(false)

const user = computed(() => auth.currentUser)
const loginTeacher = computed(() => auth.teacherProfile)

const hasProfile = computed(
  () =>
    !!teacherStore.myProfile?.teacherId ||
    !!loginTeacher.value?.teacherId ||
    !!auth.currentUser?.hasTeacherProfile ||
    !!auth.currentUser?.teacherProfileId,
)

const { showShimmer: profileShimmer } = useServerShimmer(computed(() => !profileReady.value))

const genderOptions = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'N/A', label: 'Non précisé' },
]

const teacherTypeOptions = computed(() =>
  teacherTypes.value
    .filter((t) => t.active !== false)
    .map((t) => ({
      value: String(t.id),
      label: t.name?.trim() || `Type ${t.id}`,
    })),
)

const selectedEtablissementLabel = computed(() => {
  if (!etablisementId.value) return ''
  return etablissementOptions.value.find((o) => o.value === etablisementId.value)?.label ?? ''
})

const typeTeacherLabel = computed(() => {
  const id = typeTeacherId.value
  if (!id) return 'Non renseigné'
  return teacherTypeOptions.value.find((o) => o.value === id)?.label ?? `Type #${id}`
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

onMounted(async () => {
  // Données déjà présentes au login (member.profile.teacher).
  hydrateFromTeacher(loginTeacher.value)

  if (!isApiEnabled()) {
    profileReady.value = true
    return
  }
  try {
    const [types] = await Promise.all([listTeacherTypes(), ensureBaseCatalog()])
    teacherTypes.value = types

    if (!etablisementId.value) {
      etablisementId.value = defaultSelectableEtablissementId()
    }

    await teacherStore.loadMyProfile({
      userId: auth.currentUser?.apiUserId,
      email: auth.currentUser?.email,
      teacherId: auth.currentUser?.teacherProfileId ?? loginTeacher.value?.teacherId,
    })
    hydrateFromTeacher(teacherStore.myProfile ?? loginTeacher.value)
  } finally {
    profileReady.value = true
  }
})

async function handleSubmit() {
  dismissKeyboard()
  error.value = ''
  success.value = ''
  if (hasProfile.value) {
    success.value = 'Profil enseignant déjà actif (données issues de la connexion).'
    return
  }
  const missing: string[] = []
  if (!departement.value.trim()) missing.push('Département / faculté')
  if (!gender.value.trim()) missing.push('Genre')
  if (!typeTeacherId.value) missing.push("Type d'enseignant")
  if (!etablisementId.value) missing.push('Établissement')
  if (
    etablisementId.value &&
    isApiEnabled() &&
    !isEtablissementKeySelectable(etablisementId.value, catalog.etablissements, getFlags)
  ) {
    error.value = 'Choisissez un établissement disponible dans la liste.'
    return
  }
  if (missing.length) {
    error.value = missingFieldsMessage(missing)
    return
  }

  saving.value = true
  const result = await teacherStore.createProfile({
    departement: departement.value,
    gender: gender.value,
    justificatif: justificatif.value || undefined,
    typeTeacherId: Number(typeTeacherId.value),
    etablissement: [{ etablisementId: Number(etablisementId.value) }],
  })
  saving.value = false

  if (!result.ok) {
    error.value = result.error
    return
  }

  auth.grantQuality('teacher', result.profile)

  if (requestInstitutionValidation.value && etablisementId.value && selectedEtablissementLabel.value) {
    const aff = await auth.requestTeacherInstitutionAffiliation(
      etablisementId.value,
      selectedEtablissementLabel.value,
    )
    if (!aff.ok) {
      success.value =
        'Profil enseignant créé. La demande d’affiliation n’a pas pu être envoyée : vous pourrez la lancer plus bas sur cette page.'
      appToast.warning(aff.error)
      return
    }
  }

  success.value = 'Profil enseignant créé. Votre qualité enseignant est active.'
  setTimeout(() => router.push('/teacher'), 1000)
}

function openPasswordModal() {
  newPassword.value = ''
  confirmPassword.value = ''
  changeError.value = ''
  changeSuccess.value = ''
  showPasswordModal.value = true
}

function openDeleteModal() {
  deleteConfirm.value = ''
  deleteError.value = ''
  showDeleteModal.value = true
}

async function handleChangePassword() {
  changeError.value = ''
  changeSuccess.value = ''
  if (!isApiEnabled()) {
    changeError.value = 'Mode API désactivé.'
    appToast.error(changeError.value)
    return
  }
  changeLoading.value = true
  try {
    const result = await auth.changePassword(newPassword.value, confirmPassword.value)
    if (!result.ok) {
      changeError.value = result.error
      appToast.error(result.error)
      return
    }
    const message = result.message ?? 'Mot de passe modifié. Reconnectez-vous.'
    newPassword.value = ''
    confirmPassword.value = ''
    showPasswordModal.value = false
    await router.replace({ path: '/login', query: { message } })
  } finally {
    changeLoading.value = false
  }
}

async function handleDeleteAccount() {
  deleteError.value = ''
  if (!isApiEnabled()) {
    deleteError.value = 'Mode API désactivé.'
    appToast.error(deleteError.value)
    return
  }
  if (deleteConfirm.value.trim().toUpperCase() !== 'SUPPRIMER') {
    deleteError.value = 'Tapez SUPPRIMER pour confirmer.'
    appToast.warning(deleteError.value)
    return
  }
  deleteLoading.value = true
  try {
    const result = await auth.deleteAccount()
    if (!result.ok) {
      deleteError.value = result.error
      appToast.error(result.error)
      return
    }
    showDeleteModal.value = false
    appToast.success(result.message ?? 'Compte supprimé.')
    await router.push({ path: '/login', query: { message: result.message ?? 'Compte supprimé.' } })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <DashboardPage>
    <DashboardSection>
      <div class="max-w-2xl mx-auto">
        <div class="mb-8">
          <p class="label-caps mb-2">Enseignant</p>
          <h1 class="font-display text-3xl text-ink tracking-tight">Profil enseignant</h1>
        </div>

        <AppCard v-if="user" class="p-6 mb-6 space-y-3" :hover="false">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-semibold text-ink">Compte</h2>
            <AppBadge v-if="user.certified" variant="success">Certifié</AppBadge>
            <AppBadge v-if="hasProfile" variant="brand">Enseignant #{{ loginTeacher?.teacherId || user.teacherProfileId || teacherStore.myProfile?.teacherId }}</AppBadge>
          </div>
          <dl class="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-wide text-ink-muted">Nom</dt>
              <dd class="text-ink font-medium">{{ user.lastName }} {{ user.firstName }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ink-muted">Identifiant</dt>
              <dd class="text-ink font-mono text-xs">{{ user.studentId?.startsWith('@') ? user.studentId : user.studentId ? `@${user.studentId}` : '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ink-muted">E-mail</dt>
              <dd class="text-ink">{{ user.email }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ink-muted">Téléphone</dt>
              <dd class="text-ink">{{ user.phone || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ink-muted">Ville</dt>
              <dd class="text-ink">{{ user.city || '—' }}</dd>
            </div>
          </dl>
        </AppCard>

        <AppCard v-if="!isApiEnabled()" class="p-6">
          <p class="text-sm text-ink-muted">Activez le mode API pour enregistrer un profil enseignant.</p>
        </AppCard>

        <AppCard v-else class="p-6 space-y-5">
          <AppShimmerForm v-if="profileShimmer" :fields="6" />

          <template v-else-if="hasProfile">
            <dl class="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Type d'enseignant</dt>
                <dd class="text-ink font-medium">{{ typeTeacherLabel }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Département</dt>
                <dd class="text-ink font-medium">{{ departement || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Genre</dt>
                <dd class="text-ink font-medium">{{ genderOptions.find((g) => g.value === gender)?.label || gender || '—' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Justificatif</dt>
                <dd class="text-ink font-medium">{{ justificatif || '—' }}</dd>
              </div>
            </dl>
            <AppButton variant="outline" @click="router.push('/teacher')">
              Retour au tableau de bord
            </AppButton>
          </template>

          <form v-else class="space-y-5" novalidate @submit.prevent="handleSubmit">
            <AppSelect
              v-model="typeTeacherId"
              label="Type d'enseignant"
              required
              placeholder="Choisir un type"
              :options="teacherTypeOptions"
              :hint="teacherTypeOptions.length ? undefined : 'Aucun type disponible pour le moment.'"
            />
            <AppSelect
              v-model="etablisementId"
              label="Université / établissement d'exercice"
              required
              placeholder="Choisir un établissement"
              :options="etablissementOptions"
            />
            <AppInput
              v-model="departement"
              label="Département / faculté"
              required
              hint="Ex. Droit, Sciences économiques…"
            />
            <label class="flex items-start gap-3 cursor-pointer text-sm text-ink-muted leading-relaxed">
              <input
                v-model="requestInstitutionValidation"
                type="checkbox"
                class="mt-1 rounded border-line text-accent focus:ring-accent"
              />
              <span>
                Envoyer une <strong class="font-medium text-ink">demande d’affiliation</strong>
                à cet établissement dès la création du profil (optionnel).
              </span>
            </label>
            <AppSelect
              v-model="gender"
              label="Genre"
              required
              placeholder="Choisir"
              :options="genderOptions"
            />
            <AppTextarea
              v-model="justificatif"
              label="Justificatif"
              placeholder="Référence administrative (optionnel)"
              :rows="3"
            />

            <div v-if="success" class="p-3 bg-accent-light text-sm text-accent">{{ success }}</div>
            <div v-if="error" class="flex gap-2 p-3 bg-danger-bg text-sm text-danger">
              <AlertCircle class="w-4 h-4 shrink-0" /> {{ error }}
            </div>

            <AppButton type="submit" :loading="saving || teacherStore.loading">
              <GraduationCap class="w-4 h-4" />
              Créer mon profil enseignant
            </AppButton>
          </form>
        </AppCard>

        <InstitutionAffiliationCard
          v-if="hasProfile"
          class="mb-6"
          :profile-etablissement-id="etablisementId"
          :profile-etablissement-label="selectedEtablissementLabel"
        />

        <div class="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
          <AppButton type="button" variant="outline" @click="openPasswordModal">
            <Shield class="w-4 h-4" />
            Changer le mot de passe
          </AppButton>
          <AppButton type="button" variant="danger" @click="openDeleteModal">
            <Trash2 class="w-4 h-4" />
            Supprimer le compte
          </AppButton>
        </div>
      </div>
    </DashboardSection>

    <AppModal
      v-if="showPasswordModal"
      title="Changer le mot de passe"
      @close="showPasswordModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleChangePassword">
        <p class="text-sm text-ink-muted">
          Choisissez un nouveau mot de passe sécurisé (8 caractères min., lettres et chiffres).
        </p>
        <AppInput
          v-model="newPassword"
          label="Nouveau mot de passe"
          type="password"
          autocomplete="new-password"
          required
        />
        <AppInput
          v-model="confirmPassword"
          label="Confirmer"
          type="password"
          autocomplete="new-password"
          required
        />
        <div v-if="changeError" class="flex gap-2 p-3 bg-danger-bg text-sm text-danger">
          <AlertCircle class="w-4 h-4 shrink-0" /> {{ changeError }}
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <AppButton type="button" variant="outline" @click="showPasswordModal = false">Annuler</AppButton>
          <AppButton type="submit" :loading="changeLoading">Enregistrer</AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      v-if="showDeleteModal"
      title="Supprimer le compte"
      @close="showDeleteModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleDeleteAccount">
        <p class="text-sm text-ink-muted">
          Cette action est irréversible. Toutes vos données seront supprimées.
        </p>
        <AppInput
          v-model="deleteConfirm"
          label="Tapez SUPPRIMER pour confirmer"
          placeholder="SUPPRIMER"
          required
        />
        <div v-if="deleteError" class="p-3 bg-danger-bg text-sm text-danger">{{ deleteError }}</div>
        <div class="flex justify-end gap-2 pt-2">
          <AppButton type="button" variant="outline" @click="showDeleteModal = false">Annuler</AppButton>
          <AppButton type="submit" variant="danger" :loading="deleteLoading">
            Supprimer mon compte
          </AppButton>
        </div>
      </form>
    </AppModal>
  </DashboardPage>
</template>
