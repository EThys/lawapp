<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  canManageInstitutionReferentials,
  canValidateStudentsAtInstitution,
  canValidateTeachersAtInstitution,
  getPrimaryInstitutionMembership,
  isSuperAdmin,
} from '@/utils/platformAccess'
import { INSTITUTION_ROLE_LABELS } from '@/types/platformRoles'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  listAffiliationRequestsGrouped,
  verifyStudentPath,
  verifyTeacherAffiliation,
  type AffiliationQueueItem,
} from '@/api/institutionAdmin'
import { isApiEnabled } from '@/config/features'
import { extractApiError } from '@/api/client'
import { appToast } from '@/utils/toast'
import { Building2, GraduationCap, UserCheck, Users, BookOpen } from '@lucide/vue'

const auth = useAuthStore()

const membership = computed(() => getPrimaryInstitutionMembership(auth.currentUser))
const etabId = computed(() => membership.value?.etablissementId ?? 0)
const etabLabel = computed(() => membership.value?.etablissementLabel ?? 'Établissement')

const canTeachers = computed(() => canValidateTeachersAtInstitution(auth.currentUser, etabId.value))
const canStudents = computed(() => canValidateStudentsAtInstitution(auth.currentUser, etabId.value))
const canReferentials = computed(() => canManageInstitutionReferentials(auth.currentUser, etabId.value))

const loading = ref(false)
const queueError = ref('')
const queue = ref<AffiliationQueueItem[]>([])
const actingId = ref<number | null>(null)

function itemKind(item: AffiliationQueueItem): 'teacher' | 'student' | 'evaluation' | 'unknown' {
  const t = String(item.type ?? '').toLowerCase()
  if (t.includes('teacher') || item.teacherId != null) return 'teacher'
  if (t.includes('student') || item.studentPathId != null) return 'student'
  if (t.includes('eval') || item.evaluationId != null) return 'evaluation'
  return 'unknown'
}

function itemLabel(item: AffiliationQueueItem): string {
  if (typeof item.label === 'string' && item.label.trim()) return item.label.trim()
  const kind = itemKind(item)
  if (kind === 'teacher') return `Enseignant #${item.teacherId ?? item.id}`
  if (kind === 'student') return `Parcours étudiant #${item.studentPathId ?? item.id}`
  if (kind === 'evaluation') return `Évaluation #${item.evaluationId ?? item.id}`
  return `Demande #${item.id}`
}

const pendingTeachers = computed(
  () => queue.value.filter((q) => itemKind(q) === 'teacher').length,
)
const pendingStudents = computed(
  () => queue.value.filter((q) => itemKind(q) === 'student').length,
)
const pendingEvaluations = computed(
  () => queue.value.filter((q) => itemKind(q) === 'evaluation').length,
)

const pendingItems = computed(() =>
  queue.value.filter((q) => String(q.status ?? 'pending').toLowerCase().includes('pending')),
)

async function loadQueue() {
  queueError.value = ''
  if (!isApiEnabled() || etabId.value <= 0) return
  loading.value = true
  try {
    queue.value = await listAffiliationRequestsGrouped(etabId.value, { status: 'pending' })
  } catch (e) {
    queueError.value = extractApiError(e)
    queue.value = []
  } finally {
    loading.value = false
  }
}

async function approveItem(item: AffiliationQueueItem) {
  if (etabId.value <= 0) return
  actingId.value = item.id
  try {
    const kind = itemKind(item)
    if (kind === 'teacher') {
      await verifyTeacherAffiliation(etabId.value, item.id)
    } else if (kind === 'student') {
      await verifyStudentPath(etabId.value, item.id)
    } else {
      appToast.warning('Validation des examens institution : bientôt disponible.')
      return
    }
    appToast.success('Demande validée.')
    await loadQueue()
  } catch (e) {
    appToast.error(extractApiError(e))
  } finally {
    actingId.value = null
  }
}

onMounted(() => {
  void loadQueue()
})
</script>

<template>
  <DashboardPage>
    <DashboardSection spacing="loose">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="label-caps mb-2">Administration établissement</p>
          <h1 class="font-display text-3xl text-ink tracking-tight flex items-center gap-2">
            <Building2 class="w-8 h-8 text-accent" />
            {{ etabLabel }}
          </h1>
          <p v-if="membership" class="mt-2 text-sm text-ink-muted">
            Rôle :
            <AppBadge variant="brand" class="ml-1">
              {{ INSTITUTION_ROLE_LABELS[membership.role] }}
            </AppBadge>
          </p>
          <p v-else-if="isSuperAdmin(auth.currentUser)" class="mt-2 text-sm text-warning">
            Compte super admin sans rattachement établissement — assignez un rôle institution sur le compte (API).
          </p>
        </div>
        <AppButton
          v-if="isApiEnabled() && etabId > 0"
          variant="secondary"
          size="sm"
          :loading="loading"
          @click="loadQueue"
        >
          Actualiser
        </AppButton>
      </div>
    </DashboardSection>

    <DashboardSection>
      <div class="grid gap-5 md:grid-cols-3">
        <AppCard v-if="canTeachers" class="p-5 space-y-2">
          <div class="flex items-center gap-2 text-ink">
            <UserCheck class="w-5 h-5 text-accent" />
            <h2 class="font-semibold">Enseignants</h2>
          </div>
          <p class="text-3xl font-display text-ink">{{ pendingTeachers }}</p>
          <p class="text-xs text-ink-muted">Demandes d’affiliation en attente</p>
        </AppCard>
        <AppCard v-if="canStudents" class="p-5 space-y-2">
          <div class="flex items-center gap-2 text-ink">
            <GraduationCap class="w-5 h-5 text-accent" />
            <h2 class="font-semibold">Parcours étudiants</h2>
          </div>
          <p class="text-3xl font-display text-ink">{{ pendingStudents }}</p>
          <p class="text-xs text-ink-muted">UCC · faculté · promotion à valider</p>
        </AppCard>
        <AppCard class="p-5 space-y-2">
          <div class="flex items-center gap-2 text-ink">
            <BookOpen class="w-5 h-5 text-accent" />
            <h2 class="font-semibold">Examens institution</h2>
          </div>
          <p class="text-3xl font-display text-ink">{{ pendingEvaluations }}</p>
          <p class="text-xs text-ink-muted">Publications à approuver</p>
        </AppCard>
      </div>
    </DashboardSection>

    <DashboardSection>
      <AppCard class="p-6 space-y-4">
        <h2 class="font-semibold text-ink flex items-center gap-2">
          <Users class="w-5 h-5 text-accent" />
          File d’attente
        </h2>
        <p v-if="!isApiEnabled()" class="text-sm text-ink-muted">
          Activez le mode API pour synchroniser les demandes avec le serveur.
        </p>
        <p v-else-if="etabId <= 0" class="text-sm text-ink-muted">
          Aucun établissement associé à votre compte (`institutionMemberships` / GET protected/me).
        </p>
        <p v-else-if="queueError" class="text-sm text-error">{{ queueError }}</p>
        <p v-else-if="loading" class="text-sm text-ink-muted">Chargement…</p>
        <p v-else-if="pendingItems.length === 0" class="text-sm text-ink-muted">
          Aucune demande en attente.
        </p>
        <ul v-else class="divide-y divide-line text-sm max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain">
          <li
            v-for="item in pendingItems.slice(0, 20)"
            :key="item.id"
            class="py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p class="font-medium text-ink">{{ itemLabel(item) }}</p>
              <p class="text-xs text-ink-muted capitalize">{{ itemKind(item) }}</p>
            </div>
            <AppButton
              v-if="itemKind(item) === 'teacher' && canTeachers"
              size="sm"
              :loading="actingId === item.id"
              @click="approveItem(item)"
            >
              Valider
            </AppButton>
            <AppButton
              v-else-if="itemKind(item) === 'student' && canStudents"
              size="sm"
              :loading="actingId === item.id"
              @click="approveItem(item)"
            >
              Valider
            </AppButton>
          </li>
        </ul>
        <ul class="text-sm text-ink-muted space-y-2 list-disc pl-5 border-t border-line pt-3">
          <li v-if="canReferentials">CRUD facultés & promotions de cet établissement (API à venir).</li>
          <li v-if="canTeachers">Refus avec motif : API `…/reject` (UI prochaine itération).</li>
        </ul>
      </AppCard>
    </DashboardSection>
  </DashboardPage>
</template>
