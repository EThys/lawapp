<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerDetail from '@/components/loading/AppShimmerDetail.vue'
import type { QuizLevelNode, QuizQuestionNode } from '@/api/types'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppProgressBar from '@/components/ui/AppProgressBar.vue'
import { scoreQuizLevel } from '@/utils/quizApiMapper'
import { ArrowLeft, CheckCircle, XCircle } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const quizStore = useQuizStore()
const { showShimmer: quizShimmer } = useServerShimmer(computed(() => quizStore.loading))

const quizId = Number(route.params.id)
const levelIndex = ref(0)
const questionIndex = ref(0)
const selectedOptionId = ref<number | null>(null)
const answers = ref<Record<number, number>>({})
const finished = ref(false)
const score = ref(0)
const maxScore = ref(0)
const progressError = ref('')
const syncingLevel = ref(false)

const levels = computed(() => quizStore.current?.levels ?? [])
const currentLevel = computed(() => levels.value[levelIndex.value])
const questions = computed(() => currentLevel.value?.questions ?? [])
const currentQuestion = computed(() => questions.value[questionIndex.value] as QuizQuestionNode | undefined)

const totalQuestions = computed(() =>
  levels.value.reduce((acc, lvl) => acc + (lvl.questions?.length ?? 0), 0),
)

const answeredCount = computed(() => Object.keys(answers.value).length)

const progress = computed(() =>
  totalQuestions.value ? Math.round((answeredCount.value / totalQuestions.value) * 100) : 0,
)

function levelOrderOf(level: QuizLevelNode | undefined, index: number): number {
  return level?.levelOrder ?? index + 1
}

async function syncLevelCompletion(levelIdx: number) {
  const level = levels.value[levelIdx]
  if (!level || !Number.isFinite(quizId)) return
  const levelScore = scoreQuizLevel(level, answers.value)
  syncingLevel.value = true
  progressError.value = ''
  try {
    const result = await quizStore.recordLevelProgress(quizId, {
      levelOrder: levelOrderOf(level, levelIdx),
      score: levelScore,
    })
    if (!result.ok) {
      progressError.value = result.error
    }
  } finally {
    syncingLevel.value = false
  }
}

function selectOption(optionId: number) {
  selectedOptionId.value = optionId
}

async function nextQuestion() {
  if (!currentQuestion.value || selectedOptionId.value == null || syncingLevel.value) return
  answers.value[currentQuestion.value.id] = selectedOptionId.value
  selectedOptionId.value = null

  if (questionIndex.value < questions.value.length - 1) {
    questionIndex.value++
    return
  }

  // Fin de niveau → enregistrer la progression API
  const completedLevelIdx = levelIndex.value
  await syncLevelCompletion(completedLevelIdx)

  if (levelIndex.value < levels.value.length - 1) {
    levelIndex.value++
    questionIndex.value = 0
    return
  }

  finishQuiz()
}

function finishQuiz() {
  let pts = 0
  let max = 0
  for (const lvl of levels.value) {
    for (const q of lvl.questions ?? []) {
      max += q.point ?? 1
      const chosen = answers.value[q.id]
      const correct = q.options?.find((o) => o.valid)
      if (chosen != null && correct && chosen === correct.id) {
        pts += q.point ?? 1
      }
    }
  }
  score.value = pts
  maxScore.value = max
  finished.value = true
}

onMounted(async () => {
  if (!Number.isFinite(quizId)) {
    await router.replace('/quiz')
    return
  }
  await Promise.all([quizStore.fetchById(quizId), quizStore.fetchProgressOverview()])
  if (!quizStore.current) return

  // Reprendre au niveau suivant le plus haut déjà complété (si connu).
  const saved = quizStore.progressForQuiz(quizId)
  const highest = saved?.highestCompletedLevelOrder
  if (highest != null && highest > 0) {
    const nextIdx = levels.value.findIndex(
      (lvl, i) => levelOrderOf(lvl, i) > highest,
    )
    if (nextIdx >= 0) {
      levelIndex.value = nextIdx
    } else if (saved?.completed) {
      // Tout déjà fait : afficher un récap local
      finishQuiz()
    }
  }

  const firstAnswers = questions.value[0]
  if (firstAnswers && answers.value[firstAnswers.id]) {
    selectedOptionId.value = answers.value[firstAnswers.id]
  }
})

onUnmounted(() => {
  quizStore.clearCurrent()
})
</script>

<template>
  <div class="min-h-screen bg-paper flex flex-col">
    <header class="border-b border-line bg-white px-4 py-4">
      <div class="max-w-2xl mx-auto flex items-center gap-3">
        <RouterLink to="/quiz" class="text-ink-muted hover:text-ink">
          <ArrowLeft class="w-5 h-5" />
        </RouterLink>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-ink-faint uppercase tracking-wide">Quiz</p>
          <h1 class="font-display text-lg text-ink truncate">{{ quizStore.current?.title ?? '…' }}</h1>
        </div>
        <AppBadge v-if="currentLevel" variant="muted">{{ currentLevel.title }}</AppBadge>
      </div>
    </header>

    <main class="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
      <AppShimmerDetail v-if="quizShimmer" />
      <div v-else-if="quizStore.error" class="p-4 bg-danger-bg border border-danger/20 text-sm text-danger">
        {{ quizStore.error }}
      </div>

      <div v-else-if="finished" class="space-y-6 text-center py-10">
        <CheckCircle class="w-14 h-14 mx-auto text-success" />
        <h2 class="font-display text-2xl text-ink">Quiz terminé</h2>
        <p class="text-3xl font-bold text-accent">{{ score }} / {{ maxScore }}</p>
        <p class="text-sm text-ink-muted">
          {{ Math.round(maxScore ? (score / maxScore) * 100 : 0) }} % de bonnes réponses
        </p>
        <p v-if="progressError" class="text-xs text-warning">
          Score local enregistré ; synchronisation serveur : {{ progressError }}
        </p>
        <RouterLink to="/quiz">
          <AppButton variant="outline">Retour aux quiz</AppButton>
        </RouterLink>
      </div>

      <div v-else-if="currentQuestion" class="space-y-6">
        <AppProgressBar :value="progress" />

        <p class="text-xs text-ink-faint">
          Question {{ questionIndex + 1 }} / {{ questions.length }}
          · Niveau {{ levelIndex + 1 }} / {{ levels.length }}
        </p>

        <h2 class="font-display text-xl text-ink leading-snug">{{ currentQuestion.title }}</h2>

        <div class="space-y-2">
          <button
            v-for="opt in currentQuestion.options ?? []"
            :key="opt.id"
            type="button"
            class="w-full text-left p-4 border transition-all"
            :class="
              selectedOptionId === opt.id
                ? 'border-accent bg-accent-light ring-1 ring-accent'
                : 'border-line bg-white hover:border-line-strong'
            "
            @click="selectOption(opt.id)"
          >
            {{ opt.option }}
          </button>
        </div>

        <p v-if="progressError" class="text-xs text-warning">{{ progressError }}</p>

        <AppButton
          class="w-full"
          :disabled="selectedOptionId == null || syncingLevel"
          :loading="syncingLevel"
          @click="nextQuestion"
        >
          {{
            levelIndex === levels.length - 1 && questionIndex === questions.length - 1
              ? 'Terminer'
              : 'Suivant'
          }}
        </AppButton>
      </div>

      <div v-else class="text-center py-12 text-ink-muted">
        <XCircle class="w-10 h-10 mx-auto mb-3 opacity-50" />
        Ce quiz ne contient pas de questions.
      </div>
    </main>
  </div>
</template>
