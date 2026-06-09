<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { useCourseStore } from '@/stores/courses'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'
import { useTeacherAttendanceCalendar } from '@/composables/useTeacherAttendanceCalendar'
import type { ExamSession, SessionStatus } from '@/types'
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
  History,
  UserX,
  X,
  FileSpreadsheet,
  FileText,
  Search,
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
const selectedSessionId = ref<string | null>(null)
const absenceCourseFilter = ref('all')

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab } })
})

const teacherId = computed(() => auth.currentUser?.id ?? '')

const teacherAttendanceRecords = computed(() =>
  teacherId.value ? courseStore.getAttendanceHistoryForTeacher(teacherId.value) : []
)

const {
  selectedDate: selectedPresenceDate,
  absenceRows,
  presenceCalendarMarks,
  absenceRowForMark,
} = useTeacherAttendanceCalendar({
  attendanceRecords: teacherAttendanceRecords,
  courseFilter: absenceCourseFilter,
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
}))

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

const myCourses = computed(() =>
  teacherId.value ? courseStore.getCoursesForTeacher(teacherId.value) : []
)

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

function openSession(session: ExamSession) {
  selectedSessionId.value = session.id
}

function closeSession() {
  selectedSessionId.value = null
}

function exportRows(): string[][] {
  if (activeTab.value === 'absences') {
    return [
      ['Date', 'Salle', 'Présents', 'Absents', 'Total inscrits', 'Liste absents'],
      ...absenceRows.value.map((r) => [
        r.date,
        r.courseName,
        String(r.presentCount),
        String(r.absentCount),
        String(r.totalEnrolled),
        r.absentStudents.map((s) => `${s.name} (${s.studentId})`).join('; ') || '—',
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
      String(s.score ?? '—'),
      String(s.maxScore ?? '—'),
      String(s.violations.length),
      s.violations.map((v) => `${VIOLATION_TYPE_LABELS[v.type]}: ${v.message}`).join(' · ') || '—',
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

function studentDisplayName(session: ExamSession) {
  return `${session.studentLastName} ${session.studentFirstName}`
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
        class="flex items-center gap-2 px-4 py-2.5 min-h-11 text-sm font-medium border whitespace-nowrap transition-colors flex-shrink-0"
        :class="activeTab === tab.id
          ? 'bg-accent text-white border-accent'
          : 'bg-white text-ink-muted border-line hover:border-line-strong hover:text-ink'"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
        <span
          v-if="tab.id !== 'absences'"
          class="text-xs tabular-nums px-1.5 py-0.5 rounded-full"
          :class="activeTab === tab.id ? 'bg-white/20' : 'bg-paper-warm'"
        >
          {{ counts[tab.id as 'submitted' | 'cheaters' | 'all'] }}
        </span>
      </button>
    </div>

    <template v-if="activeTab !== 'absences'">
      <div v-reveal="120" class="flex flex-col sm:flex-row gap-3 mb-6">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Rechercher un étudiant ou une évaluation…"
            class="w-full pl-10 pr-4 py-2.5 min-h-11 border border-line bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <select
          v-model="evaluationFilter"
          class="px-4 py-2.5 min-h-11 border border-line bg-white text-ink focus:outline-none focus:border-accent sm:min-w-[14rem]"
        >
          <option value="all">Toutes les évaluations</option>
          <option v-for="ev in myEvaluations" :key="ev.id" :value="ev.id">
            {{ ev.title }}
          </option>
        </select>
      </div>

      <AppCard
        :title="tabs.find((t) => t.id === activeTab)?.label ?? 'Sessions'"
        :subtitle="`${filteredSessions.length} entrée(s)`"
      >
        <div v-if="filteredSessions.length === 0" class="text-center py-12 text-sm text-ink-muted">
          Aucune session pour ce filtre.
        </div>

        <div v-else class="divide-y divide-line -mx-6">
          <button
            v-for="session in filteredSessions"
            :key="session.id"
            type="button"
            class="w-full text-left px-4 sm:px-6 py-4 hover:bg-paper/60 transition-colors"
            @click="openSession(session)"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="font-medium text-ink truncate">
                  {{ studentDisplayName(session) }}
                  <span class="text-ink-faint font-normal text-sm">· {{ session.studentId }}</span>
                </p>
                <p class="text-sm text-ink-muted truncate mt-0.5">
                  {{ evaluationTitleById.get(session.evaluationId) ?? session.evaluationCode }}
                </p>
                <p class="text-xs text-ink-faint mt-1">
                  {{ session.submittedAt ? formatDate(session.submittedAt) : formatDate(session.startedAt) }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                <span
                  v-if="session.score !== undefined"
                  class="text-sm font-semibold tabular-nums text-ink"
                >
                  {{ session.score }}/{{ session.maxScore }}
                </span>
                <AppBadge :variant="statusVariant(session.status)">
                  {{ SESSION_STATUS_LABELS[session.status] }}
                </AppBadge>
                <AppBadge
                  v-if="session.violations.length > 0"
                  variant="danger"
                >
                  {{ session.violations.length }} alerte(s)
                </AppBadge>
              </div>
            </div>
          </button>
        </div>
      </AppCard>
    </template>

    <template v-else>
      <div v-if="myCourses.length === 0" class="text-center py-12 text-sm text-ink-muted">
        Créez une salle pour enregistrer les présences et consulter l'historique des absences.
      </div>

      <template v-else>
        <div v-reveal="120" class="mb-6">
          <select
            v-model="absenceCourseFilter"
            class="w-full sm:w-auto px-4 py-2.5 min-h-11 border border-line bg-white text-ink focus:outline-none focus:border-accent"
          >
            <option value="all">Toutes les salles</option>
            <option v-for="course in myCourses" :key="course.id" :value="course.id">
              {{ course.name }}
            </option>
          </select>
        </div>

        <AppCard
          title="Calendrier des présences"
          :subtitle="`${absenceRows.length} séance(s) enregistrée(s)`"
        >
          <div v-if="absenceRows.length === 0" class="text-center py-12 text-sm text-ink-muted">
            Aucune présence enregistrée pour le moment.
          </div>

          <AppAttendanceCalendar
            v-else
            v-model:selected-date="selectedPresenceDate"
            :marks="presenceCalendarMarks"
          >
            <template #detail="{ marks }">
              <div class="space-y-4 mt-2">
                <article
                  v-for="mark in marks"
                  :key="mark.id"
                  class="border border-line p-4 bg-white text-sm"
                >
                  <template v-if="absenceRowForMark(mark)">
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div>
                        <p class="font-medium text-ink">{{ mark.title }}</p>
                        <p class="text-xs text-ink-muted mt-0.5">{{ mark.subtitle }}</p>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <AppBadge variant="success">
                          {{ absenceRowForMark(mark)!.presentCount }} présent(s)
                        </AppBadge>
                        <AppBadge
                          v-if="absenceRowForMark(mark)!.absentCount > 0"
                          variant="danger"
                        >
                          {{ absenceRowForMark(mark)!.absentCount }} absent(s)
                        </AppBadge>
                      </div>
                    </div>

                    <div
                      v-if="absenceRowForMark(mark)!.absentStudents.length > 0"
                      class="mb-3"
                    >
                      <p class="text-xs font-semibold uppercase tracking-wide text-danger mb-2">
                        Absents
                      </p>
                      <ul class="space-y-1">
                        <li
                          v-for="student in absenceRowForMark(mark)!.absentStudents"
                          :key="student.userId"
                          class="text-ink-muted"
                        >
                          {{ student.name }}
                          <span class="text-ink-faint font-mono text-xs">· {{ student.studentId }}</span>
                        </li>
                      </ul>
                    </div>

                    <details>
                      <summary class="text-accent font-medium cursor-pointer hover:text-accent-hover">
                        Voir les présents ({{ absenceRowForMark(mark)!.presentCount }})
                      </summary>
                      <ul class="mt-3 space-y-1 pl-1 text-ink-muted">
                        <li
                          v-for="record in absenceRowForMark(mark)!.presentRecords"
                          :key="record.id"
                        >
                          {{
                            (() => {
                              const u = auth.getUserById(record.studentUserId)
                              return u ? `${u.lastName} ${u.firstName}` : 'Étudiant'
                            })()
                          }}
                          <span class="text-ink-faint text-xs">
                            · marqué à {{ formatDate(record.markedAt) }}
                          </span>
                        </li>
                      </ul>
                    </details>
                  </template>
                </article>
              </div>
            </template>
          </AppAttendanceCalendar>
        </AppCard>
      </template>
    </template>

    <Teleport to="body">
      <div
        v-if="selectedSession && selectedEvaluation"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="closeSession"
      >
        <div class="absolute inset-0 bg-ink/40" />
        <div
          class="relative w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[85vh] bg-white border border-line shadow-xl flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-line flex-shrink-0">
            <div class="min-w-0">
              <p class="label-caps mb-1">Détail session</p>
              <h2 class="font-display text-xl text-ink truncate">
                {{ studentDisplayName(selectedSession) }}
              </h2>
              <p class="text-sm text-ink-muted truncate">{{ selectedEvaluation.title }}</p>
            </div>
            <button
              type="button"
              class="flex items-center justify-center min-h-11 min-w-11 text-ink-muted hover:text-ink flex-shrink-0"
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
              <AppBadge variant="muted">
                {{ Math.floor(selectedSession.timeSpentSeconds / 60) }} min
              </AppBadge>
            </div>

            <div v-if="selectedSession.violations.length > 0">
              <p class="text-xs font-semibold uppercase tracking-wide text-danger mb-3 flex items-center gap-1.5">
                <ShieldAlert class="w-4 h-4" />
                Violations ({{ selectedSession.violations.length }})
              </p>
              <ul class="space-y-2">
                <li
                  v-for="(v, i) in selectedSession.violations"
                  :key="i"
                  class="p-3 border border-danger/20 bg-danger-bg text-sm"
                >
                  <p class="font-medium text-danger">
                    {{ VIOLATION_TYPE_LABELS[v.type] }}
                  </p>
                  <p class="text-xs text-danger/80 mt-0.5">{{ v.message }}</p>
                  <p class="text-[11px] text-ink-faint mt-1">{{ formatDate(v.timestamp) }}</p>
                </li>
              </ul>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-3">
                Réponses ({{ selectedSession.answers.length }}/{{ selectedEvaluation.questions.length }})
              </p>
              <div v-if="selectedSession.answers.length === 0" class="text-sm text-ink-muted">
                Aucune réponse enregistrée.
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="(question, qi) in selectedEvaluation.questions"
                  :key="question.id"
                  class="p-4 border border-line bg-paper/40"
                >
                  <p class="text-xs text-ink-faint mb-1">Question {{ qi + 1 }}</p>
                  <p class="text-sm text-ink font-medium mb-2 break-words">{{ question.text }}</p>
                  <p class="text-sm text-ink-muted break-words">
                    <span class="font-medium text-ink">Réponse :</span>
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
                        return 'Correction manuelle ou document'
                      })()
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-shrink-0 px-5 py-4 border-t border-line bg-paper/50 pb-safe">
            <RouterLink :to="`/teacher/evaluation/${selectedEvaluation.id}`" @click="closeSession">
              <AppButton variant="outline" class="w-full sm:w-auto">
                Voir l'évaluation
              </AppButton>
            </RouterLink>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
