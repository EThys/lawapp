<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'
import type { QuizOptionRequest, QuizQuestionRequest } from '@/api/types'
import { toQuizOptionPayload } from '@/utils/quizApiMapper'
import { AlertCircle, ArrowLeft, Plus, Trash2, Check, HelpCircle } from '@lucide/vue'

interface OptionDraft extends QuizOptionRequest {
  key: string
}

interface QuestionDraft extends Omit<QuizQuestionRequest, 'options' | 'point'> {
  key: string
  point: number
  options: OptionDraft[]
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

const router = useRouter()
const quizStore = useQuizStore()

const title = ref('')
const description = ref('')
const questions = ref<QuestionDraft[]>([emptyQuestion()])
const error = ref('')
const success = ref('')

function addQuestion() {
  questions.value.push(emptyQuestion())
}

function removeQuestion(index: number) {
  if (questions.value.length <= 1) return
  questions.value.splice(index, 1)
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
  if (!questions.value.length) missing.push('Questions')
  if (missing.length) {
    error.value = missingFieldsMessage(missing)
    return false
  }

  for (let qi = 0; qi < questions.value.length; qi++) {
    const q = questions.value[qi]
    if (!q.title.trim()) {
      error.value = `Question ${qi + 1} : intitulé requis.`
      return false
    }
    const filled = q.options.filter((o) => o.option.trim())
    if (filled.length < 2) {
      error.value = `Question « ${q.title} » : au moins 2 options.`
      return false
    }
    const labels = filled.map((o) => o.option.trim().toLowerCase())
    const dup = labels.find((l, i) => labels.indexOf(l) !== i)
    if (dup) {
      error.value = `Question « ${q.title} » : options en double (« ${dup} »).`
      return false
    }
    const goalCount = filled.filter((o) => o.goal).length
    if (goalCount !== 1) {
      error.value = `Question « ${q.title} » : cochez exactement une bonne réponse.`
      return false
    }
  }
  return true
}

async function handleSubmit() {
  dismissKeyboard()
  success.value = ''
  if (!validate()) return

  // API quiz : enveloppe en un niveau unique (Niveau 1).
  const payload = {
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    notionTypeId: 1,
    levels: [
      {
        title: 'Niveau 1',
        levelOrder: 1,
        questions: questions.value.map((q) => ({
          title: q.title.trim(),
          point: Number(q.point) > 0 ? Number(q.point) : 1,
          options: q.options
            .filter((o) => o.option.trim())
            .map((o) => toQuizOptionPayload(o.option, !!o.goal)),
        })),
      },
    ],
  }

  const result = await quizStore.createQuiz(payload)
  if (!result.ok) {
    error.value = result.error
    return
  }

  success.value = 'Quiz simple publié.'
  const id = 'id' in result.quiz ? result.quiz.id : null
  setTimeout(() => {
    if (id) void router.push(`/quiz/${id}`)
    else void router.push('/quiz')
  }, 800)
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <header class="border-b border-line bg-white">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <RouterLink
          to="/teacher"
          class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft class="w-4 h-4" />
          Tableau de bord
        </RouterLink>
        <span class="font-display text-lg text-ink">Quiz simple</span>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div class="p-4 border border-accent/20 bg-accent-light/40">
        <p class="text-sm text-ink flex items-start gap-2">
          <HelpCircle class="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span>
            Quiz à choix multiple (QCM). Pour chaque question, cochez
            <strong>exactement une</strong> bonne réponse (bouton ✓).
          </span>
        </p>
      </div>

      <section class="space-y-4 p-5 border border-line bg-white">
        <AppInput v-model="title" label="Titre" placeholder="Qui est la" required />
        <AppTextarea
          v-model="description"
          label="Description"
          placeholder="Description courte (optionnel)"
          :rows="2"
        />
      </section>

      <section
        v-for="(question, qi) in questions"
        :key="question.key"
        class="space-y-3 p-5 border border-line bg-white"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">
            Question {{ qi + 1 }}
          </p>
          <button
            v-if="questions.length > 1"
            type="button"
            class="text-xs text-danger hover:underline"
            @click="removeQuestion(qi)"
          >
            Supprimer
          </button>
        </div>
        <AppInput v-model="question.title" label="Énoncé" placeholder="Elie" required />
        <AppInput v-model="question.point" label="Points" type="number" />

        <div class="space-y-2">
          <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">
            Options (une seule bonne réponse)
          </p>
          <div
            v-for="(opt, oi) in question.options"
            :key="opt.key"
            class="flex items-center gap-2"
          >
            <button
              type="button"
              class="shrink-0 w-9 h-9 border flex items-center justify-center transition-colors"
              :class="
                opt.goal
                  ? 'border-accent bg-accent-light text-accent'
                  : 'border-line bg-white text-ink-faint'
              "
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
      </section>

      <AppButton type="button" variant="outline" class="w-full" @click="addQuestion">
        <Plus class="w-4 h-4" />
        Ajouter une question
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
        Publier le quiz simple
      </AppButton>

      <p class="text-center text-xs text-ink-muted">
        Besoin de plusieurs niveaux ?
        <RouterLink to="/quiz/create" class="text-accent font-medium hover:underline">
          Quiz multi-niveaux
        </RouterLink>
      </p>
    </main>
  </div>
</template>
