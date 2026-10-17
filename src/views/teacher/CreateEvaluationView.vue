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
import AppSuggest, { type SuggestItem } from '@/components/ui/AppSuggest.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDisclosure from '@/components/ui/AppDisclosure.vue'
import AppChoicePills from '@/components/ui/AppChoicePills.vue'
import { EVALUATION_TYPE_LABELS, type EvaluationType, type Question, type QuestionType } from '@/types'
import { isApiEnabled } from '@/config/features'
import { extractApiError } from '@/api/client'
import { generateId, toDateInputValue, fromDateInputValue, formatEvaluationPeriod, formatMinutes, readFileAsDataUrl } from '@/utils/helpers'
import { resolveEvaluationDurationMinutes } from '@/utils/evaluationApiMapper'
import { getTodayDateString } from '@/utils/access'
import { useCourseStore } from '@/stores/courses'
import { useClassroomStore, mapClassroomToCourse } from '@/stores/classrooms'
import { useCategoryStore } from '@/stores/categories'
import { useCatalogStore } from '@/stores/catalog'
import { appToast } from '@/utils/toast'
import type { CorrectionMode } from '@/types'
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronLeft, ChevronRight, CalendarClock, Users, UserCheck, FileUp } from '@lucide/vue'
import { dismissKeyboard } from '@/utils/form'
import { institutionLabelForKey, resolveEvaluationPublication } from '@/utils/institutionAffiliation'
import type { EvaluationAudienceMode, EvaluationPublicationScope } from '@/types'
import { useReferentielCatalog } from '@/composables/useReferentielCatalog'
import { etablissementSelectOptions, parseNumericReferentielId } from '@/utils/referentielOptions'
import { computeAccessCodeExpiresAt } from '@/utils/evaluationAudience'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()
const auth = useAuthStore()
const courseStore = useCourseStore()
const classroomStore = useClassroomStore()
const categoryStore = useCategoryStore()
const catalogStore = useCatalogStore()
const { ensureFaculties, facultyOptionsFor, getFlags } = useReferentielCatalog()
const subjectId = ref<string | null>(null)

const FALLBACK_SUBJECTS = [
  'Droit civil',
  'Droit pénal',
  'Droit constitutionnel',
  'Droit administratif',
  'Droit du travail',
  'Droit international',
  'Procédure civile',
  'Procédure pénale',
  'Mathématiques',
  'Français',
  'Histoire',
  'Économie',
]

const isEditing = computed(() => !!route.params.id && route.name === 'teacher-edit')
const editId = computed(() => route.params.id as string | undefined)

const step = ref(0)
const steps = ['Informations', 'Questions', 'Publication']

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
const classroomsLoading = ref(false)
const evaluationAnnexData = ref('')
const evaluationAnnexName = ref('')
const evaluationAnnexError = ref('')
const publicationScope = ref<EvaluationPublicationScope>('open')
const linkedInstitutionKey = ref('')
const universitySelectOptions = computed(() => {
  if (isApiEnabled() && catalogStore.etablissements.length) {
    return etablissementSelectOptions(catalogStore.etablissements, getFlags)
  }
  return []
})
const institutionOptions = universitySelectOptions
const promotionCatalogLabels = computed((): string[] =>
  catalogStore.activePromotions
    .map((p) => p.name?.trim())
    .filter((n): n is string => !!n),
)
const audienceMode = ref<EvaluationAudienceMode>('open')
const cohortRoomMode = ref<'new' | 'existing'>('new')
const cohortNewName = ref('')
const cohortNewDesc = ref('')
const cohortRoomModeOptions = [
  { value: 'new' as const, label: 'Créer la salle', hint: 'Maintenant' },
  { value: 'existing' as const, label: 'Salle existante', hint: 'Déjà créée' },
]
const audienceInstitutionKey = ref('')
const audienceFaculty = ref('')
const selectedPromotions = ref<string[]>([])
const targetStudentIds = ref<string[]>([])
const studentSearchQuery = ref('')
const studentSearchResults = ref<{ id: string; label: string }[]>([])
const facultyEtablissementId = computed(() => {
  const key =
    publicationScope.value === 'institution'
      ? linkedInstitutionKey.value
      : audienceInstitutionKey.value
  return parseNumericReferentielId(key)
})
const facultyOptions = computed(() => facultyOptionsFor(facultyEtablissementId.value))
const promotionChoices = promotionCatalogLabels

watch(facultyEtablissementId, (id) => {
  if (id != null && isApiEnabled()) void ensureFaculties(id)
})

const publicationScopeOptions = [
  { value: 'open', label: 'Libre', hint: 'Catalogue public' },
  { value: 'institution', label: 'Université', hint: 'Promo & faculté' },
  { value: 'cohort', label: 'Formation', hint: 'Créer la salle ici' },
]

const audienceModeOptions = computed(() => [
  { value: 'open', label: 'Code ou lien suffit' },
  { value: 'classroom', label: 'Ma salle de cours' },
  { value: 'promotions', label: 'Promotions (L1, L2…)' },
  { value: 'faculty', label: 'Toute une faculté' },
  { value: 'students', label: 'Étudiants précis' },
])

function togglePromotion(p: string) {
  if (selectedPromotions.value.includes(p)) {
    selectedPromotions.value = selectedPromotions.value.filter((x) => x !== p)
  } else {
    selectedPromotions.value = [...selectedPromotions.value, p]
  }
}

function searchTargetStudents() {
  const hits = auth.searchStudents(studentSearchQuery.value, 8)
  studentSearchResults.value = hits.map((u) => ({
    id: u.id,
    label: `${u.lastName} ${u.firstName}${u.studentId ? ` · ${u.studentId}` : ''}`,
  }))
}

function addTargetStudent(id: string) {
  if (!targetStudentIds.value.includes(id)) {
    targetStudentIds.value = [...targetStudentIds.value, id]
  }
  studentSearchQuery.value = ''
  studentSearchResults.value = []
}

function removeTargetStudent(id: string) {
  targetStudentIds.value = targetStudentIds.value.filter((x) => x !== id)
}

function resolveInstitutionLabel(key: string): string {
  const hit = universitySelectOptions.value.find((o) => o.value === key)
  return (
    hit?.label ??
    institutionLabelForKey(key, catalogStore.etablissements) ??
    key
  )
}

function buildAudiencePatch(): Partial<import('@/types').Evaluation> {
  if (publicationScope.value === 'institution') {
    const key = linkedInstitutionKey.value.trim()
    return {
      audienceMode: 'promotions',
      audienceInstitutionKey: key || null,
      audienceInstitutionLabel: key ? resolveInstitutionLabel(key) : null,
      audienceFaculty: audienceFaculty.value.trim() || null,
      audiencePromotionLabels: [...selectedPromotions.value],
      audienceClassroomId: null,
      audienceStudentUserIds: [],
      excludeFromOpenCatalog: true,
    }
  }

  let mode = audienceMode.value
  if (publicationScope.value === 'cohort') {
    mode = 'classroom'
  } else if (mode === 'open' && useClassroom.value && courseId.value) {
    mode = 'classroom'
  }
  const instKey = audienceInstitutionKey.value || null
  const instLabel = instKey ? resolveInstitutionLabel(instKey) : null
  return {
    audienceMode: mode,
    audienceInstitutionKey:
      mode === 'faculty' || mode === 'promotions' ? instKey : null,
    audienceInstitutionLabel:
      mode === 'faculty' || mode === 'promotions' ? instLabel : null,
    audienceFaculty: mode === 'faculty' ? audienceFaculty.value.trim() || null : null,
    audiencePromotionLabels: mode === 'promotions' ? [...selectedPromotions.value] : [],
    audienceClassroomId: mode === 'classroom' ? courseId.value : null,
    audienceStudentUserIds: mode === 'students' ? [...targetStudentIds.value] : [],
    excludeFromOpenCatalog: publicationScope.value === 'cohort',
  }
}

const teacherCourses = computed(() => {
  if (isApiEnabled()) {
    return classroomStore.myClassrooms.map((c) =>
      mapClassroomToCourse(c, [], `${auth.currentUser?.firstName ?? ''} ${auth.currentUser?.lastName ?? ''}`.trim() || 'Enseignant'),
    )
  }
  return auth.currentUser ? courseStore.getCoursesForTeacher(auth.currentUser.id) : []
})

const classroomOptions = computed(() =>
  teacherCourses.value
    .filter((c) => {
      if (publicationScope.value !== 'cohort') return true
      return (c.roomKind ?? 'university_class') === 'training_cohort'
    })
    .map((c) => ({
      value: c.id,
      label: c.name,
    })),
)

watch(publicationScope, (scope) => {
  if (scope === 'cohort') {
    useClassroom.value = true
    audienceMode.value = 'classroom'
    presentOnly.value = false
    if (courseId.value) {
      const course = teacherCourses.value.find((c) => c.id === courseId.value)
      if (course && (course.roomKind ?? 'university_class') !== 'training_cohort') {
        courseId.value = null
      }
    }
  }
  if (scope === 'institution') {
    useClassroom.value = false
    courseId.value = null
    presentOnly.value = false
    audienceMode.value = 'promotions'
  }
  if (scope === 'open') {
    audienceMode.value = 'open'
  }
})

async function ensureCohortRoom(): Promise<boolean> {
  if (publicationScope.value !== 'cohort') return true
  if (cohortRoomMode.value === 'existing') {
    if (!courseId.value) {
      errors.value = ['Choisissez une salle de formation existante.']
      return false
    }
    return true
  }
  const name = cohortNewName.value.trim()
  if (!name) {
    errors.value = ['Donnez un nom à la salle de formation (créée avec cette évaluation).']
    return false
  }
  if (!auth.currentUser) return false
  if (isApiEnabled()) {
    const result = await classroomStore.create(
      name,
      cohortNewDesc.value,
      'training_cohort',
    )
    if (!result.ok) {
      errors.value = [result.error]
      return false
    }
    courseId.value = String(result.classroom.id)
    await classroomStore.syncMine()
  } else {
    const cls = courseStore.createCourse({
      teacherId: auth.currentUser.id,
      teacherName: `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
      name,
      subject: cohortNewDesc.value.trim() || 'Formation',
      roomKind: 'training_cohort',
    })
    courseId.value = cls.id
  }
  appToast.success(`Salle « ${name} » prête — partagez le lien depuis Mes salles.`)
  return true
}

const courseIdModel = computed({
  get: () => courseId.value ?? '',
  set: (value: string) => {
    courseId.value = value || null
  },
})

const subjectSuggestions = computed<SuggestItem[]>(() => {
  const fromApi = catalogStore.activeMatieres.map((m) => ({
    value: String(m.id),
    label: m.name?.trim() || `Matière ${m.id}`,
    description: m.code || undefined,
  }))
  if (fromApi.length) return fromApi

  const fromCategories = categoryStore.activeCategories
    .map((c) => c.name?.trim())
    .filter((n): n is string => !!n)
  const fromClassrooms = classroomStore.myClassrooms
    .map((c) => c.description?.trim())
    .filter((n): n is string => !!n)
  const merged = [...fromCategories, ...fromClassrooms, ...FALLBACK_SUBJECTS]
  const seen = new Set<string>()
  const items: SuggestItem[] = []
  for (const name of merged) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ value: name, label: name })
  }
  return items
})

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

const questions = ref<Question[]>([createEmptyQuestion('qcm')])
const errors = ref<string[]>([])
const saving = ref(false)

function goCreateClassroom() {
  void router.push('/teacher/courses?create=1')
}

watch(useClassroom, async (enabled) => {
  if (!enabled) {
    courseId.value = null
    presentOnly.value = false
    return
  }
  if (isApiEnabled() && !classroomStore.myClassrooms.length) {
    classroomsLoading.value = true
    try {
      await classroomStore.syncMine()
    } finally {
      classroomsLoading.value = false
    }
  }
  if (!courseId.value && teacherCourses.value.length === 1) {
    courseId.value = teacherCourses.value[0].id
  }
})

onMounted(async () => {
  if (isApiEnabled()) {
    classroomsLoading.value = true
    try {
      await Promise.all([
        classroomStore.syncMine(),
        categoryStore.syncCategories(),
        catalogStore.syncMatieres(),
        catalogStore.syncAll(),
        catalogStore.syncFaculties(),
      ])
    } finally {
      classroomsLoading.value = false
    }
  }

  if (isEditing.value && editId.value) {
    const eval_ = store.getById(editId.value)
    if (eval_) {
      title.value = eval_.title
      description.value = eval_.description
      subject.value = eval_.subject
      type.value = eval_.type
      durationMinutes.value = resolveEvaluationDurationMinutes(eval_) ?? eval_.durationMinutes ?? 30
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
      if (eval_.fileContent?.trim()) {
        evaluationAnnexData.value = eval_.fileContent
        evaluationAnnexName.value = 'annexe-evaluation.pdf'
      }
      publicationScope.value = eval_.publicationScope ?? 'open'
      linkedInstitutionKey.value = eval_.linkedInstitutionKey ?? ''
      audienceMode.value = eval_.audienceMode ?? 'open'
      audienceInstitutionKey.value = eval_.audienceInstitutionKey ?? ''
      audienceFaculty.value = eval_.audienceFaculty ?? ''
      selectedPromotions.value = [...(eval_.audiencePromotionLabels ?? [])]
      targetStudentIds.value = [...(eval_.audienceStudentUserIds ?? [])]
    }
  }
})

function buildPublicationPatch(asDraft: boolean) {
  if (publicationScope.value === 'institution' && !linkedInstitutionKey.value) {
    errors.value = ['Choisissez un établissement pour une évaluation liée.']
    return null
  }
  const key = publicationScope.value === 'institution' ? linkedInstitutionKey.value : null
  const label = key ? institutionLabelForKey(key, catalogStore.etablissements) : null
  return resolveEvaluationPublication({
    asDraft,
    publicationScope: publicationScope.value,
    linkedInstitutionKey: key,
    linkedInstitutionLabel: label,
    teacherAffiliation: auth.currentUser?.teacherInstitutionAffiliation,
  })
}

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
    if (scheduleEnabled.value && availableFromDate.value && availableFromDate.value < getTodayDateString()) {
      errors.value.push('La date de début ne peut pas être dans le passé.')
    }
  }
  if (current === 1) {
    if (questions.value.some((q) => !q.text.trim())) errors.value.push('Toutes les questions doivent avoir un texte.')
    if (questions.value.some((q) => q.type === 'qcm' && !q.options?.some((o) => o.isCorrect))) {
      errors.value.push('Chaque QCM doit avoir une bonne réponse.')
    }
    for (const q of questions.value) {
      if (q.type !== 'qcm' || !q.options?.length) continue
      const labels = q.options.filter((o) => o.text.trim()).map((o) => o.text.trim().toLowerCase())
      const dup = labels.find((l, i) => labels.indexOf(l) !== i)
      if (dup) {
        errors.value.push(`Deux réponses identiques dans le QCM « ${q.text.trim().slice(0, 40) || 'sans titre'} » (« ${dup} »).`)
        break
      }
    }
    if (questions.value.some((q) => q.type === 'truefalse' && q.correctAnswer === undefined)) {
      errors.value.push('Chaque question vrai/faux doit avoir une bonne réponse.')
    }
  }
  return errors.value.length === 0
}

const creatingSubject = ref(false)

function findExistingMatiere(name: string) {
  const q = name.trim().toLowerCase()
  return catalogStore.activeMatieres.find((m) => {
    if (subjectId.value && String(m.id) === subjectId.value) return true
    return (m.name?.trim().toLowerCase() ?? '') === q
  })
}

async function createMatiereFromQuery(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = findExistingMatiere(trimmed)
  if (existing) {
    subject.value = existing.name?.trim() || trimmed
    subjectId.value = String(existing.id)
    return
  }
  if (!isApiEnabled()) {
    subject.value = trimmed
    return
  }
  creatingSubject.value = true
  const result = await catalogStore.addMatiere(trimmed)
  creatingSubject.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  subject.value = result.item.name?.trim() || trimmed
  subjectId.value = String(result.item.id)
  appToast.success(`Matière « ${subject.value} » créée.`)
}

async function nextStep() {
  dismissKeyboard()
  if (!validateStep(step.value)) return
  if (step.value === 0) {
    const existing = findExistingMatiere(subject.value)
    if (existing) {
      subject.value = existing.name?.trim() || subject.value.trim()
      subjectId.value = String(existing.id)
    }
  }
  if (step.value < steps.length - 1) step.value++
}

function prevStep() {
  dismissKeyboard()
  errors.value = []
  if (step.value > 0) step.value--
}

async function handleAnnexUpload(event: Event) {
  evaluationAnnexError.value = ''
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    evaluationAnnexError.value = 'Seul le format PDF est accepté pour l’annexe API.'
    return
  }
  try {
    const { dataUrl, fileName } = await readFileAsDataUrl(file)
    evaluationAnnexData.value = dataUrl
    evaluationAnnexName.value = fileName
  } catch (e) {
    evaluationAnnexError.value = e instanceof Error ? e.message : 'Impossible de lire le fichier.'
  }
}

function clearAnnex() {
  evaluationAnnexData.value = ''
  evaluationAnnexName.value = ''
  evaluationAnnexError.value = ''
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
    courseId:
      useClassroom.value || publicationScope.value === 'cohort' ? courseId.value : null,
    requireEnrollment:
      publicationScope.value === 'cohort' ||
      (useClassroom.value && !!courseId.value),
    presentOnly: useClassroom.value && presentOnly.value && !!courseId.value,
    sessionDate: useClassroom.value && presentOnly.value && courseId.value ? sessionDate.value : null,
    fileContent: isApiEnabled() ? evaluationAnnexData.value : undefined,
    antiCheat: {
      failOnTabSwitch: failOnTabSwitch.value,
      failOnWindowBlur: failOnWindowBlur.value,
      blockCopyPaste: blockCopyPaste.value,
      blockContextMenu: true,
      requireFullscreen: requireFullscreen.value,
      maxViolations: Number(maxViolations.value),
      detectDevTools: false,
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

async function save(asDraft = true) {
  dismissKeyboard()
  if (!validateStep(0) || !validateStep(1)) {
    step.value = errors.value.some((e) => e.includes('question') || e.includes('QCM')) ? 1 : 0
    return
  }
  const existing = findExistingMatiere(subject.value)
  if (existing) {
    subject.value = existing.name?.trim() || subject.value.trim()
    subjectId.value = String(existing.id)
  }

  const publication = buildPublicationPatch(asDraft)
  if (!publication) return
  if (publicationScope.value === 'institution') {
    if (!linkedInstitutionKey.value) {
      errors.value = ['Choisissez l’université (référentiel admin).']
      step.value = steps.length - 1
      return
    }
    if (!audienceFaculty.value.trim()) {
      errors.value = ['Choisissez la faculté ciblée (liste établissement).']
      step.value = steps.length - 1
      return
    }
    if (!selectedPromotions.value.length) {
      errors.value = ['Choisissez au moins une promotion (référentiel admin).']
      step.value = steps.length - 1
      return
    }
  }
  saving.value = true
  if (!(await ensureCohortRoom())) {
    saving.value = false
    step.value = steps.length - 1
    return
  }
  saving.value = false

  const data = buildData()
  const audience = buildAudiencePatch()
  if (
    publicationScope.value !== 'institution' &&
    audience.audienceMode === 'promotions' &&
    !(audience.audiencePromotionLabels?.length)
  ) {
    errors.value = ['Sélectionnez au moins une promotion ciblée.']
    return
  }
  if (audience.audienceMode === 'students' && !(audience.audienceStudentUserIds?.length)) {
    errors.value = ['Ajoutez au moins un étudiant ciblé.']
    return
  }
  if (audience.audienceMode === 'faculty' && !audience.audienceFaculty) {
    errors.value = ['Indiquez la faculté ciblée.']
    return
  }
  const accessCodeExpiresAt =
    publication.status === 'active'
      ? computeAccessCodeExpiresAt({
          availableFrom: data.availableFrom ?? null,
          availableUntil: data.availableUntil ?? null,
          durationMinutes: data.durationMinutes,
        })
      : null

  if (isEditing.value && editId.value) {
    store.updateEvaluation(editId.value, {
      ...data,
      ...publication,
      ...audience,
      accessCodeExpiresAt,
    })
    if (publication.institutionPublicationPending) {
      appToast.info('Brouillon enregistré : validation établissement requise pour publier.')
    }
    router.push(`/teacher/evaluation/${editId.value}`)
    return
  }

  void saveEvaluation(data, asDraft, publication, audience, accessCodeExpiresAt)
}

async function saveEvaluation(
  data: ReturnType<typeof buildData>,
  _asDraft: boolean,
  publication: ReturnType<typeof buildPublicationPatch> & object,
  audience: ReturnType<typeof buildAudiencePatch>,
  accessCodeExpiresAt: string | null,
) {
  const user = auth.currentUser!
  saving.value = true
  errors.value = []
  try {
    let evaluation: ReturnType<typeof store.createEvaluation>
    if (isApiEnabled()) {
      evaluation = await store.createEvaluationOnApi({
        ...data,
        teacherId: user.id,
        teacherName: `${user.firstName} ${user.lastName}`,
      })
      store.updateEvaluation(evaluation.id, { ...publication, ...audience, accessCodeExpiresAt })
      await store.syncFromApi()
    } else {
      evaluation = store.createEvaluation({
        ...data,
        teacherId: user.id,
        teacherName: `${user.firstName} ${user.lastName}`,
        ...publication,
        ...audience,
        accessCodeExpiresAt,
      })
    }
    if (publication.institutionPublicationPending) {
      appToast.info('Évaluation en brouillon : liée à un établissement en attente de validation.')
    }
    router.push(`/teacher/evaluation/${evaluation.id}`)
  } catch (e) {
    const message = extractApiError(e)
    errors.value = [message]
    appToast.error(message)
  } finally {
    saving.value = false
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
          <AppSuggest
            v-model="subject"
            :selected-value="subjectId"
            label="Matière"
            :items="subjectSuggestions"
            placeholder="Rechercher ou créer une matière…"
            hint="Choisissez une suggestion, ou validez le texte pour créer la matière."
            allow-create
            create-label="Créer"
            :disabled="creatingSubject"
            required
            @update:selected-value="subjectId = $event"
            @create="createMatiereFromQuery"
          />
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
          <AppInput
            v-model="durationMinutes"
            label="Durée (minutes)"
            type="number"
            required
            :hint="isApiEnabled() ? 'Durée du chrono côté étudiant (en minutes)' : undefined"
          />
          <AppInput v-if="!isApiEnabled()" v-model="passingScore" label="Score de passage (%)" type="number" />
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

        <!-- Salle universitaire (optionnel — publication « Libre » uniquement) -->
        <div v-if="publicationScope === 'open'" class="p-4 border border-line bg-paper-warm space-y-4">
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
            <p v-if="classroomsLoading" class="text-sm text-ink-muted">Chargement de vos salles…</p>
            <div v-else-if="teacherCourses.length === 0" class="space-y-3">
              <p class="text-sm text-ink-muted">
                Aucune salle sur votre compte. Créez-en une, puis revenez lier l’évaluation.
              </p>
              <AppButton type="button" variant="outline" size="sm" @click="goCreateClassroom">
                <Users class="w-4 h-4" />
                Créer une salle
              </AppButton>
            </div>
            <AppSelect
              v-else
              v-model="courseIdModel"
              label="Salle"
              :options="classroomOptions"
              placeholder="Choisir une salle"
            />
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
                  Options - sélectionnez la bonne réponse
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

              <AppInput
                v-if="question.type === 'short'"
                :model-value="String(question.correctAnswer ?? '')"
                label="Réponse attendue"
                placeholder="Réponse correcte..."
                @update:model-value="question.correctAnswer = $event"
              />
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
      <AppCard v-if="isApiEnabled()" title="Publication en ligne">
        <p class="text-sm text-ink-muted mb-4">
          Récapitulatif de ce qui sera enregistré pour vos étudiants.
        </p>
        <dl class="grid sm:grid-cols-2 gap-3 text-sm mb-5">
          <div class="p-3 border border-line bg-paper-warm">
            <dt class="text-xs text-ink-faint uppercase tracking-wide">Disponibilité</dt>
            <dd class="mt-1 text-ink">{{ scheduledLabel }}</dd>
          </div>
          <div class="p-3 border border-line bg-paper-warm">
            <dt class="text-xs text-ink-faint uppercase tracking-wide">Durée du chrono</dt>
            <dd class="mt-1 text-ink font-medium">{{ formatMinutes(durationMinutes) }}</dd>
            <dd class="text-xs text-ink-muted mt-0.5">Définie à l’étape « Informations »</dd>
          </div>
        </dl>
        <div class="space-y-3 p-4 border border-line bg-paper-warm/60">
          <p class="text-sm font-medium text-ink flex items-center gap-2">
            <FileUp class="w-4 h-4 text-accent" />
            Annexe PDF de référence (optionnel)
          </p>
          <p class="text-xs text-ink-muted">
            Visible par les étudiants sur la page de résultats (aperçu + téléchargement).
          </p>
          <input
            type="file"
            accept="application/pdf"
            class="block w-full text-sm text-ink-muted file:mr-3 file:py-2 file:px-3 file:border file:border-line file:bg-white file:text-sm file:text-ink"
            @change="handleAnnexUpload"
          />
          <p v-if="evaluationAnnexName" class="text-xs text-accent flex items-center gap-2">
            {{ evaluationAnnexName }}
            <button type="button" class="text-danger underline" @click="clearAnnex">Retirer</button>
          </p>
          <p v-if="evaluationAnnexError" class="text-xs text-danger">{{ evaluationAnnexError }}</p>
        </div>
      </AppCard>

      <AppDisclosure title="Correction & résultats" hint="Auto, PDF, seuil de réussite…">
        <div class="space-y-4 pt-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              class="min-h-11 p-3 border text-left text-sm"
              :class="correctionMode === 'auto' ? 'border-accent bg-accent-light/40' : 'border-line'"
              @click="correctionMode = 'auto'"
            >
              Automatique (QCM)
            </button>
            <button
              type="button"
              class="min-h-11 p-3 border text-left text-sm"
              :class="correctionMode === 'manual' ? 'border-accent bg-accent-light/40' : 'border-line'"
              @click="correctionMode = 'manual'"
            >
              PDF manuel
            </button>
          </div>
          <AppInput v-model="passingScore" label="Seuil de réussite (%)" type="number" hint="Affichage local sur la page résultat" />
          <label v-if="correctionMode === 'auto'" class="flex items-center gap-3 cursor-pointer">
            <input v-model="instantFeedback" type="checkbox" class="w-4 h-4 text-accent" />
            <span class="text-sm text-ink">Retour immédiat QCM / vrai-faux (vert / rouge)</span>
          </label>
          <label v-if="correctionMode === 'auto'" class="flex items-center gap-3 cursor-pointer">
            <input v-model="showCorrectAnswers" type="checkbox" class="w-4 h-4 text-accent" />
            <span class="text-sm text-ink">Détail des bonnes réponses à la fin</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="showResultsImmediately" type="checkbox" class="w-4 h-4 text-accent" />
            <span class="text-sm text-ink">Afficher le score dès la soumission</span>
          </label>
        </div>
      </AppDisclosure>

      <AppCard title="Publication">
        <p class="text-sm text-ink-muted mb-4">
          Chaque évaluation a un <strong class="font-medium text-ink">code unique</strong>, valable
          jusqu’à la fin du délai. Partagez le code ou le lien — c’est le plus simple.
        </p>
        <p class="text-xs text-ink-muted mb-3">Type de publication</p>
        <AppChoicePills v-model="publicationScope" :options="publicationScopeOptions" />
        <div
          v-if="publicationScope === 'institution'"
          class="mt-4 p-4 border border-line bg-paper-warm space-y-4"
        >
          <p class="text-sm text-ink-muted">
            <strong class="font-medium text-ink">Examens d’établissement</strong> — vous
            <strong class="font-medium text-ink">sélectionnez</strong> université, faculté et promotion.
            Ces listes sont gérées par l’<strong>administration</strong> (pas de création ici).
          </p>
          <AppSelect
            v-model="linkedInstitutionKey"
            label="Université"
            :options="universitySelectOptions"
            placeholder="Choisir…"
            required
          />
          <AppSelect
            v-model="audienceFaculty"
            label="Faculté"
            :options="facultyOptions"
            placeholder="Droit, Informatique…"
            required
          />
          <div>
            <p class="text-xs text-ink-muted mb-2">Promotion(s) — référentiel admin</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in promotionCatalogLabels"
                :key="p"
                type="button"
                class="min-h-[2.75rem] min-w-[2.75rem] px-3 text-sm border transition-colors"
                :class="
                  selectedPromotions.includes(p)
                    ? 'border-accent bg-accent-light/40 text-ink font-medium'
                    : 'border-line text-ink-muted'
                "
                @click="togglePromotion(p)"
              >
                {{ p }}
              </button>
            </div>
          </div>
          <p class="text-xs text-ink-faint">
            Visible pour les étudiants au parcours validé (faculté + promo). Brouillon si votre profil
            université n’est pas encore validé.
          </p>
        </div>

        <div
          v-if="publicationScope === 'cohort'"
          class="mt-4 p-4 border border-accent/25 bg-accent-light/15 space-y-4"
        >
          <p class="text-sm text-ink-muted">
            <strong class="font-medium text-ink">Formation / indépendant</strong> — hors catalogue public.
            Créez la salle <strong class="font-medium text-ink">en même temps</strong> que l’évaluation, puis
            partagez le lien d’invitation (Mes salles).
          </p>
          <AppChoicePills v-model="cohortRoomMode" :options="cohortRoomModeOptions" />
          <template v-if="cohortRoomMode === 'new'">
            <AppInput
              v-model="cohortNewName"
              label="Nom de la salle / cohorte"
              placeholder="Atelier droit social — mars 2026"
              required
            />
            <AppTextarea
              v-model="cohortNewDesc"
              label="Description (optionnel)"
              placeholder="Public, objectifs…"
              :rows="2"
            />
          </template>
          <template v-else>
            <AppSelect
              v-model="courseIdModel"
              label="Salle formation existante"
              :options="classroomOptions"
              placeholder="Choisir…"
            />
            <p v-if="!classroomOptions.length" class="text-xs text-ink-muted">
              Aucune salle « Formation » — utilisez « Créer la salle » ci-dessus.
            </p>
          </template>
        </div>

        <div v-if="publicationScope === 'open'" class="mt-5 pt-4 border-t border-line">
          <AppSelect
            v-model="audienceMode"
            label="Affichage auto pour les étudiants (optionnel)"
            :options="audienceModeOptions"
            hint="Sinon, ils rejoignent avec le code — aucune config obligatoire."
          />

          <div v-if="audienceMode === 'faculty' || audienceMode === 'promotions'" class="mt-3 space-y-3">
            <AppSelect
              v-model="audienceInstitutionKey"
              label="Établissement"
              :options="institutionOptions"
              placeholder="UCC…"
            />
          </div>
          <AppSelect
            v-if="audienceMode === 'faculty'"
            v-model="audienceFaculty"
            class="mt-3"
            label="Faculté"
            :options="facultyOptions"
            placeholder="Droit"
          />
          <div v-if="audienceMode === 'promotions'" class="mt-3">
            <p class="text-xs text-ink-muted mb-2">Promotions concernées</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in promotionChoices"
                :key="p"
                type="button"
                class="min-h-[2.75rem] min-w-[2.75rem] px-3 text-sm border transition-colors"
                :class="
                  selectedPromotions.includes(p)
                    ? 'border-accent bg-accent-light/40 text-ink font-medium'
                    : 'border-line text-ink-muted'
                "
                @click="togglePromotion(p)"
              >
                {{ p }}
              </button>
            </div>
          </div>
          <p v-if="audienceMode === 'classroom'" class="mt-3 text-sm text-ink-muted">
            Liez une salle à l’étape <strong>Informations</strong>.
          </p>
          <div v-if="audienceMode === 'students'" class="mt-3 space-y-3">
            <AppInput
              v-model="studentSearchQuery"
              label="Nom ou e-mail"
              placeholder="Rechercher…"
              @keyup.enter="searchTargetStudents"
            />
            <AppButton type="button" variant="outline" class="w-full sm:w-auto" @click="searchTargetStudents">
              Ajouter un étudiant
            </AppButton>
            <ul v-if="studentSearchResults.length" class="border border-line divide-y max-h-40 overflow-y-auto">
              <li v-for="row in studentSearchResults" :key="row.id">
                <button
                  type="button"
                  class="w-full text-left px-3 py-3 text-sm hover:bg-paper-warm min-h-[2.75rem]"
                  @click="addTargetStudent(row.id)"
                >
                  {{ row.label }}
                </button>
              </li>
            </ul>
            <div v-if="targetStudentIds.length" class="flex flex-wrap gap-2">
              <span
                v-for="sid in targetStudentIds"
                :key="sid"
                class="inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-paper-warm border border-line min-h-[2.25rem]"
              >
                {{ auth.getUserById(sid)?.firstName ?? sid }}
                <button type="button" class="text-danger px-1" aria-label="Retirer" @click="removeTargetStudent(sid)">×</button>
              </span>
            </div>
          </div>
        </div>
      </AppCard>

      <AppDisclosure title="Sécurité pendant l’examen" hint="Anti-triche, plein écran…">
        <div class="grid sm:grid-cols-2 gap-3 pt-3">
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
              <p class="text-xs text-ink-muted">Échec si quitté (sauf dépôt document)</p>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 border border-line cursor-pointer hover:bg-paper-warm">
            <input v-model="shuffleQuestions" type="checkbox" class="w-4 h-4 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink">Mélanger les questions</p>
              <p class="text-xs text-ink-muted">
                {{ isApiEnabled() ? 'randomOrder / shuffleQuestions (API)' : 'Ordre aléatoire (local)' }}
              </p>
            </div>
          </label>
          <AppInput
            v-model="maxAttempts"
            label="Tentatives max."
            type="number"
            :hint="isApiEnabled() ? 'Non prévu par l’API — local uniquement' : 'Local uniquement'"
          />
          <AppInput v-model="maxViolations" label="Violations max." type="number" />
        </div>
      </AppDisclosure>

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

      <AppDisclosure title="Récapitulatif" hint="Vérifier avant de publier">
        <dl class="space-y-3 text-sm pt-3">
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
            <dd class="text-ink">{{ formatMinutes(durationMinutes) }} · {{ questions.length }} question(s)</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-ink-muted">Disponibilité</dt>
            <dd class="text-ink text-right">{{ scheduledLabel }}</dd>
          </div>
          <div class="flex justify-between gap-4 border-t border-line pt-3">
            <dt class="text-ink-muted">Accès</dt>
            <dd class="text-ink text-right">
              <template v-if="useClassroom && courseId">
                {{ teacherCourses.find((c) => c.id === courseId)?.name ?? '-' }}
                <span v-if="presentOnly" class="block text-xs text-warning mt-1">Présents uniquement · {{ sessionDate }}</span>
              </template>
              <template v-else>Ouvert (code d'accès)</template>
            </dd>
          </div>
          <div class="flex justify-between gap-4 border-t border-line pt-3">
            <dt class="text-ink-muted">Publication</dt>
            <dd class="text-ink text-right">
              {{
                publicationScope === 'open'
                  ? 'Libre'
                  : linkedInstitutionKey
                    ? institutionLabelForKey(linkedInstitutionKey, catalogStore.etablissements)
                    : 'Établissement à choisir'
              }}
            </dd>
          </div>
          <div class="flex justify-between gap-4 border-t border-line pt-3">
            <dt class="text-ink-muted">Correction</dt>
            <dd class="text-ink text-right">
              {{ correctionMode === 'auto' ? 'Automatique' : 'PDF manuel' }}
            </dd>
          </div>
          <div v-if="isApiEnabled() && evaluationAnnexName" class="flex justify-between gap-4 border-t border-line pt-3">
            <dt class="text-ink-muted">Annexe PDF</dt>
            <dd class="text-ink text-right truncate max-w-[12rem]">{{ evaluationAnnexName }}</dd>
          </div>
        </dl>
      </AppDisclosure>
    </div>
      </div>
    </Transition>

    <div v-if="errors.length" class="mt-6 p-4 bg-danger-bg border border-danger/20">
      <ul class="list-disc list-inside text-sm text-danger space-y-1">
        <li v-for="err in errors" :key="`bottom-${err}`">{{ err }}</li>
      </ul>
    </div>

    <div
      class="create-eval-actions flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-8 pb-[env(safe-area-inset-bottom)] sm:pb-0 sticky bottom-0 sm:static z-10 bg-paper/95 backdrop-blur-sm border-t border-line sm:border-0 pt-3 sm:pt-0 -mx-4 px-4 sm:mx-0 sm:px-0"
    >
      <AppButton v-if="step > 0" variant="outline" class="w-full sm:w-auto min-h-11" @click="prevStep">
        <ChevronLeft class="w-4 h-4" />
        Retour
      </AppButton>
      <div class="hidden sm:block flex-1" />
      <AppButton v-if="step < steps.length - 1" class="w-full sm:w-auto min-h-11" @click="nextStep">
        Continuer
        <ChevronRight class="w-4 h-4" />
      </AppButton>
      <template v-if="step === steps.length - 1">
        <AppButton
          v-if="!isApiEnabled()"
          variant="outline"
          class="w-full sm:w-auto min-h-11"
          :loading="saving"
          @click="save(true)"
        >
          Brouillon
        </AppButton>
        <AppButton class="w-full sm:w-auto min-h-11" :loading="saving" @click="save(false)">
          {{ isApiEnabled() ? 'Publier' : 'Publier' }}
        </AppButton>
      </template>
    </div>
  </div>
</template>
