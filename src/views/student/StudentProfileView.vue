<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/students'
import { useClassroomStore, mapClassroomToCourse } from '@/stores/classrooms'
import { useCourseStore } from '@/stores/courses'
import { listPromotions, listEtablissements } from '@/api/catalog'
import type { Promotion, Etablissement, Classroom } from '@/api/types'
import { isApiEnabled } from '@/config/features'
import { etablissementSelectOptions, findPartnerEtablissement } from '@/data/universities'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerForm from '@/components/loading/AppShimmerForm.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import { AlertCircle, BookOpen } from '@lucide/vue'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'

const router = useRouter()
const auth = useAuthStore()
const studentStore = useStudentStore()
const classroomStore = useClassroomStore()
const courseStore = useCourseStore()

const promotions = ref<Promotion[]>([])
const etablissements = ref<Etablissement[]>([])
const classrooms = ref<Classroom[]>([])
const promotionId = ref('')
const classroomId = ref('')
const etablissementId = ref('')
const matricule = ref(auth.currentUser?.studentId ?? '')
const gender = ref('')
const error = ref('')
const success = ref('')
const saving = ref(false)
const catalogReady = ref(!isApiEnabled())

const user = computed(() => auth.currentUser)
const loginStudent = computed(() => auth.studentProfile)

const hasProfile = computed(
  () =>
    !!studentStore.myProfile?.studentId ||
    !!loginStudent.value?.studentId ||
    !!auth.currentUser?.hasStudentProfile ||
    !!auth.currentUser?.studentProfileId,
)

const { showShimmer: profileShimmer } = useServerShimmer(computed(() => !catalogReady.value))

const genderOptions = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'N/A', label: 'Non précisé' },
]

const promotionOptions = computed(() =>
  promotions.value
    .filter((p) => p.active !== false)
    .map((p) => ({ value: String(p.id), label: p.name?.trim() || `Promotion ${p.id}` })),
)

/** Salles créées par les enseignants (GET protected/classrooms). */
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

const etablissementOptions = computed(() => etablissementSelectOptions(etablissements.value))

const promotionLabel = computed(() => {
  const id = promotionId.value
  if (!id) return '—'
  return promotionOptions.value.find((o) => o.value === id)?.label ?? `Promotion #${id}`
})

const classroomLabel = computed(() => {
  const id = classroomId.value
  if (!id) return '—'
  return classroomOptions.value.find((o) => o.value === id)?.label ?? `Salle #${id}`
})

const etablissementLabel = computed(() => {
  const id = etablissementId.value
  if (!id) return '—'
  return etablissementOptions.value.find((o) => o.value === id)?.label ?? `Établissement #${id}`
})

/**
 * Si la salle choisie porte un nom de type « L2 … », préremplit la promotion correspondante.
 */
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

onMounted(async () => {
  hydrateFromStudent(loginStudent.value)

  if (!isApiEnabled()) {
    catalogReady.value = true
    return
  }
  try {
    const [promos, etabs, rooms] = await Promise.all([
      listPromotions(),
      listEtablissements(),
      classroomStore.syncAll(),
    ])
    promotions.value = promos
    etablissements.value = etabs
    classrooms.value = rooms

    const partner = findPartnerEtablissement(etabs)
    if (partner && !etablissementId.value) {
      etablissementId.value = String(partner.id)
    }

    await studentStore.loadMyProfile({
      userId: auth.currentUser?.apiUserId,
      email: auth.currentUser?.email,
      matricule: auth.currentUser?.studentId,
      studentId: auth.currentUser?.studentProfileId ?? loginStudent.value?.studentId,
    })
    hydrateFromStudent(studentStore.myProfile ?? loginStudent.value)
  } finally {
    catalogReady.value = true
  }
})

async function handleSubmit() {
  dismissKeyboard()
  error.value = ''
  success.value = ''
  if (hasProfile.value) {
    success.value = 'Profil étudiant déjà actif (données issues de la connexion).'
    return
  }

  const userId = auth.currentUser?.apiUserId
  if (!userId) {
    error.value = 'Session utilisateur invalide. Reconnectez-vous.'
    return
  }

  if (classroomId.value && !promotionId.value) {
    syncPromotionFromClassroom(classroomId.value)
  }

  const missing: string[] = []
  if (!promotionId.value) missing.push('Promotion')
  if (!classroomId.value) missing.push('Salle')
  if (missing.length) {
    error.value = missingFieldsMessage(missing)
    return
  }

  saving.value = true
  const result = await studentStore.createProfile({
    userId,
    promotionId: Number(promotionId.value),
    etablissementId: etablissementId.value ? Number(etablissementId.value) : undefined,
    matricule: matricule.value.trim() || undefined,
    gender: gender.value.trim() || undefined,
  })

  if (!result.ok) {
    saving.value = false
    error.value = result.error
    return
  }

  const join = await classroomStore.addUser(Number(classroomId.value), userId)

  const room = classrooms.value.find((c) => String(c.id) === classroomId.value)
  if (room && auth.currentUser) {
    const mapped = mapClassroomToCourse(room)
    courseStore.upsertApiCourse(mapped)
    courseStore.enrollStudent(mapped.id, auth.currentUser.id)
  }

  saving.value = false

  auth.grantQuality('student', result.profile)
  if (!join.ok) {
    success.value =
      'Profil créé et salle enregistrée localement. Inscription serveur : ' + join.error
  } else {
    success.value = 'Profil étudiant créé et salle rejointe. Votre qualité étudiant est active.'
  }
  setTimeout(() => router.push('/student'), 1200)
}

function onClassroomChange(value: string) {
  classroomId.value = value
  syncPromotionFromClassroom(value)
}
</script>

<template>
  <DashboardPage>
    <DashboardSection>
      <div class="max-w-2xl mx-auto">
        <div class="mb-8">
          <p class="label-caps mb-2">Étudiant</p>
          <h1 class="font-display text-3xl text-ink tracking-tight">Profil étudiant</h1>
          <p class="mt-2 text-sm text-ink-muted">
            Informations du compte, niveau (promotion) et salle créée par votre enseignant.
          </p>
        </div>

        <AppCard v-if="user" class="p-6 mb-6 space-y-3" :hover="false">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-semibold text-ink">Compte</h2>
            <AppBadge v-if="user.certified" variant="success">Certifié</AppBadge>
            <AppBadge v-if="hasProfile" variant="brand">
              Étudiant #{{ loginStudent?.studentId || user.studentProfileId || studentStore.myProfile?.studentId }}
            </AppBadge>
          </div>
          <dl class="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-wide text-ink-muted">Nom</dt>
              <dd class="text-ink font-medium">{{ user.lastName }} {{ user.firstName }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ink-muted">Identifiant</dt>
              <dd class="text-ink font-mono text-xs">
                {{ user.studentId?.startsWith('@') ? user.studentId : user.studentId ? `@${user.studentId}` : '—' }}
              </dd>
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
          <p class="text-sm text-ink-muted">Activez le mode API pour enregistrer un profil étudiant.</p>
        </AppCard>

        <AppCard v-else class="p-6 space-y-5">
          <div v-if="hasProfile && !profileShimmer" class="p-3 bg-accent-light border border-accent/20 text-sm text-accent">
            Profil étudiant actif — prérempli depuis la connexion.
          </div>

          <AppShimmerForm v-if="profileShimmer" :fields="5" />

          <template v-else-if="hasProfile">
            <dl class="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Promotion</dt>
                <dd class="text-ink font-medium">{{ promotionLabel }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Salle</dt>
                <dd class="text-ink font-medium">{{ classroomLabel }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Établissement</dt>
                <dd class="text-ink font-medium">{{ etablissementLabel }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Matricule</dt>
                <dd class="text-ink font-medium">{{ matricule || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-ink-muted">Genre</dt>
                <dd class="text-ink font-medium">
                  {{ genderOptions.find((g) => g.value === gender)?.label || gender || '—' }}
                </dd>
              </div>
            </dl>
            <AppButton variant="outline" @click="router.push('/student')">
              Retour au tableau de bord
            </AppButton>
          </template>

          <form v-else class="space-y-5" novalidate @submit.prevent="handleSubmit">
            <AppSelect
              :model-value="classroomId"
              label="Salle"
              required
              placeholder="Choisir une salle"
              hint="Salles créées par les enseignants (API classrooms)."
              :options="classroomOptions"
              :error="classroomOptions.length === 0 ? 'Aucune salle disponible pour le moment.' : undefined"
              @update:model-value="onClassroomChange"
            />
            <AppSelect
              v-model="promotionId"
              label="Promotion"
              required
              placeholder="Choisir une promotion"
              hint="Niveau académique (L1, L2, M1…)."
              :options="promotionOptions"
            />
            <AppSelect
              v-if="etablissementOptions.length"
              v-model="etablissementId"
              label="Établissement"
              placeholder="Choisir un établissement"
              :options="etablissementOptions"
            />
            <AppInput v-model="matricule" label="Matricule" placeholder="N° étudiant (optionnel)" />
            <AppSelect
              v-model="gender"
              label="Genre"
              placeholder="Choisir (optionnel)"
              :options="genderOptions"
            />
            <div v-if="success" class="p-3 bg-accent-light text-sm text-accent">{{ success }}</div>
            <div v-if="error" class="flex gap-2 p-3 bg-danger-bg text-sm text-danger">
              <AlertCircle class="w-4 h-4 shrink-0" /> {{ error }}
            </div>

            <AppButton type="submit" :loading="saving || studentStore.loading || classroomStore.loading">
              <BookOpen class="w-4 h-4" />
              Créer mon profil étudiant
            </AppButton>
          </form>
        </AppCard>
      </div>
    </DashboardSection>
  </DashboardPage>
</template>
