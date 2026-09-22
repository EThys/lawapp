<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
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
import { useTeacherAttendanceList } from '@/composables/useTeacherAttendanceList'
import type { AttendanceListType } from '@/utils/attendanceTable'
import type { ExamSession, SessionStatus } from '@/types'
import { SESSION_STATUS_LABELS, VIOLATION_TYPE_LABELS } from '@/types'
import { formatDate } from '@/utils/helpers'
import { downloadExcel, downloadPdf } from '@/utils/exportReports'
import {
  ArrowLeft,
  CheckCircle,
  ShieldAlert,
  History,
  UserX,
  FileSpreadsheet,
  FileText,
} from '@lucide/vue'

type TabId = 'submitted' | 'cheaters' | 'all' | 'absences'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const evalStore = useEvaluationStore()
const courseStore = useCourseStore()

const tabs: { id: TabId; label: string; icon: typeof CheckCircle }[] = [
  { id: 'submitted', label: 'Soumissions', icon: CheckCircle },
  { id: 'cheaters', label: 'Triche', icon: ShieldAlert },
  { id: 'all', label: 'Tout l\'historique', icon: History },
  { id: 'absences', label: 'Absences', icon: UserX },
]

const activeTab = ref<TabId>((route.query.tab as TabId) || 'submitted')
const searchQuery = ref('')
const evaluationFilter = ref('all')

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab } })
})

onMounted(() => {
  const sessionId = route.query.session
  if (typeof sessionId === 'string' && sessionId) {
    void router.replace(`/teacher/session/${sessionId}`)
  }
})

const teacherId = computed(() => auth.currentUser?.id ?? '')

const {
  search: absenceSearch,
  courseFilter: absenceCourseFilter,
  typeFilter: absenceTypeFilter,
  selectedDate: selectedPresenceDate,
  myCourses,
  calendarMarks: presenceCalendarMarks,
  absenceRowForMark,
  totalAbsences,
  absenceRows,
  filteredRows: filteredTeacherAttendanceRows,
  tableRows: attendanceTableRows,
  selectedDateLabel: absenceDateLabel,
} = useTeacherAttendanceList({
  teacherUserId: teacherId,
  getAttendanceRecords: (id) => courseStore.getAttendanceHistoryForTeacher(id),
  getCourses: () => courseStore.getCoursesForTeacher(teacherId.value),
  getCourseById: (id) => courseStore.getById(id),
  getUserById: (id) => auth.getUserById(id),
})

const myEvaluations = computed(() =>
  teacherId.value ? evalStore.getEvaluationsForTeacher(teacherId.value) : []
)

const allSessions = computed(() =>
  teacherId.value ? evalStore.getSessionsForTeacher(teacherId.value) : []
)

const evaluationTitleById = computed(() => {
  const map = new Map<string, string>()
  for (const e of myEvaluations.value) map.set(e.id, e.title)
  return map
})

const counts = computed(() => ({
  submitted: allSessions.value.filter((s) => s.status === 'submitted').length,
  cheaters: allSessions.value.filter(
    (s) => s.violations.length > 0 || s.status === 'failed'
  ).length,
  all: allSessions.value.length,
  absences: totalAbsences.value,
}))

const sessionColumns = [
  { key: 'student', label: 'Étudiant' },
  { key: 'studentId', label: 'Identifiant', hideOnMobile: true },
  { key: 'evaluation', label: 'Évaluation' },
  { key: 'date', label: 'Date', hideOnMobile: true },
  { key: 'score', label: 'Score', class: 'tabular-nums' },
  { key: 'status', label: 'Statut' },
  { key: 'alerts', label: 'Alertes', class: 'tabular-nums', hideOnMobile: true },
]

const filteredSessions = computed(() => {
  let list = allSessions.value

  if (activeTab.value === 'submitted') {
    list = list.filter((s) => s.status === 'submitted')
  } else if (activeTab.value === 'cheaters') {
    list = list.filter((s) => s.violations.length > 0 || s.status === 'failed')
  }

  if (evaluationFilter.value !== 'all') {
    list = list.filter((s) => s.evaluationId === evaluationFilter.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((s) => {
      const evalTitle = evaluationTitleById.value.get(s.evaluationId) ?? ''
      return (
        s.studentFirstName.toLowerCase().includes(q) ||
        s.studentLastName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        evalTitle.toLowerCase().includes(q)
      )
    })
  }

  return list
})

const sessionTableRows = computed(() =>
  filteredSessions.value.map((s) => ({
    id: s.id,
    session: s,
    student: studentDisplayName(s),
    studentId: s.studentId,
    evaluation: evaluationTitleById.value.get(s.evaluationId) ?? s.evaluationCode,
    date: s.submittedAt ? formatDate(s.submittedAt) : formatDate(s.startedAt),
    score: s.score !== undefined ? `${s.score}/${s.maxScore}` : '-',
    status: SESSION_STATUS_LABELS[s.status],
    statusKey: s.status,
    alerts: s.violations.length > 0 ? String(s.violations.length) : '-',
    violationCount: s.violations.length,
  }))
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

function openSessionRow(row: Record<string, unknown>) {
  const session = (row as { session: ExamSession }).session
  void router.push(`/teacher/session/${session.id}`)
}

function studentDisplayName(session: ExamSession) {
  return `${session.studentLastName} ${session.studentFirstName}`.trim() || 'Étudiant'
}

function exportRows(): string[][] {
  if (activeTab.value === 'absences') {
    return [
      ['Date', 'Salle', 'Étudiant', 'Identifiant', 'Statut', 'Marqué à'],
      ...filteredTeacherAttendanceRows.value.map((r) => [
        r.date,
        r.courseName,
        r.studentName,
        r.studentId,
        r.type === 'present' ? 'Présent' : 'Absent',
        r.markedAtLabel ?? '-',
      ]),
    ]
  }

  return [
    [
      'Évaluation',
      'Nom',
      'Prénom',
      'Identifiant',
      'Statut',
      'Score',
      'Score max',
      'Violations',
      'Motifs',
      'Durée (s)',
      'Date',
    ],
    ...filteredSessions.value.map((s) => [
      evaluationTitleById.value.get(s.evaluationId) ?? s.evaluationCode,
      s.studentLastName,
      s.studentFirstName,
      s.studentId,
      SESSION_STATUS_LABELS[s.status],
      String(s.score ?? '-'),
      String(s.maxScore ?? '-'),
      String(s.violations.length),
      s.violations.map((v) => `${VIOLATION_TYPE_LABELS[v.type]}: ${v.message}`).join(' · ') || '-',
      String(s.timeSpentSeconds),
      s.submittedAt ? formatDate(s.submittedAt) : formatDate(s.startedAt),
    ]),
  ]
}

function exportExcel() {
  const title = tabs.find((t) => t.id === activeTab.value)?.label ?? 'Historique'
  downloadExcel(exportRows(), `lawapp-${activeTab.value}.xlsx`, title)
}

function exportPdf() {
  const title = `LawApp · ${tabs.find((t) => t.id === activeTab.value)?.label ?? 'Historique'}`
  downloadPdf(title, exportRows(), `lawapp-${activeTab.value}.pdf`)
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
    <RouterLink
      to="/teacher"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors min-h-11"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour au tableau de bord
    </RouterLink>

    <div v-reveal class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
      <div>
        <p class="label-caps mb-2">Espace enseignant</p>
        <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight">
          Suivi & historique
        </h1>
        <p class="mt-1 text-sm text-ink-muted">
          Réponses des étudiants, tentatives de triche et présences passées.
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
        class="flex items-center gap-2 px-4 py-2.5 min-h-11 text-sm font-medium border whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
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
          {{ counts[tab.id as keyof typeof counts] }}
        </span>
      </button>
    </div>

    <template v-if="activeTab !== 'absences'">
      <HistoryFilterBar
        v-model:search="searchQuery"
        v-model:evaluation-filter="evaluationFilter"
        :show-evaluation-filter="myEvaluations.length > 0"
        :evaluation-options="myEvaluations.map((e) => ({ id: e.id, title: e.title }))"
        search-placeholder="Rechercher un étudiant ou une évaluation…"
      />

      <AppCard
        :title="tabs.find((t) => t.id === activeTab)?.label ?? 'Sessions'"
        :subtitle="`${filteredSessions.length} entrée(s)`"
      >
        <AppDataTable
          :columns="sessionColumns"
          :rows="sessionTableRows"
          empty-message="Aucune session pour ce filtre."
          clickable
          @row-click="openSessionRow"
        >
          <template #cell-status="{ row }">
            <AppBadge :variant="statusVariant((row as { statusKey: SessionStatus }).statusKey)">
              {{ row.status }}
            </AppBadge>
          </template>
          <template #cell-alerts="{ row }">
            <AppBadge
              v-if="(row as { violationCount: number }).violationCount > 0"
              variant="danger"
            >
              {{ row.alerts }} alerte(s)
            </AppBadge>
            <span v-else class="text-ink-faint">-</span>
          </template>
        </AppDataTable>
      </AppCard>
    </template>

    <template v-else>
      <div v-if="myCourses.length === 0" class="text-center py-12 text-sm text-ink-muted">
        Créez une salle pour enregistrer les présences et consulter l'historique des absences.
      </div>

      <AttendanceListPanel
        v-else
        mode="teacher"
        layout="stacked"
        dedicated-view-path="/teacher/attendance"
        export-title="Présences enseignant"
        :calendar-marks="presenceCalendarMarks"
        :table-rows="attendanceTableRows"
        :filtered-count="filteredTeacherAttendanceRows.length"
        :course-options="myCourses.map((c) => ({ id: c.id, name: c.name }))"
        :selected-date="selectedPresenceDate"
        :selected-date-label="absenceDateLabel"
        :search="absenceSearch"
        :course-filter="absenceCourseFilter"
        :type-filter="absenceTypeFilter"
        :session-count="absenceRows.length"
        :absence-count="totalAbsences"
        :absence-row-for-mark="absenceRowForMark"
        @update:selected-date="selectedPresenceDate = $event"
        @update:search="absenceSearch = $event"
        @update:course-filter="absenceCourseFilter = $event"
        @update:type-filter="absenceTypeFilter = $event as AttendanceListType"
      />
    </template>
  </div>
</template>
