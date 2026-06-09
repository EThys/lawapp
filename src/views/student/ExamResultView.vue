<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatDuration, downloadDataUrl } from '@/utils/helpers'
import {
  getCorrectAnswerText,
  getStudentAnswerText,
  isAnswerCorrect,
} from '@/utils/evaluationReview'
import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  Home,
  Download,
  FileText,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()

const sessionId = route.params.sessionId as string
const failReason = computed(() => route.query.reason as string | undefined)

const session = computed(() => store.getSession(sessionId))
const evaluation = computed(() =>
  session.value ? store.getById(session.value.evaluationId) : undefined
)

const isSuccess = computed(() => session.value?.status === 'submitted')
const isFailed = computed(() => session.value?.status === 'failed')
const isExpired = computed(() => session.value?.status === 'expired')

const scorePercent = computed(() => {
  if (!session.value?.score || !session.value?.maxScore) return 0
  return Math.round((session.value.score / session.value.maxScore) * 100)
})

const passed = computed(() => {
  if (!evaluation.value || session.value?.score === undefined) return false
  const percent = (session.value.score / (session.value.maxScore || 1)) * 100
  return percent >= evaluation.value.settings.passingScore
})

const showAutoReview = computed(
  () =>
    isSuccess.value &&
    evaluation.value?.settings.correctionMode === 'auto' &&
    evaluation.value.settings.showCorrectAnswers
)

const showManualCorrection = computed(
  () =>
    evaluation.value?.settings.correctionMode === 'manual' &&
    evaluation.value.correctionPublished &&
    evaluation.value.correctionPdfData
)

function downloadCorrection() {
  if (!evaluation.value?.correctionPdfData || !evaluation.value.correctionPdfName) return
  downloadDataUrl(evaluation.value.correctionPdfData, evaluation.value.correctionPdfName)
}

if (!session.value || !evaluation.value) {
  router.replace('/student')
}
</script>

<template>
  <div v-if="session && evaluation" class="min-h-screen bg-paper flex items-center justify-center p-4 py-10">
    <div class="max-w-2xl w-full panel-elevated">
      <div class="px-8 pt-8 pb-6 text-center border-b border-line">
        <div
          class="w-14 h-14 mx-auto mb-4 flex items-center justify-center border"
          :class="{
            'border-success bg-success-bg': isSuccess && passed,
            'border-warning bg-warning-bg': isSuccess && !passed,
            'border-danger bg-danger-bg': isFailed || isExpired,
          }"
        >
          <CheckCircle
            v-if="isSuccess"
            class="w-7 h-7"
            :class="passed ? 'text-success' : 'text-warning'"
          />
          <XCircle v-else class="w-7 h-7 text-danger" />
        </div>

        <h1 class="font-display text-2xl text-ink">
          <template v-if="isFailed">Évaluation échouée</template>
          <template v-else-if="isExpired">Temps écoulé</template>
          <template v-else-if="passed">Épreuve réussie</template>
          <template v-else>Épreuve terminée</template>
        </h1>
        <p class="text-sm text-ink-muted mt-2">
          {{ session.studentLastName }} {{ session.studentFirstName }} · {{ evaluation.title }}
        </p>
      </div>

      <div class="px-8 py-6 space-y-5">
        <div v-if="failReason" class="flex items-start gap-2.5 p-4 bg-danger-bg border border-danger/15">
          <AlertTriangle class="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p class="text-sm text-danger">{{ failReason }}</p>
        </div>

        <div
          v-if="isSuccess && evaluation.settings.showResultsImmediately"
          class="text-center py-6 border border-line bg-paper/60"
        >
          <p class="label-caps mb-2">Score obtenu</p>
          <p class="text-4xl font-display tabular-nums" :class="passed ? 'text-success' : 'text-warning'">
            {{ session.score }}/{{ session.maxScore }}
          </p>
          <p class="text-sm text-ink-muted mt-1 tabular-nums">{{ scorePercent }}%</p>
          <AppBadge class="mt-3" :variant="passed ? 'success' : 'warning'">
            {{ passed ? 'Validé' : 'Non validé' }} · seuil {{ evaluation.settings.passingScore }}%
          </AppBadge>
        </div>

        <!-- Correction automatique -->
        <div v-if="showAutoReview" class="space-y-4">
          <h2 class="font-medium text-ink flex items-center gap-2">
            <FileText class="w-4 h-4 text-accent" />
            Correction automatique
          </h2>
          <div
            v-for="(question, i) in evaluation.questions"
            :key="question.id"
            class="p-4 border border-line text-sm space-y-2"
          >
            <p class="font-medium text-ink">Question {{ i + 1 }} · {{ question.points }} pt(s)</p>
            <p class="text-ink-muted">{{ question.text }}</p>
            <div class="grid sm:grid-cols-2 gap-3 pt-2">
              <div>
                <p class="text-xs text-ink-faint uppercase">Votre réponse</p>
                <p class="font-medium">{{ getStudentAnswerText(question, session.answers.find((a) => a.questionId === question.id)) }}</p>
              </div>
              <div v-if="question.type !== 'document'">
                <p class="text-xs text-ink-faint uppercase">Bonne réponse</p>
                <p class="font-medium text-accent">{{ getCorrectAnswerText(question) ?? '—' }}</p>
              </div>
            </div>
            <AppBadge
              v-if="isAnswerCorrect(question, session.answers.find((a) => a.questionId === question.id)) === true"
              variant="success"
            >
              Correct
            </AppBadge>
            <AppBadge
              v-else-if="isAnswerCorrect(question, session.answers.find((a) => a.questionId === question.id)) === false"
              variant="danger"
            >
              Incorrect
            </AppBadge>
            <AppBadge v-else-if="question.type === 'document'" variant="muted">Document à corriger</AppBadge>
            <p v-if="question.explanation" class="text-xs text-ink-muted pt-1">{{ question.explanation }}</p>
          </div>
        </div>

        <!-- Correction PDF manuelle -->
        <div
          v-else-if="evaluation.settings.correctionMode === 'manual' && !showManualCorrection"
          class="p-4 bg-paper-warm border border-line text-sm text-ink-muted"
        >
          La correction PDF sera disponible dès que l'enseignant la publiera sur la plateforme.
        </div>

        <div v-if="showManualCorrection" class="p-4 bg-accent-light border border-accent/20 space-y-3">
          <p class="text-sm font-medium text-ink">Correction publiée par l'enseignant</p>
          <p class="text-xs text-ink-muted">{{ evaluation.correctionPdfName }}</p>
          <AppButton variant="outline" size="sm" @click="downloadCorrection">
            <Download class="w-4 h-4" />
            Télécharger le PDF de correction
          </AppButton>
        </div>

        <div class="grid grid-cols-2 gap-px bg-line border border-line">
          <div class="bg-white p-4">
            <div class="flex items-center gap-1.5 text-ink-faint mb-1">
              <Clock class="w-3.5 h-3.5" />
              <span class="text-[10px] uppercase tracking-widest">Durée</span>
            </div>
            <p class="text-sm font-semibold tabular-nums">{{ formatDuration(session.timeSpentSeconds) }}</p>
          </div>
          <div class="bg-white p-4">
            <div class="flex items-center gap-1.5 text-ink-faint mb-1">
              <Shield class="w-3.5 h-3.5" />
              <span class="text-[10px] uppercase tracking-widest">Violations</span>
            </div>
            <p class="text-sm font-semibold tabular-nums" :class="session.violations.length > 0 ? 'text-danger' : 'text-ink'">
              {{ session.violations.length }}
            </p>
          </div>
        </div>
      </div>

      <div class="px-8 py-6 border-t border-line flex flex-col gap-2">
        <RouterLink to="/student">
          <AppButton variant="outline" class="w-full">
            <Home class="w-4 h-4" />
            Retour à mon espace
          </AppButton>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
