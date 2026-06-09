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
} from '@/types'
import { DEFAULT_ANTI_CHEAT, DEFAULT_SETTINGS } from '@/types'
import { generateId, generateCode } from '@/utils/helpers'
import { useCourseStore } from '@/stores/courses'
import { useNotificationStore } from '@/stores/notifications'

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
    return evaluations.value.filter((e) => e.teacherId === teacherId)
  }

  function getSessionsForStudent(studentUserId: string): ExamSession[] {
    return sessions.value.filter((s) => s.studentUserId === studentUserId)
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

  function getByCode(code: string): Evaluation | undefined {
    return evaluations.value.find(
      (e) => e.code.toUpperCase() === code.toUpperCase()
    )
  }

  function getById(id: string): Evaluation | undefined {
    return evaluations.value.find((e) => e.id === id)
  }

  function getSessionsForEvaluation(evaluationId: string): ExamSession[] {
    return sessions.value.filter((s) => s.evaluationId === evaluationId)
  }

  function getSessionsForTeacher(teacherId: string): ExamSession[] {
    const evalIds = new Set(getEvaluationsForTeacher(teacherId).map((e) => e.id))
    return sessions.value
      .filter((s) => evalIds.has(s.evaluationId))
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
        updateSession(sessionId, {
          startedAt: now.toISOString(),
          expiresAt: new Date(
            now.getTime() + evaluation.durationMinutes * 60 * 1000
          ).toISOString(),
        })
      }
      return getSession(sessionId) ?? null
    }

    if (session.status !== 'pending') return null

    const now = new Date()
    updateSession(sessionId, {
      status: 'in_progress',
      startedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + evaluation.durationMinutes * 60 * 1000
      ).toISOString(),
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

  function getSharedEvaluationsForStudent(studentUserId: string): Evaluation[] {
    const courseStore = useCourseStore()
    const courseIds = new Set(
      courseStore.getCoursesForStudent(studentUserId).map((c) => c.id)
    )
    return evaluations.value.filter(
      (e) =>
        e.status === 'active' &&
        !!e.sharedToClassAt &&
        !!e.courseId &&
        courseIds.has(e.courseId)
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

    updateEvaluation(evaluationId, { sharedToClassAt: new Date().toISOString() })
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

    updateEvaluation(evaluationId, { sharedToClassAt: new Date().toISOString() })

    const notifications = useNotificationStore()
    notifications.pushToMany(course.studentUserIds, {
      title: `Évaluation · ${evaluation.title}`,
      body: `Code d'accès : ${evaluation.code}. Retrouvez-le dans votre espace étudiant.`,
      link: `/student?code=${evaluation.code}`,
      type: 'evaluation',
    })

    return { ok: true }
  }

  return {
    evaluations,
    sessions,
    activeEvaluations,
    totalSessions,
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
    getSharedEvaluationsForStudent,
    publishEvaluationCode,
    shareEvaluationToClass,
  }
})
