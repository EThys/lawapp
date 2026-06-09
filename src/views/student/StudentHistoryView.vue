<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { useCourseStore } from '@/stores/courses'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AttendanceListPanel from '@/components/attendance/AttendanceListPanel.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import HistoryFilterBar from '@/components/history/HistoryFilterBar.vue'
import { useStudentAttendanceList } from '@/composables/useStudentAttendanceList'
import type { AttendanceListType } from '@/utils/attendanceTable'
import type { Evaluation, ExamSession, SessionStatus } from '@/types'
import { SESSION_STATUS_LABELS, VIOLATION_TYPE_LABELS } from '@/types'
import { formatDate } from '@/utils/helpers'
import { downloadExcel, downloadPdf } from '@/utils/exportReports'
import {
  getStudentAnswerText,
  isAnswerCorrect,
  getCorrectAnswerText,
} from '@/utils/evaluationReview'
import {
  ArrowLeft,
  CheckCircle,
  ShieldAlert,
  UserX,
  CalendarCheck,
  X,
  FileSpreadsheet,
  FileText,
} from '@lucide/vue'

type TabId = 'passed' | 'missed' | 'alerts' | 'presences'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const evalStore = useEvaluationStore()
const courseStore = useCourseStore()

const tabs: { id: TabId; label: string; icon: typeof CheckCircle }[] = [
  { id: 'passed', label: 'Évaluations passées', icon: CheckCircle },
  { id: 'missed', label: 'Manquées', icon: UserX },
  { id: 'alerts', label: 'Alertes & triche', icon: ShieldAlert },
  { id: 'presences', label: 'Présences', icon: CalendarCheck },
]

const activeTab = ref<TabId>((route.query.tab as TabId) || 'passed')
const searchQuery = ref('')
const evaluationFilter = ref('all')
const selectedSessionId = ref<string | null>(null)

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab } })
})

const studentId = computed(() => auth.currentUser?.id ?? '')

const {
  search: presenceSearch,
  courseFilter: presenceCourseFilter,
  typeFilter: presenceTypeFilter,
  selectedDate: selectedPresenceDate,
  myCourses,
  calendarMarks: presenceCalendarMarks,
  filteredRows: filteredAttendanceRows,
  tableRows: presenceTableRows,
  selectedDateLabel: presenceDateLabel,
  stats: presenceStats,
} = useStudentAttendanceList({
  studentUserId: studentId,
  getCourses: () => courseStore.getCoursesForStudent(studentId.value),
  getPresenceRecords: (id) => courseStore.getAttendanceHistoryForStudent(id),
  getAbsenceDays: (id) => courseStore.getAbsenceDaysForStudent(id),
  getCourseName: (id) => courseStore.getById(id)?.name ?? 'Salle',
})

const mySessions = computed(() =>
  studentId.value ? evalStore.getSessionsForStudent(studentId.value) : []
)

const sharedEvaluations = computed(() =>
  studentId.value ? evalStore.getSharedEvaluationsForStudent(studentId.value) : []
)

const myCoursesForEval = computed(() => myCourses.value)

const evaluationById = computed(() => {
  const map = new Map<string, Evaluation>()
  for (const s of mySessions.value) {
    const ev = evalStore.getById(s.evaluationId)
    if (ev) map.set(ev.id, ev)
  }
  for (const ev of sharedEvaluations.value) map.set(ev.id, ev)
  return map
})

const passedSessions = computed(() =>
  mySessions.value.filter((s) => s.status === 'submitted')
)

const alertSessions = computed(() =>
  mySessions.value.filter((s) => s.violations.length > 0 || s.status === 'failed')
)

interface MissedItem {
  key: string
  kind: 'expired' | 'failed' | 'never_started'
  session?: ExamSession
  evaluation: Evaluation
  label: string
}

const missedItems = computed((): MissedItem[] => {
  const items: MissedItem[] = []
  const attemptedEvalIds = new Set(mySessions.value.map((s) => s.evaluationId))

  for (const session of mySessions.value) {
    const evaluation = evalStore.getById(session.evaluationId)
    if (!evaluation) continue
    if (session.status === 'expired') {
      items.push({
        key: `expired-${session.id}`,
        kind: 'expired',
        session,
        evaluation,
        label: 'Évaluation expirée sans soumission',
      })
    } else if (session.status === 'failed' && !session.submittedAt) {
      items.push({
        key: `failed-${session.id}`,
        kind: 'failed',
        session,
        evaluation,
        label: 'Session interrompue (anti-triche)',
      })
    }
  }

  for (const evaluation of sharedEvaluations.value) {
    if (!attemptedEvalIds.has(evaluation.id) && evaluation.status !== 'draft') {
      items.push({
        key: `never-${evaluation.id}`,
        kind: 'never_started',
        evaluation,
        label: evaluation.status === 'closed' ? 'Évaluation fermée sans passage' : 'Non commencée',
      })
    }
  }

  for (const course of myCoursesForEval.value) {
    const evalsForCourse = evalStore.evaluations.filter(
      (e) =>
        e.courseId === course.id &&
        e.sharedToClassAt &&
        !attemptedEvalIds.has(e.id) &&
        e.status !== 'draft'
    )
    for (const evaluation of evalsForCourse) {
      if (!items.some((i) => i.evaluation.id === evaluation.id)) {
        items.push({
          key: `never-${evaluation.id}`,
          kind: 'never_started',
          evaluation,
          label: evaluation.status === 'closed' ? 'Évaluation fermée sans passage' : 'Partagée, non commencée',
        })
      }
    }
  }

  return items.sort((a, b) => {
    const dateA = a.session?.startedAt ?? a.evaluation.updatedAt
    const dateB = b.session?.startedAt ?? b.evaluation.updatedAt
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })
})

const evaluationOptions = computed(() =>
  Array.from(evaluationById.value.values()).map((e) => ({ id: e.id, title: e.title }))
)

const passedColumns = [
  { key: 'title', label: 'Évaluation' },
  { key: 'date', label: 'Date' },
  { key: 'score', label: 'Score', class: 'tabular-nums' },
  { key: 'status', label: 'Statut' },
]

const missedColumns = [
  { key: 'title', label: 'Évaluation' },
  { key: 'subject', label: 'Matière', hideOnMobile: true },
  { key: 'label', label: 'Motif' },
  { key: 'date', label: 'Date' },
]

const alertColumns = [
  { key: 'title', label: 'Évaluation' },
  { key: 'status', label: 'Statut' },
  { key: 'alerts', label: 'Alertes', class: 'tabular-nums' },
  { key: 'date', label: 'Date' },
]

const passedTableRows = computed(() =>
  filteredPassed.value.map((s) => ({
    id: s.id,
    session: s,
    title: evaluationById.value.get(s.evaluationId)?.title ?? s.evaluationCode,
    date: s.submittedAt ? formatDate(s.submittedAt) : formatDate(s.startedAt),
    score: s.score !== undefined ? `${s.score}/${s.maxScore}` : '—',
    status: SESSION_STATUS_LABELS[s.status],
  }))
)

const missedTableRows = computed(() =>
  filteredMissed.value.map((item) => ({
    id: item.key,
    item,
    title: item.evaluation.title,
    subject: item.evaluation.subject,
    label: item.label,
    date: item.session
      ? formatDate(item.session.startedAt)
      : formatDate(item.evaluation.updatedAt),
  }))
)

const alertTableRows = computed(() =>
  filteredAlerts.value.map((s) => ({
    id: s.id,
    session: s,
    title: evaluationById.value.get(s.evaluationId)?.title ?? s.evaluationCode,
    status: SESSION_STATUS_LABELS[s.status],
    alerts: String(s.violations.length),
    date: s.submittedAt ? formatDate(s.submittedAt) : formatDate(s.startedAt),
  }))
)

const counts = computed(() => ({
  passed: passedSessions.value.length,
  missed: missedItems.value.length,
  alerts: alertSessions.value.length,
  presences: presenceStats.value.presents + presenceStats.value.absences,
}))

const filteredPassed = computed(() => filterSessions(passedSessions.value))
const filteredAlerts = computed(() => filterSessions(alertSessions.value))

function filterSessions(list: ExamSession[]) {
  let result = list

  if (evaluationFilter.value !== 'all') {
    result = result.filter((s) => s.evaluationId === evaluationFilter.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return result
  return result.filter((s) => {
    const title = evaluationById.value.get(s.evaluationId)?.title ?? ''
    return title.toLowerCase().includes(q) || s.evaluationCode.toLowerCase().includes(q)
  })
}

const filteredMissed = computed(() => {
  let list = missedItems.value
  if (evaluationFilter.value !== 'all') {
    list = list.filter((item) => item.evaluation.id === evaluationFilter.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((item) => item.evaluation.title.toLowerCase().includes(q))
})

const selectedSession = computed(() =>
  selectedSessionId.value ? evalStore.getSession(selectedSessionId.value) : undefined
)

const selectedEvaluation = computed(() =>
  selectedSession.value ? evalStore.getById(selectedSession.value.evaluationId) : undefined
)

function statusVariant(status: SessionStatus) {
  const map: Record<SessionStatus, 'brand' | 'success' | 'danger' | 'warning' | 'muted'> = {
    pending: 'warning',
    in_progress: 'brand',
    submitted: 'success',
    failed: 'danger',
    expired: 'warning',
  }
  return map[status]
}

function openMissedRow(row: Record<string, unknown>) {
  const item = (row as { item: MissedItem }).item
  if (item.session) openSession(item.session)
}

function openSession(session: ExamSession) {
  selectedSessionId.value = session.id
}

function closeSession() {
  selectedSessionId.value = null
}

function exportRows(): string[][] {
  if (activeTab.value === 'presences') {
    return [
      ['Type', 'Salle', 'Date', 'Détail'],
      ...filteredAttendanceRows.value.map((r) => [
        r.type === 'present' ? 'Présent' : 'Absent',
        r.courseName,
        r.date,
        r.type === 'present' && r.detail ? formatDate(r.detail) : '—',
      ]),
    ]
  }

  if (activeTab.value === 'missed') {
    return [
      ['Évaluation', 'Matière', 'Motif', 'Date'],
      ...filteredMissed.value.map((item) => [
        item.evaluation.title,
        item.evaluation.subject,
        item.label,
        item.session
          ? formatDate(item.session.startedAt)
          : formatDate(item.evaluation.updatedAt),
      ]),
    ]
  }

  const sessions =
    activeTab.value === 'passed'
      ? filteredPassed.value
      : activeTab.value === 'alerts'
        ? filteredAlerts.value
        : mySessions.value

  return [
    ['Évaluation', 'Statut', 'Score', 'Violations', 'Motifs', 'Date'],
    ...sessions.map((s) => [
      evaluationById.value.get(s.evaluationId)?.title ?? s.evaluationCode,
      SESSION_STATUS_LABELS[s.status],
      s.score !== undefined ? `${s.score}/${s.maxScore}` : '—',
      String(s.violations.length),
      s.violations.map((v) => `${VIOLATION_TYPE_LABELS[v.type]}: ${v.message}`).join(' · ') || '—',
      s.submittedAt ? formatDate(s.submittedAt) : formatDate(s.startedAt),
    ]),
  ]
}

function exportExcel() {
  const title = tabs.find((t) => t.id === activeTab.value)?.label ?? 'Historique'
  downloadExcel(exportRows(), `lawapp-etudiant-${activeTab.value}.xlsx`, title)
}

function exportPdf() {
  const title = `LawApp · ${tabs.find((t) => t.id === activeTab.value)?.label ?? 'Historique'}`
  downloadPdf(title, exportRows(), `lawapp-etudiant-${activeTab.value}.pdf`)
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
    <RouterLink
      to="/student"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors min-h-11"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour à mon espace
    </RouterLink>

    <div v-reveal class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
      <div>
        <p class="label-caps mb-2">Espace étudiant</p>
        <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight">Mon historique</h1>
        <p class="mt-1 text-sm text-ink-muted">
          Évaluations passées, manquées, alertes anti-triche et présences.
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <AppButton variant="outline" class="w-full sm:w-auto" @click="exportExcel">
          <FileSpreadsheet class="w-4 h-4" />
          Exporter XLS
        </AppButton>
        <AppButton variant="outline" class="w-full sm:w-auto" @click="exportPdf">
          <FileText class="w-4 h-4" />
          Exporter PDF
        </AppButton>
      </div>
    </div>

    <div v-reveal="80" class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="flex items-center gap-2 px-4 py-2.5 min-h-11 text-sm font-medium border whitespace-nowrap transition-colors flex-shrink-0"
        :class="activeTab === tab.id
          ? 'bg-accent text-white border-accent'
          : 'bg-white text-ink-muted border-line hover:border-line-strong hover:text-ink'"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
        <span
          class="text-xs tabular-nums px-1.5 py-0.5 rounded-full"
          :class="activeTab === tab.id ? 'bg-white/20' : 'bg-paper-warm'"
        >
          {{ counts[tab.id] }}
        </span>
      </button>
    </div>

    <HistoryFilterBar
      v-if="activeTab !== 'presences'"
      v-model:search="searchQuery"
      v-model:evaluation-filter="evaluationFilter"
      :show-evaluation-filter="evaluationOptions.length > 0"
      :evaluation-options="evaluationOptions"
      search-placeholder="Rechercher une évaluation…"
    />

    <!-- Évaluations passées -->
    <AppCard
      v-if="activeTab === 'passed'"
      title="Évaluations passées"
      :subtitle="`${filteredPassed.length} soumission(s)`"
    >
      <AppDataTable
        :columns="passedColumns"
        :rows="passedTableRows"
        empty-message="Aucune évaluation soumise pour le moment."
        clickable
        @row-click="(row) => openSession((row as { session: ExamSession }).session)"
      >
        <template #cell-status="{ row }">
          <AppBadge variant="success">{{ row.status }}</AppBadge>
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Manquées -->
    <AppCard
      v-if="activeTab === 'missed'"
      title="Évaluations manquées"
      :subtitle="`${filteredMissed.length} entrée(s)`"
    >
      <AppDataTable
        :columns="missedColumns"
        :rows="missedTableRows"
        empty-message="Aucune évaluation manquée enregistrée."
        :clickable="true"
        @row-click="openMissedRow"
      >
        <template #cell-label="{ row }">
          <AppBadge variant="warning">{{ row.label }}</AppBadge>
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Alertes triche -->
    <AppCard
      v-if="activeTab === 'alerts'"
      title="Alertes & triche"
      :subtitle="`${filteredAlerts.length} session(s) avec incident`"
    >
      <AppDataTable
        :columns="alertColumns"
        :rows="alertTableRows"
        empty-message="Aucune alerte anti-triche sur votre compte."
        clickable
        @row-click="(row) => openSession((row as { session: ExamSession }).session)"
      >
        <template #cell-status="{ row }">
          <AppBadge variant="danger">{{ row.status }}</AppBadge>
        </template>
        <template #cell-alerts="{ row }">
          <AppBadge variant="danger">{{ row.alerts }} alerte(s)</AppBadge>
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Présences -->
    <template v-if="activeTab === 'presences'">
      <div v-if="myCourses.length === 0" class="text-center py-12 text-sm text-ink-muted">
        Rejoignez une salle pour voir votre historique de présences.
      </div>
      <AttendanceListPanel
        v-else
        mode="student"
        layout="stacked"
        dedicated-view-path="/student/attendance"
        export-title="Présences étudiant"
        :calendar-marks="presenceCalendarMarks"
        :table-rows="presenceTableRows"
        :filtered-count="filteredAttendanceRows.length"
        :course-options="myCourses.map((c) => ({ id: c.id, name: c.name }))"
        :selected-date="selectedPresenceDate"
        :selected-date-label="presenceDateLabel"
        :search="presenceSearch"
        :course-filter="presenceCourseFilter"
        :type-filter="presenceTypeFilter"
        :session-count="presenceStats.sessions"
        @update:selected-date="selectedPresenceDate = $event"
        @update:search="presenceSearch = $event"
        @update:course-filter="presenceCourseFilter = $event"
        @update:type-filter="presenceTypeFilter = ($event as AttendanceListType)"
      />
    </template>

    <!-- Détail session -->
    <Teleport to="body">
      <div
        v-if="selectedSession && selectedEvaluation"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="closeSession"
      >
        <div class="absolute inset-0 bg-ink/40" />
        <div class="relative w-full sm:max-w-2xl max-h-[92dvh] bg-white border border-line shadow-xl flex flex-col overflow-hidden">
          <div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-line flex-shrink-0">
            <div class="min-w-0">
              <p class="label-caps mb-1">Ma session</p>
              <h2 class="font-display text-xl text-ink truncate">{{ selectedEvaluation.title }}</h2>
              <p class="text-sm text-ink-muted">{{ selectedEvaluation.subject }}</p>
            </div>
            <button
              type="button"
              class="flex items-center justify-center min-h-11 min-w-11 text-ink-muted"
              aria-label="Fermer"
              @click="closeSession"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            <div class="flex flex-wrap gap-2">
              <AppBadge :variant="statusVariant(selectedSession.status)">
                {{ SESSION_STATUS_LABELS[selectedSession.status] }}
              </AppBadge>
              <AppBadge v-if="selectedSession.score !== undefined" variant="brand">
                {{ selectedSession.score }}/{{ selectedSession.maxScore }} pts
              </AppBadge>
            </div>

            <div v-if="selectedSession.violations.length > 0">
              <p class="text-xs font-semibold uppercase tracking-wide text-danger mb-3 flex items-center gap-1.5">
                <ShieldAlert class="w-4 h-4" />
                Motifs enregistrés ({{ selectedSession.violations.length }})
              </p>
              <ul class="space-y-2">
                <li
                  v-for="(v, i) in selectedSession.violations"
                  :key="i"
                  class="p-3 border border-danger/20 bg-danger-bg text-sm"
                >
                  <p class="font-medium text-danger">{{ VIOLATION_TYPE_LABELS[v.type] }}</p>
                  <p class="text-xs text-danger/80 mt-0.5">{{ v.message }}</p>
                  <p class="text-[11px] text-ink-faint mt-1">{{ formatDate(v.timestamp) }}</p>
                </li>
              </ul>
            </div>

            <div v-if="selectedSession.status === 'submitted'">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-3">
                Mes réponses
              </p>
              <div class="space-y-3">
                <div
                  v-for="(question, qi) in selectedEvaluation.questions"
                  :key="question.id"
                  class="p-4 border border-line bg-paper/40"
                >
                  <p class="text-xs text-ink-faint mb-1">Question {{ qi + 1 }}</p>
                  <p class="text-sm text-ink font-medium mb-2 break-words">{{ question.text }}</p>
                  <p class="text-sm text-ink-muted break-words">
                    {{
                      getStudentAnswerText(
                        question,
                        selectedSession.answers.find((a) => a.questionId === question.id)
                      )
                    }}
                  </p>
                  <p
                    v-if="selectedEvaluation.settings.correctionMode === 'auto'"
                    class="text-xs mt-2"
                    :class="{
                      'text-success': isAnswerCorrect(
                        question,
                        selectedSession.answers.find((a) => a.questionId === question.id)
                      ) === true,
                      'text-danger': isAnswerCorrect(
                        question,
                        selectedSession.answers.find((a) => a.questionId === question.id)
                      ) === false,
                    }"
                  >
                    {{
                      (() => {
                        const ans = selectedSession.answers.find((a) => a.questionId === question.id)
                        const correct = isAnswerCorrect(question, ans)
                        if (correct === true) return 'Correct'
                        if (correct === false) {
                          const expected = getCorrectAnswerText(question)
                          return expected ? `Incorrect · attendu : ${expected}` : 'Incorrect'
                        }
                        return 'Correction manuelle'
                      })()
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-shrink-0 px-5 py-4 border-t border-line bg-paper/50 pb-safe flex flex-wrap gap-2">
            <RouterLink
              v-if="selectedSession.status === 'submitted'"
              :to="`/exam/${selectedSession.id}/result`"
              @click="closeSession"
            >
              <AppButton variant="outline">Voir le résultat complet</AppButton>
            </RouterLink>
            <AppButton variant="ghost" @click="closeSession">Fermer</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
