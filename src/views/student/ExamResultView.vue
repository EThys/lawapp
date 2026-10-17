<script setup lang="ts">

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { useRoute, useRouter, RouterLink } from 'vue-router'

import { useEvaluationStore } from '@/stores/evaluations'

import { isApiEnabled } from '@/config/features'

import {

  parseApiEvaluationId,

  parseSubmissionSessionId,

  submissionSessionId,

  isManualSubmissionAnswer,

  submissionKindLabel,

  mergeSubmissionMaxScore,

} from '@/utils/evaluationApiMapper'

import type { EvaluationSubmissionAnswerDetail } from '@/api/types'

import type { Question } from '@/types'

import AppButton from '@/components/ui/AppButton.vue'

import AppBadge from '@/components/ui/AppBadge.vue'

import AppShimmerDetail from '@/components/loading/AppShimmerDetail.vue'
import AppDocumentPreview from '@/components/ui/AppDocumentPreview.vue'

import { formatDuration, formatDate, resolveFileContent } from '@/utils/helpers'

import {

  getCorrectAnswerText,

  getStudentAnswerText,

  isAnswerCorrect,

} from '@/utils/evaluationReview'

import {

  CheckCircle2,

  XCircle,

  Clock,

  Shield,

  AlertTriangle,

  Home,

  ListChecks,

  PenLine,

  Target,

  Eye,

  EyeOff,

  Sparkles,

  RefreshCw,

} from '@lucide/vue'

import { appToast } from '@/utils/toast'



const route = useRoute()

const router = useRouter()

const store = useEvaluationStore()



const sessionId = route.params.sessionId as string

const failReason = computed(() => route.query.reason as string | undefined)

const loading = ref(true)
const refreshing = ref(false)

const reviewTab = ref<'all' | 'qcm' | 'manual'>('all')



const session = computed(() => {
  const direct = store.getSession(sessionId)
  if (direct) return direct
  const parsed = parseSubmissionSessionId(sessionId)
  if (parsed) {
    return store.getSession(submissionSessionId(parsed.evaluationId, parsed.submissionId))
  }
  return undefined
})

const evaluation = computed(() => {

  if (!session.value) return undefined

  return (

    store.getById(session.value.evaluationId) ??

    store.getByCode(session.value.evaluationCode) ??

    (session.value.apiEvaluationId != null

      ? store.evaluations.find(

          (e) =>

            e.apiId === session.value!.apiEvaluationId ||

            e.id === String(session.value!.apiEvaluationId),

        )

      : undefined)

  )

})



const settings = computed(() => evaluation.value?.settings)

const apiAnswers = computed(() => session.value?.apiAnswers ?? [])

const displayMaxScore = computed(() =>
  mergeSubmissionMaxScore(session.value?.maxScore, evaluation.value, apiAnswers.value),
)

const manualAnswers = computed(() => apiAnswers.value.filter((a) => isManualSubmissionAnswer(a.kind)))

const autoAnswers = computed(() => apiAnswers.value.filter((a) => !isManualSubmissionAnswer(a.kind)))



const visibleApiAnswers = computed(() => {

  if (reviewTab.value === 'manual') return manualAnswers.value

  if (reviewTab.value === 'qcm') return autoAnswers.value

  return apiAnswers.value

})



const isSuccess = computed(() => session.value?.status === 'submitted')

const isFailed = computed(() => session.value?.status === 'failed')

const isExpired = computed(() => session.value?.status === 'expired')



const scorePercent = computed(() => {

  if (session.value?.score == null || !displayMaxScore.value) return null

  return Math.round((session.value.score / displayMaxScore.value) * 100)

})



const passingScore = computed(() => settings.value?.passingScore ?? 50)



const passed = computed(() => {

  if (!isSuccess.value || session.value?.score == null) return false

  const max = displayMaxScore.value || 1

  return (session.value.score / max) * 100 >= passingScore.value

})



const pendingManualCount = computed(

  () => manualAnswers.value.filter((a) => a.score == null && !a.feedback).length,

)



const showScoreBlock = computed(() => {

  if (!isSuccess.value) return false

  if (session.value?.score != null || session.value?.scoreQcm != null) return true

  return settings.value?.showResultsImmediately !== false

})



const showScoreValue = computed(() => {

  if (settings.value?.showResultsImmediately === false && pendingManualCount.value > 0) {

    return session.value?.scoreQcm != null || autoAnswers.value.some((a) => a.score != null)

  }

  return session.value?.score != null || session.value?.scoreQcm != null

})



const showAutoReview = computed(

  () =>

    !apiAnswers.value.length &&

    isSuccess.value &&

    settings.value?.correctionMode === 'auto' &&

    settings.value?.showCorrectAnswers,

)



const showManualCorrection = computed(

  () =>

    settings.value?.correctionMode === 'manual' &&

    evaluation.value?.correctionPublished &&

    evaluation.value?.correctionPdfData,

)



const resultTitle = computed(() => {

  if (isFailed.value) return 'Évaluation échouée'

  if (isExpired.value) return 'Temps écoulé'

  if (passed.value) return 'Épreuve réussie'

  if (isSuccess.value && pendingManualCount.value > 0) return 'Copie soumise'

  return 'Épreuve terminée'

})



const resultSubtitle = computed(() => {

  if (isFailed.value) return 'Des règles anti-triche ont été violées.'

  if (isExpired.value) return 'Le chronomètre est arrivé à zéro.'

  if (pendingManualCount.value > 0) {

    return `${pendingManualCount.value} réponse(s) en attente de correction par l’enseignant.`

  }

  if (passed.value) return `Seuil de réussite atteint (${passingScore.value} %).`

  if (isSuccess.value && scorePercent.value != null) return `Seuil de réussite : ${passingScore.value} %.`

  return 'Votre copie a bien été enregistrée.'

})



const heroTone = computed(() => {

  if (isFailed.value || isExpired.value) return 'danger'

  if (passed.value) return 'success'

  if (isSuccess.value) return 'warning'

  return 'muted'

})



const questionById = computed(() => {

  const map = new Map<string, Question>()

  for (const q of evaluation.value?.questions ?? []) {

    map.set(q.id, q)

    map.set(String(Number(q.id)), q)

  }

  return map

})



function studentAnswerDisplay(a: EvaluationSubmissionAnswerDetail) {

  if (a.selectedOptionText) return a.selectedOptionText

  if (answerDocumentContent(a)) return '—'

  if (a.textResponse) return a.textResponse

  if (a.selectedOptionId != null) return `Option #${a.selectedOptionId}`

  return '—'

}

function answerDocumentContent(a: EvaluationSubmissionAnswerDetail): string | null {

  if (a.fileContent?.trim() && resolveFileContent(a.fileContent)) return a.fileContent.trim()

  if (a.textResponse?.trim() && resolveFileContent(a.textResponse)) return a.textResponse.trim()

  const qid = String(a.questionId)

  const local = session.value?.answers.find((x) => x.questionId === qid)

  if (local?.fileName && typeof local.value === 'string' && resolveFileContent(local.value)) {

    return local.value

  }

  return null

}

function answerDocumentFilename(a: EvaluationSubmissionAnswerDetail): string {

  const local = session.value?.answers.find((x) => x.questionId === String(a.questionId))

  if (local?.fileName) return local.fileName

  return `depot-question-${a.questionId}.pdf`

}

function isDocumentLikeAnswer(a: EvaluationSubmissionAnswerDetail): boolean {

  if (answerDocumentContent(a)) return true

  const k = (a.kind ?? '').toLowerCase()

  if (k.includes('document') || k.includes('depot') || k.includes('fichier')) return true

  const q = questionById.value.get(String(a.questionId))

  return q?.type === 'document'

}



function isQcmLikeAnswer(a: EvaluationSubmissionAnswerDetail): boolean {

  if (isManualSubmissionAnswer(a.kind)) return false

  const k = (a.kind ?? '').toLowerCase()

  return k.includes('option') || k.includes('qcm') || k.includes('vrai') || a.selectedOptionId != null

}



function apiAnswerVerdict(a: EvaluationSubmissionAnswerDetail): boolean | null {

  if (a.optionCorrect === true) return true

  if (a.optionCorrect === false) return false

  if (a.score != null && a.questionPoint != null) {

    if (a.score >= a.questionPoint) return true

    if (a.score <= 0) return false

  }

  const q = questionById.value.get(String(a.questionId))

  if (q?.type === 'qcm' || q?.type === 'truefalse') {

    const ans = session.value?.answers.find((x) => x.questionId === String(a.questionId))

    if (ans) return isAnswerCorrect(q, ans)

  }

  return null

}



function canShowVerdict(a: EvaluationSubmissionAnswerDetail): boolean {

  if (isManualSubmissionAnswer(a.kind)) return a.score != null || !!a.feedback

  if (settings.value?.correctionMode === 'manual') return false

  return settings.value?.showCorrectAnswers !== false || a.optionCorrect != null || apiAnswerVerdict(a) != null

}



function promptForAnswer(a: EvaluationSubmissionAnswerDetail) {

  const q = questionById.value.get(String(a.questionId))

  return {

    title: a.promptTitle || q?.promptTitle,

    file: a.promptFileContent || q?.promptFileContent,

    subItems: q?.subItems,

  }

}



function scoreBadgeLabel(a: EvaluationSubmissionAnswerDetail) {

  if (a.score != null) {

    return `${a.score}${a.questionPoint != null ? `/${a.questionPoint}` : ''}`

  }

  if (isManualSubmissionAnswer(a.kind)) return 'En correction'

  const v = apiAnswerVerdict(a)

  if (v === true) return 'Correct'

  if (v === false) return 'Incorrect'

  return '—'

}



type QcmOptionRow = { id: string; text: string; isSelected: boolean; tone: 'ok' | 'ko' | 'neutral' }



function qcmOptionRows(a: EvaluationSubmissionAnswerDetail): QcmOptionRow[] | null {

  const q = questionById.value.get(String(a.questionId))

  if (!q?.options?.length || !isQcmLikeAnswer(a)) return null



  const selectedId =

    a.selectedOptionId != null

      ? String(a.selectedOptionId)

      : session.value?.answers.find((x) => x.questionId === q.id)?.value != null

        ? String(session.value!.answers.find((x) => x.questionId === q.id)!.value)

        : null



  const verdict = canShowVerdict(a) ? apiAnswerVerdict(a) : null



  return q.options.map((opt) => {

    const isSelected =

      selectedId === opt.id ||

      (!!a.selectedOptionText && a.selectedOptionText.trim() === opt.text.trim())

    let tone: QcmOptionRow['tone'] = 'neutral'

    if (isSelected && verdict === true) tone = 'ok'

    else if (isSelected && verdict === false) tone = 'ko'

    return { id: opt.id, text: opt.text, isSelected, tone }

  })

}



function qcmOptionClass(tone: QcmOptionRow['tone'], isSelected: boolean) {

  if (!isSelected) return 'border-line bg-white text-ink-muted'

  if (tone === 'ok') return 'border-success bg-success-bg text-success font-medium ring-1 ring-success/30'

  if (tone === 'ko') return 'border-danger bg-danger-bg text-danger font-medium ring-1 ring-danger/30'

  return 'border-accent bg-accent-light text-ink ring-1 ring-accent/30'

}



function answerBoxClass(a: EvaluationSubmissionAnswerDetail) {

  if (!isQcmLikeAnswer(a) || !canShowVerdict(a)) return ''

  const v = apiAnswerVerdict(a)

  if (v === true) return 'border-success bg-success-bg'

  if (v === false) return 'border-danger bg-danger-bg'

  return ''

}



function resolveResultApiId(): number | null {
  const parsedRoute = parseSubmissionSessionId(sessionId)
  if (parsedRoute) return parsedRoute.evaluationId

  return (
    session.value?.apiEvaluationId ??
    evaluation.value?.apiId ??
    parseApiEvaluationId(session.value?.evaluationId ?? '') ??
    parseApiEvaluationId(session.value?.evaluationCode ?? '') ??
    parseApiEvaluationId(sessionId) ??
    null
  )
}

async function refreshFromApi() {
  const apiId = resolveResultApiId()
  if (!isApiEnabled() || apiId == null) return
  refreshing.value = true
  try {
    await store.loadMySubmission(apiId, sessionId, { force: true })
  } finally {
    refreshing.value = false
  }
}

function onVisibilityRefresh() {
  if (document.visibilityState === 'visible') void refreshFromApi()
}

function findResultSession(): ReturnType<typeof store.getSession> {
  return (
    store.getSession(sessionId) ??
    (() => {
      const parsed = parseSubmissionSessionId(sessionId)
      if (!parsed) return undefined
      return store.getSession(submissionSessionId(parsed.evaluationId, parsed.submissionId))
    })()
  )
}

onMounted(async () => {
  loading.value = true
  try {
    const apiId = resolveResultApiId()

    if (isApiEnabled() && apiId != null) {
      await store.fetchEvaluationById(apiId).catch(() => null)
      const resolved = await store.ensureStudentResultSession(sessionId, apiId)
      if (resolved && resolved.id !== sessionId) {
        await router.replace({ path: `/exam/${resolved.id}/result`, query: route.query })
        return
      }
      if (findResultSession() || resolved) {
        await refreshFromApi()
        return
      }
      appToast.error(
        'Copie introuvable en ligne. Reconnectez-vous avec le même compte étudiant.',
      )
      router.replace('/student')
      return
    }

    if (!findResultSession()) {
      router.replace('/student')
    }
  } finally {
    loading.value = false
  }
  document.addEventListener('visibilitychange', onVisibilityRefresh)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityRefresh)
})

watch(
  () => route.params.sessionId,
  () => {
    if (!loading.value) void refreshFromApi()
  },
)

</script>



<template>

  <div class="min-h-screen bg-paper px-4 py-6 pb-12">

    <AppShimmerDetail v-if="loading && !session" />



    <template v-else-if="session">

      <header class="max-w-3xl mx-auto mb-4 flex items-center justify-between gap-3">

        <RouterLink to="/student" class="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent">

          <Home class="w-4 h-4" />

          Espace étudiant

        </RouterLink>

        <button
          v-if="isApiEnabled() && resolveResultApiId() != null"
          type="button"
          class="inline-flex items-center justify-center w-9 h-9 border border-line bg-white text-ink-muted hover:text-ink hover:bg-paper-warm transition-colors disabled:opacity-40 cursor-pointer"
          :disabled="refreshing"
          title="Actualiser notes et feedback"
          aria-label="Actualiser notes et feedback"
          @click="refreshFromApi()"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': refreshing }" />
        </button>

      </header>



      <div class="max-w-3xl mx-auto space-y-4">

        <!-- Hero -->

        <section

          class="bg-white border border-line p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"

          :class="{

            'border-l-4 border-l-success': heroTone === 'success',

            'border-l-4 border-l-warning': heroTone === 'warning',

            'border-l-4 border-l-danger': heroTone === 'danger',

          }"

        >

          <div class="flex gap-4 items-start min-w-0">

            <div

              class="w-12 h-12 flex-shrink-0 flex items-center justify-center border border-line"

              :class="{

                'bg-success-bg text-success border-success/30': heroTone === 'success',

                'bg-warning-bg text-warning': heroTone === 'warning',

                'bg-danger-bg text-danger border-danger/30': heroTone === 'danger',

              }"

            >

              <CheckCircle2 v-if="isSuccess" class="w-7 h-7" />

              <XCircle v-else class="w-7 h-7" />

            </div>

            <div class="min-w-0">

              <p class="label-caps mb-1">Résultat</p>

              <h1 class="font-display text-2xl text-ink">{{ resultTitle }}</h1>

              <p class="text-sm text-ink-muted mt-1">{{ resultSubtitle }}</p>

              <p class="text-xs text-ink-faint mt-2">

                {{ session.studentFirstName }} {{ session.studentLastName }}

                <template v-if="evaluation"> · {{ evaluation.title }}</template>

              </p>

            </div>

          </div>



          <div v-if="showScoreBlock && showScoreValue" class="text-center flex-shrink-0 sm:min-w-[7rem]">

            <p

              class="font-display text-4xl tabular-nums leading-none"

              :class="passed ? 'text-success' : 'text-warning'"

            >

              <template v-if="session.score != null">{{ scorePercent ?? 0 }}%</template>

              <template v-else-if="session.scoreQcm != null">{{ session.scoreQcm }}</template>

            </p>

            <p class="text-xs text-ink-muted mt-1 uppercase tracking-wide">

              <template v-if="session.score != null && displayMaxScore != null">

                {{ session.score }}/{{ displayMaxScore }} pts

              </template>

              <template v-else-if="session.scoreQcm != null">Score QCM</template>

            </p>

          </div>



          <div

            v-else-if="showScoreBlock && !showScoreValue"

            class="flex items-center gap-2 text-sm text-ink-muted border border-dashed border-line px-3 py-2 bg-paper"

          >

            <EyeOff class="w-4 h-4 flex-shrink-0" />

            Score différé

          </div>

        </section>



        <div v-if="failReason" class="flex items-start gap-2 p-4 bg-danger-bg border border-danger/20 text-sm text-danger">

          <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" />

          {{ failReason }}

        </div>



        <!-- Critères -->

        <section v-if="settings" class="bg-white border border-line p-4">

          <p class="flex items-center gap-2 text-sm font-semibold text-ink mb-3">

            <Target class="w-4 h-4" />

            Critères de l’évaluation

          </p>

          <div class="flex flex-wrap gap-2">

            <span class="text-xs px-2.5 py-1 border border-line bg-paper text-ink-muted">Seuil {{ passingScore }} %</span>

            <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-line bg-paper text-ink-muted">

              <Sparkles class="w-3 h-3" />

              {{ settings.correctionMode === 'auto' ? 'Correction auto' : 'Correction manuelle' }}

            </span>

            <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-line bg-paper text-ink-muted">

              <component :is="settings.showResultsImmediately ? Eye : EyeOff" class="w-3 h-3" />

              {{ settings.showResultsImmediately ? 'Score immédiat' : 'Score différé' }}

            </span>

            <span v-if="settings.correctionMode === 'auto'" class="text-xs px-2.5 py-1 border border-line bg-paper text-ink-muted">

              {{ settings.showCorrectAnswers ? 'Détail affiché' : 'Détail masqué' }}

            </span>

          </div>

        </section>



        <AppDocumentPreview

          v-if="evaluation?.fileContent?.trim() && resolveFileContent(evaluation.fileContent)"

          :content="evaluation.fileContent"

          title="Document de référence"

          filename="annexe-evaluation.pdf"

        />



        <!-- Stats -->

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">

          <div class="bg-white border border-line p-3 flex gap-2 items-start">

            <Clock class="w-4 h-4 text-ink-faint mt-0.5" />

            <div>

              <p class="text-sm font-semibold tabular-nums">{{ formatDuration(session.timeSpentSeconds) }}</p>

              <p class="text-[11px] text-ink-muted">
                Temps passé
                <span v-if="isApiEnabled() && session.timeSpentSeconds > 0" class="block text-ink-faint">
                  Mesure locale ou en ligne
                </span>
              </p>

            </div>

          </div>

          <div class="bg-white border border-line p-3 flex gap-2 items-start">

            <Shield class="w-4 h-4 text-ink-faint mt-0.5" />

            <div>

              <p class="text-sm font-semibold tabular-nums">{{ session.violations.length }}</p>

              <p class="text-[11px] text-ink-muted">Alerte(s)</p>

            </div>

          </div>

          <div v-if="autoAnswers.length" class="bg-white border border-line p-3 flex gap-2 items-start">

            <ListChecks class="w-4 h-4 text-ink-faint mt-0.5" />

            <div>

              <p class="text-sm font-semibold tabular-nums">{{ autoAnswers.length }}</p>

              <p class="text-[11px] text-ink-muted">QCM / auto</p>

            </div>

          </div>

          <div v-if="manualAnswers.length" class="bg-white border border-line p-3 flex gap-2 items-start">

            <PenLine class="w-4 h-4 text-ink-faint mt-0.5" />

            <div>

              <p class="text-sm font-semibold tabular-nums">{{ pendingManualCount }}/{{ manualAnswers.length }}</p>

              <p class="text-[11px] text-ink-muted">En correction</p>

            </div>

          </div>

        </div>



        <p v-if="session.submittedAt" class="text-xs text-ink-faint">

          Soumis le {{ formatDate(session.submittedAt) }}

        </p>



        <!-- Tabs -->

        <div v-if="apiAnswers.length" class="result-tabs" role="tablist">
          <button
            type="button"
            class="result-tab"
            :class="{ 'result-tab--active': reviewTab === 'all' }"
            @click="reviewTab = 'all'"
          >
            Tout
            <span class="result-tab__count">{{ apiAnswers.length }}</span>
          </button>
          <button
            type="button"
            class="result-tab"
            :class="{ 'result-tab--active': reviewTab === 'qcm' }"
            @click="reviewTab = 'qcm'"
          >
            <ListChecks class="w-4 h-4 shrink-0" />
            QCM
            <span class="result-tab__count">{{ autoAnswers.length }}</span>
          </button>
          <button
            type="button"
            class="result-tab"
            :class="{ 'result-tab--active': reviewTab === 'manual' }"
            @click="reviewTab = 'manual'"
          >
            <PenLine class="w-4 h-4 shrink-0" />
            Ouvertes
            <span class="result-tab__count">{{ manualAnswers.length }}</span>
          </button>
        </div>



        <!-- Réponses API -->

        <section v-if="apiAnswers.length" class="space-y-3">

          <div v-if="visibleApiAnswers.length === 0" class="text-sm text-ink-muted text-center py-8 border border-dashed border-line bg-white">

            Rien dans cet onglet.

          </div>



          <article

            v-for="answer in visibleApiAnswers"

            :key="answer.answerId ?? answer.questionId"

            class="bg-white border border-line p-4 border-l-[3px]"

            :class="{

              'border-l-accent': isManualSubmissionAnswer(answer.kind),

              'border-l-success': !isManualSubmissionAnswer(answer.kind) && canShowVerdict(answer) && apiAnswerVerdict(answer) === true,

              'border-l-danger': !isManualSubmissionAnswer(answer.kind) && canShowVerdict(answer) && apiAnswerVerdict(answer) === false,

            }"

          >

            <div class="flex items-start justify-between gap-3 mb-2">

              <div class="min-w-0">

                <p class="text-[11px] uppercase tracking-wide text-ink-faint">

                  {{ submissionKindLabel(answer.kind) }}

                  <template v-if="answer.questionPoint != null"> · {{ answer.questionPoint }} pt(s)</template>

                </p>

                <h3 class="text-sm font-semibold text-ink break-words">

                  {{ answer.questionTitle || `Question #${answer.questionId}` }}

                </h3>

              </div>

              <AppBadge

                :variant="

                  canShowVerdict(answer) && apiAnswerVerdict(answer) === true

                    ? 'success'

                    : canShowVerdict(answer) && apiAnswerVerdict(answer) === false

                      ? 'danger'

                      : isManualSubmissionAnswer(answer.kind)

                        ? 'warning'

                        : 'muted'

                "

              >

                {{ scoreBadgeLabel(answer) }}

              </AppBadge>

            </div>



            <div

              v-if="promptForAnswer(answer).title || promptForAnswer(answer).subItems?.length || (promptForAnswer(answer).file && resolveFileContent(promptForAnswer(answer).file))"

              class="mb-3 p-3 bg-paper border border-line text-sm text-ink-muted whitespace-pre-wrap space-y-2"

            >

              <p v-if="promptForAnswer(answer).title">{{ promptForAnswer(answer).title }}</p>

              <AppDocumentPreview

                v-if="promptForAnswer(answer).file && resolveFileContent(promptForAnswer(answer).file)"

                :content="promptForAnswer(answer).file!"

                title="Consigne jointe"

                :filename="`consigne-${answer.questionId}.pdf`"

                compact

              />

              <ul v-if="promptForAnswer(answer).subItems?.length" class="mt-2 space-y-2 list-none p-0">

                <li v-for="(sub, si) in promptForAnswer(answer).subItems" :key="si" class="space-y-2">

                  <p v-if="sub.title">{{ sub.title }}</p>

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



            <!-- QCM : options colorées vert / rouge -->

            <ul v-if="qcmOptionRows(answer)" class="space-y-2 mb-3">

              <li

                v-for="opt in qcmOptionRows(answer)!"

                :key="opt.id"

                class="flex items-center gap-3 p-3 border text-sm transition-colors"

                :class="qcmOptionClass(opt.tone, opt.isSelected)"

              >

                <span

                  class="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center"

                  :class="opt.isSelected ? 'border-current bg-current/10' : 'border-line'"

                >

                  <span v-if="opt.isSelected" class="w-2 h-2 rounded-full bg-current" />

                </span>

                <span class="flex-1 break-words">{{ opt.text }}</span>

                <CheckCircle2 v-if="opt.isSelected && opt.tone === 'ok'" class="w-4 h-4 flex-shrink-0" />

                <XCircle v-else-if="opt.isSelected && opt.tone === 'ko'" class="w-4 h-4 flex-shrink-0" />

              </li>

            </ul>



            <!-- Dépôt document : aperçu PDF -->

            <AppDocumentPreview

              v-else-if="isDocumentLikeAnswer(answer) && answerDocumentContent(answer)"

              :content="answerDocumentContent(answer)!"

              title="Votre document déposé"

              :filename="answerDocumentFilename(answer)"

              compact

            />

            <!-- Réponse texte (non QCM ou sans options listées) -->

            <div

              v-else

              class="p-3 border border-line bg-paper"

              :class="answerBoxClass(answer)"

            >

              <p class="text-[11px] uppercase tracking-wide text-ink-faint mb-1">Votre réponse</p>

              <p class="text-sm whitespace-pre-wrap break-words" :class="{

                'text-success': canShowVerdict(answer) && apiAnswerVerdict(answer) === true,

                'text-danger': canShowVerdict(answer) && apiAnswerVerdict(answer) === false,

              }">

                {{ studentAnswerDisplay(answer) }}

              </p>

            </div>



            <div v-if="answer.feedback" class="mt-3 p-3 bg-accent-light border border-accent/20">

              <p class="text-[11px] uppercase tracking-wide text-accent mb-1">Commentaire enseignant</p>

              <p class="text-sm text-ink">{{ answer.feedback }}</p>

            </div>



            <p v-if="answer.gradedAt" class="text-[11px] text-ink-faint mt-2">

              Noté le {{ formatDate(answer.gradedAt) }}

            </p>

          </article>

        </section>



        <!-- Correction locale -->

        <section v-else-if="showAutoReview && evaluation" class="space-y-3">

          <p class="label-caps">Correction détaillée</p>

          <article

            v-for="(q, i) in evaluation.questions"

            :key="q.id"

            class="bg-white border border-line p-4 border-l-[3px]"

            :class="{

              'border-l-success': isAnswerCorrect(q, session.answers.find((a) => a.questionId === q.id)),

              'border-l-danger': isAnswerCorrect(q, session.answers.find((a) => a.questionId === q.id)) === false,

            }"

          >

            <div class="flex items-start gap-2 mb-2">

              <AppBadge :variant="isAnswerCorrect(q, session.answers.find((a) => a.questionId === q.id)) ? 'success' : 'danger'">

                Q{{ i + 1 }}

              </AppBadge>

              <p class="text-sm font-medium text-ink flex-1">{{ q.text }}</p>

            </div>



            <ul v-if="q.type === 'qcm' && q.options?.length" class="space-y-2">

              <li

                v-for="opt in q.options"

                :key="opt.id"

                class="flex items-center gap-3 p-3 border text-sm"

                :class="

                  session.answers.find((a) => a.questionId === q.id)?.value === opt.id

                    ? isAnswerCorrect(q, session.answers.find((a) => a.questionId === q.id))

                      ? 'border-success bg-success-bg text-success font-medium'

                      : 'border-danger bg-danger-bg text-danger font-medium'

                    : 'border-line bg-white text-ink-muted'

                "

              >

                {{ opt.text }}

              </li>

            </ul>



            <div v-else class="p-3 border border-line bg-paper text-sm">

              {{ getStudentAnswerText(q, session.answers.find((a) => a.questionId === q.id)) }}

            </div>



            <p v-if="getCorrectAnswerText(q)" class="text-xs text-ink-faint mt-2">

              Attendu : {{ getCorrectAnswerText(q) }}

            </p>

          </article>

        </section>



        <AppDocumentPreview

          v-if="showManualCorrection && evaluation?.correctionPdfData"

          :content="evaluation.correctionPdfData"

          title="Correction publiée par l’enseignant"

          :filename="evaluation.correctionPdfName ?? 'correction.pdf'"

        />



        <footer class="pt-2 flex justify-center">

          <RouterLink to="/student">

            <AppButton>

              <Home class="w-4 h-4" />

              Retour à l’espace étudiant

            </AppButton>

          </RouterLink>

        </footer>

      </div>

    </template>



    <div v-else class="max-w-sm mx-auto mt-16 text-center space-y-4 text-sm text-ink-muted">

      <p>{{ loading ? 'Chargement…' : 'Résultat introuvable.' }}</p>

      <RouterLink to="/student">

        <AppButton variant="outline">Espace étudiant</AppButton>

      </RouterLink>

    </div>

  </div>

</template>

<style scoped>
.result-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.result-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid var(--color-line);
  background: white;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  line-height: 1.25;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.result-tab:hover:not(.result-tab--active) {
  color: var(--color-ink);
  background: var(--color-paper-warm);
  border-color: var(--color-line-strong);
}

.result-tab--active {
  background: var(--color-brand-dark);
  border-color: var(--color-brand-dark);
  color: #fff;
}

.result-tab__count {
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  opacity: 0.85;
}

.result-tab--active .result-tab__count {
  color: #fff;
  opacity: 0.9;
}
</style>

