<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { useCourseStore } from '@/stores/courses'
import { useNotificationStore } from '@/stores/notifications'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppStatCard from '@/components/ui/AppStatCard.vue'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import { EVALUATION_TYPE_LABELS } from '@/types'
import { formatDate, getEvaluationAvailabilityMessage, isEvaluationAvailable, downloadDataUrl } from '@/utils/helpers'
import { Download } from '@lucide/vue'
import { getEvaluationAccessDeniedReason, getTodayDateString } from '@/utils/access'
import { ArrowRight, AlertCircle, ClipboardList, CalendarClock, BookOpen, Target, UserCheck, Users, Radio, Bell, Share2, History, ShieldAlert, UserX, CalendarCheck } from '@lucide/vue'
import type { Evaluation } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const evalStore = useEvaluationStore()
const courseStore = useCourseStore()
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

const sharedEvaluations = computed(() =>
  auth.currentUser ? evalStore.getSharedEvaluationsForStudent(auth.currentUser.id) : []
)

const sharedClassLinks = computed(() =>
  myCourses.value.filter((c) => c.enrollmentSharedAt)
)

const hasSharedContent = computed(
  () =>
    sharedPresence.value.length > 0 ||
    sharedEvaluations.value.length > 0 ||
    sharedClassLinks.value.length > 0
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

function lookupCode() {
  error.value = ''
  scheduleMessage.value = ''
  foundEvaluation.value = null

  if (!code.value.trim()) {
    error.value = 'Veuillez entrer un code.'
    return
  }

  const evaluation = evalStore.getByCode(code.value.trim())
  if (!evaluation) {
    error.value = 'Code invalide. Vérifiez auprès de votre enseignant.'
    return
  }
  if (evaluation.status === 'draft') {
    error.value = 'Cette évaluation n\'est pas encore publiée.'
    return
  }
  if (evaluation.status === 'closed') {
    error.value = 'Cette évaluation est fermée.'
    return
  }

  const availabilityMsg = getEvaluationAvailabilityMessage({
    availableFrom: evaluation.availableFrom ?? null,
    availableUntil: evaluation.availableUntil ?? null,
    title: evaluation.title,
  })
  if (availabilityMsg) {
    scheduleMessage.value = availabilityMsg
    return
  }

  if (!isEvaluationAvailable(evaluation)) {
    error.value = 'Cette évaluation n\'est pas accessible pour le moment.'
    return
  }

  if (auth.currentUser) {
    const accessDenied = getEvaluationAccessDeniedReason(evaluation, auth.currentUser.id, courseStore)
    if (accessDenied) {
      error.value = accessDenied
      return
    }
  }

  foundEvaluation.value = evaluation
}

function startSharedEvaluation(evaluation: Evaluation) {
  error.value = ''
  scheduleMessage.value = ''
  foundEvaluation.value = evaluation
  void joinEvaluation()
}

function openSharedPresence(shareCode: string) {
  router.push(`/join/presence/${shareCode}`)
}

async function joinEvaluation() {
  if (!foundEvaluation.value) {
    error.value = 'Évaluation introuvable.'
    return
  }
  if (!auth.currentUser || !profile.value) {
    error.value = 'Connectez-vous pour commencer l\'évaluation.'
    return
  }

  error.value = ''
  const user = auth.currentUser
  const studentId = profile.value.studentId

  const accessDenied = getEvaluationAccessDeniedReason(foundEvaluation.value, user.id, courseStore)
  if (accessDenied) {
    error.value = accessDenied
    return
  }

  const attempts = evalStore.getStudentAttempts(foundEvaluation.value.id, studentId)
  if (attempts >= foundEvaluation.value.settings.maxAttempts) {
    error.value = `Nombre maximum de tentatives atteint (${foundEvaluation.value.settings.maxAttempts}).`
    return
  }

  const existing = evalStore.getActiveSessionForStudent(foundEvaluation.value.id, user.id)
  if (existing) {
    await router.push(evalStore.getExamEntryPath(existing))
    return
  }

  const session = evalStore.createSession({
    evaluation: foundEvaluation.value,
    studentUserId: user.id,
    studentFirstName: profile.value.firstName,
    studentLastName: profile.value.lastName,
    studentId,
  })

  await router.push(evalStore.getExamEntryPath(session))
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
  const paramCode = (route.query.code as string) || (route.params.code as string | undefined)
  if (paramCode) {
    code.value = paramCode.toUpperCase()
    lookupCode()
  }
  presenceTimer = setInterval(() => {
    presenceTick.value++
  }, 1000)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutsideNotifications)
  if (presenceTimer) clearInterval(presenceTimer)
})
</script>

<template>
  <DashboardPage>
    <DashboardSection spacing="loose">
      <div v-reveal="100" class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        <div>
          <p class="label-caps mb-2">Espace étudiant</p>
          <h1 class="font-display text-3xl text-ink tracking-tight">
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
          class="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-80 bg-white border border-line shadow-lg z-20"
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

    <DashboardSection>
      <AppCard
        v-reveal="95"
        title="Mon historique"
        subtitle="Évaluations, alertes et présences"
        hover
      >
        <div class="dashboard-tiles dashboard-tiles--4 mb-5">
          <RouterLink
            to="/student/history?tab=passed"
            class="dashboard-tile hover:bg-accent-light/30"
          >
            <div class="dashboard-tile__label">
              <ClipboardList class="w-4 h-4 text-accent" />
              <p class="dashboard-tile__caption">Passées</p>
            </div>
            <p class="dashboard-tile__value">{{ stats.completed }}</p>
          </RouterLink>
          <RouterLink
            to="/student/history?tab=missed"
            class="dashboard-tile hover:bg-warning-bg/50"
          >
            <div class="dashboard-tile__label">
              <UserX class="w-4 h-4 text-warning" />
              <p class="dashboard-tile__caption">Manquées</p>
            </div>
            <p class="dashboard-tile__value">{{ stats.missed }}</p>
          </RouterLink>
          <RouterLink
            to="/student/history?tab=alerts"
            class="dashboard-tile hover:bg-danger-bg/40"
          >
            <div class="dashboard-tile__label">
              <ShieldAlert class="w-4 h-4 text-danger" />
              <p class="dashboard-tile__caption">Alertes</p>
            </div>
            <p class="dashboard-tile__value">{{ stats.alerts }}</p>
          </RouterLink>
          <RouterLink
            to="/student/attendance"
            class="dashboard-tile hover:bg-paper"
          >
            <div class="dashboard-tile__label">
              <CalendarCheck class="w-4 h-4 text-ink-muted" />
              <p class="dashboard-tile__caption">Présences</p>
            </div>
            <p class="dashboard-tile__value">{{ stats.presences }}</p>
          </RouterLink>
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
              <p class="font-mono text-2xl font-bold text-accent tracking-widest">{{ tunnel.code }}</p>
            </div>
          </div>
          <AppButton size="sm" @click="openSharedPresence(tunnel.shareCode)">
            Pointer ma présence
            <ArrowRight class="w-4 h-4" />
          </AppButton>
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
                {{ EVALUATION_TYPE_LABELS[evaluation.type] }} · {{ evaluation.durationMinutes }} min
              </p>
            </div>
            <AppBadge variant="success">Évaluation</AppBadge>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-faint mb-1">Code d'accès</p>
            <p class="font-mono text-2xl font-bold text-accent tracking-widest">{{ evaluation.code }}</p>
          </div>
          <AppButton size="sm" @click="startSharedEvaluation(evaluation)">
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
          <p class="font-mono text-xl font-bold text-accent tracking-widest">{{ course.enrollmentCode }}</p>
        </div>
      </div>
      </AppCard>
    </DashboardSection>

    <DashboardSection spacing="loose">
      <div v-reveal class="dashboard-stats">
      <AppStatCard :value="stats.total" label="Sessions" :icon="BookOpen" :delay="0" />
      <AppStatCard :value="stats.completed" label="Terminées" :icon="ClipboardList" :delay="1" />
      <AppStatCard :value="stats.average ?? 0" :label="stats.average !== null ? 'Moyenne' : 'Moyenne (n/a)'" suffix="%" :icon="Target" :delay="2" />
      </div>
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
          <AppCard v-reveal="150" title="Rejoindre une évaluation" hover>
          <div class="space-y-4">
            <AppInput
              v-model="code"
              label="Code d'accès"
              placeholder="ABC123"
              hint="Code à 6 caractères fourni par l'enseignant"
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
                  {{ foundEvaluation.durationMinutes }} min
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
            <div v-if="mySessions.length === 0" class="text-center py-12 px-2">
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
                  v-if="session.status === 'pending' || session.status === 'in_progress'"
                  :to="sessionResumeLink(session)"
                  class="inline-flex items-center min-h-11 px-2 text-xs text-accent hover:text-accent-hover font-medium"
                >
                  {{ session.status === 'pending' ? 'Commencer' : 'Reprendre' }}
                </RouterLink>
                <RouterLink
                  v-else
                  :to="`/exam/${session.id}/result`"
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
