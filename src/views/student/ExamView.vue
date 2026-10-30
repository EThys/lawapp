<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import { isApiEnabled } from '@/config/features'
import { parseApiEvaluationId } from '@/utils/evaluationApiMapper'
import { useAntiCheat } from '@/composables/useAntiCheat'
import { useTimer } from '@/composables/useTimer'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { Question, StudentAnswer, Violation } from '@/types'
import { shuffleArray, calculateScore, readFileAsDataUrl } from '@/utils/helpers'
import { appToast } from '@/utils/toast'
import { isAnswerCorrect, getCorrectAnswerText, getStudentAnswerText } from '@/utils/evaluationReview'
import {
  Clock,
  Shield,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Maximize,
  CheckCircle,
  XCircle,
  CircleHelp,
  ListChecks,
  X,
  Home,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()

const sessionId = route.params.sessionId as string
const session = computed(() => store.getSession(sessionId))
const evaluation = computed(() => {
  if (!session.value) return undefined
  const s = session.value
  return (
    store.getById(s.evaluationId) ??
    store.getByCode(s.evaluationCode) ??
    store.evaluations.find(
      (e) =>
        e.id === s.evaluationId ||
        e.code === s.evaluationCode ||
        (s.apiEvaluationId != null && e.apiId === s.apiEvaluationId) ||
        (e.apiId != null && String(e.apiId) === s.evaluationId),
    )
  )
})

function resolveExamApiId(): number | null {
  const ev = evaluation.value
  const s = session.value
  if (!ev && !s) return null
  return (
    ev?.apiId ??
    s?.apiEvaluationId ??
    (ev ? parseApiEvaluationId(ev.id) : null) ??
    (ev ? parseApiEvaluationId(ev.code) : null) ??
    parseApiEvaluationId(s?.evaluationId ?? '') ??
    parseApiEvaluationId(s?.evaluationCode ?? '')
  )
}

const currentIndex = ref(0)
const answers = ref<StudentAnswer[]>([])
const violations = ref<Violation[]>([])
const showWarning = ref(false)
const warningMessage = ref('')
const isSubmitting = ref(false)
const examEnded = ref(false)
const submitError = ref('')
const startTime = ref(Date.now())
const orderedQuestions = shallowRef<Question[]>([])
const showSubmitModal = ref(false)
const showReviewPanel = ref(false)
const timeUpOverlay = ref(false)

const inputsLocked = computed(() => examEnded.value || isSubmitting.value || timeUpOverlay.value)

const totalQuestions = computed(() => orderedQuestions.value.length)
const currentQuestion = computed(() => orderedQuestions.value[currentIndex.value])
const answeredCount = computed(() => answers.value.length)
const unansweredCount = computed(() => totalQuestions.value - answeredCount.value)

const instantFeedbackEnabled = computed(
  () =>
    evaluation.value?.settings.correctionMode === 'auto' &&
    (evaluation.value?.settings.instantFeedback ?? true)
)

/** Autorisé uniquement pendant la sélection d’un fichier (import document). */
const documentImportActive = ref(false)

const allowReview = computed(() => evaluation.value?.settings.allowReview ?? false)

const currentAnswer = computed(() =>
  currentQuestion.value ? getAnswer(currentQuestion.value.id) : undefined
)

const currentFeedback = computed(() => {
  if (!instantFeedbackEnabled.value || !currentQuestion.value || !currentAnswer.value) return null
  const q = currentQuestion.value
  if (q.type !== 'qcm' && q.type !== 'truefalse') return null
  const correct = isAnswerCorrect(q, currentAnswer.value)
  if (correct === null) return null
  return {
    isCorrect: correct,
    correctText: correct ? null : getCorrectAnswerText(q),
  }
})

const QUESTION_TYPE_LABELS: Record<string, string> = {
  qcm: 'QCM',
  truefalse: 'Vrai / Faux',
  short: 'Réponse courte',
  document: 'Dépôt document',
}

function getAnswer(questionId: string): StudentAnswer | undefined {
  return answers.value.find((a) => a.questionId === questionId)
}

const uploadError = ref('')
const showQuestionNav = ref(false)

const timerRef = shallowRef<ReturnType<typeof useTimer> | null>(null)
const antiCheatRef = shallowRef<ReturnType<typeof useAntiCheat> | null>(null)

const timerFormatted = computed(() => timerRef.value?.formattedTime.value ?? '00:00')
const timerUrgency = computed(() => timerRef.value?.urgency.value ?? 'normal')
const timerProgress = computed(() => timerRef.value?.progress.value ?? 100)
const requireFullscreen = computed(() => evaluation.value?.antiCheat.requireFullscreen ?? false)
const isFullscreen = computed(() => antiCheatRef.value?.isFullscreen.value ?? false)
const fullscreenSupported = computed(() => antiCheatRef.value?.fullscreenSupported ?? false)
const mustEnterFullscreen = computed(
  () =>
    requireFullscreen.value &&
    fullscreenSupported.value &&
    !isFullscreen.value &&
    !examEnded.value &&
    !documentImportActive.value,
)

function setAnswer(questionId: string, value: string | boolean, fileName?: string) {
  const existing = answers.value.findIndex((a) => a.questionId === questionId)
  const entry: StudentAnswer = { questionId, value, ...(fileName ? { fileName } : {}) }
  if (existing >= 0) {
    answers.value[existing] = entry
  } else {
    answers.value.push(entry)
  }
  store.updateSession(sessionId, { answers: [...answers.value] })
}

function getDotStatus(q: Question, index: number) {
  if (index === currentIndex.value) return 'current'
  const answer = getAnswer(q.id)
  if (!answer) return 'unanswered'
  if (instantFeedbackEnabled.value && (q.type === 'qcm' || q.type === 'truefalse')) {
    const correct = isAnswerCorrect(q, answer)
    if (correct === true) return 'correct'
    if (correct === false) return 'incorrect'
  }
  return 'answered'
}

function getQcmOptionClass(optionId: string) {
  const q = currentQuestion.value
  if (!q || q.type !== 'qcm') return 'border-line bg-white hover:border-line-strong'
  const answer = getAnswer(q.id)
  const selected = answer?.value === optionId
  if (!selected) return 'border-line bg-white hover:border-line-strong'

  if (!instantFeedbackEnabled.value) {
    return 'border-accent bg-accent-light ring-1 ring-accent/30 text-ink'
  }

  const correctOption = q.options?.find((o) => o.isCorrect)
  if (!correctOption) {
    return 'border-accent bg-accent-light ring-1 ring-accent/30 text-ink'
  }

  const isThisCorrect = optionId === correctOption.id
  return isThisCorrect
    ? 'border-success bg-success-bg ring-1 ring-success/30 text-success font-medium'
    : 'border-danger bg-danger-bg ring-1 ring-danger/30 text-danger font-medium'
}

function getTrueFalseClass(value: boolean) {
  const q = currentQuestion.value
  if (!q || q.type !== 'truefalse') return ''
  const selected = getAnswer(q.id)?.value === value
  if (!selected) return 'border-line bg-white hover:border-line-strong'

  if (!instantFeedbackEnabled.value) {
    return 'border-accent bg-accent-light text-accent'
  }

  const correct = isAnswerCorrect(q, getAnswer(q.id))
  return correct
    ? 'border-success bg-success-bg text-success'
    : 'border-danger bg-danger-bg text-danger'
}

async function beginDocumentImport() {
  documentImportActive.value = true
  if (requireFullscreen.value && document.fullscreenElement) {
    try {
      await document.exitFullscreen()
    } catch {
      /* navigateur refuse parfois ; la sélection reste possible */
    }
  }
}

async function endDocumentImport() {
  documentImportActive.value = false
  if (requireFullscreen.value) {
    await antiCheatRef.value?.enterFullscreen()
  }
}

async function handleDocumentUpload(questionId: string, event: Event) {
  uploadError.value = ''
  const input = event.target as HTMLInputElement
  try {
    const file = input.files?.[0]
    if (!file) return
    const { dataUrl, fileName } = await readFileAsDataUrl(file)
    setAnswer(questionId, dataUrl, fileName)
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : 'Erreur lors du dépôt.'
  } finally {
    await endDocumentImport()
  }
}

async function handleDocumentImportCancel() {
  await endDocumentImport()
}

function failExam(reason: string) {
  if (examEnded.value) return
  examEnded.value = true
  antiCheatRef.value?.stop()
  timerRef.value?.stop()

  store.updateSession(sessionId, {
    status: 'failed',
    submittedAt: new Date().toISOString(),
    violations: [...violations.value],
    timeSpentSeconds: Math.floor((Date.now() - startTime.value) / 1000),
    answers: [...answers.value],
  })

  router.replace(`/exam/${sessionId}/result?reason=${encodeURIComponent(reason)}`)
}

function handleTimerExpired() {
  if (examEnded.value || isSubmitting.value) return
  timeUpOverlay.value = true
  examEnded.value = true
  antiCheatRef.value?.stop()
  timerRef.value?.stop()
  appToast.success('Temps écoulé', {
    description:
      'Merci pour votre participation. Vos réponses sont enregistrées et l’épreuve va se fermer automatiquement.',
    duration: 10000,
  })
  submitExam('expired')
}

function leaveAfterTimeUp() {
  timeUpOverlay.value = false
  const s = store.getSession(sessionId)
  if (s && (s.status === 'submitted' || s.status === 'expired')) {
    void router.replace(`/exam/${sessionId}/result`)
    return
  }
  void router.replace('/student')
}

function submitExam(status: 'submitted' | 'expired' = 'submitted') {
  if (isSubmitting.value) return
  if (examEnded.value && status !== 'expired') return
  isSubmitting.value = true
  showSubmitModal.value = false
  showReviewPanel.value = false

  const eval_ = evaluation.value
  if (!eval_) {
    isSubmitting.value = false
    if (status === 'expired') {
      examEnded.value = true
      timeUpOverlay.value = true
      submitError.value = 'Évaluation introuvable. Vous pouvez retourner à votre espace.'
    } else {
      submitError.value = 'Évaluation introuvable. Rejoignez l’épreuve depuis votre espace.'
    }
    return
  }

  const { score, maxScore } = calculateScore(eval_.questions, answers.value)

  void (async () => {
    // Mode API : toujours POST …/reponses (même après expiration du chrono).
    if (isApiEnabled()) {
      const apiId = resolveExamApiId()
      if (apiId == null) {
        isSubmitting.value = false
        submitError.value =
          'Envoi impossible : identifiant d’évaluation manquant. Retournez à votre espace étudiant.'
        if (status === 'expired') {
          examEnded.value = true
          timeUpOverlay.value = true
        } else {
          examEnded.value = false
        }
        if (import.meta.env.DEV) {
          console.warn('[LawApp] submit skipped - no apiId', {
            evaluationId: eval_.id,
            code: eval_.code,
            apiId: eval_.apiId,
            sessionEvalId: session.value?.evaluationId,
          })
        }
        return
      }

      // Assure apiId sur l’objet passé au store.
      const forApi = eval_.apiId === apiId ? eval_ : { ...eval_, apiId, isFromApi: true as const }
      const spent = Math.floor((Date.now() - startTime.value) / 1000)
      const result = await store.submitAnswersToApi(forApi, answers.value, {
        timeSpentSeconds: spent,
        startedAt: session.value?.startedAt,
      })
      if (!result.ok) {
        isSubmitting.value = false
        submitError.value =
          result.error ||
          'Impossible d\'envoyer vos réponses. Réessayez ou retournez à votre espace.'
        if (status === 'expired') {
          examEnded.value = true
          timeUpOverlay.value = true
          // Conserve quand même la session locale pour le résultat.
          store.updateSession(sessionId, {
            status: 'expired',
            submittedAt: new Date().toISOString(),
            score,
            maxScore,
            violations: [...violations.value],
            timeSpentSeconds: spent,
            answers: [...answers.value],
            apiEvaluationId: apiId,
          })
        } else {
          examEnded.value = false
        }
        return
      }
      await store.loadMySubmission(result.apiId, sessionId, { force: true })
    } else if (import.meta.env.DEV) {
      console.warn('[LawApp] submit local only - VITE_USE_API=false')
    }

    examEnded.value = true
    submitError.value = ''
    antiCheatRef.value?.stop()
    timerRef.value?.stop()

    const afterApi = isApiEnabled() ? store.getSession(sessionId) : undefined
    store.updateSession(sessionId, {
      status: status === 'expired' ? 'expired' : 'submitted',
      submittedAt: new Date().toISOString(),
      score: afterApi?.score ?? score,
      maxScore: afterApi?.maxScore ?? maxScore,
      scoreQcm: afterApi?.scoreQcm ?? undefined,
      apiAnswers: afterApi?.apiAnswers,
      apiSubmissionId: afterApi?.apiSubmissionId,
      violations: [...violations.value],
      timeSpentSeconds: Math.floor((Date.now() - startTime.value) / 1000),
      answers: [...answers.value],
      apiEvaluationId: resolveExamApiId() ?? undefined,
    })

    timeUpOverlay.value = false
    await router.replace(`/exam/${sessionId}/result`)
  })()
}

function initExamRuntime() {
  if (!session.value || !evaluation.value) return

  const expiresMs = new Date(session.value.expiresAt).getTime()
  const startedMs = new Date(session.value.startedAt).getTime()
  if (expiresMs <= startedMs) {
    router.replace(`/exam/${sessionId}/intro`)
    return
  }

  orderedQuestions.value = evaluation.value.settings.shuffleQuestions
    ? shuffleArray(evaluation.value.questions)
    : [...evaluation.value.questions]

  answers.value = [...session.value.answers]
  violations.value = [...session.value.violations]
  startTime.value = Date.now()

  timerRef.value = useTimer(
    session.value.expiresAt,
    session.value.startedAt,
    () => handleTimerExpired(),
  )

  antiCheatRef.value = useAntiCheat(
    evaluation.value.antiCheat,
    {
      onViolation(v) {
        violations.value.push(v)
        store.updateSession(sessionId, { violations: [...violations.value] })
      },
      onFail(reason) {
        failExam(reason)
      },
      onWarning(msg) {
        warningMessage.value = msg
        showWarning.value = true
        setTimeout(() => (showWarning.value = false), 4000)
      },
    },
    { allowScreenLeave: documentImportActive },
  )

  timerRef.value.start()
  antiCheatRef.value.start()
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault()
  e.returnValue = ''
}

function openSubmitFlow() {
  if (allowReview.value) {
    showReviewPanel.value = true
  } else {
    showSubmitModal.value = true
  }
}

function confirmSubmit() {
  showSubmitModal.value = true
}

function goToQuestion(index: number) {
  currentIndex.value = index
  showReviewPanel.value = false
}

function enterFullscreen() {
  antiCheatRef.value?.enterFullscreen()
}

onMounted(() => {
  void (async () => {
    if (!session.value || !evaluation.value) {
      router.replace('/student')
      return
    }

    if (session.value.status === 'pending') {
      router.replace(`/exam/${sessionId}/intro`)
      return
    }

    if (session.value.status !== 'in_progress') {
      router.replace(`/exam/${sessionId}/result`)
      return
    }

    // Passage API : questions + anticheat / criteres actifs pour cette épreuve.
    if (isApiEnabled() && evaluation.value.apiId != null) {
      const passage = await store.loadPassageFromApi(evaluation.value.apiId)
      if (!passage?.questions.length) {
        submitError.value =
          store.apiError || 'Impossible de charger la feuille d\'évaluation (passage).'
        return
      }
    }

    initExamRuntime()
    window.addEventListener('beforeunload', handleBeforeUnload)
  })()
})

onUnmounted(() => {
  antiCheatRef.value?.stop()
  timerRef.value?.stop()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div v-if="evaluation && session" class="h-dvh min-h-dvh bg-paper flex flex-col overflow-hidden">
    <div
      v-if="mustEnterFullscreen"
      class="fixed inset-0 z-[60] bg-brand-dark flex flex-col items-center justify-center p-6 pt-safe pb-safe px-safe text-center text-white"
    >
      <Maximize class="w-10 h-10 text-accent mb-4" />
      <h2 class="font-display text-lg mb-2">Plein écran obligatoire</h2>
      <p class="text-sm text-white/75 max-w-sm mb-6">
        Cette épreuve se déroule en plein écran. Activez-le pour continuer.
      </p>
      <AppButton class="min-w-[12rem] w-full max-w-xs" @click="enterFullscreen">
        Activer le plein écran
      </AppButton>
    </div>

    <div
      v-if="requireFullscreen && !fullscreenSupported && !examEnded"
      class="flex-shrink-0 px-4 py-2.5 bg-warning-bg border-b border-warning/25 text-xs sm:text-sm text-warning text-center px-safe"
    >
      Sur mobile (iPhone/iPad), le plein écran navigateur n’est pas disponible : restez dans LawApp sans
      changer d’application pendant l’épreuve.
    </div>

    <header class="flex-shrink-0 z-30 bg-white border-b border-line shadow-sm pt-safe">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h1 class="text-sm font-semibold text-ink truncate">{{ evaluation.title }}</h1>
          <p class="text-xs text-ink-faint">
            {{ session.studentLastName }} {{ session.studentFirstName }}
            · {{ evaluation.subject }}
          </p>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div
            class="flex items-center gap-2 px-3 py-1.5 font-mono text-sm font-semibold border"
            :class="{
              'bg-paper-warm text-ink border-line': timerUrgency === 'normal',
              'bg-warning-bg text-warning border-warning/20': timerUrgency === 'warning',
              'bg-danger-bg text-danger border-danger/20 animate-pulse': timerUrgency === 'critical',
            }"
          >
            <Clock class="w-4 h-4" />
            {{ timerFormatted }}
          </div>

          <div
            class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-accent-light text-accent text-xs font-medium border border-accent/15"
            :title="`${violations.length} violation(s)`"
          >
            <Shield class="w-3.5 h-3.5" />
            <span class="tabular-nums">{{ violations.length }}</span>
            <span class="hidden sm:inline">violation(s)</span>
          </div>
        </div>
      </div>

      <div class="h-1 bg-line">
        <div
          class="h-full bg-accent transition-all duration-1000"
          :style="{ width: `${timerProgress}%` }"
        />
      </div>

      <div class="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between text-xs text-ink-faint border-t border-line/60">
        <span>{{ answeredCount }}/{{ totalQuestions }} répondues</span>
        <span>Question {{ currentIndex + 1 }} sur {{ totalQuestions }}</span>
      </div>
    </header>

    <Transition name="slide">
      <div
        v-if="showWarning"
        class="fixed top-20 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-danger text-white shadow-lg sm:max-w-md border border-danger/20"
      >
        <AlertTriangle class="w-5 h-5 flex-shrink-0" />
        <p class="text-sm font-medium">{{ warningMessage }}</p>
      </div>
    </Transition>

    <div
      v-if="submitError"
      class="flex-shrink-0 mx-4 mt-3 flex items-start gap-2.5 p-3 bg-danger-bg border border-danger/20 text-sm text-danger"
    >
      <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div class="min-w-0">
        <p>{{ submitError }}</p>
        <button type="button" class="mt-1 text-xs underline cursor-pointer" @click="submitError = ''">
          Fermer
        </button>
      </div>
    </div>

    <!-- Panneau révision -->
    <Transition name="fade">
      <div
        v-if="showReviewPanel"
        class="fixed inset-0 z-40 bg-ink/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="showReviewPanel = false"
      >
        <div class="bg-white w-full sm:max-w-lg max-h-[85dvh] flex flex-col border border-line shadow-xl pb-safe">
          <div class="flex items-center justify-between px-5 py-4 border-b border-line">
            <div class="flex items-center gap-2">
              <ListChecks class="w-5 h-5 text-accent" />
              <h2 class="font-medium text-ink">Revoir mes réponses</h2>
            </div>
            <button
              type="button"
              class="min-h-11 min-w-11 flex items-center justify-center text-ink-muted hover:text-ink"
              @click="showReviewPanel = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto divide-y divide-line">
            <button
              v-for="(q, i) in orderedQuestions"
              :key="q.id"
              type="button"
              class="w-full text-left px-5 py-4 hover:bg-paper-warm transition-colors"
              @click="goToQuestion(i)"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-medium text-ink">Question {{ i + 1 }}</p>
                <AppBadge :variant="getAnswer(q.id) ? 'success' : 'warning'">
                  {{ getAnswer(q.id) ? 'Répondu' : 'À faire' }}
                </AppBadge>
              </div>
              <p class="text-xs text-ink-muted mt-1 line-clamp-2">{{ q.text }}</p>
              <p v-if="getAnswer(q.id)" class="text-xs text-ink-faint mt-2">
                {{ getStudentAnswerText(q, getAnswer(q.id)) }}
              </p>
            </button>
          </div>
          <div class="px-5 py-4 border-t border-line space-y-2">
            <p v-if="unansweredCount > 0" class="text-xs text-warning">
              {{ unansweredCount }} question(s) sans réponse.
            </p>
            <AppButton class="w-full" @click="confirmSubmit">
              <Send class="w-4 h-4" />
              Soumettre définitivement
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modale de confirmation -->
    <Transition name="fade">
      <div
        v-if="showSubmitModal"
        class="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
        @click.self="showSubmitModal = false"
      >
        <div class="bg-white w-full max-w-md border border-line shadow-xl p-6 space-y-5">
          <div class="text-center">
            <div class="w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-accent-light border border-accent/20">
              <Send class="w-6 h-6 text-accent" />
            </div>
            <h2 class="font-display text-xl text-ink">Soumettre l'évaluation ?</h2>
            <p class="text-sm text-ink-muted mt-2">
              <template v-if="unansweredCount > 0">
                {{ unansweredCount }} question(s) sans réponse.
              </template>
              <template v-else>
                Toutes les questions ont une réponse.
              </template>
              Cette action est définitive.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3 text-center p-4 bg-paper-warm border border-line text-sm">
            <div>
              <p class="text-ink-faint text-xs uppercase tracking-wide">Répondues</p>
              <p class="font-semibold text-ink tabular-nums">{{ answeredCount }}/{{ totalQuestions }}</p>
            </div>
            <div>
              <p class="text-ink-faint text-xs uppercase tracking-wide">Temps restant</p>
              <p class="font-semibold text-ink tabular-nums">{{ timerFormatted }}</p>
            </div>
          </div>
          <div class="flex flex-col-reverse sm:flex-row gap-2">
            <AppButton variant="outline" class="flex-1" @click="showSubmitModal = false">
              Continuer
            </AppButton>
            <AppButton class="flex-1" :disabled="isSubmitting" @click="submitExam()">
              Soumettre
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div
        v-if="timeUpOverlay || (isSubmitting && examEnded)"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 backdrop-blur-sm px-6"
        role="alertdialog"
        aria-live="assertive"
        aria-label="Temps écoulé"
      >
        <div class="max-w-md w-full text-center space-y-4 p-8 border border-line shadow-xl bg-white">
          <Clock class="w-14 h-14 mx-auto text-accent" />
          <h2 class="font-display text-2xl sm:text-3xl text-ink">Temps écoulé</h2>
          <p class="text-sm sm:text-base text-ink-muted leading-relaxed">
            Merci pour votre participation. Vos réponses sont en cours d’enregistrement.
            Merci de ne pas fermer cette page.
          </p>
          <p v-if="isSubmitting" class="text-xs text-ink-faint animate-pulse">Envoi en cours…</p>
          <p v-if="submitError && !isSubmitting" class="text-sm text-danger">{{ submitError }}</p>
          <div v-if="!isSubmitting" class="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <AppButton class="w-full sm:w-auto" @click="leaveAfterTimeUp">
              <Home class="w-4 h-4" />
              Retour à l’espace étudiant
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>

    <main
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain max-w-3xl mx-auto w-full px-4 py-5 sm:py-8 transition-opacity"
      :class="{ 'pointer-events-none select-none opacity-50': inputsLocked }"
      :aria-disabled="inputsLocked"
    >
      <Transition name="step" mode="out-in">
        <div v-if="currentQuestion" :key="currentQuestion.id" class="space-y-5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <AppBadge variant="brand">
                Question {{ currentIndex + 1 }} / {{ totalQuestions }}
              </AppBadge>
              <AppBadge variant="muted">
                {{ QUESTION_TYPE_LABELS[currentQuestion.type] ?? currentQuestion.type }}
              </AppBadge>
            </div>
            <span class="text-sm font-medium text-ink-muted tabular-nums">
              {{ currentQuestion.points }} pt{{ currentQuestion.points > 1 ? 's' : '' }}
            </span>
          </div>

          <div class="p-5 sm:p-8 bg-white border border-line shadow-sm">
            <p class="text-base sm:text-lg text-ink leading-relaxed whitespace-pre-wrap break-words">
              {{ currentQuestion.text }}
            </p>
          </div>

          <Transition name="fade">
            <div
              v-if="currentFeedback"
              class="flex items-start gap-3 p-4 border"
              :class="currentFeedback.isCorrect
                ? 'bg-success-bg border-success/30 text-success'
                : 'bg-danger-bg border-danger/30 text-danger'"
            >
              <CheckCircle v-if="currentFeedback.isCorrect" class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <XCircle v-else class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-semibold">
                  {{ currentFeedback.isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse' }}
                </p>
                <p v-if="currentFeedback.correctText" class="text-xs mt-1 opacity-80">
                  La bonne réponse était : <strong>{{ currentFeedback.correctText }}</strong>
                </p>
              </div>
            </div>
          </Transition>

          <div v-if="currentQuestion.type === 'qcm'" class="space-y-3">
            <p class="text-xs font-medium text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
              <CircleHelp class="w-3.5 h-3.5" />
              Choisissez une réponse
            </p>
            <label
              v-for="option in currentQuestion.options"
              :key="option.id"
              class="flex items-center gap-3 p-4 min-h-[3.25rem] border cursor-pointer transition-all"
              :class="getQcmOptionClass(option.id)"
            >
              <input
                type="radio"
                :name="currentQuestion.id"
                :checked="getAnswer(currentQuestion.id)?.value === option.id"
                class="w-4 h-4 text-accent flex-shrink-0"
                @change="setAnswer(currentQuestion.id, option.id)"
              />
              <span class="text-base sm:text-sm flex-1">{{ option.text }}</span>
              <CheckCircle
                v-if="getAnswer(currentQuestion.id)?.value === option.id && instantFeedbackEnabled && isAnswerCorrect(currentQuestion, getAnswer(currentQuestion.id)) === true"
                class="w-5 h-5 text-success flex-shrink-0"
              />
              <XCircle
                v-else-if="getAnswer(currentQuestion.id)?.value === option.id && instantFeedbackEnabled && isAnswerCorrect(currentQuestion, getAnswer(currentQuestion.id)) === false"
                class="w-5 h-5 text-danger flex-shrink-0"
              />
            </label>
          </div>

          <div v-if="currentQuestion.type === 'truefalse'" class="space-y-3">
            <p class="text-xs font-medium text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
              <CircleHelp class="w-3.5 h-3.5" />
              Vrai ou faux ?
            </p>
            <div class="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                class="p-5 min-h-[3.5rem] border font-semibold text-base transition-all"
                :class="getTrueFalseClass(true)"
                @click="setAnswer(currentQuestion.id, true)"
              >
                Vrai
              </button>
              <button
                type="button"
                class="p-5 min-h-[3.5rem] border font-semibold text-base transition-all"
                :class="getTrueFalseClass(false)"
                @click="setAnswer(currentQuestion.id, false)"
              >
                Faux
              </button>
            </div>
          </div>

          <div v-if="currentQuestion.type === 'short'" class="space-y-2">
            <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">Votre réponse</p>
            <textarea
              :value="(getAnswer(currentQuestion.id)?.value as string) || ''"
              rows="5"
              placeholder="Saisissez votre réponse ici..."
              class="w-full px-4 py-3 border border-line bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-none text-ink text-base"
              @input="setAnswer(currentQuestion.id, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>

          <div v-if="currentQuestion.type === 'document'" class="space-y-3 p-5 border border-line bg-paper-warm">
            <p class="text-sm text-ink-muted">Formats acceptés : PDF, Word, images (max. 3 Mo)</p>
            <p class="text-xs text-accent">
              Au clic sur « Choisir un fichier », vous pourrez quitter le plein écran le temps d’importer ; il se réactive dès que le fichier est déposé.
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              class="block w-full text-sm text-ink file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-accent-light file:text-accent file:font-medium"
              @click="beginDocumentImport"
              @change="handleDocumentUpload(currentQuestion.id, $event)"
              @cancel="handleDocumentImportCancel"
            />
            <p v-if="getAnswer(currentQuestion.id)?.fileName" class="text-sm text-accent font-medium">
              Fichier déposé : {{ getAnswer(currentQuestion.id)?.fileName }}
            </p>
            <p v-if="uploadError" class="text-sm text-danger">{{ uploadError }}</p>
          </div>
        </div>
      </Transition>
    </main>

    <footer class="flex-shrink-0 bg-white border-t border-line shadow-[0_-4px_12px_rgb(0_0_0/0.04)] pb-safe">
      <div class="max-w-3xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <AppButton
          variant="outline"
          :disabled="currentIndex === 0"
          @click="currentIndex--"
        >
          <ChevronLeft class="w-4 h-4" />
          <span class="hidden sm:inline">Précédent</span>
        </AppButton>

        <div class="flex items-center gap-2">
          <button
            v-if="allowReview"
            type="button"
            class="flex items-center justify-center gap-1.5 min-h-11 px-3 text-xs font-medium text-ink-muted hover:text-ink border border-line"
            @click="showReviewPanel = true"
          >
            <ListChecks class="w-4 h-4" />
            <span class="hidden sm:inline">Revoir</span>
          </button>
        </div>

        <div class="flex gap-2">
          <AppButton
            v-if="currentIndex < totalQuestions - 1"
            @click="currentIndex++"
          >
            <span class="hidden sm:inline">Suivant</span>
            <ChevronRight class="w-4 h-4" />
          </AppButton>
          <AppButton v-else variant="secondary" @click="openSubmitFlow">
            <Send class="w-4 h-4" />
            Soumettre
          </AppButton>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 pb-3 sm:pb-4 border-t border-line/60 sm:border-0">
        <button
          type="button"
          class="sm:hidden w-full flex items-center justify-center gap-2 min-h-11 text-xs font-medium text-ink-muted"
          @click="showQuestionNav = !showQuestionNav"
        >
          {{ showQuestionNav ? 'Masquer les questions' : 'Voir les questions' }}
          <span class="text-accent tabular-nums">({{ answeredCount }}/{{ totalQuestions }})</span>
        </button>

        <div
          class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible"
          :class="showQuestionNav ? 'block' : 'hidden sm:block'"
        >
          <div class="flex gap-1.5 sm:flex-wrap sm:justify-center pb-1 sm:pb-0 min-w-min sm:min-w-0">
            <button
              v-for="(q, i) in orderedQuestions"
              :key="q.id"
              type="button"
              class="w-11 h-11 flex-shrink-0 text-xs font-semibold transition-all border"
              :class="{
                'bg-accent text-white border-accent shadow-sm': getDotStatus(q, i) === 'current',
                'bg-success-bg text-success border-success/30': getDotStatus(q, i) === 'correct',
                'bg-danger-bg text-danger border-danger/30': getDotStatus(q, i) === 'incorrect',
                'bg-accent-light text-accent border-accent/20': getDotStatus(q, i) === 'answered',
                'bg-paper-warm text-ink-faint border-line hover:border-line-strong': getDotStatus(q, i) === 'unanswered',
              }"
              @click="currentIndex = i"
            >
              {{ i + 1 }}
            </button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
