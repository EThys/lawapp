<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'
import type { QuizLevelRequest, QuizQuestionRequest, QuizOptionRequest } from '@/api/types'
import { toQuizOptionPayload } from '@/utils/quizApiMapper'
import { AlertCircle, ArrowLeft, Plus, Trash2, Check } from '@lucide/vue'

interface OptionDraft extends QuizOptionRequest {
  key: string
}

interface QuestionDraft extends Omit<QuizQuestionRequest, 'options' | 'point'> {
  key: string
  point: number
  options: OptionDraft[]
}

interface LevelDraft extends Omit<QuizLevelRequest, 'questions'> {
  key: string
  questions: QuestionDraft[]
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyOption(goal = false): OptionDraft {
  return { key: uid(), option: '', goal }
}

function emptyQuestion(): QuestionDraft {
  return {
    key: uid(),
    title: '',
    point: 1,
    options: [emptyOption(true), emptyOption(false), emptyOption(false), emptyOption(false)],
  }
}

function emptyLevel(order: number): LevelDraft {
  return {
    key: uid(),
    title: `Niveau ${order}`,
    levelOrder: order,
    questions: [emptyQuestion()],
  }
}

const router = useRouter()
const quizStore = useQuizStore()

const title = ref('')
const description = ref('')
const notionTypeId = ref('')
const levels = ref<LevelDraft[]>([emptyLevel(1)])
const error = ref('')
const success = ref('')

const notionOptions = computed(() =>
  quizStore.notionTypes.map((t) => ({
    value: String(t.id),
    label: t.label || t.code || `Type #${t.id}`,
  })),
)

onMounted(() => {
  void quizStore.fetchNotionTypes()
})

function addLevel() {
  levels.value.push(emptyLevel(levels.value.length + 1))
}

function removeLevel(index: number) {
  if (levels.value.length <= 1) return
  levels.value.splice(index, 1)
  levels.value.forEach((l, i) => {
    l.levelOrder = i + 1
  })
}

function addQuestion(level: LevelDraft) {
  level.questions.push(emptyQuestion())
}

function removeQuestion(level: LevelDraft, qIndex: number) {
  if (level.questions.length <= 1) return
  level.questions.splice(qIndex, 1)
}

function addOption(question: QuestionDraft) {
  question.options.push(emptyOption(false))
}

function removeOption(question: QuestionDraft, oIndex: number) {
  if (question.options.length <= 2) return
  const wasGoal = question.options[oIndex]?.goal
  question.options.splice(oIndex, 1)
  if (wasGoal && question.options.length) question.options[0].goal = true
}

function setCorrectOption(question: QuestionDraft, oIndex: number) {
  question.options.forEach((o, i) => {
    o.goal = i === oIndex
  })
}

function validate(): boolean {
  error.value = ''
  const missing: string[] = []
  if (!title.value.trim()) missing.push('Titre')
  if (!notionTypeId.value) missing.push('Type de notion')
  if (!levels.value.length) missing.push('Niveaux')
  if (missing.length) {
    error.value = missingFieldsMessage(missing)
    return false
  }

  for (let li = 0; li < levels.value.length; li++) {
    const level = levels.value[li]
    if (!level.title.trim()) {
      error.value = `Le titre du niveau ${li + 1} est requis.`
      return false
    }
    if (!level.questions.length) {
      error.value = `Le niveau « ${level.title} » doit contenir au moins une question.`
      return false
    }
    for (let qi = 0; qi < level.questions.length; qi++) {
      const q = level.questions[qi]
      if (!q.title.trim()) {
        error.value = `Question ${qi + 1} du niveau « ${level.title} » : intitulé requis.`
        return false
      }
      const filled = q.options.filter((o) => o.option.trim())
      if (filled.length < 2) {
        error.value = `Question « ${q.title} » : au moins 2 options renseignées.`
        return false
      }
      const labels = filled.map((o) => o.option.trim().toLowerCase())
      const dup = labels.find((l, i) => labels.indexOf(l) !== i)
      if (dup) {
        error.value = `Question « ${q.title} » : deux options identiques (« ${dup} »). Chaque option doit être unique.`
        return false
      }
      const goalCount = filled.filter((o) => o.goal).length
      if (goalCount !== 1) {
        error.value = `Question « ${q.title} » : exactement une bonne réponse (✓) est requise.`
        return false
      }
    }
  }
  return true
}

async function handleSubmit() {
  dismissKeyboard()
  success.value = ''
  if (!validate()) return

  const payload = {
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    notionTypeId: Number(notionTypeId.value),
    levels: levels.value.map((level, li) => ({
      title: level.title.trim(),
      levelOrder: level.levelOrder ?? li + 1,
      questions: level.questions.map((q) => ({
        title: q.title.trim(),
        point: Number(q.point) > 0 ? Number(q.point) : 1,
        options: q.options
          .filter((o) => o.option.trim())
          .map((o) => toQuizOptionPayload(o.option, !!o.goal)),
      })),
    })),
  }

  const result = await quizStore.createQuiz(payload)
  if (!result.ok) {
    error.value = result.error
    return
  }

  success.value = 'Quiz publié.'
  const id = 'id' in result.quiz ? result.quiz.id : null
  setTimeout(() => {
    if (id) void router.push(`/quiz/${id}`)
    else void router.push('/quiz')
  }, 800)
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
    <RouterLink
      to="/teacher"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour au tableau de bord
    </RouterLink>

    <div>
      <h1 class="font-display text-3xl text-ink mb-1">Créer un quiz</h1>
      <p class="text-sm text-ink-muted">
        QCM par niveaux (un seul niveau = quiz simple). Chaque question : exactement une bonne réponse (✓).
      </p>
    </div>

      <section class="space-y-4 p-5 border border-line bg-white">
        <AppInput v-model="title" label="Titre" placeholder="Quiz droit civil - niveau débutant" required />
        <AppSelect
          v-model="notionTypeId"
          label="Type de notion"
          :options="notionOptions"
          placeholder="Choisir un type (Droit, Info…)"
          required
          :hint="
            notionOptions.length
              ? undefined
              : 'Aucun type chargé. Rechargez la page ou créez un type via l’API notion-types.'
          "
        />
        <AppTextarea
          v-model="description"
          label="Description"
          placeholder="Présentation courte du quiz (optionnel)"
          :rows="3"
        />
      </section>

      <section
        v-for="(level, li) in levels"
        :key="level.key"
        class="space-y-4 p-5 border border-line bg-white"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold text-ink">Niveau {{ li + 1 }}</h2>
          <AppButton
            v-if="levels.length > 1"
            type="button"
            variant="ghost"
            size="sm"
            @click="removeLevel(li)"
          >
            <Trash2 class="w-4 h-4" />
            Retirer
          </AppButton>
        </div>
        <AppInput v-model="level.title" label="Titre du niveau" placeholder="Débutant" required />

        <div
          v-for="(question, qi) in level.questions"
          :key="question.key"
          class="space-y-3 p-4 border border-line bg-paper-warm/40"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">Question {{ qi + 1 }}</p>
            <button
              v-if="level.questions.length > 1"
              type="button"
              class="text-xs text-danger hover:underline"
              @click="removeQuestion(level, qi)"
            >
              Supprimer
            </button>
          </div>
          <AppInput v-model="question.title" label="Énoncé" placeholder="Quelle est la définition de…" required />
          <AppInput v-model="question.point" label="Points" type="number" />

          <div class="space-y-2">
            <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">Options</p>
            <div
              v-for="(opt, oi) in question.options"
              :key="opt.key"
              class="flex items-center gap-2"
            >
              <button
                type="button"
                class="shrink-0 w-9 h-9 border flex items-center justify-center transition-colors"
                :class="opt.goal ? 'border-accent bg-accent-light text-accent' : 'border-line bg-white text-ink-faint'"
                :title="opt.goal ? 'Bonne réponse' : 'Marquer comme bonne réponse'"
                @click="setCorrectOption(question, oi)"
              >
                <Check class="w-4 h-4" />
              </button>
              <input
                v-model="opt.option"
                type="text"
                :placeholder="`Option ${oi + 1}`"
                class="flex-1 px-3.5 py-2.5 border border-line bg-white text-sm min-h-11 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
              <button
                v-if="question.options.length > 2"
                type="button"
                class="text-ink-faint hover:text-danger p-2"
                @click="removeOption(question, oi)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              class="text-xs text-accent font-medium hover:underline"
              @click="addOption(question)"
            >
              + Ajouter une option
            </button>
          </div>
        </div>

        <AppButton type="button" variant="outline" size="sm" @click="addQuestion(level)">
          <Plus class="w-4 h-4" />
          Question
        </AppButton>
      </section>

      <AppButton type="button" variant="outline" class="w-full" @click="addLevel">
        <Plus class="w-4 h-4" />
        Ajouter un niveau
      </AppButton>

      <div
        v-if="error"
        class="flex items-start gap-2.5 p-4 bg-danger-bg border border-danger/20 text-sm text-danger"
      >
        <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
        {{ error }}
      </div>
      <div v-if="success" class="p-4 bg-accent-light border border-accent/20 text-sm text-accent">
        {{ success }}
      </div>

      <AppButton class="w-full" :loading="quizStore.creating" @click="handleSubmit">
        Publier le quiz
      </AppButton>
  </div>
</template>
