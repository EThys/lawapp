<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { EVALUATION_TYPE_LABELS } from '@/types'
import {
  Shield,
  Clock,
  AlertTriangle,
  Monitor,
  Eye,
  Ban,
  ArrowRight,
  FileText,
  CheckCircle,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()

const sessionId = route.params.sessionId as string
const session = computed(() => store.getSession(sessionId))
const evaluation = computed(() =>
  session.value ? store.getById(session.value.evaluationId) : undefined
)

const startError = ref('')
const starting = ref(false)
const ready = ref(false)

const questionCount = computed(() => evaluation.value?.questions.length ?? 0)

const questionBreakdown = computed(() => {
  if (!evaluation.value) return []
  const counts: Record<string, number> = {}
  for (const q of evaluation.value.questions) {
    counts[q.type] = (counts[q.type] || 0) + 1
  }
  const labels: Record<string, string> = {
    qcm: 'QCM',
    truefalse: 'Vrai/Faux',
    short: 'Réponse courte',
    document: 'Dépôt document',
  }
  return Object.entries(counts).map(([type, count]) => ({
    label: labels[type] ?? type,
    count,
  }))
})

const instantFeedback = computed(
  () =>
    evaluation.value?.settings.correctionMode === 'auto' &&
    (evaluation.value?.settings.instantFeedback ?? true)
)

const fullscreenSupported = typeof document.documentElement.requestFullscreen === 'function'

const rules = computed(() => [
  { icon: Eye, text: 'Ne quittez pas l\'onglet : échec immédiat' },
  {
    icon: Monitor,
    text: fullscreenSupported
      ? 'Restez en plein écran pendant toute l\'évaluation'
      : 'Sur mobile, restez dans cet onglet sans changer d\'application',
  },
  { icon: Ban, text: 'Copier-coller et menu contextuel interdits' },
  { icon: Clock, text: `Durée : ${evaluation.value?.durationMinutes ?? '?'} minutes` },
  { icon: Shield, text: 'Les violations sont enregistrées et signalées' },
])

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

  ready.value = true
})
</script>

<template>
  <div
    v-if="ready && session && evaluation"
    class="min-h-dvh bg-brand-dark flex items-start justify-center overflow-y-auto py-6 px-4 sm:items-center sm:p-8"
  >
    <div class="max-w-lg w-full panel-elevated my-auto">
      <div class="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-line">
        <p class="label-caps mb-3">Avant de commencer</p>
        <h1 class="font-display text-2xl text-ink">Passer l'évaluation</h1>
        <p class="text-sm text-ink-muted mt-2">
          Vérifiez les informations ci-dessous. Le chrono démarre dès validation.
        </p>
      </div>

      <div class="px-5 sm:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
        <div class="p-5 bg-paper border border-line">
          <h2 class="font-display text-lg text-ink">{{ evaluation.title }}</h2>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <AppBadge variant="brand">{{ EVALUATION_TYPE_LABELS[evaluation.type] }}</AppBadge>
            <span class="text-xs text-ink-faint">{{ evaluation.subject }}</span>
          </div>
          <p class="text-xs text-ink-muted mt-4 border-t border-line pt-3">
            {{ session.studentLastName }} {{ session.studentFirstName }}
            <span class="text-ink-faint">· {{ session.studentId }}</span>
          </p>
        </div>

        <div class="p-4 border border-line bg-white">
          <div class="flex items-center gap-2 mb-3">
            <FileText class="w-4 h-4 text-accent" />
            <p class="text-sm font-medium text-ink">{{ questionCount }} question{{ questionCount > 1 ? 's' : '' }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="item in questionBreakdown"
              :key="item.label"
              class="text-xs px-2.5 py-1 bg-paper-warm border border-line text-ink-muted"
            >
              {{ item.count }} {{ item.label }}
            </span>
          </div>
          <p
            v-if="instantFeedback"
            class="text-xs text-accent mt-3 flex items-center gap-1.5"
          >
            <CheckCircle class="w-3.5 h-3.5" />
            Retour immédiat activé pour les QCM et vrai/faux
          </p>
        </div>

        <div v-if="evaluation.settings.instructions" class="p-4 bg-accent-light border border-accent/15">
          <p class="text-xs font-medium text-accent uppercase tracking-wide mb-1.5">Consignes</p>
          <p class="text-sm text-accent leading-relaxed">{{ evaluation.settings.instructions }}</p>
        </div>

        <ul class="space-y-3">
          <li
            v-for="(rule, i) in rules"
            :key="i"
            class="flex items-start gap-3 text-sm text-ink-muted"
          >
            <component :is="rule.icon" class="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            {{ rule.text }}
          </li>
        </ul>

        <div class="flex items-start gap-2.5 p-4 bg-danger-bg border border-danger/15">
          <AlertTriangle class="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p class="text-xs text-danger leading-relaxed">
            En lançant le chrono, vous acceptez les règles anti-triche.
            Le temps ne peut pas être mis en pause.
          </p>
        </div>

        <p v-if="startError" class="text-sm text-danger">{{ startError }}</p>
      </div>

      <div class="px-5 sm:px-8 py-5 sm:py-6 border-t border-line bg-paper/50 pb-safe">
        <AppButton class="w-full" size="lg" :loading="starting" @click="startExam">
          Commencer l'évaluation
          <ArrowRight class="w-4 h-4" />
        </AppButton>
      </div>
    </div>
  </div>
</template>
