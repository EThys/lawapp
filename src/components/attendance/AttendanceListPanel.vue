<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import HistoryFilterBar from '@/components/history/HistoryFilterBar.vue'
import type { AttendanceListType } from '@/utils/attendanceTable'
import type { TeacherAbsenceDayRow } from '@/composables/useTeacherAttendanceCalendar'
import type { AttendanceCalendarMark } from '@/utils/attendanceCalendar'
import {
  CalendarCheck,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  X,
} from '@lucide/vue'
import { downloadExcel, downloadPdf } from '@/utils/exportReports'

const props = withDefaults(
  defineProps<{
    mode: 'student' | 'teacher'
    layout?: 'stacked' | 'split'
    calendarMarks: AttendanceCalendarMark[]
    tableRows: Record<string, unknown>[]
    filteredCount: number
    courseOptions: { id: string; name: string }[]
    selectedDate: string | null
    selectedDateLabel: string | null
    search: string
    courseFilter: string
    typeFilter: AttendanceListType
    dedicatedViewPath: string
    showTeacherDetail?: boolean
    absenceRowForMark?: (mark: AttendanceCalendarMark) => TeacherAbsenceDayRow | undefined
    sessionCount?: number
    absenceCount?: number
    exportTitle?: string
  }>(),
  {
    layout: 'stacked',
    showTeacherDetail: true,
    exportTitle: 'Présences',
  }
)

const emit = defineEmits<{
  'update:selectedDate': [value: string | null]
  'update:search': [value: string]
  'update:courseFilter': [value: string]
  'update:typeFilter': [value: string]
  selectDate: [date: string]
}>()

const tableSectionRef = ref<HTMLElement | null>(null)

const studentColumns = [
  { key: 'dateLabel', label: 'Date', hideOnMobile: true },
  { key: 'courseName', label: 'Salle' },
  { key: 'type', label: 'Statut' },
  { key: 'detail', label: 'Détail', hideOnMobile: true },
]

const teacherColumns = [
  { key: 'studentName', label: 'Étudiant' },
  { key: 'studentId', label: 'Identifiant', hideOnMobile: true },
  { key: 'courseName', label: 'Salle', hideOnMobile: true },
  { key: 'type', label: 'Statut' },
  { key: 'markedAtLabel', label: 'Marqué à', hideOnMobile: true },
]

const tableColumns = computed(() => {
  if (props.mode === 'student') {
    if (props.selectedDate) {
      return studentColumns.filter((c) => c.key !== 'dateLabel')
    }
    return studentColumns
  }
  if (props.selectedDate) {
    return teacherColumns.filter((c) => c.key !== 'dateLabel')
  }
  return [
    { key: 'dateLabel', label: 'Date', hideOnMobile: true },
    ...teacherColumns,
  ]
})

const tableSubtitle = computed(() => {
  if (props.selectedDateLabel) {
    return `${props.filteredCount} entrée(s) · ${props.selectedDateLabel}`
  }
  return `${props.filteredCount} entrée(s) · toutes les dates`
})

const dedicatedLink = computed(() => {
  const query = new URLSearchParams()
  if (props.selectedDate) query.set('date', props.selectedDate)
  if (props.courseFilter !== 'all') query.set('course', props.courseFilter)
  const qs = query.toString()
  return qs ? `${props.dedicatedViewPath}?${qs}` : props.dedicatedViewPath
})

function onDateChange(date: string | null) {
  emit('update:selectedDate', date)
}

function onCalendarSelect(date: string) {
  emit('update:selectedDate', date)
  emit('selectDate', date)
  if (props.layout === 'stacked') {
    nextTick(() => {
      tableSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
}

function clearDateFilter() {
  emit('update:selectedDate', null)
}

function exportRows(): string[][] {
  if (props.mode === 'student') {
    return [
      ['Type', 'Salle', 'Date', 'Détail'],
      ...props.tableRows.map((r) => [
        r.type === 'absent' ? 'Absent' : 'Présent',
        String(r.courseName ?? ''),
        String(r.date ?? ''),
        String(r.detail ?? '—'),
      ]),
    ]
  }
  return [
    ['Date', 'Salle', 'Étudiant', 'Identifiant', 'Statut', 'Marqué à'],
    ...props.tableRows.map((r) => [
      String(r.date ?? ''),
      String(r.courseName ?? ''),
      String(r.studentName ?? ''),
      String(r.studentId ?? ''),
      r.type === 'absent' ? 'Absent' : 'Présent',
      String(r.markedAtLabel ?? '—'),
    ]),
  ]
}

function exportExcel() {
  downloadExcel(exportRows(), `lawapp-${props.mode}-presences.xlsx`, props.exportTitle ?? 'Présences')
}

function exportPdf() {
  downloadPdf(`LawApp · ${props.exportTitle ?? 'Présences'}`, exportRows(), `lawapp-${props.mode}-presences.pdf`)
}
</script>

<template>
  <div
    class="attendance-list-panel"
    :class="layout === 'split' ? 'attendance-list-panel--split' : 'attendance-list-panel--stacked'"
  >
    <div class="attendance-list-panel__calendar">
      <AppCard
        title="Calendrier"
        :subtitle="
          sessionCount !== undefined
            ? `${sessionCount} séance(s) enregistrée(s)`
            : `${calendarMarks.length} entrée(s)`
        "
      >
        <div v-if="calendarMarks.length === 0" class="text-sm text-ink-muted py-8 text-center">
          Aucune séance enregistrée pour le moment.
        </div>

        <AppAttendanceCalendar
          v-else
          :marks="calendarMarks"
          :selected-date="selectedDate"
          @update:selected-date="onDateChange"
          @select="onCalendarSelect"
        >
          <template v-if="mode === 'teacher' && showTeacherDetail && absenceRowForMark" #detail="{ marks }">
            <div class="space-y-3 mt-2">
              <article
                v-for="mark in marks"
                :key="mark.id"
                class="border border-line p-3 bg-white text-sm"
              >
                <template v-if="absenceRowForMark(mark)">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p class="font-medium text-ink">{{ mark.title }}</p>
                    <div class="flex gap-1.5">
                      <AppBadge variant="success">{{ absenceRowForMark(mark)!.presentCount }} prés.</AppBadge>
                      <AppBadge
                        v-if="absenceRowForMark(mark)!.absentCount > 0"
                        variant="danger"
                      >
                        {{ absenceRowForMark(mark)!.absentCount }} abs.
                      </AppBadge>
                    </div>
                  </div>
                  <p class="text-xs text-ink-muted">Voir le détail dans le tableau →</p>
                </template>
              </article>
            </div>
          </template>

          <template v-else-if="mode === 'student'" #detail="{ marks }">
            <ul class="space-y-2 mt-2">
              <li
                v-for="mark in marks"
                :key="mark.id ?? mark.title"
                class="flex items-center justify-between gap-3 p-2 border border-line bg-white text-sm"
              >
                <span class="font-medium text-ink truncate">{{ mark.title }}</span>
                <AppBadge :variant="mark.status === 'absent' ? 'danger' : 'success'">
                  {{ mark.status === 'absent' ? 'Absent' : 'Présent' }}
                </AppBadge>
              </li>
            </ul>
          </template>
        </AppAttendanceCalendar>

        <p v-if="selectedDateLabel" class="mt-4 text-xs text-ink-muted">
          Cliquez sur une date pour filtrer le tableau ci-dessous.
        </p>
      </AppCard>
    </div>

    <div ref="tableSectionRef" class="attendance-list-panel__table">
      <AppCard
        :title="selectedDateLabel ? `Séance du ${selectedDateLabel}` : 'Liste des présences et absences'"
        :subtitle="tableSubtitle"
      >
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="selectedDateLabel"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent-light text-accent border border-accent/20"
            >
              <CalendarCheck class="w-3.5 h-3.5" />
              {{ selectedDateLabel }}
              <button
                type="button"
                class="ml-1 p-0.5 hover:bg-accent/10 rounded"
                aria-label="Afficher toutes les dates"
                @click="clearDateFilter"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </span>
            <span v-else class="text-xs text-ink-muted">
              Sélectionnez une date dans le calendrier pour filtrer.
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <RouterLink v-if="layout === 'stacked'" :to="dedicatedLink">
              <AppButton variant="outline" size="sm">
                <ExternalLink class="w-4 h-4" />
                Vue détaillée
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

        <HistoryFilterBar
          :search="search"
          :course-filter="courseFilter"
          :type-filter="typeFilter"
          :show-course-filter="courseOptions.length > 0"
          :course-options="courseOptions"
          :show-type-filter="true"
          :show-session-with-absences="mode === 'teacher'"
          :search-placeholder="mode === 'teacher' ? 'Rechercher un étudiant ou une salle…' : 'Rechercher par salle…'"
          @update:search="emit('update:search', $event)"
          @update:course-filter="emit('update:courseFilter', $event)"
          @update:type-filter="emit('update:typeFilter', $event as AttendanceListType)"
        />

        <AppDataTable
          :columns="tableColumns"
          :rows="tableRows"
          :empty-message="
            selectedDateLabel
              ? 'Aucune entrée pour cette date avec les filtres actuels.'
              : 'Aucune entrée pour ces filtres.'
          "
        >
          <template #cell-type="{ row }">
            <AppBadge :variant="row.type === 'absent' ? 'danger' : 'success'">
              {{ row.typeLabel }}
            </AppBadge>
          </template>
        </AppDataTable>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.attendance-list-panel--stacked {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.attendance-list-panel--split {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .attendance-list-panel--split {
    grid-template-columns: minmax(280px, 2fr) minmax(0, 3fr);
    align-items: start;
  }

  .attendance-list-panel--split .attendance-list-panel__table {
    position: sticky;
    top: 5rem;
    max-height: calc(100dvh - 6rem);
    overflow-y: auto;
  }
}
</style>
