<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useStudentAttendanceList } from '@/composables/useStudentAttendanceList'
import type { AttendanceListType } from '@/utils/attendanceTable'
import { getTodayDateString } from '@/utils/access'
import { downloadExcel, downloadPdf } from '@/utils/exportReports'
import { appToast } from '@/utils/toast'
import {
  CalendarCheck,
  UserX,
  Radio,
  Search,
  UserPlus,
  FileSpreadsheet,
  FileText,
  X,
  Clock3,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()

const studentId = computed(() => auth.currentUser?.id ?? '')
const todayKey = getTodayDateString()

const {
  search,
  courseFilter,
  typeFilter,
  selectedDate,
  myCourses,
  calendarMarks,
  filteredRows,
  tableRows,
  selectedDateLabel,
  stats,
} = useStudentAttendanceList({
  studentUserId: studentId,
  getCourses: () => courseStore.getCoursesForStudent(studentId.value),
  getPresenceRecords: (id) => courseStore.getAttendanceHistoryForStudent(id),
  getAbsenceDays: (id) => courseStore.getAbsenceDaysForStudent(id),
  getCourseName: (id) => courseStore.getById(id)?.name ?? 'Salle',
})

watch(
  () => route.query.date,
  (d) => {
    selectedDate.value = typeof d === 'string' ? d : null
  },
  { immediate: true },
)

watch(selectedDate, (d) => {
  const nextQuery = { ...route.query }
  if (d) nextQuery.date = d
  else delete nextQuery.date
  router.replace({ query: nextQuery })
})

watch(
  () => route.query.course,
  (c) => {
    if (typeof c === 'string') courseFilter.value = c
  },
  { immediate: true },
)

watch(courseFilter, (c) => {
  const nextQuery = { ...route.query }
  if (c !== 'all') nextQuery.course = c
  else delete nextQuery.course
  router.replace({ query: nextQuery })
})

const attendanceRate = computed(() => {
  const total = stats.value.presents + stats.value.absences
  if (!total) return null
  return Math.round((stats.value.presents / total) * 100)
})

const rateTone = computed(() => {
  const rate = attendanceRate.value
  if (rate == null) return 'muted'
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
})

const ringOffset = computed(() => {
  const rate = attendanceRate.value ?? 0
  const circumference = 2 * Math.PI * 40
  return circumference - (rate / 100) * circumference
})

const courseOptions = computed(() => [
  { value: 'all', label: 'Toutes les salles' },
  ...myCourses.value.map((c) => ({ value: c.id, label: c.name })),
])

const typeChips: { id: AttendanceListType; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'present', label: 'Présent' },
  { id: 'absent', label: 'Absent' },
]

const timelineGroups = computed(() => {
  const map = new Map<
    string,
    { date: string; label: string; rows: typeof tableRows.value }
  >()
  for (const row of tableRows.value) {
    const date = String(row.date)
    const existing = map.get(date)
    if (existing) {
      existing.rows.push(row)
    } else {
      map.set(date, {
        date,
        label: String(row.dateLabel ?? selectedDateLabel.value ?? date),
        rows: [row],
      })
    }
  }
  return Array.from(map.values())
})

function exportRows(): string[][] {
  return [
    ['Type', 'Salle', 'Date', 'Détail'],
    ...tableRows.value.map((r) => [
      r.type === 'absent' ? 'Absent' : 'Présent',
      String(r.courseName ?? ''),
      String(r.date ?? ''),
      String(r.detail ?? '-'),
    ]),
  ]
}

function exportExcel() {
  downloadExcel(exportRows(), 'lawapp-etudiant-presences.xlsx', 'Présences étudiant')
  appToast.success('Export Excel téléchargé.')
}

function exportPdf() {
  downloadPdf('LawApp · Présences étudiant', exportRows(), 'lawapp-etudiant-presences.pdf')
  appToast.success('Export PDF téléchargé.')
}

function clearDateFilter() {
  selectedDate.value = null
}
</script>

<template>
  <DashboardPage>
    <section v-reveal class="sa-hero">
      <div class="sa-hero__copy">
        <p class="label-caps mb-2">Carnet de présence</p>
        <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight">
          {{ auth.currentUser?.firstName ? `${auth.currentUser.firstName}, votre assiduité` : 'Votre assiduité' }}
        </h1>
        <p class="mt-2 text-sm text-ink-muted max-w-xl">
          Un journal de vos séances, pas un tableau administratif.
          Cliquez un jour pour filtrer le fil.
        </p>
        <div class="sa-hero__actions">
          <RouterLink to="/join/tunnel">
            <AppButton size="sm">
              <Radio class="w-4 h-4" />
              Pointer ma présence
            </AppButton>
          </RouterLink>
          <AppButton variant="outline" size="sm" @click="exportExcel">
            <FileSpreadsheet class="w-4 h-4" />
            XLS
          </AppButton>
          <AppButton variant="outline" size="sm" @click="exportPdf">
            <FileText class="w-4 h-4" />
            PDF
          </AppButton>
        </div>
      </div>

      <div class="sa-rate" :data-tone="rateTone">
        <svg class="sa-rate__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="sa-rate__track" cx="50" cy="50" r="40" />
          <circle
            class="sa-rate__progress"
            cx="50"
            cy="50"
            r="40"
            :stroke-dasharray="2 * Math.PI * 40"
            :stroke-dashoffset="ringOffset"
          />
        </svg>
        <div class="sa-rate__value">
          <p class="sa-rate__number">{{ attendanceRate == null ? '—' : `${attendanceRate}` }}</p>
          <p class="sa-rate__unit">{{ attendanceRate == null ? 'n/a' : '%' }}</p>
        </div>
        <p class="sa-rate__caption">Taux de présence</p>
      </div>
    </section>

    <div v-reveal="60" class="sa-stats">
      <div class="sa-stat">
        <CalendarCheck class="sa-stat__icon text-success" />
        <div>
          <p class="sa-stat__value">{{ stats.presents }}</p>
          <p class="sa-stat__label">Présences</p>
        </div>
      </div>
      <div class="sa-stat">
        <UserX class="sa-stat__icon text-danger" />
        <div>
          <p class="sa-stat__value">{{ stats.absences }}</p>
          <p class="sa-stat__label">Absences</p>
        </div>
      </div>
      <div class="sa-stat">
        <Clock3 class="sa-stat__icon text-accent" />
        <div>
          <p class="sa-stat__value">{{ stats.sessions }}</p>
          <p class="sa-stat__label">Jours de séance</p>
        </div>
      </div>
    </div>

    <div v-if="myCourses.length === 0" v-reveal="80" class="sa-empty">
      <UserPlus class="w-10 h-10 text-ink-faint mb-3" />
      <p class="font-medium text-ink mb-1">Aucune salle pour l’instant</p>
      <p class="text-sm text-ink-muted mb-4 max-w-sm">
        Rejoignez la salle de votre enseignant pour voir ici vos pointages et absences.
      </p>
      <RouterLink to="/join/group">
        <AppButton variant="outline" size="sm">
          <UserPlus class="w-4 h-4" />
          Rejoindre une salle
        </AppButton>
      </RouterLink>
    </div>

    <template v-else>
      <div v-reveal="80" class="sa-toolbar">
        <div class="sa-chips" role="tablist" aria-label="Filtrer par statut">
          <button
            v-for="chip in typeChips"
            :key="chip.id"
            type="button"
            role="tab"
            class="sa-chip"
            :class="{ 'sa-chip--on': typeFilter === chip.id }"
            @click="typeFilter = chip.id"
          >
            {{ chip.label }}
          </button>
        </div>
        <div class="sa-toolbar__filters">
          <AppSelect
            :model-value="courseFilter"
            :options="courseOptions"
            @update:model-value="courseFilter = $event"
          />
          <div class="sa-search">
            <Search class="sa-search__icon" />
            <AppInput
              :model-value="search"
              placeholder="Rechercher une salle…"
              @update:model-value="search = $event"
            />
          </div>
        </div>
      </div>

      <div v-if="selectedDateLabel" class="sa-date-chip">
        <CalendarCheck class="w-3.5 h-3.5" />
        <span>{{ selectedDate === todayKey ? 'Aujourd’hui' : selectedDateLabel }}</span>
        <button type="button" class="sa-date-chip__clear" aria-label="Toutes les dates" @click="clearDateFilter">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div v-reveal="100" class="sa-layout">
        <aside class="sa-calendar">
          <AppAttendanceCalendar
            :marks="calendarMarks"
            :selected-date="selectedDate"
            :show-legend="false"
            :auto-select-latest="false"
            @update:selected-date="selectedDate = $event"
          />
          <div class="sa-legend">
            <span><i class="sa-dot sa-dot--present" /> Présent</span>
            <span><i class="sa-dot sa-dot--absent" /> Absent</span>
            <span><i class="sa-dot sa-dot--today" /> Aujourd’hui</span>
          </div>
        </aside>

        <div class="sa-journal">
          <div class="sa-journal__head">
            <h2 class="font-display text-lg text-ink">Fil des séances</h2>
            <p class="text-xs text-ink-muted">{{ filteredRows.length }} entrée(s)</p>
          </div>

          <div v-if="timelineGroups.length === 0" class="sa-journal__empty">
            Aucune séance pour ces filtres.
          </div>

          <ol v-else class="sa-timeline">
            <li v-for="group in timelineGroups" :key="group.date" class="sa-day">
              <div class="sa-day__rail" aria-hidden="true" />
              <time class="sa-day__date" :datetime="group.date">
                {{ group.date === todayKey ? 'Aujourd’hui' : group.label }}
              </time>
              <ul class="sa-day__cards">
                <li
                  v-for="row in group.rows"
                  :key="String(row.id)"
                  class="sa-entry"
                  :class="row.type === 'absent' ? 'sa-entry--absent' : 'sa-entry--present'"
                >
                  <div class="sa-entry__status">
                    <UserX v-if="row.type === 'absent'" class="w-4 h-4" />
                    <CalendarCheck v-else class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <p class="sa-entry__title">{{ row.courseName }}</p>
                    <p class="sa-entry__meta">
                      {{ row.type === 'absent' ? 'Absent à la séance' : row.detail && row.detail !== '-' ? `Pointé à ${row.detail}` : 'Présent' }}
                    </p>
                  </div>
                  <AppBadge :variant="row.type === 'absent' ? 'danger' : 'success'">
                    {{ row.type === 'absent' ? 'Absent' : 'Présent' }}
                  </AppBadge>
                </li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </template>
  </DashboardPage>
</template>

<style scoped>
.sa-hero {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.35rem 1.25rem;
  margin-bottom: 1.25rem;
  border: 1px solid var(--color-line);
  background:
    radial-gradient(ellipse 70% 80% at 100% 0%, color-mix(in srgb, var(--color-accent-light) 80%, white), transparent 58%),
    white;
}

@media (min-width: 768px) {
  .sa-hero {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 1.6rem 1.75rem;
  }
}

.sa-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.sa-rate {
  position: relative;
  width: 7.5rem;
  flex-shrink: 0;
  text-align: center;
}

.sa-rate__ring {
  width: 7.5rem;
  height: 7.5rem;
  transform: rotate(-90deg);
}

.sa-rate__track,
.sa-rate__progress {
  fill: none;
  stroke-width: 8;
}

.sa-rate__track {
  stroke: var(--color-line);
}

.sa-rate__progress {
  stroke: var(--color-accent);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.4s ease;
}

.sa-rate[data-tone='success'] .sa-rate__progress {
  stroke: var(--color-success);
}

.sa-rate[data-tone='warning'] .sa-rate__progress {
  stroke: var(--color-warning);
}

.sa-rate[data-tone='danger'] .sa-rate__progress {
  stroke: var(--color-danger);
}

.sa-rate__value {
  position: absolute;
  inset: 1.15rem 0 auto;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.1rem;
}

.sa-rate__number {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.65rem;
  font-weight: 600;
  line-height: 1;
  color: var(--color-ink);
}

.sa-rate__unit {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-ink-faint);
}

.sa-rate__caption {
  margin: 0.15rem 0 0;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.sa-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.sa-stat {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 4.25rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--color-line);
  background: white;
}

.sa-stat__icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.sa-stat__value {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--color-ink);
}

.sa-stat__label {
  margin: 0.15rem 0 0;
  font-size: 0.7rem;
  color: var(--color-ink-muted);
}

.sa-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3.5rem 1.25rem;
  border: 1px dashed var(--color-line);
  background: white;
}

.sa-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

@media (min-width: 900px) {
  .sa-toolbar {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

.sa-chips {
  display: flex;
  gap: 0.4rem;
}

.sa-chip {
  min-height: 2.35rem;
  padding: 0 0.85rem;
  border: 1px solid var(--color-line);
  background: white;
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.sa-chip--on {
  background: var(--color-brand-dark);
  border-color: var(--color-brand-dark);
  color: white;
}

.sa-toolbar__filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.65rem;
  width: 100%;
}

@media (min-width: 640px) {
  .sa-toolbar__filters {
    grid-template-columns: 12rem minmax(0, 16rem);
    width: auto;
  }
}

.sa-search {
  position: relative;
}

.sa-search__icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  width: 0.95rem;
  height: 0.95rem;
  color: var(--color-ink-faint);
  transform: translateY(-50%);
  z-index: 1;
  pointer-events: none;
}

.sa-search :deep(input) {
  padding-left: 2.1rem;
}

.sa-date-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding: 0.35rem 0.55rem 0.35rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-line));
  background: var(--color-accent-light);
  color: var(--color-brand-dark);
  font-size: 0.75rem;
  font-weight: 600;
}

.sa-date-chip__clear {
  display: inline-flex;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.sa-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sa-calendar,
.sa-journal {
  border: 1px solid var(--color-line);
  background: white;
  padding: 1rem 1rem 1.15rem;
}

.sa-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 0.85rem;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

.sa-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.sa-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
}

.sa-dot--present {
  background: var(--color-success);
}

.sa-dot--absent {
  background: var(--color-danger);
}

.sa-dot--today {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 45%, white);
  background: white;
}

.sa-journal__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.sa-journal__empty {
  padding: 2.5rem 0.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.sa-timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.sa-day {
  position: relative;
  padding-left: 1.15rem;
}

.sa-day__rail {
  position: absolute;
  left: 0.2rem;
  top: 0.35rem;
  bottom: -0.35rem;
  width: 1px;
  background: var(--color-line);
}

.sa-day:last-child .sa-day__rail {
  display: none;
}

.sa-day__date {
  display: block;
  margin-bottom: 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: capitalize;
  color: var(--color-ink-faint);
}

.sa-day__cards {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sa-entry {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
}

.sa-entry--present {
  border-left: 3px solid var(--color-success);
}

.sa-entry--absent {
  border-left: 3px solid var(--color-danger);
}

.sa-entry__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  flex-shrink: 0;
  background: white;
  border: 1px solid var(--color-line);
}

.sa-entry--present .sa-entry__status {
  color: var(--color-success);
}

.sa-entry--absent .sa-entry__status {
  color: var(--color-danger);
}

.sa-entry__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-ink);
}

.sa-entry__meta {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: var(--color-ink-muted);
}

@media (max-width: 640px) {
  .sa-stats {
    grid-template-columns: 1fr;
  }

  .sa-hero {
    padding: 1.15rem 1rem;
  }
}
</style>
