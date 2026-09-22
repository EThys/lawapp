<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import { isApiEnabled } from '@/config/features'
import {
  examIntroAnticheatRules,
  resolveEvaluationDurationMinutes,
} from '@/utils/evaluationApiMapper'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { EVALUATION_TYPE_LABELS } from '@/types'
import { formatMinutes } from '@/utils/helpers'
import {
  Shield,
  Clock,
  ArrowRight,
  FileText,
  CheckCircle,
  Loader2,
  ListChecks,
  ChevronDown,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()

const sessionId = route.params.sessionId as string
const session = computed(() => store.getSession(sessionId))
const evaluation = computed(() =>
  session.value ? store.getById(session.value.evaluationId) : undefined,
)

const startError = ref('')
const starting = ref(false)
const ready = ref(false)
const loadingPassage = ref(false)
const rulesExpanded = ref(false)

const questionCount = computed(() => evaluation.value?.questions.length ?? 0)

const durationMinutes = computed(() =>
  evaluation.value ? resolveEvaluationDurationMinutes(evaluation.value) : null,
)

const durationLabel = computed(() =>
  durationMinutes.value != null ? formatMinutes(durationMinutes.value) : '—',
)

const questionBreakdown = computed(() => {
  if (!evaluation.value) return []
  const counts: Record<string, number> = {}
  for (const q of evaluation.value.questions) {
    counts[q.type] = (counts[q.type] || 0) + 1
  }
  const labels: Record<string, string> = {
    qcm: 'QCM',
    truefalse: 'V/F',
    short: 'Ouverte',
    document: 'Document',
  }
  return Object.entries(counts).map(([type, count]) => ({
    label: labels[type] ?? type,
    count,
  }))
})

const instantFeedback = computed(
  () =>
    evaluation.value?.settings.correctionMode === 'auto' &&
    (evaluation.value?.settings.instantFeedback ?? true),
)

const anticheatRules = computed(() =>
  evaluation.value ? examIntroAnticheatRules(evaluation.value) : [],
)

const visibleRules = computed(() =>
  rulesExpanded.value ? anticheatRules.value : anticheatRules.value.slice(0, 2),
)

const toneClasses: Record<string, string> = {
  danger: 'border-danger/20 bg-danger-bg/50 text-danger',
  warning: 'border-warning/25 bg-warning-bg/40 text-ink',
  info: 'border-line bg-paper-warm/80 text-ink-muted',
}

async function ensurePassageLoaded(): Promise<boolean> {
  const ev = evaluation.value
  if (!ev) return false
  if (ev.questions.length > 0 && isApiEnabled() && ev.apiId != null) {
    loadingPassage.value = true
    try {
      const passage = await store.loadPassageFromApi(ev.apiId)
      return !!(passage && passage.questions.length)
    } finally {
      loadingPassage.value = false
    }
  }
  if (ev.questions.length > 0) return true
  if (!isApiEnabled() || ev.apiId == null) return false

  loadingPassage.value = true
  try {
    const passage = await store.loadPassageFromApi(ev.apiId)
    return !!(passage && passage.questions.length)
  } finally {
    loadingPassage.value = false
  }
}

async function startExam() {
  startError.value = ''
  starting.value = true

  try {
    const current = store.getSession(sessionId)
    if (!current || !evaluation.value) {
      startError.value = 'Session introuvable. Rejoignez l\'évaluation depuis votre espace.'
      return
    }

    if (['submitted', 'failed', 'expired'].includes(current.status)) {
      await router.replace(`/exam/${sessionId}/result`)
      return
    }

    const ok = await ensurePassageLoaded()
    if (!ok) {
      startError.value =
        store.apiError ||
        'Impossible de charger la feuille d\'évaluation (passage). Réessayez.'
      return
    }

    if (current.status === 'in_progress') {
      await router.push(`/exam/${sessionId}`)
      return
    }

    const begun = store.beginSession(sessionId)
    if (!begun) {
      const retry = store.getSession(sessionId)
      if (retry?.status === 'in_progress') {
        await router.push(`/exam/${sessionId}`)
        return
      }
      startError.value = 'Impossible de démarrer l\'évaluation. Réessayez depuis votre espace étudiant.'
      return
    }

    await router.push(`/exam/${sessionId}`)
  } finally {
    starting.value = false
  }
}

onMounted(() => {
  if (!session.value || !evaluation.value) {
    router.replace('/student')
    return
  }

  if (session.value.status === 'in_progress') {
    router.replace(`/exam/${sessionId}`)
    return
  }

  if (['submitted', 'failed', 'expired'].includes(session.value.status)) {
    router.replace(`/exam/${sessionId}/result`)
    return
  }

  void ensurePassageLoaded().then((ok) => {
    if (!ok && evaluation.value?.apiId) {
      startError.value =
        store.apiError ||
        'Feuille d\'évaluation indisponible. Vérifiez que l\'épreuve est ouverte.'
    }
    ready.value = true
  })
})
</script>

<template>
  <div
    v-if="!ready || loadingPassage"
    class="min-h-dvh bg-brand-dark flex flex-col items-center justify-center gap-3 px-4 text-white/90"
  >
    <Loader2 class="w-7 h-7 animate-spin text-accent" />
    <p class="text-sm">Préparation de l’épreuve…</p>
  </div>

  <div
    v-else-if="session && evaluation"
    class="min-h-dvh bg-brand-dark flex items-center justify-center p-4 sm:p-6"
  >
    <div
      class="max-w-md w-full max-h-[min(92dvh,720px)] flex flex-col overflow-hidden rounded-md border border-white/10 bg-paper shadow-2xl"
    >
      <div class="flex-shrink-0 px-5 pt-5 pb-4 bg-brand-dark text-white border-b border-white/10">
        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55 mb-1">
          Avant de commencer
        </p>
        <h1 class="font-display text-xl leading-snug line-clamp-2">{{ evaluation.title }}</h1>
        <p class="text-xs text-white/65 mt-2 truncate">
          {{ session.studentLastName }} {{ session.studentFirstName }} · {{ session.studentId }}
        </p>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="p-3 border border-line bg-paper-warm/50 rounded-sm">
            <p class="text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1">
              <Clock class="w-3 h-3" /> Durée
            </p>
            <p class="font-semibold text-ink mt-0.5">{{ durationLabel }}</p>
          </div>
          <div class="p-3 border border-line bg-paper-warm/50 rounded-sm">
            <p class="text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1">
              <ListChecks class="w-3 h-3" /> Questions
            </p>
            <p class="font-semibold text-ink mt-0.5">{{ questionCount }}</p>
            <p v-if="questionBreakdown.length" class="text-[10px] text-ink-muted truncate mt-0.5">
              {{ questionBreakdown.map((b) => `${b.count} ${b.label}`).join(' · ') }}
            </p>
          </div>
        </div>

        <p
          v-if="instantFeedback"
          class="text-xs text-accent flex items-center gap-1.5 px-2 py-1.5 bg-accent-light/50 border border-accent/15"
        >
          <CheckCircle class="w-3.5 h-3.5 flex-shrink-0" />
          Retour immédiat QCM / vrai-faux
        </p>

        <div
          v-if="evaluation.settings.instructions"
          class="p-3 border border-accent/15 bg-accent-light/25 text-sm text-ink line-clamp-4"
          :title="evaluation.settings.instructions"
        >
          <p class="text-[10px] font-semibold text-accent uppercase mb-1 flex items-center gap-1">
            <FileText class="w-3 h-3" /> Consignes
          </p>
          <p class="text-xs leading-relaxed whitespace-pre-wrap">{{ evaluation.settings.instructions }}</p>
        </div>

        <section v-if="anticheatRules.length" class="space-y-2">
          <p class="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Shield class="w-3.5 h-3.5 text-danger" />
            Règles anti-triche
          </p>
          <ul class="space-y-1.5">
            <li
              v-for="rule in visibleRules"
              :key="rule.id"
              class="px-2.5 py-2 border text-xs leading-snug rounded-sm"
              :class="toneClasses[rule.tone]"
            >
              <span class="font-medium">{{ rule.title }}</span>
              <span v-if="rule.detail && rulesExpanded" class="block mt-0.5 opacity-90">{{
                rule.detail
              }}</span>
            </li>
          </ul>
          <button
            v-if="anticheatRules.length > 2"
            type="button"
            class="text-xs text-accent font-medium flex items-center gap-1 cursor-pointer"
            @click="rulesExpanded = !rulesExpanded"
          >
            <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': rulesExpanded }" />
            {{ rulesExpanded ? 'Réduire' : `Voir tout (${anticheatRules.length})` }}
          </button>
        </section>

        <p class="text-[11px] text-ink-muted leading-relaxed">
          Le chrono démarre à « Commencer » et ne peut pas être mis en pause. En cas de fin du temps,
          vos réponses seront envoyées automatiquement.
        </p>

        <p v-if="startError" class="text-xs text-danger">{{ startError }}</p>
      </div>

      <div class="flex-shrink-0 px-5 py-4 border-t border-line bg-paper/90 pb-safe">
        <AppButton class="w-full" size="lg" :loading="starting" @click="startExam">
          Commencer l’évaluation
          <ArrowRight class="w-4 h-4" />
        </AppButton>
      </div>
    </div>
  </div>
</template>
