<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import { isApiEnabled } from '@/config/features'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppStepper from '@/components/ui/AppStepper.vue'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'
import { extractQuizId } from '@/utils/quizApiMapper'
import type { QuizLevelRequest, QuizQuestionRequest, QuizOptionRequest } from '@/api/types'
import { toQuizOptionPayload } from '@/utils/quizApiMapper'
import { AlertCircle, ArrowLeft, Plus, Trash2, Check, RefreshCw } from '@lucide/vue'

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

const steps = ['Informations du quiz', 'Niveaux et questions', 'Publication']

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

const step = ref(0)
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

const totalQuestions = computed(() =>
  levels.value.reduce((acc, lvl) => acc + lvl.questions.length, 0),
)

const summaryLevels = computed(() =>
  levels.value.map((level, li) => ({
    order: level.levelOrder ?? li + 1,
    title: level.title.trim() || `Niveau ${li + 1}`,
    questionCount: level.questions.length,
  })),
)

watch(
  () => quizStore.notionTypes,
  (types) => {
    if (notionTypeId.value || types.length !== 1) return
    notionTypeId.value = String(types[0].id)
  },
  { immediate: true },
)

onMounted(() => {
  if (isApiEnabled()) void quizStore.fetchNotionTypes()
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

function validateMeta(): boolean {
  error.value = ''
  const missing: string[] = []
  if (!title.value.trim()) missing.push('Titre')
  if (!notionTypeId.value) missing.push('Type de notion')
  if (missing.length) {
    error.value = missingFieldsMessage(missing)
    return false
  }
  return true
}

function validateLevels(): boolean {
  error.value = ''
  if (!levels.value.length) {
    error.value = 'Au moins un niveau est requis.'
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
        error.value = `Question « ${q.title} » : deux options identiques (« ${dup} »).`
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

function validateAll(): boolean {
  return validateMeta() && validateLevels()
}

function goNext() {
  dismissKeyboard()
  error.value = ''
  if (step.value === 0 && !validateMeta()) return
  if (step.value === 1 && !validateLevels()) return
  if (step.value < steps.length - 1) step.value++
}

function goBack() {
  error.value = ''
  if (step.value > 0) step.value--
}

async function handleSubmit() {
  dismissKeyboard()
  success.value = ''
  if (!validateAll()) {
    if (!title.value.trim() || !notionTypeId.value) step.value = 0
    else step.value = 1
    return
  }

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
  const id = extractQuizId(result.quiz)
  setTimeout(() => {
    if (id) void router.push(`/quiz/${id}`)
    else void router.push('/quiz')
  }, 800)
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
    <RouterLink
      to="/quiz"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour aux quiz
    </RouterLink>

    <div>
      <h1 class="font-display text-3xl text-ink mb-1">Créer un quiz</h1>
      <p class="text-sm text-ink-muted leading-relaxed">
        Structure alignée sur l’API : quiz (titre, type de notion), niveaux, questions et options
        (champ <code class="text-accent">goal</code> = bonne réponse).
      </p>
    </div>

    <div
      v-if="!isApiEnabled()"
      class="p-4 border border-line bg-white text-sm text-ink-muted"
    >
      Mode API désactivé. Activez <code class="text-accent">VITE_USE_API=true</code> pour publier en
      ligne.
    </div>

    <template v-else>
      <AppStepper :steps="steps" :current="step" />

      <Transition name="step" mode="out-in">
        <section v-if="step === 0" key="meta" class="space-y-4 p-5 border border-line bg-white">
          <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">QuizRequest</p>
          <AppInput
            v-model="title"
            label="Titre"
            placeholder="Quiz droit civil - niveau débutant"
            required
          />
          <div class="space-y-2">
            <AppSelect
              v-if="notionOptions.length"
              v-model="notionTypeId"
              label="Type de notion (notionTypeId)"
              :options="notionOptions"
              placeholder="Choisir un type (Droit, Info…)"
              required
              :disabled="quizStore.notionTypesLoading"
            />
            <div class="flex flex-wrap items-center gap-2">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                :loading="quizStore.notionTypesLoading"
                @click="quizStore.fetchNotionTypes()"
              >
                <RefreshCw class="w-4 h-4" />
                Recharger les types
              </AppButton>
              <p v-if="quizStore.notionTypesLoading" class="text-xs text-ink-muted">
                Chargement des types…
              </p>
              <p
                v-else-if="!notionOptions.length && quizStore.error"
                class="text-xs text-danger"
              >
                {{ quizStore.error }}
              </p>
            </div>
            <AppInput
              v-if="!notionOptions.length && !quizStore.notionTypesLoading"
              v-model="notionTypeId"
              label="Identifiant type (notionTypeId)"
              type="number"
              placeholder="Ex. 1"
              hint="Si la liste est vide, saisissez l’ID connu côté backend."
              required
            />
          </div>
          <AppTextarea
            v-model="description"
            label="Description (optionnel)"
            placeholder="Présentation courte du quiz"
            :rows="3"
          />
        </section>

        <div v-else-if="step === 1" key="levels" class="space-y-4">
          <p class="text-sm text-ink-muted">
            Au moins un niveau, une question par niveau, au minimum deux options par question. Une
            seule option marquée ✓ (goal).
          </p>

          <section
            v-for="(level, li) in levels"
            :key="level.key"
            class="space-y-4 p-5 border border-line bg-white"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-ink">
                Niveau {{ li + 1 }}
                <span class="text-xs font-normal text-ink-muted">(levelOrder {{ level.levelOrder }})</span>
              </h2>
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
                <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">
                  Question {{ qi + 1 }}
                </p>
                <button
                  v-if="level.questions.length > 1"
                  type="button"
                  class="text-xs text-danger hover:underline"
                  @click="removeQuestion(level, qi)"
                >
                  Supprimer
                </button>
              </div>
              <AppInput
                v-model="question.title"
                label="Énoncé"
                placeholder="Quelle est la définition de…"
                required
              />
              <AppInput v-model="question.point" label="Points (point)" type="number" />

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
                    :class="
                      opt.goal
                        ? 'border-accent bg-accent-light text-accent'
                        : 'border-line bg-white text-ink-faint'
                    "
                    :title="opt.goal ? 'Bonne réponse (goal)' : 'Marquer comme bonne réponse'"
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
        </div>

        <section v-else key="publish" class="space-y-4 p-5 border border-line bg-white">
          <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">Aperçu</p>
          <dl class="grid gap-2 text-sm">
            <div class="flex gap-2">
              <dt class="text-ink-muted shrink-0">Titre</dt>
              <dd class="text-ink font-medium">{{ title || 'Non renseigné' }}</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-ink-muted shrink-0">Type</dt>
              <dd class="text-ink">
                {{
                  notionOptions.find((o) => o.value === notionTypeId)?.label ||
                  (notionTypeId ? `#${notionTypeId}` : 'Non choisi')
                }}
              </dd>
            </div>
            <div v-if="description.trim()" class="flex gap-2">
              <dt class="text-ink-muted shrink-0">Description</dt>
              <dd class="text-ink">{{ description }}</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-ink-muted shrink-0">Contenu</dt>
              <dd class="text-ink">
                {{ levels.length }} niveau(x), {{ totalQuestions }} question(s)
              </dd>
            </div>
          </dl>
          <ul class="text-sm text-ink-muted space-y-1 border-t border-line pt-3">
            <li v-for="lvl in summaryLevels" :key="lvl.order">
              {{ lvl.title }} · {{ lvl.questionCount }} question(s)
            </li>
          </ul>
          <p class="text-xs text-ink-muted">
            Envoi via <code class="text-accent">POST /v1/private/quiz</code> avec le corps
            QuizRequest.
          </p>
        </section>
      </Transition>

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

      <div class="flex flex-col-reverse sm:flex-row gap-3">
        <AppButton v-if="step > 0" type="button" variant="outline" class="sm:flex-1" @click="goBack">
          Étape précédente
        </AppButton>
        <AppButton
          v-if="step < steps.length - 1"
          type="button"
          class="sm:flex-1"
          @click="goNext"
        >
          Étape suivante
        </AppButton>
        <AppButton
          v-else
          class="sm:flex-1"
          :loading="quizStore.creating"
          @click="handleSubmit"
        >
          Publier le quiz
        </AppButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.step-enter-from,
.step-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
