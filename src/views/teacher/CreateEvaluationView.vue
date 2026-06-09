<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppStepper from '@/components/ui/AppStepper.vue'
import { EVALUATION_TYPE_LABELS, type EvaluationType, type Question, type QuestionType } from '@/types'
import { generateId, toDateInputValue, fromDateInputValue, formatEvaluationPeriod } from '@/utils/helpers'
import { getTodayDateString } from '@/utils/access'
import { useCourseStore } from '@/stores/courses'
import type { CorrectionMode } from '@/types'
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronLeft, ChevronRight, CalendarClock, Users, UserCheck, FileUp } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()
const auth = useAuthStore()
const courseStore = useCourseStore()

const isEditing = computed(() => !!route.params.id && route.name === 'teacher-edit')
const editId = computed(() => route.params.id as string | undefined)

const step = ref(0)
const steps = ['Informations', 'Questions', 'Sécurité & publication']

const title = ref('')
const description = ref('')
const subject = ref('')
const type = ref<EvaluationType>('interro')
const durationMinutes = ref(30)
const instructions = ref('')
const shuffleQuestions = ref(false)
const maxAttempts = ref(1)
const passingScore = ref(50)
const failOnTabSwitch = ref(true)
const failOnWindowBlur = ref(true)
const blockCopyPaste = ref(true)
const requireFullscreen = ref(true)
const maxViolations = ref(2)
const scheduleEnabled = ref(false)
const availableFromDate = ref('')
const availableUntilDate = ref('')
const allowDocumentUpload = ref(false)
const correctionMode = ref<CorrectionMode>('auto')
const showCorrectAnswers = ref(true)
const instantFeedback = ref(true)
const showResultsImmediately = ref(true)
const useClassroom = ref(false)
const courseId = ref<string | null>(null)
const presentOnly = ref(false)
const sessionDate = ref(getTodayDateString())

const teacherCourses = computed(() =>
  auth.currentUser ? courseStore.getCoursesForTeacher(auth.currentUser.id) : []
)

const questions = ref<Question[]>([createEmptyQuestion('qcm')])
const errors = ref<string[]>([])

function createEmptyQuestion(qType: QuestionType): Question {
  if (qType === 'qcm') {
    return {
      id: generateId(),
      type: 'qcm',
      text: '',
      points: 1,
      options: [
        { id: generateId(), text: '', isCorrect: true },
        { id: generateId(), text: '', isCorrect: false },
        { id: generateId(), text: '', isCorrect: false },
        { id: generateId(), text: '', isCorrect: false },
      ],
    }
  }
  if (qType === 'truefalse') {
    return { id: generateId(), type: 'truefalse', text: '', points: 1, correctAnswer: true }
  }
  if (qType === 'document') {
    return { id: generateId(), type: 'document', text: '', points: 1 }
  }
  return { id: generateId(), type: 'short', text: '', points: 1, correctAnswer: '' }
}

function createClassroom() {
  if (!auth.currentUser) return
  const cls = courseStore.createCourse({
    teacherId: auth.currentUser.id,
    teacherName: `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
    name: 'Ma salle',
    subject: subject.value.trim() || 'Général',
  })
  useClassroom.value = true
  courseId.value = cls.id
}

watch(useClassroom, (enabled) => {
  if (!enabled) {
    courseId.value = null
    presentOnly.value = false
  } else if (!courseId.value && teacherCourses.value.length === 1) {
    courseId.value = teacherCourses.value[0].id
  }
})

onMounted(() => {
  if (isEditing.value && editId.value) {
    const eval_ = store.getById(editId.value)
    if (eval_) {
      title.value = eval_.title
      description.value = eval_.description
      subject.value = eval_.subject
      type.value = eval_.type
      durationMinutes.value = eval_.durationMinutes
      instructions.value = eval_.settings.instructions
      shuffleQuestions.value = eval_.settings.shuffleQuestions
      maxAttempts.value = eval_.settings.maxAttempts
      passingScore.value = eval_.settings.passingScore
      allowDocumentUpload.value = eval_.settings.allowDocumentUpload ?? false
      correctionMode.value = eval_.settings.correctionMode ?? 'auto'
      showCorrectAnswers.value = eval_.settings.showCorrectAnswers ?? true
      instantFeedback.value = eval_.settings.instantFeedback ?? true
      showResultsImmediately.value = eval_.settings.showResultsImmediately
      failOnTabSwitch.value = eval_.antiCheat.failOnTabSwitch
      failOnWindowBlur.value = eval_.antiCheat.failOnWindowBlur
      blockCopyPaste.value = eval_.antiCheat.blockCopyPaste
      requireFullscreen.value = eval_.antiCheat.requireFullscreen
      maxViolations.value = eval_.antiCheat.maxViolations
      questions.value = JSON.parse(JSON.stringify(eval_.questions))
      if (eval_.availableFrom || eval_.availableUntil) {
        scheduleEnabled.value = true
        availableFromDate.value = toDateInputValue(eval_.availableFrom)
        availableUntilDate.value = toDateInputValue(eval_.availableUntil ?? null)
      }
      courseId.value = eval_.courseId ?? null
      useClassroom.value = !!eval_.courseId
      presentOnly.value = eval_.presentOnly ?? false
      sessionDate.value = eval_.sessionDate ?? getTodayDateString()
    }
  }
})

function addQuestion(qType: QuestionType) {
  questions.value.push(createEmptyQuestion(qType))
}

function removeQuestion(index: number) {
  if (questions.value.length > 1) questions.value.splice(index, 1)
}

function setCorrectOption(qIndex: number, optIndex: number) {
  questions.value[qIndex].options?.forEach((o, i) => {
    o.isCorrect = i === optIndex
  })
}

function addOption(qIndex: number) {
  questions.value[qIndex].options?.push({ id: generateId(), text: '', isCorrect: false })
}

function removeOption(qIndex: number, optIndex: number) {
  const opts = questions.value[qIndex].options
  if (opts && opts.length > 2) opts.splice(optIndex, 1)
}

function validateStep(current: number): boolean {
  errors.value = []
  if (current === 0) {
    if (!title.value.trim()) errors.value.push('Le titre est requis.')
    if (!subject.value.trim()) errors.value.push('La matière est requise.')
    if (Number(durationMinutes.value) < 1) errors.value.push('La durée doit être d\'au moins 1 minute.')
    if (scheduleEnabled.value && !availableFromDate.value && !availableUntilDate.value) {
      errors.value.push('Indiquez au moins une date de début ou de fin.')
    }
    if (scheduleEnabled.value && availableFromDate.value && availableUntilDate.value) {
      if (availableUntilDate.value < availableFromDate.value) {
        errors.value.push('La date limite doit être après la date de début.')
      }
    }
  }
  if (current === 1) {
    if (questions.value.some((q) => !q.text.trim())) errors.value.push('Toutes les questions doivent avoir un texte.')
    if (questions.value.some((q) => q.type === 'qcm' && !q.options?.some((o) => o.isCorrect))) {
      errors.value.push('Chaque QCM doit avoir une bonne réponse.')
    }
    if (questions.value.some((q) => q.type === 'truefalse' && q.correctAnswer === undefined)) {
      errors.value.push('Chaque question vrai/faux doit avoir une bonne réponse.')
    }
  }
  return errors.value.length === 0
}

function nextStep() {
  if (!validateStep(step.value)) return
  if (step.value < steps.length - 1) step.value++
}

function prevStep() {
  errors.value = []
  if (step.value > 0) step.value--
}

function buildData() {
  const availableFrom = scheduleEnabled.value ? fromDateInputValue(availableFromDate.value) : null
  const availableUntil = scheduleEnabled.value ? fromDateInputValue(availableUntilDate.value, true) : null
  return {
    title: title.value.trim(),
    description: description.value.trim(),
    type: type.value,
    durationMinutes: Number(durationMinutes.value),
    subject: subject.value.trim(),
    questions: questions.value.map((q) => ({ ...q, points: Number(q.points) })),
    availableFrom,
    availableUntil,
    courseId: useClassroom.value ? courseId.value : null,
    requireEnrollment: useClassroom.value && !!courseId.value,
    presentOnly: useClassroom.value && presentOnly.value && !!courseId.value,
    sessionDate: useClassroom.value && presentOnly.value && courseId.value ? sessionDate.value : null,
    antiCheat: {
      failOnTabSwitch: failOnTabSwitch.value,
      failOnWindowBlur: failOnWindowBlur.value,
      blockCopyPaste: blockCopyPaste.value,
      blockContextMenu: true,
      requireFullscreen: requireFullscreen.value,
      maxViolations: Number(maxViolations.value),
      detectDevTools: true,
    },
    settings: {
      shuffleQuestions: shuffleQuestions.value,
      showResultsImmediately: showResultsImmediately.value,
      showCorrectAnswers: correctionMode.value === 'auto' && showCorrectAnswers.value,
      instantFeedback: correctionMode.value === 'auto' && instantFeedback.value,
      correctionMode: correctionMode.value,
      allowDocumentUpload: allowDocumentUpload.value,
      allowReview: false,
      maxAttempts: Number(maxAttempts.value),
      passingScore: Number(passingScore.value),
      instructions: instructions.value,
    },
  }
}

watch(correctionMode, (mode) => {
  if (mode === 'auto') {
    showCorrectAnswers.value = true
    instantFeedback.value = true
  }
})

function save(asDraft = true) {
  if (!validateStep(0) || !validateStep(1)) {
    step.value = errors.value.some((e) => e.includes('question') || e.includes('QCM')) ? 1 : 0
    return
  }

  const data = buildData()

  if (isEditing.value && editId.value) {
    store.updateEvaluation(editId.value, { ...data, status: asDraft ? 'draft' : 'active' })
    router.push(`/teacher/evaluation/${editId.value}`)
  } else {
    const user = auth.currentUser!
    const evaluation = store.createEvaluation({
      ...data,
      teacherId: user.id,
      teacherName: `${user.firstName} ${user.lastName}`,
    })
    if (!asDraft) {
      store.updateEvaluation(evaluation.id, { status: 'active' })
    }
    router.push(`/teacher/evaluation/${evaluation.id}`)
  }
}

const scheduledLabel = computed(() => {
  if (!scheduleEnabled.value) return 'Ouverte sans limite de dates'
  return formatEvaluationPeriod({
    availableFrom: availableFromDate.value ? fromDateInputValue(availableFromDate.value) : null,
    availableUntil: availableUntilDate.value ? fromDateInputValue(availableUntilDate.value, true) : null,
  })
})

const evaluationTypes = Object.entries(EVALUATION_TYPE_LABELS) as [EvaluationType, string][]
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <RouterLink
      to="/teacher"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour au tableau de bord
    </RouterLink>

    <h1 class="font-display text-3xl text-ink mb-1">
      {{ isEditing ? 'Modifier l\'évaluation' : 'Créer une évaluation' }}
    </h1>
    <p class="text-sm text-ink-muted mb-6">
      Étape {{ step + 1 }} sur {{ steps.length }} · {{ steps[step] }}
    </p>

    <AppStepper :steps="steps" :current="step" />

    <div v-if="errors.length" class="mb-6 p-4 bg-danger-bg border border-danger/20">
      <ul class="list-disc list-inside text-sm text-danger space-y-1">
        <li v-for="err in errors" :key="err">{{ err }}</li>
      </ul>
    </div>

    <Transition name="step" mode="out-in">
      <div :key="step">
    <!-- Step 1 -->
    <AppCard v-if="step === 0" title="Informations générales">
      <div class="space-y-4">
        <AppInput v-model="title" label="Titre" placeholder="Interro n°3, chapitre 5" required />
        <AppTextarea v-model="description" label="Description" placeholder="Description optionnelle..." />
        <div class="grid sm:grid-cols-2 gap-4">
          <AppInput v-model="subject" label="Matière" placeholder="Mathématiques" required />
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-ink-muted uppercase tracking-wide">Type d'évaluation</label>
            <select
              v-model="type"
              class="w-full px-3.5 py-2.5 border border-line bg-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
            >
              <option v-for="[val, label] in evaluationTypes" :key="val" :value="val">{{ label }}</option>
            </select>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <AppInput v-model="durationMinutes" label="Durée (minutes)" type="number" required />
          <AppInput v-model="passingScore" label="Score de passage (%)" type="number" />
        </div>
        <AppTextarea v-model="instructions" label="Instructions pour les étudiants" placeholder="Consignes..." />

        <!-- Période d'ouverture -->
        <div class="p-4 border border-line bg-paper-warm space-y-4">
          <label class="flex items-start gap-3 cursor-pointer">
            <input v-model="scheduleEnabled" type="checkbox" class="mt-0.5 w-4 h-4 text-accent focus:ring-accent" />
            <div>
              <p class="text-sm font-medium text-ink flex items-center gap-2">
                <CalendarClock class="w-4 h-4 text-accent" />
                Définir une période d'ouverture
              </p>
              <p class="text-xs text-ink-muted mt-1">
                Ex. du 10/04/2026 au 06/06/2026. Hors période, le code d'accès ne fonctionne pas.
              </p>
            </div>
          </label>
          <div v-if="scheduleEnabled" class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">Date de début</label>
              <input
                v-model="availableFromDate"
                type="date"
                class="w-full px-3.5 py-2.5 border border-line bg-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">Date limite</label>
              <input
                v-model="availableUntilDate"
                type="date"
                class="w-full px-3.5 py-2.5 border border-line bg-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>
        </div>

        <label class="flex items-start gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
          <input v-model="allowDocumentUpload" type="checkbox" class="mt-0.5 w-4 h-4 text-accent" />
          <div>
            <p class="text-sm font-medium text-ink flex items-center gap-2">
              <FileUp class="w-4 h-4 text-accent" />
              Autoriser le dépôt de documents
            </p>
            <p class="text-xs text-ink-muted mt-1">Pour les TP et devoirs : les étudiants pourront importer PDF, Word, etc.</p>
          </div>
        </label>

        <!-- Salle (optionnel) -->
        <div class="p-4 border border-line bg-paper-warm space-y-4">
          <label class="flex items-start gap-3 cursor-pointer">
            <input v-model="useClassroom" type="checkbox" class="mt-0.5 w-4 h-4 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink flex items-center gap-2">
                <Users class="w-4 h-4 text-accent" />
                Lier à une salle de classe (optionnel)
              </p>
              <p class="text-xs text-ink-muted mt-1">
                Sans salle, l'évaluation est ouverte : les étudiants rejoignent avec le code d'accès.
                Avec une salle, vous pouvez limiter l'accès et gérer la présence.
              </p>
            </div>
          </label>

          <div v-if="useClassroom" class="space-y-3 pt-2 border-t border-line">
            <div v-if="teacherCourses.length === 0" class="space-y-3">
              <p class="text-sm text-ink-muted">Vous n'avez pas encore de salle. Créez-en une ou continuez sans.</p>
              <AppButton type="button" variant="outline" size="sm" @click="createClassroom">
                <Users class="w-4 h-4" />
                Créer une salle
              </AppButton>
            </div>
            <select
              v-else
              v-model="courseId"
              class="w-full px-3.5 py-2.5 border border-line bg-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
            >
              <option v-for="c in teacherCourses" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.studentUserIds.length }} membres)
              </option>
            </select>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Step 2 -->
    <AppCard v-else-if="step === 1" title="Questions" :subtitle="`${questions.length} question(s)`">
      <div class="space-y-6">
        <div
          v-for="(question, qIndex) in questions"
          :key="question.id"
          class="p-5 border border-line bg-paper-warm/50"
        >
          <div class="flex items-start gap-3">
            <GripVertical class="w-5 h-5 text-ink-faint mt-2 flex-shrink-0" />
            <div class="flex-1 space-y-4">
              <div class="flex items-center justify-between gap-4">
                <span class="text-sm font-medium text-ink-muted">Question {{ qIndex + 1 }}</span>
                <div class="flex items-center gap-2">
                  <AppBadge variant="brand">{{ question.type.toUpperCase() }}</AppBadge>
                  <button type="button" class="p-1.5 hover:bg-danger-bg text-ink-faint hover:text-danger" @click="removeQuestion(qIndex)">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <AppTextarea v-model="question.text" placeholder="Énoncé..." required />
              <AppInput v-model="question.points" label="Points" type="number" />

              <div v-if="question.type === 'qcm'" class="space-y-2">
                <label class="text-xs font-medium text-ink-muted uppercase tracking-wide">
                  Options — sélectionnez la bonne réponse
                </label>
                <div
                  v-for="(option, oIndex) in question.options"
                  :key="option.id"
                  class="flex items-center gap-3 p-2 border transition-colors"
                  :class="option.isCorrect ? 'border-success/40 bg-success-bg/50' : 'border-line bg-white'"
                >
                  <label class="flex items-center gap-2 cursor-pointer flex-shrink-0" :title="option.isCorrect ? 'Bonne réponse' : 'Marquer comme bonne réponse'">
                    <input type="radio" :name="`correct-${question.id}`" :checked="option.isCorrect" class="w-4 h-4 text-accent" @change="setCorrectOption(qIndex, oIndex)" />
                    <span class="text-[10px] font-semibold uppercase tracking-wide" :class="option.isCorrect ? 'text-success' : 'text-ink-faint'">
                      {{ option.isCorrect ? 'Correcte' : '' }}
                    </span>
                  </label>
                  <input v-model="option.text" type="text" placeholder="Texte de l'option..." class="flex-1 px-3 py-2 border border-line bg-white text-sm focus:outline-none focus:border-accent" />
                  <button type="button" class="p-1 text-ink-faint hover:text-danger" @click="removeOption(qIndex, oIndex)">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                <button type="button" class="text-sm text-accent hover:text-accent-hover font-medium" @click="addOption(qIndex)">+ Option</button>
              </div>

              <div v-if="question.type === 'truefalse'" class="space-y-2">
                <label class="text-xs font-medium text-ink-muted uppercase tracking-wide">
                  Bonne réponse attendue
                </label>
                <div class="flex gap-3">
                  <label
                    class="flex-1 flex items-center justify-center gap-2 p-3 border cursor-pointer transition-colors"
                    :class="question.correctAnswer === true ? 'border-success bg-success-bg text-success font-medium' : 'border-line bg-white hover:border-line-strong'"
                  >
                    <input v-model="question.correctAnswer" type="radio" :value="true" class="w-4 h-4 text-accent" />
                    <span class="text-sm">Vrai</span>
                  </label>
                  <label
                    class="flex-1 flex items-center justify-center gap-2 p-3 border cursor-pointer transition-colors"
                    :class="question.correctAnswer === false ? 'border-success bg-success-bg text-success font-medium' : 'border-line bg-white hover:border-line-strong'"
                  >
                    <input v-model="question.correctAnswer" type="radio" :value="false" class="w-4 h-4 text-accent" />
                    <span class="text-sm">Faux</span>
                  </label>
                </div>
              </div>

              <AppInput v-if="question.type === 'short'" v-model="question.correctAnswer as string" label="Réponse attendue" placeholder="Réponse correcte..." />

              <p v-if="question.type === 'document'" class="text-xs text-ink-muted p-3 bg-paper border border-line">
                L'étudiant déposera un fichier (PDF, Word…) lors de l'épreuve. Correction manuelle.
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <AppButton type="button" variant="outline" size="sm" @click="addQuestion('qcm')"><Plus class="w-4 h-4" /> QCM</AppButton>
          <AppButton type="button" variant="outline" size="sm" @click="addQuestion('truefalse')"><Plus class="w-4 h-4" /> Vrai/Faux</AppButton>
          <AppButton type="button" variant="outline" size="sm" @click="addQuestion('short')"><Plus class="w-4 h-4" /> Réponse courte</AppButton>
          <AppButton v-if="allowDocumentUpload" type="button" variant="outline" size="sm" @click="addQuestion('document')"><Plus class="w-4 h-4" /> Dépôt document</AppButton>
        </div>
      </div>
    </AppCard>

    <!-- Step 3 -->
    <div v-else class="space-y-6">
      <AppCard title="Correction et résultats">
        <div class="space-y-4">
          <p class="text-sm text-ink-muted">Mode de correction après passage de l'épreuve.</p>
          <div class="grid sm:grid-cols-2 gap-3">
            <label
              class="flex items-start gap-3 p-4 border cursor-pointer transition-colors"
              :class="correctionMode === 'auto' ? 'border-accent bg-accent-light' : 'border-line hover:bg-paper-warm'"
            >
              <input v-model="correctionMode" type="radio" value="auto" class="mt-1 w-4 h-4 text-accent" />
              <div>
                <p class="text-sm font-medium text-ink">Correction automatique</p>
                <p class="text-xs text-ink-muted mt-1">QCM et vrai/faux : correction automatique et retour immédiat possible.</p>
              </div>
            </label>
            <label
              class="flex items-start gap-3 p-4 border cursor-pointer transition-colors"
              :class="correctionMode === 'manual' ? 'border-accent bg-accent-light' : 'border-line hover:bg-paper-warm'"
            >
              <input v-model="correctionMode" type="radio" value="manual" class="mt-1 w-4 h-4 text-accent" />
              <div>
                <p class="text-sm font-medium text-ink">Correction manuelle (PDF)</p>
                <p class="text-xs text-ink-muted mt-1">Vous publiez un PDF de correction depuis la fiche évaluation.</p>
              </div>
            </label>
          </div>
          <label v-if="correctionMode === 'auto'" class="flex items-center gap-3 cursor-pointer">
            <input v-model="instantFeedback" type="checkbox" class="w-4 h-4 text-accent" />
            <span class="text-sm text-ink">Retour immédiat pendant l'épreuve (correct / incorrect pour QCM et vrai/faux)</span>
          </label>
          <label v-if="correctionMode === 'auto'" class="flex items-center gap-3 cursor-pointer">
            <input v-model="showCorrectAnswers" type="checkbox" class="w-4 h-4 text-accent" />
            <span class="text-sm text-ink">Afficher le détail des bonnes réponses à la fin de l'épreuve</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="showResultsImmediately" type="checkbox" class="w-4 h-4 text-accent" />
            <span class="text-sm text-ink">Afficher le score immédiatement après soumission</span>
          </label>
        </div>
      </AppCard>

      <AppCard title="Paramètres anti-triche">
        <div class="grid sm:grid-cols-2 gap-4">
          <label class="flex items-center gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
            <input v-model="failOnTabSwitch" type="checkbox" class="w-4 h-4 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink">Échec si changement d'onglet</p>
              <p class="text-xs text-ink-muted">Échec immédiat</p>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
            <input v-model="failOnWindowBlur" type="checkbox" class="w-4 h-4 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink">Échec si perte de focus</p>
              <p class="text-xs text-ink-muted">Changement de fenêtre</p>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
            <input v-model="blockCopyPaste" type="checkbox" class="w-4 h-4 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink">Bloquer copier/coller</p>
              <p class="text-xs text-ink-muted">Ctrl+C / Ctrl+V interdits</p>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
            <input v-model="requireFullscreen" type="checkbox" class="w-4 h-4 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink">Plein écran obligatoire</p>
              <p class="text-xs text-ink-muted">Échec si quitté</p>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
            <input v-model="shuffleQuestions" type="checkbox" class="w-4 h-4 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink">Mélanger les questions</p>
              <p class="text-xs text-ink-muted">Ordre aléatoire</p>
            </div>
          </label>
          <AppInput v-model="maxAttempts" label="Tentatives max." type="number" />
          <AppInput v-model="maxViolations" label="Violations max." type="number" />
        </div>
      </AppCard>

      <AppCard v-if="useClassroom && courseId" title="Accès et présence">
        <div class="space-y-4">
          <label class="flex items-start gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
            <input v-model="presentOnly" type="checkbox" class="mt-0.5 w-4 h-4 text-accent focus:ring-accent" />
            <div>
              <p class="text-sm font-medium text-ink flex items-center gap-2">
                <UserCheck class="w-4 h-4 text-accent" />
                Réservée aux étudiants présents
              </p>
              <p class="text-xs text-ink-muted mt-1">
                Seuls les étudiants ayant rejoint le tunnel en salle pourront accéder à l'évaluation.
              </p>
            </div>
          </label>
          <div v-if="presentOnly">
            <label class="block text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
              Date de séance (présence)
            </label>
            <input
              v-model="sessionDate"
              type="date"
              class="w-full px-3.5 py-2.5 border border-line bg-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
            />
          </div>
        </div>
      </AppCard>

      <AppCard title="Récapitulatif">
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between gap-4 border-b border-line pb-3">
            <dt class="text-ink-muted">Titre</dt>
            <dd class="font-medium text-ink text-right">{{ title }}</dd>
          </div>
          <div class="flex justify-between gap-4 border-b border-line pb-3">
            <dt class="text-ink-muted">Matière / Type</dt>
            <dd class="text-ink text-right">{{ subject }} · {{ EVALUATION_TYPE_LABELS[type] }}</dd>
          </div>
          <div class="flex justify-between gap-4 border-b border-line pb-3">
            <dt class="text-ink-muted">Durée</dt>
            <dd class="text-ink">{{ durationMinutes }} min · {{ questions.length }} question(s)</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-ink-muted">Disponibilité</dt>
            <dd class="text-ink text-right">{{ scheduledLabel }}</dd>
          </div>
          <div class="flex justify-between gap-4 border-t border-line pt-3">
            <dt class="text-ink-muted">Accès</dt>
            <dd class="text-ink text-right">
              <template v-if="useClassroom && courseId">
                {{ teacherCourses.find((c) => c.id === courseId)?.name ?? '—' }}
                <span v-if="presentOnly" class="block text-xs text-warning mt-1">Présents uniquement · {{ sessionDate }}</span>
              </template>
              <template v-else>Ouvert (code d'accès)</template>
            </dd>
          </div>
          <div class="flex justify-between gap-4 border-t border-line pt-3">
            <dt class="text-ink-muted">Correction</dt>
            <dd class="text-ink text-right">
              {{ correctionMode === 'auto' ? 'Automatique' : 'PDF manuel' }}
            </dd>
          </div>
        </dl>
      </AppCard>
    </div>
      </div>
    </Transition>

    <div class="flex flex-col sm:flex-row gap-3 mt-8">
      <AppButton v-if="step > 0" variant="outline" @click="prevStep">
        <ChevronLeft class="w-4 h-4" />
        Retour
      </AppButton>
      <div class="flex-1" />
      <AppButton v-if="step < steps.length - 1" @click="nextStep">
        Continuer
        <ChevronRight class="w-4 h-4" />
      </AppButton>
      <template v-if="step === steps.length - 1">
        <AppButton variant="outline" @click="save(true)">Enregistrer brouillon</AppButton>
        <AppButton @click="save(false)">Publier l'évaluation</AppButton>
      </template>
    </div>
  </div>
</template>
