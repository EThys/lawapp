<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import { useAuthStore } from '@/stores/auth'
import { isApiEnabled } from '@/config/features'
import { parseApiEvaluationId } from '@/utils/evaluationApiMapper'
import {
  isEvaluationOwnedByTeacher,
  isManualQuestion,
  isManualSubmissionAnswer,
} from '@/utils/evaluationApiMapper'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import AppShimmerDetail from '@/components/loading/AppShimmerDetail.vue'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import type { Question, QuestionGrade, SessionStatus } from '@/types'
import { SESSION_STATUS_LABELS, VIOLATION_TYPE_LABELS } from '@/types'
import { formatDate, formatDuration, resolveFileContent } from '@/utils/helpers'
import AppDocumentPreview from '@/components/ui/AppDocumentPreview.vue'
import { appToast } from '@/utils/toast'
import {
  getStudentAnswerText,
  isAnswerCorrect,
  getCorrectAnswerText,
} from '@/utils/evaluationReview'
import type { EvaluationSubmissionAnswerDetail } from '@/api/types'
import {
  ArrowLeft,
  ShieldAlert,
  Save,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  PenLine,
  ListChecks,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()
const auth = useAuthStore()

const sessionId = computed(() => {
  const fromParams = route.params.sessionId as string | undefined
  if (fromParams) return fromParams
  const evalId = route.params.evaluationId as string | undefined
  const subId = route.params.submissionId as string | undefined
  if (evalId && subId) return `sub-${evalId}-${subId}`
  return ''
})

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const teacherComment = ref('')
const gradeDraft = ref<Record<string, { points: string; comment: string }>>({})
const reviewTab = ref<'grade' | 'qcm' | 'all'>('grade')

const { showShimmer } = useServerShimmer(loading)

const session = computed(() => (sessionId.value ? store.getSession(sessionId.value) : undefined))

const evaluation = computed(() => {
  if (!session.value) return undefined
  return (
    store.getById(session.value.evaluationId) ??
    store.getByCode(session.value.evaluationCode) ??
    (session.value.apiEvaluationId != null
      ? store.evaluations.find(
          (e) => e.apiId === session.value!.apiEvaluationId || e.id === String(session.value!.apiEvaluationId),
        )
      : undefined)
  )
})

const canView = computed(() => {
  if (!auth.currentUser) return false
  if (!evaluation.value) return false
  return isEvaluationOwnedByTeacher(evaluation.value, auth.currentUser.id)
})

const isApiSubmission = computed(
  () => !!(session.value?.apiSubmissionId != null && session.value?.apiEvaluationId != null),
)

const apiAnswers = computed(() => session.value?.apiAnswers ?? [])

const manualAnswers = computed(() => apiAnswers.value.filter((a) => isManualSubmissionAnswer(a.kind)))
const autoAnswers = computed(() => apiAnswers.value.filter((a) => !isManualSubmissionAnswer(a.kind)))

const visibleApiAnswers = computed(() => {
  if (reviewTab.value === 'grade') return manualAnswers.value
  if (reviewTab.value === 'qcm') return autoAnswers.value
  return apiAnswers.value
})

function statusVariant(status: SessionStatus) {
  const map: Record<SessionStatus, 'brand' | 'success' | 'danger' | 'warning' | 'muted'> = {
    pending: 'warning',
    in_progress: 'brand',
    submitted: 'success',
    failed: 'danger',
    expired: 'warning',
  }
  return map[status]
}

function initGrades() {
  const s = session.value
  if (!s) return
  teacherComment.value = s.teacherComment ?? ''
  const next: Record<string, { points: string; comment: string }> = {}

  if (s.apiAnswers?.length) {
    for (const a of s.apiAnswers) {
      const qid = String(a.questionId)
      const existing = s.questionGrades?.find((g) => g.questionId === qid)
      const max = Number(a.questionPoint) || 0
      let defaultPts = existing?.pointsAwarded ?? a.score
      if (defaultPts == null) {
        if (a.optionCorrect === true) defaultPts = max
        else if (a.optionCorrect === false) defaultPts = 0
        else defaultPts = undefined
      }
      next[qid] = {
        points: defaultPts == null ? '' : String(defaultPts),
        comment: existing?.comment ?? a.feedback ?? '',
      }
    }
  } else if (evaluation.value) {
    for (const q of evaluation.value.questions) {
      const existing = s.questionGrades?.find((g) => g.questionId === q.id)
      const auto = isAnswerCorrect(q, s.answers.find((a) => a.questionId === q.id))
      let defaultPts = existing?.pointsAwarded
      if (defaultPts == null) {
        if (auto === true) defaultPts = q.points
        else if (auto === false) defaultPts = 0
        else defaultPts = undefined
      }
      next[q.id] = {
        points: defaultPts == null ? '' : String(defaultPts),
        comment: existing?.comment ?? '',
      }
    }
  }
  gradeDraft.value = next
}

async function loadPage() {
  loading.value = true
  loadError.value = ''
  try {
    if (!sessionId.value) {
      loadError.value = 'Identifiant de soumission manquant.'
      return
    }
    if (isApiEnabled()) {
      await store.resolveSessionFromRoute(sessionId.value)
    }
    const s = store.getSession(sessionId.value)
    if (!s) {
      loadError.value =
        'Soumission introuvable. Ouvrez-la depuis la fiche évaluation (liste des soumissions API).'
      return
    }
    if (!evaluation.value) {
      const apiId =
        s.apiEvaluationId ??
        parseApiEvaluationId(s.evaluationId) ??
        parseApiEvaluationId(s.evaluationCode)
      if (apiId != null && isApiEnabled()) {
        await store.fetchEvaluationById(apiId)
      }
    }
    initGrades()
    if (manualAnswers.value.length) reviewTab.value = 'grade'
    else if (autoAnswers.value.length) reviewTab.value = 'qcm'
  } catch {
    loadError.value = 'Impossible de charger la soumission.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadPage()
})

watch(sessionId, () => {
  void loadPage()
})

watch([session, evaluation], () => initGrades())

function answerVerdict(q: Question) {
  const ans = session.value?.answers.find((a) => a.questionId === q.id)
  return isAnswerCorrect(q, ans)
}

function apiAnswerVerdict(a: EvaluationSubmissionAnswerDetail) {
  if (a.optionCorrect === true) return true
  if (a.optionCorrect === false) return false
  if (a.score != null && a.questionPoint != null) {
    if (a.score >= a.questionPoint) return true
    if (a.score <= 0) return false
  }
  return null
}

function questionById(id: string) {
  return evaluation.value?.questions.find((q) => q.id === id)
}

function answerDocumentContent(a: EvaluationSubmissionAnswerDetail): string | null {
  if (a.fileContent?.trim() && resolveFileContent(a.fileContent)) return a.fileContent.trim()
  if (a.textResponse?.trim() && resolveFileContent(a.textResponse)) return a.textResponse.trim()
  const local = session.value?.answers.find((x) => x.questionId === String(a.questionId))
  if (local?.fileName && typeof local.value === 'string' && resolveFileContent(local.value)) {
    return local.value
  }
  return null
}

function answerDocumentFilename(a: EvaluationSubmissionAnswerDetail): string {
  const local = session.value?.answers.find((x) => x.questionId === String(a.questionId))
  if (local?.fileName) return local.fileName
  return `depot-etudiant-${a.questionId}.pdf`
}

function isDocumentLikeAnswer(a: EvaluationSubmissionAnswerDetail): boolean {
  if (answerDocumentContent(a)) return true
  const k = (a.kind ?? '').toLowerCase()
  if (k.includes('document') || k.includes('depot') || k.includes('fichier')) return true
  return questionById(String(a.questionId))?.type === 'document'
}

function promptForAnswer(a: EvaluationSubmissionAnswerDetail) {
  const q = questionById(String(a.questionId))
  return {
    title: a.promptTitle || q?.promptTitle,
    file: a.promptFileContent || q?.promptFileContent,
    subItems: q?.subItems,
  }
}

function localAnswerDocumentContent(questionId: string): string | null {
  const ans = session.value?.answers.find((x) => x.questionId === questionId)
  if (ans?.fileName && typeof ans.value === 'string' && resolveFileContent(ans.value)) return ans.value
  if (typeof ans?.value === 'string' && resolveFileContent(ans.value)) return ans.value
  return null
}

function localAnswerDocumentFilename(questionId: string): string {
  const ans = session.value?.answers.find((x) => x.questionId === questionId)
  return ans?.fileName ?? `depot-etudiant-${questionId}.pdf`
}

function studentAnswerDisplay(a: EvaluationSubmissionAnswerDetail) {
  if (answerDocumentContent(a)) return '—'
  if (a.selectedOptionText) return a.selectedOptionText
  if (a.textResponse) return a.textResponse
  if (a.selectedOptionId != null) return `Option #${a.selectedOptionId}`
  return '—'
}

function kindLabel(kind?: string) {
  const k = (kind ?? '').toLowerCase()
  if (k.includes('ouvert')) return 'Question ouverte'
  if (k.includes('case') || k.includes('pratique')) return 'Cas pratique'
  if (k.includes('option') || k.includes('qcm')) return 'QCM'
  return kind || 'Question'
}

function buildApiGrades() {
  if (manualAnswers.value.length) {
    return manualAnswers.value.map((a) => {
      const draft = gradeDraft.value[String(a.questionId)]
      const max = Number(a.questionPoint) || 0
      const pts = Math.max(0, Math.min(max || Number.MAX_SAFE_INTEGER, Number(draft?.points) || 0))
      return {
        questionId: a.questionId,
        score: pts,
        feedback: draft?.comment?.trim() || undefined,
      }
    })
  }

  const ev = evaluation.value
  if (!ev) return []
  return ev.questions
    .filter((q) => isManualQuestion(q) && /^\d+$/.test(q.id))
    .map((q) => {
      const draft = gradeDraft.value[q.id]
      const pts = Math.max(0, Math.min(q.points, Number(draft?.points) || 0))
      return {
        questionId: Number(q.id),
        score: pts,
        feedback: draft?.comment?.trim() || undefined,
      }
    })
}

async function saveCorrection() {
  const s = session.value
  if (!s) return

  saving.value = true
  try {
    if (isApiEnabled()) {
      const grades = buildApiGrades()
      if (!grades.length) {
        appToast.error('Aucune question ouverte ou cas pratique à noter.')
        return
      }
      const result = await store.gradeSubmissionOnApi(s, grades)
      if (!result.ok) {
        appToast.error(result.error)
        return
      }
      appToast.success('Notes enregistrées.')
      initGrades()
      return
    }

    const ev = evaluation.value
    if (!ev) {
      appToast.error('Évaluation introuvable pour la correction locale.')
      return
    }

    const grades: QuestionGrade[] = ev.questions.map((q) => {
      const draft = gradeDraft.value[q.id]
      const pts = Math.max(0, Math.min(q.points, Number(draft?.points) || 0))
      return {
        questionId: q.id,
        pointsAwarded: pts,
        comment: draft?.comment?.trim() || undefined,
      }
    })

    const score = grades.reduce((sum, g) => sum + g.pointsAwarded, 0)
    const maxScore = ev.questions.reduce((sum, q) => sum + q.points, 0)

    store.updateSession(s.id, {
      questionGrades: grades,
      teacherComment: teacherComment.value.trim() || undefined,
      score,
      maxScore,
      gradedAt: new Date().toISOString(),
      status: s.status === 'pending' || s.status === 'in_progress' ? 'submitted' : s.status,
    })

    appToast.success('Correction enregistrée localement.')
  } finally {
    saving.value = false
  }
}

const studentName = computed(() =>
  session.value
    ? `${session.value.studentLastName} ${session.value.studentFirstName}`.trim() ||
      session.value.studentEmail ||
      'Étudiant'
    : '',
)

const evalLink = computed(() => {
  if (!evaluation.value) return '/teacher/history'
  return `/teacher/evaluation/${evaluation.value.apiId ?? evaluation.value.id}`
})

const liveManualTotal = computed(() =>
  manualAnswers.value.reduce((sum, a) => {
    const draft = gradeDraft.value[String(a.questionId)]
    return sum + (Number(draft?.points) || 0)
  }, 0),
)
</script>

<template>
  <DashboardPage>
    <RouterLink
      to="/teacher/history?tab=submitted"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour au suivi
    </RouterLink>

    <AppShimmerDetail v-if="showShimmer" />

    <div v-else-if="!session" class="p-6 border border-line bg-white text-sm text-ink-muted">
      {{ loadError || 'Session introuvable.' }}
      <div class="mt-4">
        <AppButton variant="outline" @click="router.push('/teacher/history')">Historique</AppButton>
      </div>
    </div>

    <template v-else-if="!canView">
      <div class="p-6 border border-line bg-white text-sm text-ink-muted">Accès refusé.</div>
    </template>

    <template v-else>
      <header class="sd-hero">
        <div class="min-w-0">
          <p class="label-caps mb-2">Correction</p>
          <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight">
            {{ studentName }}
          </h1>
          <p class="mt-1 text-sm text-ink-muted">
            {{ evaluation?.title || 'Évaluation' }}
            <template v-if="session.studentId"> · {{ session.studentId }}</template>
          </p>
          <div class="flex flex-wrap gap-2 pt-3">
            <AppBadge :variant="statusVariant(session.status)">
              {{ SESSION_STATUS_LABELS[session.status] }}
            </AppBadge>
            <AppBadge v-if="session.score !== undefined" variant="brand">
              {{ session.score }}<template v-if="session.maxScore != null">/{{ session.maxScore }}</template>
              pts
            </AppBadge>
            <AppBadge v-if="session.scoreQcm != null" variant="muted">QCM {{ session.scoreQcm }}</AppBadge>
            <AppBadge v-if="session.gradedAt" variant="success">Corrigé</AppBadge>
          </div>
        </div>
        <div class="sd-hero__score">
          <p class="sa-rate__caption">Total ouvert</p>
          <p class="sd-hero__number">{{ liveManualTotal }}</p>
          <p class="text-xs text-ink-faint">{{ manualAnswers.length }} à noter</p>
        </div>
      </header>

      <div
        v-if="loadError"
        class="flex items-start gap-2.5 p-4 border border-danger/20 bg-danger-bg text-sm text-danger mb-6"
      >
        <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>{{ loadError }}</p>
      </div>

      <div class="sd-stats">
        <div class="sd-stat">
          <p class="sd-stat__value">{{ session.submittedAt ? formatDate(session.submittedAt) : '—' }}</p>
          <p class="sd-stat__label">Soumis le</p>
        </div>
        <div class="sd-stat">
          <p class="sd-stat__value tabular-nums">
            {{ session.timeSpentSeconds > 0 ? formatDuration(session.timeSpentSeconds) : '—' }}
          </p>
          <p class="sd-stat__label">Temps passé</p>
        </div>
        <div class="sd-stat">
          <p class="sd-stat__value">{{ autoAnswers.length || session.answers.length }}</p>
          <p class="sd-stat__label">QCM / auto</p>
        </div>
        <div class="sd-stat">
          <p class="sd-stat__value">{{ manualAnswers.length }}</p>
          <p class="sd-stat__label">Ouvertes / cas</p>
        </div>
        <div class="sd-stat">
          <p class="sd-stat__value">{{ session.violations.length }}</p>
          <p class="sd-stat__label">Alertes</p>
        </div>
      </div>

      <AppDocumentPreview
        v-if="evaluation?.fileContent?.trim() && resolveFileContent(evaluation.fileContent)"
        :content="evaluation.fileContent"
        title="Document de référence (évaluation)"
        filename="annexe-evaluation.pdf"
        class="mb-6"
      />

      <AppCard v-if="session.violations.length" title="Violations anti-triche" :hover="false" class="mb-6">
        <ul class="space-y-2">
          <li
            v-for="(v, i) in session.violations"
            :key="i"
            class="p-3 border border-danger/20 bg-danger-bg text-sm"
          >
            <p class="font-medium text-danger flex items-center gap-1.5">
              <ShieldAlert class="w-4 h-4" />
              {{ VIOLATION_TYPE_LABELS[v.type] }}
            </p>
            <p class="text-xs text-danger/80 mt-0.5">{{ v.message }}</p>
            <p class="text-[11px] text-ink-faint mt-1">{{ formatDate(v.timestamp) }}</p>
          </li>
        </ul>
      </AppCard>

      <div v-if="apiAnswers.length" class="sd-tabs" role="tablist">
        <button
          type="button"
          class="sd-tab"
          :class="{ 'sd-tab--on': reviewTab === 'grade' }"
          @click="reviewTab = 'grade'"
        >
          <PenLine class="w-4 h-4" />
          À noter
          <span class="sd-tab__count">{{ manualAnswers.length }}</span>
        </button>
        <button
          type="button"
          class="sd-tab"
          :class="{ 'sd-tab--on': reviewTab === 'qcm' }"
          @click="reviewTab = 'qcm'"
        >
          <ListChecks class="w-4 h-4" />
          QCM auto
          <span class="sd-tab__count">{{ autoAnswers.length }}</span>
        </button>
        <button
          type="button"
          class="sd-tab"
          :class="{ 'sd-tab--on': reviewTab === 'all' }"
          @click="reviewTab = 'all'"
        >
          Tout
        </button>
      </div>

      <AppCard
        v-if="apiAnswers.length"
        :title="reviewTab === 'grade' ? 'Questions à noter' : reviewTab === 'qcm' ? 'QCM (corrigés automatiquement)' : 'Toutes les réponses'"
        :subtitle="
          reviewTab === 'grade'
            ? 'Questions ouvertes et cas pratiques à noter'
            : `${visibleApiAnswers.length} réponse(s)`
        "
        :hover="false"
      >
        <div v-if="visibleApiAnswers.length === 0" class="text-sm text-ink-muted py-6 text-center">
          Rien dans cet onglet.
        </div>
        <div v-else class="space-y-4">
          <article
            v-for="(answer, qi) in visibleApiAnswers"
            :key="answer.answerId ?? answer.questionId"
            class="sd-q"
            :class="{
              'sd-q--manual': isManualSubmissionAnswer(answer.kind),
              'sd-q--ok': apiAnswerVerdict(answer) === true,
              'sd-q--ko': apiAnswerVerdict(answer) === false,
            }"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-ink-faint mb-1">
                  {{ qi + 1 }}. {{ kindLabel(answer.kind) }}
                  <template v-if="answer.questionPoint != null"> · {{ answer.questionPoint }} pt(s)</template>
                </p>
                <p class="text-sm text-ink font-medium break-words">
                  {{ answer.questionTitle || `Question #${answer.questionId}` }}
                </p>
              </div>
              <CheckCircle2 v-if="apiAnswerVerdict(answer) === true" class="w-5 h-5 text-success flex-shrink-0" />
              <XCircle v-else-if="apiAnswerVerdict(answer) === false" class="w-5 h-5 text-danger flex-shrink-0" />
              <MinusCircle v-else class="w-5 h-5 text-ink-faint flex-shrink-0" />
            </div>

            <div
              v-if="promptForAnswer(answer).title || promptForAnswer(answer).subItems?.length || (promptForAnswer(answer).file && resolveFileContent(promptForAnswer(answer).file))"
              class="mb-3 p-3 border border-line bg-paper-warm/50 space-y-2"
            >
              <p class="text-[11px] uppercase tracking-wide text-ink-faint">Consigne / cas pratique</p>
              <p v-if="promptForAnswer(answer).title" class="text-sm text-ink">{{ promptForAnswer(answer).title }}</p>
              <AppDocumentPreview
                v-if="promptForAnswer(answer).file && resolveFileContent(promptForAnswer(answer).file)"
                :content="promptForAnswer(answer).file!"
                title="Consigne jointe"
                :filename="`consigne-${answer.questionId}.pdf`"
                compact
              />
              <ul v-if="promptForAnswer(answer).subItems?.length" class="space-y-2 list-none p-0">
                <li v-for="(sub, si) in promptForAnswer(answer).subItems" :key="si" class="space-y-2">
                  <p v-if="sub.title" class="text-sm text-ink">{{ sub.title }}</p>
                  <AppDocumentPreview
                    v-if="sub.fileContent?.trim() && resolveFileContent(sub.fileContent)"
                    :content="sub.fileContent"
                    :title="`Consigne ${si + 1}`"
                    :filename="`consigne-${answer.questionId}-${si + 1}.pdf`"
                    compact
                  />
                </li>
              </ul>
            </div>

            <AppDocumentPreview
              v-if="isDocumentLikeAnswer(answer) && answerDocumentContent(answer)"
              :content="answerDocumentContent(answer)!"
              title="Document déposé par l’étudiant"
              :filename="answerDocumentFilename(answer)"
              compact
              class="mb-3"
            />

            <div v-else class="sd-q__answer">
              <p class="text-[11px] uppercase tracking-wide text-ink-faint mb-1">Réponse de l’étudiant</p>
              <p class="text-sm text-ink break-words whitespace-pre-wrap">{{ studentAnswerDisplay(answer) }}</p>
            </div>

            <div
              v-if="isManualSubmissionAnswer(answer.kind) && gradeDraft[String(answer.questionId)]"
              class="grid sm:grid-cols-[8rem_1fr] gap-3 pt-1"
            >
              <AppInput
                v-model="gradeDraft[String(answer.questionId)].points"
                label="Points"
                type="number"
                :hint="answer.questionPoint != null ? `max ${answer.questionPoint}` : undefined"
              />
              <AppTextarea
                v-model="gradeDraft[String(answer.questionId)].comment"
                label="Feedback"
                placeholder="Commentaire pour l’étudiant"
                :rows="2"
              />
            </div>
            <p
              v-else-if="answer.score != null || answer.feedback"
              class="text-xs text-ink-muted"
            >
              Note auto : {{ answer.score ?? '—' }}
              <template v-if="answer.feedback"> · {{ answer.feedback }}</template>
            </p>
          </article>
        </div>
      </AppCard>

      <AppCard
        v-else-if="evaluation"
        title="Réponses & correction"
        :subtitle="`${session.answers.length}/${evaluation.questions.length} réponse(s)`"
        :hover="false"
      >
        <div v-if="session.answers.length === 0" class="text-sm text-ink-muted py-4">
          Aucune réponse enregistrée localement.
        </div>
        <div v-else class="space-y-4">
          <article
            v-for="(question, qi) in evaluation.questions"
            :key="question.id"
            class="sd-q"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-ink-faint mb-1">
                  Question {{ qi + 1 }} · {{ question.points }} pt(s) · {{ question.type }}
                </p>
                <p class="text-sm text-ink font-medium break-words">{{ question.text }}</p>
              </div>
              <CheckCircle2 v-if="answerVerdict(question) === true" class="w-5 h-5 text-success flex-shrink-0" />
              <XCircle v-else-if="answerVerdict(question) === false" class="w-5 h-5 text-danger flex-shrink-0" />
              <MinusCircle v-else class="w-5 h-5 text-ink-faint flex-shrink-0" />
            </div>
            <AppDocumentPreview
              v-if="question.type === 'document' && localAnswerDocumentContent(question.id)"
              :content="localAnswerDocumentContent(question.id)!"
              title="Document déposé par l’étudiant"
              :filename="localAnswerDocumentFilename(question.id)"
              compact
              class="mb-3"
            />
            <div v-else class="sd-q__answer">
              <p class="text-[11px] uppercase tracking-wide text-ink-faint mb-1">Réponse de l’étudiant</p>
              <p class="text-sm text-ink break-words">
                {{ getStudentAnswerText(question, session.answers.find((a) => a.questionId === question.id)) }}
              </p>
            </div>
            <p v-if="getCorrectAnswerText(question)" class="text-xs text-ink-faint">
              Attendu : {{ getCorrectAnswerText(question) }}
            </p>
            <div class="grid sm:grid-cols-[8rem_1fr] gap-3">
              <AppInput
                v-if="gradeDraft[question.id]"
                v-model="gradeDraft[question.id].points"
                label="Points"
                type="number"
                :hint="`max ${question.points}`"
              />
              <AppInput
                v-if="gradeDraft[question.id]"
                v-model="gradeDraft[question.id].comment"
                label="Commentaire"
                placeholder="Feedback"
              />
            </div>
          </article>
        </div>
      </AppCard>

      <AppCard v-if="!isApiSubmission" title="Commentaire global" :hover="false" class="mt-6">
        <AppTextarea
          v-model="teacherComment"
          label="Remarque pour l’étudiant (locale)"
          placeholder="Appréciation générale…"
          :rows="3"
        />
      </AppCard>

      <div class="sd-bar">
        <p class="text-xs text-ink-muted hidden sm:block">
          {{
            isApiEnabled()
              ? 'Seules les questions ouvertes et les cas pratiques sont notés ici'
              : 'Enregistrement local'
          }}
        </p>
        <div class="flex flex-wrap gap-2">
          <AppButton :disabled="saving" :loading="saving" @click="saveCorrection">
            <Save class="w-4 h-4" />
            Enregistrer les notes
          </AppButton>
          <RouterLink :to="evalLink">
            <AppButton variant="outline">Voir l’évaluation</AppButton>
          </RouterLink>
        </div>
      </div>
    </template>
  </DashboardPage>
</template>

<style scoped>
.sd-hero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--color-line);
  background: white;
}

@media (min-width: 700px) {
  .sd-hero {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.sd-hero__score {
  text-align: right;
  flex-shrink: 0;
}

.sd-hero__number {
  margin: 0.15rem 0;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--color-ink);
}

.sd-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

@media (min-width: 800px) {
  .sd-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.sd-stat {
  padding: 0.85rem;
  border: 1px solid var(--color-line);
  background: white;
}

.sd-stat__value {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-ink);
}

.sd-stat__label {
  margin: 0.2rem 0 0;
  font-size: 0.7rem;
  color: var(--color-ink-muted);
}

.sd-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.sd-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.35rem;
  padding: 0 0.85rem;
  border: 1px solid var(--color-line);
  background: white;
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  cursor: pointer;
}

.sd-tab--on {
  background: var(--color-brand-dark);
  border-color: var(--color-brand-dark);
  color: white;
}

.sd-tab__count {
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  opacity: 0.8;
}

.sd-q {
  padding: 1rem;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
}

.sd-q--manual {
  border-left: 3px solid var(--color-accent);
}

.sd-q--ok {
  border-left-color: var(--color-success);
}

.sd-q--ko:not(.sd-q--manual) {
  border-left-color: var(--color-danger);
}

.sd-q__answer {
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: white;
  border: 1px solid var(--color-line);
}

.sd-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding: 0.75rem 0;
  background: color-mix(in srgb, var(--color-paper) 88%, white);
  border-top: 1px solid var(--color-line);
}
</style>
