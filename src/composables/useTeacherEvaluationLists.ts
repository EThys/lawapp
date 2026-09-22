import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { isApiEnabled } from '@/config/features'
import { useServerShimmer } from '@/composables/useServerShimmer'
import { EVALUATION_TYPE_LABELS, SESSION_STATUS_LABELS, type EvaluationStatus } from '@/types'
import { formatDate, formatDateOnly, formatMinutes } from '@/utils/helpers'
import { submissionSessionId } from '@/utils/evaluationApiMapper'

export function useTeacherEvaluationLists() {
  const store = useEvaluationStore()
  const auth = useAuthStore()
  const router = useRouter()

  const { showShimmer } = useServerShimmer(computed(() => store.apiLoading))

  const myEvaluations = computed(() =>
    auth.currentUser ? store.getTeacherEvaluationsSorted(auth.currentUser.id) : [],
  )

  const evaluationColumns = [
    { key: 'title', label: 'Évaluation' },
    { key: 'type', label: 'Type', hideOnMobile: true },
    { key: 'status', label: 'Statut' },
    { key: 'deadline', label: 'Échéance' },
    { key: 'details', label: 'Détails', hideOnMobile: true },
    { key: 'actions', label: 'Actions', class: 'text-right whitespace-nowrap' },
  ]

  const evaluationTableRows = computed(() =>
    myEvaluations.value.map((evaluation) => ({
      id: evaluation.id,
      submissionCount: store.getSessionsForEvaluation(evaluation.id).filter(
        (s) => s.submittedAt || s.apiSubmissionId != null,
      ).length,
      title: evaluation.title,
      type: EVALUATION_TYPE_LABELS[evaluation.type],
      status: statusLabel(evaluation.status),
      statusKey: evaluation.status,
      details: `${evaluation.subject} · ${formatMinutes(evaluation.durationMinutes)} · ${evaluation.questions.length} q.`,
      subject: evaluation.subject,
      durationMinutes: evaluation.durationMinutes,
      questionsCount: evaluation.questions.length,
      code: evaluation.code,
      shared: !!evaluation.sharedToClassAt,
      opensAt: evaluation.availableFrom ? formatDateOnly(evaluation.availableFrom) : null,
      closesAt: evaluation.availableUntil ? formatDateOnly(evaluation.availableUntil) : null,
      createdAt: formatDate(evaluation.createdAt),
    })),
  )

  const recentSessions = computed(() => {
    if (!auth.currentUser) return []
    return store
      .getSessionsForTeacher(auth.currentUser.id)
      .slice()
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  })

  const sessionColumns = [
    { key: 'student', label: 'Étudiant' },
    { key: 'evaluation', label: 'Évaluation' },
    { key: 'status', label: 'Statut' },
    { key: 'score', label: 'Score', hideOnMobile: true },
    { key: 'startedAt', label: 'Début', hideOnMobile: true },
    { key: 'alerts', label: 'Alertes' },
  ]

  const sessionTableRows = computed(() => {
    const titleById = new Map(myEvaluations.value.map((e) => [e.id, e.title]))
    return recentSessions.value.map((session) => {
      const user = session.studentUserId ? auth.getUserById(session.studentUserId) : null
      const studentName = [session.studentLastName, session.studentFirstName]
        .filter(Boolean)
        .join(' ')
      const rowId =
        session.apiEvaluationId != null && session.apiSubmissionId != null
          ? submissionSessionId(session.apiEvaluationId, session.apiSubmissionId)
          : session.id
      return {
        id: rowId,
        student: user ? `${user.lastName} ${user.firstName}` : studentName || 'Étudiant',
        evaluation: titleById.get(session.evaluationId) ?? 'Évaluation',
        status: SESSION_STATUS_LABELS[session.status],
        statusKey: session.status,
        score:
          session.score == null
            ? '—'
            : `${session.score}${session.maxScore != null ? ` / ${session.maxScore}` : ''}`,
        startedAt: formatDate(session.startedAt),
        alerts: session.violations.length,
        violationCount: session.violations.length,
      }
    })
  })

  function evalBadgeVariant(key: unknown) {
    if (key === 'draft' || key === 'active' || key === 'closed') return statusVariant(key)
    return 'muted' as const
  }

  function sessionBadgeVariant(key: unknown) {
    if (key === 'submitted') return 'success' as const
    if (key === 'failed' || key === 'abandoned') return 'danger' as const
    if (key === 'in_progress') return 'warning' as const
    return 'muted' as const
  }

  function statusVariant(status: EvaluationStatus) {
    const map = { draft: 'muted' as const, active: 'success' as const, closed: 'danger' as const }
    return map[status]
  }

  function statusLabel(status: EvaluationStatus) {
    const map = { draft: 'Brouillon', active: 'Active', closed: 'Fermée' }
    return map[status]
  }

  function deleteEval(id: string) {
    if (confirm('Supprimer cette évaluation et toutes ses sessions ?')) {
      store.deleteEvaluation(id)
    }
  }

  function openSessionDetail(row: Record<string, unknown>) {
    const id = String(row.id ?? '')
    if (!id) return
    void router.push(`/teacher/session/${id}`)
  }

  onMounted(() => {
    if (!isApiEnabled()) return
    void store.syncFromApi()
    void store.syncAllTeacherSubmissions()
  })

  return {
    store,
    showShimmer,
    myEvaluations,
    evaluationColumns,
    evaluationTableRows,
    sessionColumns,
    sessionTableRows,
    evalBadgeVariant,
    sessionBadgeVariant,
    deleteEval,
    openSessionDetail,
  }
}
