import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Evaluation,
  ExamSession,
  Question,
  EvaluationType,
  AntiCheatConfig,
  EvaluationSettings,
  SessionStatus,
  StudentAnswer,
} from '@/types'
import { DEFAULT_ANTI_CHEAT, DEFAULT_SETTINGS } from '@/types'
import { generateId, generateCode, getEvaluationAvailabilityMessage, isEvaluationAvailable } from '@/utils/helpers'
import {
  computeAccessCodeExpiresAt,
  isCohortEvaluation,
  isOpenCatalogEvaluation,
  isStudentAcademicVerified,
  studentMatchesEvaluationAudience,
} from '@/utils/evaluationAudience'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import { useNotificationStore } from '@/stores/notifications'
import { isApiEnabled, TOKEN_KEY } from '@/config/features'
import * as evaluationsApi from '@/api/evaluations'
import {
  mapApiEvaluationToLocal,
  mapPassageToEvaluation,
  mapLocalQuestionsToApiRequest,
  sanitizeEvaluationRequest,
  mapStudentAnswersToApi,
  mapAnswerableSummaryToLocal,
  sortEvaluationsNewestFirst,
  parseApiEvaluationId,
  parseCreateEvaluationId,
  validateEvaluationPayloadForApi,
  mapSubmissionSummaryToSession,
  mapSubmissionDetailToSession,
  mergeSubmissionMaxScore,
  isEvaluationOwnedByTeacher,
  parseSubmissionSessionId,
  submissionSessionId,
  matchSubmissionSummary,
  findCompanionLocalSession,
  resolveEvaluationDurationMinutes,
} from '@/utils/evaluationApiMapper'
import { extractApiError } from '@/api/client'
import { messageForJoinBlockCode } from '@/utils/apiJoinMessages'
import type {
  EvaluationAnswerableSummary,
  ApiEvaluation,
  GradeItemRequest,
  EvaluationSubmissionDetail,
} from '@/api/types'
import { parseSubmissionApiResponse, clearMySubmissionCache, getMySubmission } from '@/api/evaluations'
import { useTeacherStore } from '@/stores/teachers'

const EVALUATIONS_KEY = 'lawapp_evaluations'
const SESSIONS_KEY = 'lawapp_sessions'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data))
}

function normalizeSessions(list: ExamSession[]): ExamSession[] {
  let changed = false
  for (const session of list) {
    const expiresMs = new Date(session.expiresAt).getTime()
    const startedMs = new Date(session.startedAt).getTime()

    if (!session.status || session.status === ('' as SessionStatus)) {
      session.status = expiresMs <= startedMs ? 'pending' : 'in_progress'
      changed = true
    }

    if (session.status === 'in_progress' && expiresMs <= startedMs) {
      session.status = 'pending'
      changed = true
    }
  }
  if (changed) saveToStorage(SESSIONS_KEY, list)
  return list
}

export const useEvaluationStore = defineStore('evaluations', () => {
  const evaluations = ref<Evaluation[]>(loadFromStorage(EVALUATIONS_KEY, []))
  const sessions = ref<ExamSession[]>(normalizeSessions(loadFromStorage(SESSIONS_KEY, [])))
  const apiLoading = ref(false)
  const apiError = ref<string | null>(null)
  const answerableFromApi = ref<EvaluationAnswerableSummary[]>([])
  const forMeFromApi = ref<EvaluationAnswerableSummary[]>([])

  const activeEvaluations = computed(() =>
    evaluations.value.filter((e) => e.status === 'active')
  )

  const totalSessions = computed(() => sessions.value.length)

  function persistEvaluations() {
    saveToStorage(EVALUATIONS_KEY, evaluations.value)
  }

  function persistSessions() {
    saveToStorage(SESSIONS_KEY, sessions.value)
  }

  function getEvaluationsForTeacher(teacherId: string): Evaluation[] {
    if (isApiEnabled()) {
      return evaluations.value.filter((e) => isEvaluationOwnedByTeacher(e, teacherId))
    }
    return evaluations.value.filter((e) => e.teacherId === teacherId)
  }

  function sessionBelongsToStudentUser(s: ExamSession, studentUserId: string): boolean {
    const auth = useAuthStore()
    const apiUid = auth.currentUser?.apiUserId
    const email = auth.currentUser?.email?.trim().toLowerCase()
    const matricule = auth.currentUser?.studentId?.trim().toLowerCase()
    if (s.studentUserId === studentUserId) return true
    if (apiUid != null && s.studentUserId === String(apiUid)) return true
    if (email && (s.studentEmail ?? '').trim().toLowerCase() === email) return true
    if (matricule && (s.studentId ?? '').trim().toLowerCase() === matricule) return true
    return false
  }

  function getSessionsForStudent(studentUserId: string): ExamSession[] {
    return sessions.value
      .filter((s) => sessionBelongsToStudentUser(s, studentUserId))
      .sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.startedAt).getTime() -
          new Date(a.submittedAt ?? a.startedAt).getTime(),
      )
  }

  function createEvaluation(data: {
    teacherId: string
    teacherName: string
    title: string
    description: string
    type: EvaluationType
    durationMinutes: number
    subject: string
    questions: Question[]
    antiCheat?: Partial<AntiCheatConfig>
    settings?: Partial<EvaluationSettings>
    availableFrom?: string | null
    availableUntil?: string | null
    courseId?: string | null
    requireEnrollment?: boolean
    presentOnly?: boolean
    sessionDate?: string | null
    publicationScope?: Evaluation['publicationScope']
    linkedInstitutionKey?: string | null
    linkedInstitutionLabel?: string | null
    institutionPublicationPending?: boolean
    audienceMode?: Evaluation['audienceMode']
    audienceInstitutionKey?: string | null
    audienceInstitutionLabel?: string | null
    audienceFaculty?: string | null
    audiencePromotionLabels?: string[]
    audienceClassroomId?: string | null
    audienceStudentUserIds?: string[]
    accessCodeExpiresAt?: string | null
    excludeFromOpenCatalog?: boolean
  }): Evaluation {
    const now = new Date().toISOString()
    const evaluation: Evaluation = {
      id: generateId(),
      code: generateCode(),
      title: data.title,
      description: data.description,
      type: data.type,
      status: 'draft',
      durationMinutes: data.durationMinutes,
      questions: data.questions,
      subject: data.subject,
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      availableFrom: data.availableFrom ?? null,
      availableUntil: data.availableUntil ?? null,
      correctionPdfName: null,
      correctionPdfData: null,
      correctionPublished: false,
      correctionPublishedAt: null,
      courseId: data.courseId ?? null,
      requireEnrollment: data.requireEnrollment ?? false,
      presentOnly: data.presentOnly ?? false,
      sessionDate: data.sessionDate ?? null,
      sharedToClassAt: null,
      requiresAccessCode: false,
      publicationScope: data.publicationScope ?? 'open',
      linkedInstitutionKey: data.linkedInstitutionKey ?? null,
      linkedInstitutionLabel: data.linkedInstitutionLabel ?? null,
      institutionPublicationPending: data.institutionPublicationPending ?? false,
      audienceMode: data.audienceMode ?? 'open',
      audienceInstitutionKey: data.audienceInstitutionKey ?? null,
      audienceInstitutionLabel: data.audienceInstitutionLabel ?? null,
      audienceFaculty: data.audienceFaculty ?? null,
      audiencePromotionLabels: data.audiencePromotionLabels ?? [],
      audienceClassroomId: data.audienceClassroomId ?? null,
      audienceStudentUserIds: data.audienceStudentUserIds ?? [],
      accessCodeExpiresAt: data.accessCodeExpiresAt ?? null,
      excludeFromOpenCatalog:
        data.excludeFromOpenCatalog ??
        data.publicationScope === 'cohort',
      antiCheat: { ...DEFAULT_ANTI_CHEAT, ...data.antiCheat },
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      createdAt: now,
      updatedAt: now,
    }
    evaluations.value.unshift(evaluation)
    persistEvaluations()
    return evaluation
  }

  function updateEvaluation(id: string, updates: Partial<Evaluation>) {
    const idx = evaluations.value.findIndex((e) => e.id === id)
    if (idx === -1) return
    evaluations.value[idx] = {
      ...evaluations.value[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    persistEvaluations()
  }

  function deleteEvaluation(id: string) {
    evaluations.value = evaluations.value.filter((e) => e.id !== id)
    sessions.value = sessions.value.filter((s) => s.evaluationId !== id)
    persistEvaluations()
    persistSessions()
  }

  /** Feuille passage : pas de bonnes réponses sur les options QCM. */
  function isPassageEvaluationShape(item: Evaluation): boolean {
    if (!item.questions.length) return false
    return !item.questions.some((q) =>
      q.options?.some((o) => o.isCorrect === true || o.isCorrect === false),
    )
  }

  function mergeApiEvaluations(mapped: Evaluation[]) {
    for (const item of mapped) {
      const idx = evaluations.value.findIndex((e) => e.id === item.id || e.apiId === item.apiId)
      if (idx >= 0) {
        const prev = evaluations.value[idx]
        const fromPassage = isPassageEvaluationShape(item)
        evaluations.value[idx] = {
          ...item,
          ...prev,
          questions: item.questions.length ? item.questions : prev.questions,
          teacherId: prev.createdByUserId ? prev.teacherId : item.teacherId,
          teacherName: prev.createdByUserId ? prev.teacherName : item.teacherName,
          createdByUserId: prev.createdByUserId,
          antiCheat: fromPassage ? item.antiCheat : prev.antiCheat,
          settings: fromPassage
            ? {
                ...item.settings,
                instructions: prev.settings.instructions || item.settings.instructions,
                correctionMode: prev.settings.correctionMode,
                instantFeedback: prev.settings.instantFeedback,
                showCorrectAnswers: prev.settings.showCorrectAnswers,
                showResultsImmediately: prev.settings.showResultsImmediately,
                passingScore: prev.settings.passingScore,
              }
            : {
                ...prev.settings,
                allowDocumentUpload: item.settings.allowDocumentUpload,
                shuffleQuestions: item.settings.shuffleQuestions,
              },
          durationMinutes: fromPassage
            ? item.durationMinutes
            : (item.compteur ?? item.durationMinutes ?? prev.durationMinutes),
          courseId: prev.courseId ?? item.courseId,
          fileContent: item.fileContent ?? prev.fileContent,
          compteur: item.compteur ?? prev.compteur,
        }
      } else {
        evaluations.value.push(item)
      }
    }
    persistEvaluations()
  }

  /** Enseignant : rafraîchit uniquement ses épreuves (pas le catalogue public global). */
  async function syncFromApi(): Promise<void> {
    if (!isApiEnabled()) return
    const auth = useAuthStore()
    const teacherId = auth.currentUser?.id
    if (!teacherId) return
    apiLoading.value = true
    apiError.value = null
    try {
      const owned = evaluations.value.filter(
        (e) => isEvaluationOwnedByTeacher(e, teacherId) && e.apiId != null,
      )
      await Promise.allSettled(owned.map((e) => fetchEvaluationById(e.apiId!)))
    } catch (e) {
      apiError.value = extractApiError(e)
    } finally {
      apiLoading.value = false
    }
  }

  function sessionMatchesEvaluation(session: ExamSession, evaluation: Evaluation): boolean {
    if (evaluation.apiId != null) {
      if (session.apiEvaluationId === evaluation.apiId) return true
      if (session.evaluationId === String(evaluation.apiId)) return true
      if (session.evaluationCode.toUpperCase() === `EV${evaluation.apiId}`) return true
    }
    return (
      session.evaluationId === evaluation.id ||
      session.evaluationCode.toUpperCase() === evaluation.code.toUpperCase()
    )
  }

  /** Déjà passée (local) — complément si le backend laisse encore l’id dans « repondre ». */
  function studentAlreadyFinishedEvaluation(
    evaluation: Evaluation,
    studentUserId: string,
  ): boolean {
    const terminal: SessionStatus[] = ['submitted', 'failed', 'expired']
    return sessions.value.some(
      (s) =>
        s.studentUserId === studentUserId &&
        terminal.includes(s.status) &&
        sessionMatchesEvaluation(s, evaluation),
    )
  }

  /** Exclure du catalogue : déjà passées par l’étudiant OU date limite dépassée. */
  function filterAnswerableStillOpen(list: EvaluationAnswerableSummary[]): EvaluationAnswerableSummary[] {
    const auth = useAuthStore()
    const studentId = auth.currentUser?.id
    if (!list.length) return list
    const now = Date.now()
    return list.filter((item) => {
      if (studentId && studentFinishedApiEvaluation(studentId, item.id)) return false
      if (item.endDate) {
        const day = String(item.endDate).slice(0, 10)
        const end = /^\d{4}-\d{2}-\d{2}$/.test(day)
          ? new Date(`${day}T23:59:59.999`).getTime()
          : new Date(item.endDate).getTime()
        if (!Number.isNaN(end) && now > end) return false
      }
      return true
    })
  }

  function studentFinishedApiEvaluation(studentUserId: string, apiEvaluationId: number): boolean {
    if (studentHasServerSubmission(studentUserId, apiEvaluationId)) return true
    const ev = evaluations.value.find((e) => e.apiId === apiEvaluationId)
    if (ev && studentAlreadyFinishedEvaluation(ev, studentUserId)) return true
    return sessions.value.some(
      (s) =>
        sessionBelongsToStudentUser(s, studentUserId) &&
        (s.apiEvaluationId === apiEvaluationId ||
          parseApiEvaluationId(s.evaluationId) === apiEvaluationId ||
          parseApiEvaluationId(s.evaluationCode) === apiEvaluationId) &&
        (s.status === 'submitted' || s.status === 'failed' || s.status === 'expired'),
    )
  }

  function studentHasServerSubmission(studentUserId: string, apiEvaluationId: number): boolean {
    return sessions.value.some(
      (s) =>
        sessionBelongsToStudentUser(s, studentUserId) &&
        s.apiEvaluationId === apiEvaluationId &&
        s.apiSubmissionId != null,
    )
  }

  /**
   * Étudiant : GET protected/evaluations/repondre uniquement
   * (pas la liste publique qui expose les bonnes réponses QCM).
   */
  async function syncStudentCatalog(): Promise<void> {
    if (!isApiEnabled()) return
    apiLoading.value = true
    apiError.value = null
    try {
      const [raw, forMeRaw] = await Promise.all([
        evaluationsApi.listAnswerableEvaluations(),
        evaluationsApi.listForMeEvaluations().catch(() => [] as EvaluationAnswerableSummary[]),
      ])
      const answerable = filterAnswerableStillOpen(raw)
      const forMe = filterAnswerableStillOpen(forMeRaw)
      answerableFromApi.value = answerable
      forMeFromApi.value = forMe
      const mergedSummaries = [...answerable]
      const seen = new Set(answerable.map((a) => a.id))
      for (const item of forMe) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          mergedSummaries.push(item)
        }
      }
      const mapped = mergedSummaries.map((item) => mapAnswerableSummaryToLocal(item, 'Enseignant'))
      // Remplace le catalogue API étudiant (évite de garder d'anciennes questions avec isValid).
      evaluations.value = [
        ...evaluations.value.filter((e) => !e.isFromApi),
        ...mapped,
      ]
      persistEvaluations()
    } catch (e) {
      apiError.value = extractApiError(e)
    } finally {
      apiLoading.value = false
    }
  }

  /** GET public/evaluations/{id} — résolution par code EV{id} / id numérique. */
  async function fetchEvaluationById(apiId: number): Promise<Evaluation | null> {
    try {
      const api = await evaluationsApi.getPublicEvaluation(apiId)
      if (!api) return null
      const mapped = mapApiEvaluationToLocal(api, 'Enseignant')
      mergeApiEvaluations([mapped])
      return mapped
    } catch (e) {
      apiError.value = extractApiError(e)
      return null
    }
  }

  /** GET protected/evaluations/{id}/passage — feuille pour passer l’épreuve (sans bonnes réponses). */
  async function loadPassageFromApi(apiId: number): Promise<Evaluation | null> {
    try {
      const passage = await evaluationsApi.getEvaluationPassage(apiId)
      const mapped = mapPassageToEvaluation(passage)
      mergeApiEvaluations([mapped])
      return mapped
    } catch (e) {
      apiError.value = extractApiError(e)
      return null
    }
  }

  /**
   * Résout une évaluation pour un étudiant : cache → repondre → métadonnées → passage.
   * Les questions d’examen viennent toujours de GET …/passage.
   */
  async function resolveAccessCodeForStudent(
    code: string,
  ): Promise<{ ok: true; evaluation: Evaluation } | { ok: false; error: string }> {
    const trimmed = code.trim()
    if (!trimmed) return { ok: false, error: 'Code vide.' }
    if (!isApiEnabled()) {
      const local = getByCode(trimmed)
      return local
        ? { ok: true, evaluation: local }
        : { ok: false, error: 'Code invalide.' }
    }
    apiError.value = null
    try {
      const resolved = await evaluationsApi.resolveAccessCode(trimmed)
      if (resolved.canJoin === false) {
        const msg =
          messageForJoinBlockCode(resolved.blockReasonCode) ??
          resolved.message ??
          'Vous ne pouvez pas rejoindre cette épreuve.'
        return { ok: false, error: msg }
      }
      const apiId =
        resolved.evaluationId ??
        parseApiEvaluationId(trimmed) ??
        getByCode(trimmed)?.apiId ??
        null
      if (apiId == null) {
        return { ok: false, error: resolved.message ?? 'Code introuvable.' }
      }
      const evaluation = await resolveForStudentExam(String(apiId))
      if (!evaluation) {
        return { ok: false, error: apiError.value ?? 'Évaluation introuvable.' }
      }
      return { ok: true, evaluation }
    } catch (e) {
      const msg = extractApiError(e)
      apiError.value = msg
      return { ok: false, error: msg }
    }
  }

  async function resolveForStudentExam(codeOrId: string): Promise<Evaluation | null> {
    let apiId =
      parseApiEvaluationId(codeOrId) ??
      getByCode(codeOrId)?.apiId ??
      null

    if (isApiEnabled() && apiId == null && codeOrId.trim()) {
      try {
        const resolved = await evaluationsApi.resolveAccessCode(codeOrId)
        if (resolved.canJoin === false) {
          apiError.value =
            messageForJoinBlockCode(resolved.blockReasonCode) ??
            resolved.message ??
            'Accès refusé.'
          return null
        }
        if (resolved.evaluationId) apiId = resolved.evaluationId
      } catch {
        /* fallback cache / repondre */
      }
    }

    let base = getByCode(codeOrId) ?? (apiId != null ? getById(String(apiId)) : undefined)

    if (!base && apiId != null) {
      await syncStudentCatalog().catch(() => undefined)
      base = evaluations.value.find((e) => e.apiId === apiId)
    }

    if (!base && apiId != null) {
      // Métadonnées publiques si absente de « repondre » (ex. code enseignant).
      base = (await fetchEvaluationById(apiId)) ?? undefined
      if (base) {
        // Ne pas laisser les isValid publics en store pour l'étudiant.
        base = {
          ...base,
          questions: [],
          settings: { ...base.settings, showCorrectAnswers: false },
        }
        mergeApiEvaluations([base])
      }
    }

    if (!base?.apiId) return base ?? null

    const passage = await loadPassageFromApi(base.apiId)
    return passage ?? null
  }

  async function ensureTeacherProfileForApi(): Promise<void> {
    const teacherStore = useTeacherStore()
    const auth = useAuthStore()

    // Profil déjà connu → ne jamais rappeler POST /v1/private/teachers.
    if (
      auth.currentUser?.hasTeacherProfile ||
      auth.currentUser?.teacherProfileId ||
      auth.teacherProfile?.teacherId ||
      teacherStore.myProfile?.teacherId
    ) {
      return
    }

    const teacher = await teacherStore.loadMyProfile()
    if (teacher?.teacherId) return

    // Enseignant côté session mais introuvable dans la liste API : on laisse
    // passer (JWT suffit pour créer l'évaluation). Pas de création auto avec
    // un body inventé (departement/gender) qui renvoie 400.
    if (auth.isTeacher) return

    throw new Error(
      'Profil enseignant requis. Complétez-le dans « Profil enseignant » avant de publier.',
    )
  }

  async function createEvaluationOnApi(data: {
    title: string
    description: string
    availableFrom: string | null
    availableUntil: string | null
    questions: Question[]
    teacherId: string
    teacherName: string
    subject: string
    type: EvaluationType
    durationMinutes: number
    fileContent?: string
    antiCheat?: Partial<AntiCheatConfig>
    settings?: Partial<EvaluationSettings>
    courseId?: string | null
    requireEnrollment?: boolean
    presentOnly?: boolean
    sessionDate?: string | null
  }): Promise<Evaluation> {
    const token = localStorage.getItem(TOKEN_KEY)?.trim()
    if (!token) {
      throw new Error('Connectez-vous pour publier une évaluation en ligne.')
    }

    const validationErrors = validateEvaluationPayloadForApi({
      title: data.title,
      questions: data.questions,
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil,
    })
    if (validationErrors.length) {
      throw new Error(validationErrors[0])
    }

    await ensureTeacherProfileForApi()

    const courseStore = useCourseStore()
    const classroomApiId = data.courseId
      ? courseStore.getById(data.courseId)?.apiId
      : undefined

    const payload = sanitizeEvaluationRequest(
      mapLocalQuestionsToApiRequest({
        title: data.title,
        description: data.description,
        subject: data.subject,
        availableFrom: data.availableFrom,
        availableUntil: data.availableUntil,
        questions: data.questions,
        durationMinutes: data.durationMinutes,
        fileContent: data.fileContent,
        antiCheat: { ...DEFAULT_ANTI_CHEAT, ...data.antiCheat },
        settings: {
          shuffleQuestions:
            data.settings?.shuffleQuestions ?? DEFAULT_SETTINGS.shuffleQuestions,
          allowDocumentUpload:
            data.settings?.allowDocumentUpload ?? DEFAULT_SETTINGS.allowDocumentUpload,
        },
        classroomId: classroomApiId,
      }),
    )

    if (!payload.option?.length && !payload.ouverte?.length && !payload.caseStudy?.length) {
      throw new Error('Ajoutez au moins une question valide (QCM, ouverte ou cas pratique).')
    }

    if (import.meta.env.DEV) {
      console.info('[LawApp] POST private/evaluations payload', payload)
    }

    try {
      const createRes = await evaluationsApi.createEvaluation(payload)
      const createdApiId = parseCreateEvaluationId(createRes as Record<string, unknown>)
      // continue below with createdApiId
      return await finalizeCreatedEvaluation(data, payload, createdApiId)
    } catch (e) {
      if (import.meta.env.DEV) {
        const err = e as { status?: number; data?: unknown; message?: string }
        console.warn('[LawApp] create evaluation failed', err.status, err.data ?? err.message, payload)
      }
      throw e
    }
  }

  async function finalizeCreatedEvaluation(
    data: {
      title: string
      description: string
      availableFrom: string | null
      availableUntil: string | null
      questions: Question[]
      teacherId: string
      teacherName: string
      subject: string
      type: EvaluationType
      durationMinutes: number
    fileContent?: string
    antiCheat?: Partial<AntiCheatConfig>
    settings?: Partial<EvaluationSettings>
    courseId?: string | null
    requireEnrollment?: boolean
    presentOnly?: boolean
    sessionDate?: string | null
  },
  payload: ReturnType<typeof mapLocalQuestionsToApiRequest>,
  createdApiId: number | null,
): Promise<Evaluation> {
  const localExtras = {
      teacherId: data.teacherId,
      createdByUserId: data.teacherId,
      teacherName: data.teacherName,
      subject: data.subject,
      type: data.type,
      durationMinutes: data.durationMinutes,
      antiCheat: { ...DEFAULT_ANTI_CHEAT, ...data.antiCheat },
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      status: 'active' as const,
      courseId: data.courseId ?? null,
      requireEnrollment: data.requireEnrollment ?? false,
      presentOnly: data.presentOnly ?? false,
      sessionDate: data.sessionDate ?? null,
    }

    if (createdApiId != null) {
      const fromServer = await fetchEvaluationById(createdApiId)
      if (fromServer) {
        updateEvaluation(fromServer.id, {
          ...localExtras,
          apiId: createdApiId,
          fileContent: data.fileContent ?? fromServer.fileContent,
          compteur: payload.compteur,
        })
        return getById(fromServer.id) ?? fromServer
      }
    }

    try {
      await syncFromApi()
    } catch {
      // La création a réussi : une erreur de resynchronisation ne doit pas bloquer.
    }

    const created =
      (createdApiId != null
        ? evaluations.value.find((e) => e.apiId === createdApiId || e.id === String(createdApiId))
        : undefined) ??
      evaluations.value.find((e) => e.title === data.title.trim()) ??
      evaluations.value[0]

    if (created) {
      updateEvaluation(created.id, {
        ...localExtras,
        apiId: created.apiId ?? createdApiId ?? undefined,
        fileContent: data.fileContent ?? created.fileContent,
        compteur: payload.compteur,
      })
      return getById(created.id) ?? created
    }

    if (createdApiId != null) {
      const apiEvaluation: ApiEvaluation = {
        id: createdApiId,
        title: data.title.trim(),
        description: data.description.trim(),
        compteur: payload.compteur,
        fileContent: data.fileContent,
        startDate: payload.startDate,
        endDate: payload.endDate,
        option: payload.option as ApiEvaluation['option'],
        ouverte: payload.ouverte as ApiEvaluation['ouverte'],
        caseStudy: payload.caseStudy as ApiEvaluation['caseStudy'],
      }
      const fallback = mapApiEvaluationToLocal(apiEvaluation, data.teacherName)
      mergeApiEvaluations([fallback])
      updateEvaluation(fallback.id, localExtras)
      return getById(fallback.id) ?? fallback
    }

    throw new Error('Évaluation créée, mais la confirmation est incomplète. Actualisez la page.')
  }

  async function submitAnswersToApi(
    evaluation: Evaluation,
    answers: StudentAnswer[],
    meta?: { timeSpentSeconds?: number; startedAt?: string },
  ): Promise<{ ok: true; apiId: number } | { ok: false; error: string }> {
    const apiId =
      evaluation.apiId ??
      parseApiEvaluationId(evaluation.id) ??
      parseApiEvaluationId(evaluation.code)
    if (apiId == null) {
      return {
        ok: false,
        error: 'Évaluation non synchronisée. Rejoignez l’épreuve depuis le catalogue.',
      }
    }
    try {
      if (import.meta.env.DEV) {
        console.info('[LawApp] POST protected/evaluations/%s/reponses', apiId, {
          answersCount: answers.length,
        })
      }
      // Soumission = POST …/reponses uniquement.
      const payload: import('@/api/types').EvaluationAnswerSubmitRequest = {
        answers: mapStudentAnswersToApi(answers, evaluation.questions),
      }
      if (meta?.timeSpentSeconds != null && meta.timeSpentSeconds >= 0) {
        payload.timeSpentSeconds = Math.round(meta.timeSpentSeconds)
      }
      if (meta?.startedAt) payload.startedAt = meta.startedAt
      await evaluationsApi.submitEvaluationAnswers(apiId, payload)
      clearMySubmissionCache(apiId)
      // Mémorise l’apiId si absent en store.
      if (evaluation.apiId == null) {
        updateEvaluation(evaluation.id, { apiId, isFromApi: true })
      }
      return { ok: true, apiId }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    }
  }

  function mergeViolationsFromLocalCompanion(mapped: ExamSession): ExamSession {
    const companion = findCompanionLocalSession(mapped, sessions.value)
    let next = mapped
    if (!mapped.violations.length && companion?.violations.length) {
      next = { ...next, violations: [...companion.violations] }
    }
    if ((!next.timeSpentSeconds || next.timeSpentSeconds <= 0) && companion?.timeSpentSeconds) {
      next = {
        ...next,
        timeSpentSeconds: companion.timeSpentSeconds,
        startedAt: companion.startedAt || next.startedAt,
      }
    }
    return next
  }

  function upsertApiSession(mapped: ExamSession): ExamSession {
    const enriched = withEvaluationMaxScore(mergeViolationsFromLocalCompanion(mapped))
    const idx = sessions.value.findIndex(
      (s) =>
        s.id === enriched.id ||
        (enriched.apiSubmissionId != null &&
          s.apiSubmissionId === enriched.apiSubmissionId &&
          (s.apiEvaluationId === enriched.apiEvaluationId ||
            s.evaluationId === enriched.evaluationId)),
    )
    if (idx >= 0) {
      const current = sessions.value[idx]
      const companion = findCompanionLocalSession(enriched, sessions.value)
      const violations =
        enriched.violations.length > 0
          ? enriched.violations
          : current.violations.length > 0
            ? current.violations
            : (companion?.violations ?? [])
      sessions.value[idx] = {
        ...current,
        ...enriched,
        id: current.id,
        violations,
        timeSpentSeconds: enriched.timeSpentSeconds || current.timeSpentSeconds,
        studentUserId: current.studentUserId ?? enriched.studentUserId,
      }
      persistSessions()
      return sessions.value[idx]
    }
    sessions.value.unshift(enriched)
    persistSessions()
    return enriched
  }

  /** GET private/evaluations/{id}/submissions — liste enseignant. */
  async function syncSubmissionsForEvaluation(apiEvaluationId: number): Promise<ExamSession[]> {
    if (!isApiEnabled()) return []
    try {
      const list = await evaluationsApi.listEvaluationSubmissions(apiEvaluationId)
      const mapped = list.map(mapSubmissionSummaryToSession)
      for (const session of mapped) upsertApiSession(session)
      return mapped
    } catch (e) {
      apiError.value = extractApiError(e)
      return []
    }
  }

  /** Charge toutes les soumissions des évaluations API du prof (dashboard / historique). */
  async function syncAllTeacherSubmissions(): Promise<void> {
    if (!isApiEnabled()) return
    const auth = useAuthStore()
    const teacherId = auth.currentUser?.id
    if (!teacherId) return
    const apiIds = [
      ...new Set(
        evaluations.value
          .filter((e) => e.apiId != null && isEvaluationOwnedByTeacher(e, teacherId))
          .map((e) => e.apiId as number),
      ),
    ]
    await Promise.allSettled(apiIds.map((id) => syncSubmissionsForEvaluation(id)))
  }

  /** GET private/.../submissions/{submissionId} */
  async function loadSubmissionDetail(
    apiEvaluationId: number,
    submissionId: number,
  ): Promise<ExamSession | null> {
    if (!isApiEnabled()) return null
    try {
      const detail = await evaluationsApi.getEvaluationSubmission(apiEvaluationId, submissionId)
      if (!detail) return null
      if (!getById(String(apiEvaluationId)) && !evaluations.value.some((e) => e.apiId === apiEvaluationId)) {
        await fetchEvaluationById(apiEvaluationId)
      }
      return upsertApiSession(mapSubmissionDetailToSession(detail))
    } catch (e) {
      apiError.value = extractApiError(e)
      return null
    }
  }

  function evaluationApiIdForSession(session: ExamSession): number | null {
    return (
      session.apiEvaluationId ??
      parseApiEvaluationId(session.evaluationId) ??
      parseApiEvaluationId(session.evaluationCode) ??
      getById(session.evaluationId)?.apiId ??
      parseApiEvaluationId(getById(session.evaluationId)?.code ?? '')
    )
  }

  /** Trouve evaluationId + submissionId API, même pour une session UUID locale. */
  async function resolveSessionApiIds(
    session: ExamSession,
  ): Promise<{ evaluationId: number; submissionId: number } | null> {
    const evaluationId = evaluationApiIdForSession(session)
    if (evaluationId == null) return null

    if (session.apiSubmissionId != null) {
      if (session.apiEvaluationId !== evaluationId) {
        updateSession(session.id, { apiEvaluationId: evaluationId })
      }
      return { evaluationId, submissionId: session.apiSubmissionId }
    }

    try {
      const list = await evaluationsApi.listEvaluationSubmissions(evaluationId)
      const match = matchSubmissionSummary(session, list)
      if (!match) return null
      updateSession(session.id, {
        apiEvaluationId: evaluationId,
        apiSubmissionId: match.submissionId,
      })
      return { evaluationId, submissionId: match.submissionId }
    } catch (e) {
      apiError.value = extractApiError(e)
      return null
    }
  }

  /** Résout `/teacher/session/:id` (sub-{eval}-{sub} ou session locale). */
  async function resolveSessionFromRoute(sessionId: string): Promise<ExamSession | null> {
    const parsed = parseSubmissionSessionId(sessionId)
    if (parsed && isApiEnabled()) {
      const detail = await loadSubmissionDetail(parsed.evaluationId, parsed.submissionId)
      return detail ?? getSession(sessionId) ?? getSession(submissionSessionId(parsed.evaluationId, parsed.submissionId)) ?? null
    }

    const local = getSession(sessionId)
    if (!local) return null
    if (!isApiEnabled()) return local

    const ids = await resolveSessionApiIds(local)
    if (ids) {
      const detail = await loadSubmissionDetail(ids.evaluationId, ids.submissionId)
      return getSession(sessionId) ?? detail ?? local
    }

    return local
  }

  function evaluationForSession(
    session: Pick<ExamSession, 'evaluationId' | 'apiEvaluationId' | 'evaluationCode'>,
  ): Evaluation | undefined {
    return (
      getById(session.evaluationId) ??
      getByCode(session.evaluationCode) ??
      (session.apiEvaluationId != null
        ? evaluations.value.find(
            (e) =>
              e.apiId === session.apiEvaluationId ||
              e.id === String(session.apiEvaluationId),
          )
        : undefined)
    )
  }

  function withEvaluationMaxScore(session: ExamSession): ExamSession {
    const ev = evaluationForSession(session)
    const max = mergeSubmissionMaxScore(session.maxScore, ev, session.apiAnswers)
    if (max != null && max !== session.maxScore) return { ...session, maxScore: max }
    return session
  }

  /** Met à jour toutes les sessions locales de l’étudiant pour cette évaluation (notes, feedback API). */
  function applySubmissionDetailToStudentSessions(
    detail: EvaluationSubmissionDetail,
    preferSessionId?: string,
  ): ExamSession {
    const mapped = withEvaluationMaxScore(mapSubmissionDetailToSession(detail))
    const auth = useAuthStore()
    const studentId = auth.currentUser?.id

    const targetIds = new Set<string>()
    if (preferSessionId) targetIds.add(preferSessionId)
    if (mapped.apiSubmissionId != null && mapped.apiEvaluationId != null) {
      targetIds.add(submissionSessionId(mapped.apiEvaluationId, mapped.apiSubmissionId))
    }
    for (const s of sessions.value) {
      if (studentId && !sessionBelongsToStudentUser(s, studentId)) continue
      const sameEval =
        (mapped.apiEvaluationId != null && s.apiEvaluationId === mapped.apiEvaluationId) ||
        s.evaluationId === mapped.evaluationId ||
        (mapped.apiEvaluationId != null && s.evaluationId === String(mapped.apiEvaluationId)) ||
        (mapped.apiEvaluationId != null &&
          s.evaluationCode.toUpperCase() === `EV${mapped.apiEvaluationId}`)
      if (sameEval) targetIds.add(s.id)
    }

    const patch: Partial<ExamSession> = {
      apiAnswers: mapped.apiAnswers ?? [],
      apiSubmissionId: mapped.apiSubmissionId,
      apiEvaluationId: mapped.apiEvaluationId,
      score: mapped.score,
      scoreQcm: mapped.scoreQcm,
      maxScore: mapped.maxScore,
      questionGrades: mapped.questionGrades,
      gradedAt: mapped.gradedAt,
      answers: mapped.answers.length ? mapped.answers : undefined,
      submittedAt: mapped.submittedAt,
      startedAt: mapped.startedAt,
      timeSpentSeconds: mapped.timeSpentSeconds > 0 ? mapped.timeSpentSeconds : undefined,
      studentFirstName: mapped.studentFirstName,
      studentLastName: mapped.studentLastName,
      studentEmail: mapped.studentEmail,
      studentId: mapped.studentId,
    }

    if (targetIds.size === 0) {
      return upsertApiSession(mapped)
    }

    let primary: ExamSession | undefined
    for (const id of targetIds) {
      const existing = getSession(id)
      if (!existing) continue
      const violations =
        existing.violations.length > 0 ? existing.violations : mapped.violations
      updateSession(id, {
        ...patch,
        apiAnswers: patch.apiAnswers?.length ? patch.apiAnswers : existing.apiAnswers,
        answers: patch.answers?.length ? patch.answers : existing.answers,
        score: patch.score ?? existing.score,
        scoreQcm: patch.scoreQcm ?? existing.scoreQcm,
        maxScore: patch.maxScore ?? existing.maxScore,
        questionGrades: patch.questionGrades?.length ? patch.questionGrades : existing.questionGrades,
        gradedAt: patch.gradedAt ?? existing.gradedAt,
        timeSpentSeconds:
          patch.timeSpentSeconds && patch.timeSpentSeconds > 0
            ? patch.timeSpentSeconds
            : existing.timeSpentSeconds,
        status: existing.status === 'failed' ? 'failed' : 'submitted',
        violations,
      })
      const updated = getSession(id)
      if (updated && (!primary || id === preferSessionId)) primary = updated
    }

    return primary ?? upsertApiSession(mapped)
  }

  /** GET protected/evaluations/{id}/ma-soumission — fusionne dans la session locale si possible. */
  async function loadMySubmission(
    apiEvaluationId: number,
    preferSessionId?: string,
    options?: { force?: boolean },
  ): Promise<ExamSession | null> {
    if (!isApiEnabled()) {
      return preferSessionId ? getSession(preferSessionId) ?? null : null
    }
    const auth = useAuthStore()
    const studentId = auth.currentUser?.id
    const mayCallApi =
      options?.force === true ||
      (studentId != null && studentHasServerSubmission(studentId, apiEvaluationId)) ||
      (studentId != null && studentFinishedApiEvaluation(studentId, apiEvaluationId))

    if (!mayCallApi) {
      if (preferSessionId && getSession(preferSessionId)) {
        return getSession(preferSessionId) ?? null
      }
      return null
    }

    try {
      const detail = await getMySubmission(apiEvaluationId, { force: options?.force })
      if (detail) return applySubmissionDetailToStudentSessions(detail, preferSessionId)
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status !== 404) apiError.value = extractApiError(e)
    }
    if (preferSessionId && getSession(preferSessionId)) {
      return getSession(preferSessionId) ?? null
    }
    const parsed = preferSessionId ? parseSubmissionSessionId(preferSessionId) : null
    if (parsed) {
      return getSession(submissionSessionId(parsed.evaluationId, parsed.submissionId)) ?? null
    }
    return (
      sessions.value.find(
        (s) =>
          s.apiEvaluationId === apiEvaluationId &&
          (s.status === 'submitted' || s.apiSubmissionId != null),
      ) ?? null
    )
  }

  /** Résout la session affichée sur /exam/:id/result (id UUID ou sub-{eval}-{sub}). */
  async function ensureStudentResultSession(
    sessionId: string,
    apiEvaluationId: number,
  ): Promise<ExamSession | null> {
    let s: ExamSession | null = getSession(sessionId) ?? null
    if (s) return s

    const parsed = parseSubmissionSessionId(sessionId)
    if (parsed) {
      s = getSession(submissionSessionId(parsed.evaluationId, parsed.submissionId)) ?? null
      if (s) return s
    }

    const fromApi = await loadMySubmission(apiEvaluationId, sessionId, { force: true })
    s = getSession(sessionId) ?? fromApi ?? null
    if (s) return s

    if (parsed) {
      return getSession(submissionSessionId(parsed.evaluationId, parsed.submissionId)) ?? null
    }
    return null
  }

  /** Recharge ma-soumission pour chaque évaluation API déjà passée (notes / feedback enseignant). */
  async function refreshMySubmissionsForStudent(): Promise<void> {
    if (!isApiEnabled()) return
    const auth = useAuthStore()
    const studentId = auth.currentUser?.id
    if (!studentId) return
    const apiIds = new Set<number>()
    for (const s of getSessionsForStudent(studentId)) {
      if (s.apiSubmissionId == null || s.apiEvaluationId == null) continue
      apiIds.add(s.apiEvaluationId)
    }
    await Promise.allSettled([...apiIds].map((id) => loadMySubmission(id, undefined, { force: true })))
  }

  /** POST private/.../submissions/{id}/notes */
  async function gradeSubmissionOnApi(
    session: ExamSession,
    grades: GradeItemRequest[],
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!grades.length) {
      return { ok: false, error: 'Au moins une note est requise.' }
    }
    const ids = await resolveSessionApiIds(session)
    const evalId = ids?.evaluationId
    const subId = ids?.submissionId
    if (evalId == null || subId == null) {
      return {
        ok: false,
        error:
          'Impossible de relier cette copie en ligne. Ouvrez-la depuis la liste des soumissions, puis réessayez.',
      }
    }
    try {
      if (import.meta.env.DEV) {
        console.info(
          '[LawApp] POST private/evaluations/%s/submissions/%s/notes',
          evalId,
          subId,
          grades,
        )
      }
      const response = await evaluationsApi.gradeEvaluationSubmission(evalId, subId, { grades })
      const fromPost = parseSubmissionApiResponse(response)
      if (fromPost) {
        upsertApiSession(mapSubmissionDetailToSession(fromPost))
      } else {
        await loadSubmissionDetail(evalId, subId)
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    }
  }

  function getByCode(code: string): Evaluation | undefined {
    const normalized = code.trim().toUpperCase()
    const byCode = evaluations.value.find((e) => e.code.toUpperCase() === normalized)
    if (byCode) return byCode
    const apiId = parseApiEvaluationId(code)
    if (apiId != null) return evaluations.value.find((e) => e.apiId === apiId || e.id === String(apiId))
    return undefined
  }

  function getById(id: string): Evaluation | undefined {
    return evaluations.value.find((e) => e.id === id)
  }

  function sessionBelongsToEvaluation(session: ExamSession, evaluation: Evaluation): boolean {
    if (session.evaluationId === evaluation.id) return true
    if (evaluation.apiId != null) {
      if (session.apiEvaluationId === evaluation.apiId) return true
      if (session.evaluationId === String(evaluation.apiId)) return true
      if (session.evaluationCode.toUpperCase() === `EV${evaluation.apiId}`) return true
    }
    return false
  }

  function getSessionsForEvaluation(evaluationId: string): ExamSession[] {
    const evaluation =
      getById(evaluationId) ??
      getByCode(evaluationId) ??
      evaluations.value.find((e) => String(e.apiId) === evaluationId)
    if (!evaluation) {
      return sessions.value.filter((s) => s.evaluationId === evaluationId)
    }
    return sessions.value
      .filter((s) => sessionBelongsToEvaluation(s, evaluation))
      .sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.startedAt).getTime() -
          new Date(a.submittedAt ?? a.startedAt).getTime(),
      )
  }

  function getSessionsForTeacher(teacherId: string): ExamSession[] {
    const teacherEvals = getEvaluationsForTeacher(teacherId)
    return sessions.value
      .filter((s) => teacherEvals.some((e) => sessionBelongsToEvaluation(s, e)))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  }

  function getStudentAttempts(evaluationId: string, studentId: string): number {
    const terminal: SessionStatus[] = ['submitted', 'failed', 'expired']
    return sessions.value.filter(
      (s) =>
        s.evaluationId === evaluationId &&
        s.studentId.toLowerCase() === studentId.toLowerCase() &&
        terminal.includes(s.status)
    ).length
  }

  function createSession(data: {
    evaluation: Evaluation
    studentUserId?: string
    studentFirstName: string
    studentLastName: string
    studentId: string
  }): ExamSession {
    if (!isEvaluationAvailable(data.evaluation)) {
      throw new Error(
        getEvaluationAvailabilityMessage({
          availableFrom: data.evaluation.availableFrom ?? null,
          availableUntil: data.evaluation.availableUntil ?? null,
          title: data.evaluation.title,
        }) ||
          "Cette évaluation n'est plus accessible.",
      )
    }
    const now = new Date()
    const session: ExamSession = {
      id: generateId(),
      evaluationId: data.evaluation.id,
      evaluationCode: data.evaluation.code,
      studentUserId: data.studentUserId,
      studentFirstName: data.studentFirstName,
      studentLastName: data.studentLastName,
      studentId: data.studentId,
      startedAt: now.toISOString(),
      expiresAt: now.toISOString(),
      status: 'pending',
      answers: [],
      violations: [],
      timeSpentSeconds: 0,
    }
    sessions.value.unshift(session)
    persistSessions()
    return session
  }

  function getActiveSessionForStudent(
    evaluationId: string,
    studentUserId: string
  ): ExamSession | undefined {
    return sessions.value.find(
      (s) =>
        s.evaluationId === evaluationId &&
        s.studentUserId === studentUserId &&
        (s.status === 'pending' || s.status === 'in_progress')
    )
  }

  function getActiveSessionByStudentId(
    evaluationId: string,
    studentId: string
  ): ExamSession | undefined {
    const id = studentId.trim().toLowerCase()
    return sessions.value.find(
      (s) =>
        s.evaluationId === evaluationId &&
        s.studentId.toLowerCase() === id &&
        (s.status === 'pending' || s.status === 'in_progress')
    )
  }

  function getExamEntryPath(session: ExamSession): string {
    if (session.status === 'pending') return `/exam/${session.id}/intro`
    if (session.status === 'in_progress') return `/exam/${session.id}`
    return `/exam/${session.id}/result`
  }

  function beginSession(sessionId: string): ExamSession | null {
    const session = getSession(sessionId)
    if (!session) return null
    const evaluation = getById(session.evaluationId)
    if (!evaluation) return null

    if (session.status === 'in_progress') {
      const expiresMs = new Date(session.expiresAt).getTime()
      const startedMs = new Date(session.startedAt).getTime()
      if (expiresMs <= startedMs) {
        const now = new Date()
        const mins = resolveEvaluationDurationMinutes(evaluation) ?? 60
        updateSession(sessionId, {
          startedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + mins * 60 * 1000).toISOString(),
        })
      }
      return getSession(sessionId) ?? null
    }

    if (session.status !== 'pending') return null

    // Date limite dépassée : ne plus démarrer une nouvelle tentative.
    if (!isEvaluationAvailable(evaluation)) return null

    const now = new Date()
    const mins = resolveEvaluationDurationMinutes(evaluation) ?? 60
    updateSession(sessionId, {
      status: 'in_progress',
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + mins * 60 * 1000).toISOString(),
    })
    return getSession(sessionId) ?? null
  }

  function updateSession(id: string, updates: Partial<ExamSession>) {
    const idx = sessions.value.findIndex((s) => s.id === id)
    if (idx === -1) return
    sessions.value[idx] = { ...sessions.value[idx], ...updates }
    persistSessions()
  }

  function getSession(id: string): ExamSession | undefined {
    return sessions.value.find((s) => s.id === id)
  }

  function stampAccessCodeExpiry(evaluationId: string) {
    const evaluation = getById(evaluationId)
    if (!evaluation) return
    updateEvaluation(evaluationId, {
      accessCodeExpiresAt: computeAccessCodeExpiresAt(evaluation),
    })
  }

  /** Évaluations visibles automatiquement (parcours étudiant validé + ciblage). */
  function getPersonalizedEvaluationsForStudent(studentUserId: string): Evaluation[] {
    const auth = useAuthStore()
    const user = auth.getUserById(studentUserId) ?? auth.currentUser
    if (!isStudentAcademicVerified(user)) {
      return []
    }
    if (isApiEnabled()) {
      const forMeIds = new Set(forMeFromApi.value.map((a) => a.id))
      const list = evaluations.value.filter(
        (e) =>
          e.isFromApi &&
          e.apiId != null &&
          forMeIds.has(e.apiId) &&
          e.status === 'active' &&
          isEvaluationAvailable(e) &&
          !studentAlreadyFinishedEvaluation(e, studentUserId),
      )
      return sortEvaluationsNewestFirst(list)
    }
    const list = evaluations.value.filter(
      (e) =>
        e.status === 'active' &&
        isEvaluationAvailable(e) &&
        !studentAlreadyFinishedEvaluation(e, studentUserId) &&
        studentMatchesEvaluationAudience(e, user, studentUserId),
    )
    return sortEvaluationsNewestFirst(list)
  }

  function getCatalogEvaluationsForStudent(): Evaluation[] {
    if (isApiEnabled()) {
      const auth = useAuthStore()
      const studentId = auth.currentUser?.id
      const answerableIds = new Set(answerableFromApi.value.map((a) => a.id))
      const forMeIds = new Set(forMeFromApi.value.map((a) => a.id))
      let list = evaluations.value.filter(
        (e) =>
          e.isFromApi &&
          e.apiId != null &&
          answerableIds.has(e.apiId) &&
          !forMeIds.has(e.apiId) &&
          isEvaluationAvailable(e),
      )
      if (studentId) {
        list = list.filter((e) => !studentAlreadyFinishedEvaluation(e, studentId))
      }
      return sortEvaluationsNewestFirst(list)
    }
    const auth = useAuthStore()
    const user = auth.currentUser
    const studentId = user?.id
    const personalizedIds = new Set(
      studentId ? getPersonalizedEvaluationsForStudent(studentId).map((e) => e.id) : [],
    )
    return sortEvaluationsNewestFirst(
      evaluations.value.filter(
        (e) =>
          e.status === 'active' &&
          isEvaluationAvailable(e) &&
          isOpenCatalogEvaluation(e) &&
          !personalizedIds.has(e.id),
      ),
    )
  }

  /** Toutes les épreuves accessibles (dédupliquées) — calendrier, exports iCal. */
  function getCalendarEvaluationsForStudent(studentUserId: string): Evaluation[] {
    const byId = new Map<string, Evaluation>()
    for (const e of getPersonalizedEvaluationsForStudent(studentUserId)) {
      byId.set(e.id, e)
    }
    for (const e of getCatalogEvaluationsForStudent()) {
      byId.set(e.id, e)
    }
    for (const e of getCohortEvaluationsForStudent(studentUserId)) {
      byId.set(e.id, e)
    }
    for (const e of getCodeProtectedEvaluationsForStudent(studentUserId)) {
      byId.set(e.id, e)
    }
    return sortEvaluationsNewestFirst([...byId.values()])
  }

  /** Formations / cohortes : membres de la salle uniquement (hors catalogue public). */
  function getCohortEvaluationsForStudent(studentUserId: string): Evaluation[] {
    const courseStore = useCourseStore()
    const enrolledIds = new Set(
      courseStore.getCoursesForStudent(studentUserId).map((c) => c.id),
    )
    const list = evaluations.value.filter((e) => {
      if (e.status !== 'active' || !isCohortEvaluation(e) || !isEvaluationAvailable(e)) return false
      if (studentAlreadyFinishedEvaluation(e, studentUserId)) return false
      const cid = e.audienceClassroomId ?? e.courseId
      return !!cid && enrolledIds.has(cid)
    })
    return sortEvaluationsNewestFirst(list)
  }

  function getTeacherEvaluationsSorted(teacherId: string): Evaluation[] {
    return sortEvaluationsNewestFirst(getEvaluationsForTeacher(teacherId))
  }

  function getSharedEvaluationsForStudent(studentUserId: string): Evaluation[] {
    const courseStore = useCourseStore()
    const courseIds = new Set(
      courseStore.getCoursesForStudent(studentUserId).map((c) => c.id)
    )
    return evaluations.value.filter(
      (e) =>
        e.status === 'active' &&
        isEvaluationAvailable(e) &&
        !!e.sharedToClassAt &&
        !e.requiresAccessCode &&
        !!e.courseId &&
        courseIds.has(e.courseId)
    )
  }

  function getCodeProtectedEvaluationsForStudent(studentUserId: string): Evaluation[] {
    const courseStore = useCourseStore()
    const courseIds = new Set(courseStore.getCoursesForStudent(studentUserId).map((c) => c.id))
    return evaluations.value.filter(
      (e) =>
        e.status === 'active' &&
        isEvaluationAvailable(e) &&
        e.requiresAccessCode &&
        !!e.sharedToClassAt &&
        (!e.courseId || courseIds.has(e.courseId)),
    )
  }

  function publishEvaluationCode(
    evaluationId: string
  ): { ok: true } | { ok: false; error: string } {
    const evaluation = getById(evaluationId)
    if (!evaluation) return { ok: false, error: 'Évaluation introuvable.' }
    if (evaluation.status !== 'active') {
      return { ok: false, error: 'Activez l\'évaluation avant de générer le code.' }
    }

    updateEvaluation(evaluationId, {
      sharedToClassAt: new Date().toISOString(),
      requiresAccessCode: true,
    })
    stampAccessCodeExpiry(evaluationId)
    return { ok: true }
  }

  function shareEvaluationToClass(
    evaluationId: string
  ): { ok: true } | { ok: false; error: string } {
    const evaluation = getById(evaluationId)
    if (!evaluation) return { ok: false, error: 'Évaluation introuvable.' }
    if (evaluation.status !== 'active') {
      return { ok: false, error: 'Activez l\'évaluation avant de la partager.' }
    }
    if (!evaluation.courseId) {
      return { ok: false, error: 'Liez cette évaluation à une salle pour la partager à vos étudiants inscrits.' }
    }

    const courseStore = useCourseStore()
    const course = courseStore.getById(evaluation.courseId)
    if (!course) return { ok: false, error: 'Salle introuvable.' }
    if (course.studentUserIds.length === 0) {
      return { ok: false, error: 'Aucun étudiant inscrit dans votre salle.' }
    }

    updateEvaluation(evaluationId, {
      sharedToClassAt: new Date().toISOString(),
      requiresAccessCode: false,
    })
    stampAccessCodeExpiry(evaluationId)

    const notifications = useNotificationStore()
    notifications.pushToMany(course.studentUserIds, {
      title: `Évaluation · ${evaluation.title}`,
      body: `Disponible dans votre espace étudiant.`,
      link: '/student',
      type: 'evaluation',
    })

    return { ok: true }
  }

  return {
    evaluations,
    sessions,
    activeEvaluations,
    totalSessions,
    apiLoading,
    apiError,
    answerableFromApi,
    forMeFromApi,
    syncFromApi,
    syncStudentCatalog,
    resolveAccessCodeForStudent,
    fetchEvaluationById,
    loadPassageFromApi,
    resolveForStudentExam,
    createEvaluationOnApi,
    submitAnswersToApi,
    syncSubmissionsForEvaluation,
    syncAllTeacherSubmissions,
    loadSubmissionDetail,
    resolveSessionFromRoute,
    loadMySubmission,
    ensureStudentResultSession,
    refreshMySubmissionsForStudent,
    gradeSubmissionOnApi,
    getEvaluationsForTeacher,
    getSessionsForStudent,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    getByCode,
    getById,
    getSessionsForEvaluation,
    getSessionsForTeacher,
    getStudentAttempts,
    createSession,
    beginSession,
    getExamEntryPath,
    getActiveSessionForStudent,
    getActiveSessionByStudentId,
    updateSession,
    getSession,
    getCatalogEvaluationsForStudent,
    getCalendarEvaluationsForStudent,
    getCohortEvaluationsForStudent,
    getPersonalizedEvaluationsForStudent,
    getTeacherEvaluationsSorted,
    getSharedEvaluationsForStudent,
    getCodeProtectedEvaluationsForStudent,
    publishEvaluationCode,
    shareEvaluationToClass,
  }
})
