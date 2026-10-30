<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { useCourseStore } from '@/stores/courses'
import { usePresenceSessionStore } from '@/stores/presenceSessions'
import { useNotificationStore } from '@/stores/notifications'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppStatCard from '@/components/ui/AppStatCard.vue'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import WorkspaceQualityPrompt from '@/components/account/WorkspaceQualityPrompt.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import DashboardTile from '@/components/layout/DashboardTile.vue'
import { EVALUATION_TYPE_LABELS } from '@/types'
import { formatEvaluationPeriod, formatDate, formatMinutes, downloadDataUrl } from '@/utils/helpers'
import { Download } from '@lucide/vue'
import { getEvaluationJoinBlockReason, evaluationAvailabilityLabel, getTodayDateString } from '@/utils/access'
import {
  isStudentAcademicPending,
  isStudentAcademicVerified,
  STUDENT_PARCOURS_PENDING_BANNER,
} from '@/utils/evaluationAudience'
import { isApiEnabled } from '@/config/features'
import { studentResultPath } from '@/utils/evaluationApiMapper'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import AppShimmerStats from '@/components/loading/AppShimmerStats.vue'
import { appToast } from '@/utils/toast'
import { ArrowRight, AlertCircle, ClipboardList, CalendarClock, BookOpen, Target, UserCheck, Users, Radio, Bell, Share2, History, ShieldAlert, UserX, CalendarCheck, RefreshCw, CalendarDays } from '@lucide/vue'
import type { Evaluation } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const evalStore = useEvaluationStore()
const courseStore = useCourseStore()
const presenceStore = usePresenceSessionStore()
const notifStore = useNotificationStore()

const showNotifications = ref(false)
const notificationsRef = ref<HTMLElement | null>(null)
const presenceTick = ref(0)
let presenceTimer: ReturnType<typeof setInterval> | null = null

const code = ref('')
const error = ref('')
const scheduleMessage = ref('')
const foundEvaluation = ref<ReturnType<typeof evalStore.getByCode> | null>(null)

const mySessions = computed(() =>
  auth.currentUser ? evalStore.getSessionsForStudent(auth.currentUser.id) : []
)

const myCourses = computed(() =>
  auth.currentUser ? courseStore.getCoursesForStudent(auth.currentUser.id) : []
)

const sharedPresence = computed(() => {
  presenceTick.value
  return auth.currentUser
    ? courseStore.getSharedPresenceForStudent(auth.currentUser.id)
    : []
})

const openQrPresenceSessions = computed(() => {
  presenceTick.value
  return auth.currentUser
    ? presenceStore.getOpenSessionsForStudent(auth.currentUser.id)
    : []
})

const activePresenceRelay = computed(() => {
  presenceTick.value
  return auth.currentUser
    ? presenceStore.getActiveRelaySessionForStudent(auth.currentUser.id)
    : undefined
})

const sharedEvaluations = computed(() =>
  auth.currentUser ? evalStore.getSharedEvaluationsForStudent(auth.currentUser.id) : []
)

const catalogEvaluations = computed(() =>
  evalStore.getCatalogEvaluationsForStudent(),
)

const cohortEvaluations = computed(() =>
  auth.currentUser ? evalStore.getCohortEvaluationsForStudent(auth.currentUser.id) : [],
)

const personalizedEvaluations = computed(() =>
  auth.currentUser
    ? evalStore.getPersonalizedEvaluationsForStudent(auth.currentUser.id)
    : [],
)

const parcoursPending = computed(() => isStudentAcademicPending(auth.currentUser))
const parcoursVerified = computed(() => isStudentAcademicVerified(auth.currentUser))

const { showShimmer: catalogShimmer } = useServerShimmer(computed(() => evalStore.apiLoading))

const codeProtectedEvaluations = computed(() =>
  auth.currentUser ? evalStore.getCodeProtectedEvaluationsForStudent(auth.currentUser.id) : [],
)

const hasSharedContent = computed(
  () =>
    sharedPresence.value.length > 0 ||
    openQrPresenceSessions.value.length > 0 ||
    !!activePresenceRelay.value ||
    sharedEvaluations.value.length > 0 ||
    codeProtectedEvaluations.value.length > 0 ||
    sharedClassLinks.value.length > 0 ||
    cohortEvaluations.value.length > 0
)

const myNotifications = computed(() =>
  auth.currentUser ? notifStore.getForUser(auth.currentUser.id) : []
)

const unreadNotifications = computed(() => myNotifications.value.filter((n) => !n.read).length)

const profile = computed(() => {
  const user = auth.currentUser
  if (!user) return null
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId ?? user.email,
  }
})

const stats = computed(() => {
  const completed = mySessions.value.filter((s) => s.status === 'submitted')
  const avg =
    completed.length > 0
      ? Math.round(
          completed.reduce((acc, s) => acc + ((s.score ?? 0) / (s.maxScore || 1)) * 100, 0) /
            completed.length
        )
      : null
  const missed = mySessions.value.filter((s) => s.status === 'expired' || s.status === 'failed').length
  const alerts = mySessions.value.filter((s) => s.violations.length > 0 || s.status === 'failed').length
  const presences = auth.currentUser
    ? courseStore.getAttendanceHistoryForStudent(auth.currentUser.id).length
    : 0
  const absences = auth.currentUser
    ? courseStore.getAbsenceDaysForStudent(auth.currentUser.id).length
    : 0

  return {
    total: mySessions.value.length,
    completed: completed.length,
    average: avg,
    missed,
    alerts,
    presences: presences + absences,
  }
})

const sharedClassLinks = computed(() =>
  myCourses.value.filter((c) => c.enrollmentSharedAt)
)

function evaluationBlockReason(evaluation: Evaluation): string | null {
  if (!auth.currentUser) return 'Connectez-vous pour commencer.'
  return getEvaluationJoinBlockReason(evaluation, auth.currentUser.id, courseStore, auth.currentUser)
}

function availabilityBadge(evaluation: Evaluation): { label: string; variant: 'success' | 'warning' | 'muted' } {
  const state = evaluationAvailabilityLabel(evaluation)
  if (state === 'open') return { label: 'Ouverte', variant: 'success' }
  if (state === 'upcoming') return { label: 'Bientôt', variant: 'warning' }
  return { label: 'Terminée', variant: 'muted' }
}

function reportStudentIssue(message: string, kind: 'error' | 'schedule' = 'error') {
  if (kind === 'schedule') {
    scheduleMessage.value = message
    appToast.warning(message)
    return
  }
  error.value = message
  appToast.error(message)
}

async function refreshCatalog() {
  if (!isApiEnabled()) return
  await evalStore.syncStudentCatalog()
  if (evalStore.apiError) {
    appToast.error(evalStore.apiError)
  } else {
    appToast.success('Catalogue actualisé.')
  }
}

async function lookupCode() {
  error.value = ''
  scheduleMessage.value = ''
  foundEvaluation.value = null

  if (!code.value.trim()) {
    reportStudentIssue('Veuillez entrer un code.')
    return
  }

  let evaluation = evalStore.getByCode(code.value.trim())
  if (!evaluation && isApiEnabled()) {
    const resolved = await evalStore.resolveAccessCodeForStudent(code.value.trim())
    if (!resolved.ok) {
      reportStudentIssue(resolved.error)
      return
    }
    evaluation = resolved.evaluation
  }
  if (!evaluation) {
    reportStudentIssue('Code invalide. Vérifiez le code fourni par votre enseignant.')
    return
  }

  if (!evaluation.requiresAccessCode && evaluation.isFromApi) {
    reportStudentIssue('Cette évaluation est dans la liste ci-dessus : rejoignez-la directement sans code.')
    return
  }

  if (!evaluation.requiresAccessCode && !evaluation.isFromApi) {
    reportStudentIssue('Cette évaluation est accessible depuis votre espace, sans code.')
    return
  }

  const blockReason = evaluationBlockReason(evaluation)
  if (blockReason) {
    reportStudentIssue(
      blockReason,
      blockReason.includes('sera disponible') || blockReason.includes('pas encore')
        ? 'schedule'
        : 'error',
    )
    return
  }

  foundEvaluation.value = evaluation
  appToast.success('Évaluation trouvée. Vérifiez votre identité puis commencez.')
}

function startEvaluation(evaluation: Evaluation) {
  error.value = ''
  scheduleMessage.value = ''

  const blockReason = evaluationBlockReason(evaluation)
  if (blockReason) {
    reportStudentIssue(
      blockReason,
      blockReason.includes('sera disponible') || blockReason.includes('pas encore')
        ? 'schedule'
        : 'error',
    )
    return
  }

  foundEvaluation.value = evaluation
  void joinEvaluation()
}

function openSharedPresence(shareCode: string) {
  router.push(`/join/presence/${shareCode}`)
}

async function joinEvaluation() {
  if (!foundEvaluation.value) {
    reportStudentIssue('Évaluation introuvable.')
    return
  }
  if (!auth.currentUser || !profile.value) {
    reportStudentIssue('Connectez-vous pour commencer l\'évaluation.')
    return
  }

  error.value = ''
  const user = auth.currentUser
  const studentId = profile.value.studentId

  const accessDenied = auth.currentUser
    ? getEvaluationJoinBlockReason(
        foundEvaluation.value,
        auth.currentUser.id,
        courseStore,
        auth.currentUser,
      )
    : 'Connectez-vous pour commencer.'
  if (accessDenied) {
    reportStudentIssue(accessDenied)
    return
  }

  const attempts = evalStore.getStudentAttempts(foundEvaluation.value.id, studentId)
  if (attempts >= foundEvaluation.value.settings.maxAttempts) {
    reportStudentIssue(`Nombre maximum de tentatives atteint (${foundEvaluation.value.settings.maxAttempts}).`)
    return
  }

  const existing = evalStore.getActiveSessionForStudent(foundEvaluation.value.id, user.id)
  if (existing) {
    if (existing.status === 'pending') {
      const pendingBlock = evaluationBlockReason(foundEvaluation.value)
      if (pendingBlock) {
        reportStudentIssue(
          pendingBlock,
          pendingBlock.includes('sera disponible') || pendingBlock.includes('pas encore')
            ? 'schedule'
            : 'error',
        )
        return
      }
    }
    await router.push(evalStore.getExamEntryPath(existing))
    return
  }

  if (foundEvaluation.value.apiId) {
    const passageEval = await evalStore.loadPassageFromApi(foundEvaluation.value.apiId)
    if (!passageEval || !passageEval.questions.length) {
      reportStudentIssue(
        evalStore.apiError ||
          'Impossible de charger la feuille d\'évaluation. Réessayez ou contactez votre enseignant.',
      )
      return
    }
    foundEvaluation.value = passageEval
    const afterPassage = evaluationBlockReason(passageEval)
    if (afterPassage) {
      reportStudentIssue(
        afterPassage,
        afterPassage.includes('sera disponible') || afterPassage.includes('pas encore')
          ? 'schedule'
          : 'error',
      )
      return
    }
  }

  try {
    const session = evalStore.createSession({
      evaluation: foundEvaluation.value,
      studentUserId: user.id,
      studentFirstName: profile.value.firstName,
      studentLastName: profile.value.lastName,
      studentId,
    })
    await router.push(evalStore.getExamEntryPath(session))
  } catch (e) {
    reportStudentIssue(
      e instanceof Error ? e.message : "Cette évaluation n'est plus accessible.",
      'error',
    )
  }
}

function isPresentToday(courseId: string): boolean {
  if (!auth.currentUser) return false
  return courseStore.isPresent(courseId, auth.currentUser.id, getTodayDateString())
}

function downloadCorrectionForSession(session: (typeof mySessions.value)[0]) {
  const eval_ = evalStore.getById(session.evaluationId)
  if (!eval_?.correctionPdfData || !eval_.correctionPdfName) return
  downloadDataUrl(eval_.correctionPdfData, eval_.correctionPdfName)
}

function hasPublishedCorrection(session: (typeof mySessions.value)[0]) {
  const eval_ = evalStore.getById(session.evaluationId)
  return !!eval_?.correctionPublished && !!eval_?.correctionPdfData
}

function isTunnelOpen(courseId: string): boolean {
  return !!courseStore.getActiveTunnel(courseId)
}

function openNotification(id: string, link: string) {
  notifStore.markRead(id)
  showNotifications.value = false
  router.push(link)
}

function markAllNotificationsRead() {
  if (auth.currentUser) notifStore.markAllRead(auth.currentUser.id)
}

function sessionResumeLink(session: (typeof mySessions.value)[0]) {
  return evalStore.getExamEntryPath(session)
}

/** Pending : bloqué si date dépassée ; in_progress : reprise autorisée. */
function canResumeSession(session: (typeof mySessions.value)[0]): boolean {
  if (session.status === 'in_progress') return true
  if (session.status !== 'pending') return false
  const evaluation = evalStore.getById(session.evaluationId)
  if (!evaluation) return false
  return !evaluationBlockReason(evaluation)
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'À commencer',
    in_progress: 'En cours',
    submitted: 'Terminé',
    failed: 'Échoué',
    expired: 'Expiré',
  }
  return map[status] || status
}

function statusVariant(status: string) {
  const map: Record<string, 'brand' | 'success' | 'danger' | 'warning' | 'muted'> = {
    pending: 'warning',
    in_progress: 'brand',
    submitted: 'success',
    failed: 'danger',
    expired: 'warning',
  }
  return map[status] || 'muted'
}

function onClickOutsideNotifications(e: MouseEvent) {
  if (notificationsRef.value && !notificationsRef.value.contains(e.target as Node)) {
    showNotifications.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutsideNotifications)
  if (isApiEnabled()) void evalStore.syncStudentCatalog()
  const paramCode = (route.query.code as string) || (route.params.code as string | undefined)
  if (paramCode) {
    code.value = paramCode.toUpperCase()
    void lookupCode()
  }
  presenceTimer = setInterval(() => {
    presenceTick.value++
  }, 1000)
  document.addEventListener('visibilitychange', onVisibilityRefresh)
})

function onVisibilityRefresh() {
  if (document.visibilityState === 'visible' && isApiEnabled()) {
    void evalStore.syncStudentCatalog()
  }
}

onUnmounted(() => {
  document.removeEventListener('click', onClickOutsideNotifications)
  document.removeEventListener('visibilitychange', onVisibilityRefresh)
  if (presenceTimer) clearInterval(presenceTimer)
})
</script>

<template>
  <DashboardPage>
    <DashboardSection spacing="loose" variant="intro">
      <WorkspaceQualityPrompt
        v-if="!auth.hasTeacherQuality"
        v-reveal="96"
        class="mb-4"
        target="teacher"
      />

      <p
        v-if="parcoursPending"
        v-reveal="97"
        class="mb-4 text-xs text-ink-muted leading-relaxed"
      >
        {{ STUDENT_PARCOURS_PENDING_BANNER }}
        <RouterLink to="/student/profile" class="font-medium text-accent hover:underline">
          Compléter le parcours
        </RouterLink>
      </p>

      <div v-reveal="100" class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        <div class="min-w-0 flex-1">
          <p class="label-caps mb-2">Espace étudiant</p>
          <h1 class="font-display text-2xl sm:text-3xl text-brand-dark tracking-tight break-words">
            Bonjour, {{ auth.currentUser?.firstName }}
          </h1>
          <p class="mt-1 text-sm text-ink-muted">
            {{ auth.currentUser?.institution || auth.currentUser?.email }}
            <span v-if="auth.currentUser?.studentId" class="text-ink-faint">
              · {{ auth.currentUser.studentId }}
            </span>
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <RouterLink to="/student/calendar" class="w-full sm:w-auto">
            <AppButton variant="outline" class="w-full sm:w-auto">
              <CalendarDays class="w-4 h-4" />
              Calendrier
            </AppButton>
          </RouterLink>
          <RouterLink to="/student/history" class="w-full sm:w-auto">
            <AppButton variant="outline" class="w-full sm:w-auto">
              <History class="w-4 h-4" />
              Mon historique
            </AppButton>
          </RouterLink>

          <div ref="notificationsRef" class="relative w-full sm:w-auto">
        <AppButton variant="outline" class="w-full sm:w-auto" @click.stop="showNotifications = !showNotifications">
          <Bell class="w-4 h-4" />
          Notifications
          <span
            v-if="unreadNotifications > 0"
            class="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold bg-accent text-white rounded-full"
          >
            {{ unreadNotifications }}
          </span>
        </AppButton>

        <div
          v-if="showNotifications"
          class="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-80 max-h-[min(70dvh,24rem)] flex flex-col bg-white border border-line shadow-lg z-30 rounded-sm"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-line">
            <p class="text-sm font-medium text-ink">Notifications</p>
            <button
              v-if="unreadNotifications > 0"
              type="button"
              class="text-xs text-accent hover:text-accent-hover"
              @click="markAllNotificationsRead"
            >
              Tout marquer lu
            </button>
          </div>
          <div v-if="myNotifications.length === 0" class="px-4 py-8 text-sm text-ink-muted text-center">
            Aucune notification.
          </div>
          <div v-else class="max-h-72 overflow-y-auto divide-y divide-line">
            <button
              v-for="notif in myNotifications.slice(0, 10)"
              :key="notif.id"
              type="button"
              class="w-full text-left px-4 py-3 hover:bg-paper/80 transition-colors"
              :class="{ 'bg-accent-light/40': !notif.read }"
              @click="openNotification(notif.id, notif.link)"
            >
              <p class="text-sm font-medium text-ink">{{ notif.title }}</p>
              <p class="text-xs text-ink-muted mt-1 line-clamp-2">{{ notif.body }}</p>
            </button>
          </div>
        </div>
          </div>
        </div>
      </div>
    </DashboardSection>

    <DashboardSection spacing="loose">
      <div v-reveal class="dashboard-stats">
        <AppShimmerStats v-if="catalogShimmer" :count="3" :columns="3" />
        <template v-else>
          <AppStatCard :value="stats.total" label="Sessions" :icon="BookOpen" :delay="0" />
          <AppStatCard :value="stats.completed" label="Terminées" :icon="ClipboardList" :delay="1" />
          <AppStatCard
            :value="stats.average ?? 0"
            :label="stats.average !== null ? 'Moyenne' : 'Moyenne (n/a)'"
            suffix="%"
            :icon="Target"
            :delay="2"
          />
        </template>
      </div>
    </DashboardSection>

    <DashboardSection>
      <AppCard v-if="cohortEvaluations.length" v-reveal="103" hover class="mb-6">
        <div class="border-b border-line mb-4 sm:mb-5 pb-4">
          <h3 class="font-display text-ink text-lg">Mes formations</h3>
          <p class="text-xs text-ink-faint mt-1">
            Épreuves réservées à votre salle (lien reçu du formateur) — hors catalogue public.
          </p>
        </div>
        <div class="dashboard-stack">
          <div
            v-for="evaluation in cohortEvaluations"
            :key="`cohort-${evaluation.id}`"
            class="dashboard-row dashboard-row--soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-ink">{{ evaluation.title }}</p>
              <p class="text-xs text-ink-muted mt-1">
                {{ evaluation.subject }}
                <span v-if="evaluation.durationMinutes"> · {{ formatMinutes(evaluation.durationMinutes) }}</span>
              </p>
            </div>
            <AppButton
              size="sm"
              :disabled="!!evaluationBlockReason(evaluation)"
              @click="startEvaluation(evaluation)"
            >
              Commencer
            </AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard v-if="personalizedEvaluations.length" v-reveal="104" hover class="mb-6">
        <div class="border-b border-line mb-4 sm:mb-5 pb-4">
          <h3 class="font-display text-ink text-lg">Pour vous</h3>
          <p class="text-xs text-ink-faint mt-1">Vos examens de promo / faculté (parcours validé).</p>
        </div>
        <div class="dashboard-stack">
          <div
            v-for="evaluation in personalizedEvaluations"
            :key="`personal-${evaluation.id}`"
            class="dashboard-row dashboard-row--accent flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-ink">{{ evaluation.title }}</p>
              <p class="text-xs text-ink-muted mt-1">
                {{ evaluation.subject }}
                <span v-if="evaluation.durationMinutes"> · {{ formatMinutes(evaluation.durationMinutes) }}</span>
              </p>
            </div>
            <AppButton
              size="sm"
              :disabled="!!evaluationBlockReason(evaluation)"
              @click="startEvaluation(evaluation)"
            >
              Commencer
            </AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard v-reveal="105" hover>
        <div class="flex items-start justify-between gap-3 border-b border-line mb-4 sm:mb-5 pb-4">
          <div class="min-w-0">
            <h3 class="font-display text-ink text-lg">Catalogue & codes</h3>
            <p class="text-xs text-ink-faint mt-1">Ouvert à tous · ou entrez le code du prof.</p>
          </div>
          <button
            v-if="isApiEnabled()"
            type="button"
            class="shrink-0 inline-flex items-center justify-center w-9 h-9 min-h-9 border border-line bg-white text-ink-muted hover:text-ink hover:bg-paper-warm hover:border-line-strong transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="evalStore.apiLoading"
            title="Actualiser"
            aria-label="Actualiser la liste des évaluations"
            @click="refreshCatalog"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': evalStore.apiLoading }" />
          </button>
        </div>
        <AppShimmerList v-if="catalogShimmer" variant="eval" :count="4" />
        <div v-else-if="catalogEvaluations.length === 0" class="text-sm text-ink-muted py-6 text-center px-2">
          <template v-if="parcoursPending">
            Aucune évaluation libre pour le moment. Les examens ciblés apparaîtront dans « Pour vous » après validation de votre parcours.
          </template>
          <template v-else-if="parcoursVerified">
            Aucune évaluation libre pour le moment. Consultez « Pour vous » si des examens ciblés existent.
          </template>
          <template v-else>
            Aucune évaluation disponible pour le moment.
          </template>
        </div>
        <div v-else class="dashboard-stack">
          <div
            v-for="evaluation in catalogEvaluations"
            :key="`catalog-${evaluation.id}`"
            class="dashboard-row flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-medium text-ink">{{ evaluation.title }}</p>
                <AppBadge :variant="availabilityBadge(evaluation).variant">
                  {{ availabilityBadge(evaluation).label }}
                </AppBadge>
              </div>
              <p class="text-xs text-ink-muted mt-1">
                {{ formatEvaluationPeriod({
                  availableFrom: evaluation.availableFrom,
                  availableUntil: evaluation.availableUntil,
                }) }}
                <span v-if="evaluation.durationMinutes"> · {{ formatMinutes(evaluation.durationMinutes) }}</span>
              </p>
              <p v-if="evaluationBlockReason(evaluation) && availabilityBadge(evaluation).label !== 'Ouverte'" class="text-xs text-warning mt-2">
                {{ evaluationBlockReason(evaluation) }}
              </p>
            </div>
            <AppButton
              size="sm"
              class="w-full sm:w-auto shrink-0"
              :disabled="availabilityBadge(evaluation).label !== 'Ouverte'"
              @click="startEvaluation(evaluation)"
            >
              Commencer
              <ArrowRight class="w-4 h-4" />
            </AppButton>
          </div>
        </div>
      </AppCard>
    </DashboardSection>

    <DashboardSection>
      <AppCard
        v-reveal="95"
        title="Mon historique"
        subtitle="Évaluations, alertes et présences"
        hover
      >
        <AppShimmerStats v-if="catalogShimmer" :count="4" :columns="4" class="mb-5" />
        <div v-else class="dashboard-tiles dashboard-tiles--4 mb-5">
          <DashboardTile
            to="/student/history?tab=passed"
            caption="Passées"
            :value="stats.completed"
            :icon="ClipboardList"
          />
          <DashboardTile
            to="/student/history?tab=missed"
            caption="Manquées"
            :value="stats.missed"
            :icon="UserX"
            tone="warning"
          />
          <DashboardTile
            to="/student/history?tab=alerts"
            caption="Alertes"
            :value="stats.alerts"
            :icon="ShieldAlert"
            tone="danger"
          />
          <DashboardTile
            to="/student/attendance"
            caption="Présences"
            :value="stats.presences"
            :icon="CalendarCheck"
            tone="muted"
          />
        </div>
        <RouterLink to="/student/history">
          <AppButton variant="outline" size="sm">
            <History class="w-4 h-4" />
            Voir tout mon historique
          </AppButton>
        </RouterLink>
      </AppCard>
    </DashboardSection>

    <DashboardSection v-if="hasSharedContent">
      <AppCard
        v-reveal="110"
        title="Partagé par ma salle"
        subtitle="Codes et liens envoyés par votre professeur"
        hover
      >
      <div
        v-if="error && !foundEvaluation"
        class="mb-4 flex items-start gap-2 p-3 bg-danger-bg border border-danger/15 text-sm text-danger"
      >
        <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
        {{ error }}
      </div>
      <div class="space-y-4">
        <div
          v-if="activePresenceRelay"
          class="p-4 border border-accent/30 bg-accent-light/20 space-y-3"
        >
          <p class="text-sm font-medium text-ink">Relais présence actif</p>
          <p class="text-xs text-ink-muted">{{ activePresenceRelay.classroomName }}</p>
          <RouterLink :to="{ name: 'presence-relay', params: { sessionId: activePresenceRelay.id } }">
            <AppButton size="sm">
              Afficher le QR relais
              <ArrowRight class="w-4 h-4" />
            </AppButton>
          </RouterLink>
        </div>

        <div
          v-for="session in openQrPresenceSessions"
          :key="session.id"
          class="p-4 border border-line bg-paper-warm space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-ink flex items-center gap-2">
                <UserCheck class="w-4 h-4 text-accent" />
                Présence QR · {{ session.classroomName }}
              </p>
              <p class="text-xs text-ink-muted mt-1">Scannez le QR affiché en salle</p>
            </div>
            <AppBadge variant="success">Ouverte</AppBadge>
          </div>
          <RouterLink to="/presence/check-in">
            <AppButton size="sm">
              Scanner / pointer
              <ArrowRight class="w-4 h-4" />
            </AppButton>
          </RouterLink>
        </div>

        <div
          v-for="{ course, tunnel } in sharedPresence"
          :key="tunnel.id"
          class="p-4 border border-line bg-paper-warm space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-ink flex items-center gap-2">
                <Radio class="w-4 h-4 text-accent" />
                Présence · {{ course.name }}
              </p>
              <p class="text-xs text-ink-muted mt-1">WiFi « {{ tunnel.wifiLabel }} »</p>
            </div>
            <AppBadge variant="brand">En cours</AppBadge>
          </div>
          <div class="flex items-center gap-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-ink-faint mb-1">Code</p>
              <p class="font-mono text-xl sm:text-2xl font-bold text-accent tracking-widest break-all">{{ tunnel.code }}</p>
            </div>
          </div>
          <AppButton size="sm" @click="openSharedPresence(tunnel.shareCode)">
            Pointer ma présence
            <ArrowRight class="w-4 h-4" />
          </AppButton>
        </div>

        <div
          v-for="evaluation in codeProtectedEvaluations"
          :key="`code-${evaluation.id}`"
          class="p-4 border border-line bg-white space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-ink">{{ evaluation.title }}</p>
              <p class="text-xs text-ink-muted mt-1">Accès par code requis</p>
            </div>
            <AppBadge variant="warning">Code requis</AppBadge>
          </div>
          <p class="text-xs text-ink-muted">
            Saisissez le code <span class="font-mono font-semibold text-accent">{{ evaluation.code }}</span> dans le champ ci-dessous.
          </p>
        </div>

        <div
          v-for="evaluation in sharedEvaluations"
          :key="evaluation.id"
          class="p-4 border border-line bg-accent-light/40 space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-ink">{{ evaluation.title }}</p>
              <p class="text-xs text-ink-muted mt-1">
                {{ EVALUATION_TYPE_LABELS[evaluation.type] }} · {{ formatMinutes(evaluation.durationMinutes) }}
              </p>
            </div>
            <AppBadge variant="success">Évaluation</AppBadge>
          </div>
          <AppButton size="sm" @click="startEvaluation(evaluation)">
            Commencer l'évaluation
            <ArrowRight class="w-4 h-4" />
          </AppButton>
        </div>

        <div
          v-for="course in sharedClassLinks"
          :key="course.id"
          class="p-4 border border-line bg-white space-y-2"
        >
          <p class="text-sm font-medium text-ink flex items-center gap-2">
            <Share2 class="w-4 h-4 text-accent" />
            Lien classe · {{ course.name }}
          </p>
          <p class="text-xs uppercase tracking-wide text-ink-faint">Code classe</p>
          <p class="font-mono text-lg sm:text-xl font-bold text-accent tracking-widest break-all">{{ course.enrollmentCode }}</p>
        </div>
      </div>
      </AppCard>
    </DashboardSection>

    <DashboardSection>
      <AppCard v-if="myCourses.length > 0" v-reveal="120" title="Ma classe" hover>
        <div class="card-inset-list">
          <div
            v-for="course in myCourses"
            :key="course.id"
            class="card-inset-list__item flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
          <div>
            <p class="font-medium text-ink">{{ course.name }}</p>
            <p class="text-xs text-ink-muted">{{ course.subject }} · Prof. {{ course.teacherName }}</p>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <AppBadge v-if="isPresentToday(course.id)" variant="success">
              <UserCheck class="w-3 h-3 inline mr-1" />
              Présent
            </AppBadge>
            <AppBadge v-else-if="isTunnelOpen(course.id)" variant="brand">
              <Radio class="w-3 h-3 inline mr-1" />
              Présence ouverte
            </AppBadge>
            <RouterLink v-if="!isPresentToday(course.id) && isTunnelOpen(course.id)" to="/join/tunnel">
              <AppButton variant="outline" size="sm">Pointer présence</AppButton>
            </RouterLink>
          </div>
        </div>
      </div>
      <p class="text-xs text-ink-faint mt-4 pt-1">
        Pas encore inscrit ?
        <RouterLink to="/join/group" class="text-accent hover:text-accent-hover font-medium">Rejoindre avec le lien classe</RouterLink>
      </p>
      </AppCard>

      <AppCard v-else v-reveal="120" title="Ma classe" hover>
        <div class="text-center py-8 px-2">
          <Users class="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p class="text-sm text-ink-muted mb-4">Rejoignez la salle de votre enseignant avec le lien partagé.</p>
          <RouterLink to="/join/group">
            <AppButton variant="outline" size="sm">Rejoindre ma classe</AppButton>
          </RouterLink>
        </div>
      </AppCard>
    </DashboardSection>

    <DashboardSection>
      <AppCard v-reveal="130" title="Présence en salle" subtitle="Même réseau WiFi que l'enseignant" hover>
      <p class="text-sm text-ink-muted mb-4">
        Quand votre professeur partage la session à la salle, le code apparaît ci-dessus.
        Connectez-vous au WiFi de la salle puis pointez votre présence.
      </p>
      <RouterLink to="/join/tunnel">
        <AppButton variant="outline">
          <Radio class="w-4 h-4" />
          Pointer ma présence
        </AppButton>
      </RouterLink>
      </AppCard>
    </DashboardSection>

    <DashboardSection spacing="none">
      <div class="dashboard-two-col">
        <div class="dashboard-two-col__aside">
          <AppCard v-reveal="150" title="Accès par code privé" subtitle="Uniquement pour les évaluations verrouillées par le professeur" hover>
          <div class="space-y-4">
            <AppInput
              v-model="code"
              label="Code d'accès"
              placeholder="ABC123 ou EV4"
              hint="Requis seulement si votre professeur a activé l'accès par code"
              @keyup.enter="lookupCode"
            />
            <AppButton class="w-full" @click="lookupCode">Vérifier</AppButton>

            <div v-if="scheduleMessage" class="flex items-start gap-2 p-4 bg-warning-bg border border-warning/20 text-sm text-warning">
              <CalendarClock class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p class="font-medium">Évaluation pas encore ouverte</p>
                <p class="mt-1 text-warning/90">{{ scheduleMessage }}</p>
              </div>
            </div>

            <div v-if="error" class="flex items-start gap-2 p-3 bg-danger-bg border border-danger/15 text-sm text-danger">
              <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                {{ error }}
                <p v-if="error.includes('présents') || error.includes('réseau') || error.includes('présence')" class="mt-2 text-xs">
                  <RouterLink to="/join/tunnel" class="text-accent font-medium underline">Pointer ma présence en salle</RouterLink>
                </p>
              </div>
            </div>

            <div v-if="foundEvaluation && profile" class="p-4 bg-accent-light border border-accent/20 space-y-4 animate-scale-in">
              <div>
                <p class="font-medium text-ink">{{ foundEvaluation.title }}</p>
                <p class="text-xs text-ink-muted mt-1">
                  {{ EVALUATION_TYPE_LABELS[foundEvaluation.type] }} ·
                  {{ formatMinutes(foundEvaluation.durationMinutes) }}
                </p>
                <AppBadge v-if="foundEvaluation.presentOnly" variant="warning" class="mt-2">
                  Réservée aux présents
                </AppBadge>
              </div>

              <div class="p-3 bg-white border border-line text-sm space-y-2">
                <p class="text-xs text-ink-muted uppercase tracking-wide">Votre identité (profil)</p>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <span class="text-ink-faint text-xs">Nom</span>
                    <p class="font-medium">{{ profile.lastName }}</p>
                  </div>
                  <div>
                    <span class="text-ink-faint text-xs">Prénom</span>
                    <p class="font-medium">{{ profile.firstName }}</p>
                  </div>
                  <div class="col-span-2">
                    <span class="text-ink-faint text-xs">N° étudiant</span>
                    <p class="font-medium font-mono">{{ profile.studentId }}</p>
                  </div>
                </div>
                <p class="text-xs text-ink-faint">Vérifiez vos informations puis validez pour commencer.</p>
              </div>

              <AppButton class="w-full" @click="joinEvaluation">
                Valider et commencer
                <ArrowRight class="w-4 h-4" />
              </AppButton>
            </div>
          </div>
          </AppCard>
        </div>

        <div class="dashboard-two-col__main">
          <AppCard v-reveal="200" title="Historique" :subtitle="`${mySessions.length} session(s)`" hover>
            <AppShimmerList v-if="catalogShimmer" variant="row" :count="4" />
            <div v-else-if="mySessions.length === 0" class="text-center py-12 px-2">
              <ClipboardList class="w-10 h-10 text-ink-faint mx-auto mb-3" />
              <p class="text-sm text-ink-muted">Aucune évaluation passée pour le moment.</p>
            </div>

            <div v-else class="card-inset-list">
              <div
                v-for="session in mySessions"
                :key="session.id"
                class="card-inset-list__item card-inset-list__item--hover flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
              <div class="min-w-0 flex-1">
                <p class="font-medium text-ink truncate">
                  {{ evalStore.getById(session.evaluationId)?.title ?? session.evaluationCode }}
                </p>
                <p class="text-xs text-ink-faint mt-0.5">
                  {{ session.submittedAt ? formatDate(session.submittedAt) : formatDate(session.startedAt) }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-shrink-0">
                <span v-if="session.score !== undefined" class="text-sm font-medium tabular-nums text-ink">
                  {{ session.score }}/{{ session.maxScore }}
                </span>
                <AppBadge :variant="statusVariant(session.status)">
                  {{ statusLabel(session.status) }}
                </AppBadge>
                <RouterLink
                  v-if="canResumeSession(session)"
                  :to="sessionResumeLink(session)"
                  class="inline-flex items-center min-h-11 px-2 text-xs text-accent hover:text-accent-hover font-medium"
                >
                  {{ session.status === 'pending' ? 'Commencer' : 'Reprendre' }}
                </RouterLink>
                <span
                  v-else-if="session.status === 'pending'"
                  class="text-xs text-ink-faint"
                >
                  Date limite dépassée
                </span>
                <RouterLink
                  v-else
                  :to="studentResultPath(session)"
                  class="inline-flex items-center min-h-11 px-2 text-xs text-accent hover:text-accent-hover font-medium"
                >
                  Détails
                </RouterLink>
                <button
                  v-if="hasPublishedCorrection(session)"
                  type="button"
                  class="inline-flex items-center gap-1 min-h-11 px-2 text-xs text-accent hover:text-accent-hover font-medium"
                  @click="downloadCorrectionForSession(session)"
                >
                  <Download class="w-3 h-3" />
                  Correction PDF
                </button>
              </div>
            </div>
            </div>
          </AppCard>
        </div>
      </div>
    </DashboardSection>
  </DashboardPage>
</template>
