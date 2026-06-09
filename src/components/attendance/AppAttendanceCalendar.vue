<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AttendanceCalendarMark, AttendanceDayStatus } from '@/utils/attendanceCalendar'
import {
  WEEKDAY_LABELS,
  MONTH_LABELS,
  getMonthWeeks,
  getTodayKey,
  parseDateKey,
  groupMarksByDate,
  getDominantStatus,
  countMarksInMonth,
  formatCalendarDayLong,
} from '@/utils/attendanceCalendar'
import { ChevronLeft, ChevronRight, CalendarDays } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    marks: AttendanceCalendarMark[]
    selectedDate?: string | null
    showLegend?: boolean
    showMonthStats?: boolean
  }>(),
  {
    selectedDate: null,
    showLegend: true,
    showMonthStats: true,
  }
)

const emit = defineEmits<{
  'update:selectedDate': [date: string | null]
  select: [date: string, marks: AttendanceCalendarMark[]]
}>()

const todayKey = getTodayKey()
const initial = parseDateKey(props.selectedDate ?? todayKey)
const viewYear = ref(initial.getFullYear())
const viewMonth = ref(initial.getMonth())

const marksByDate = computed(() => groupMarksByDate(props.marks))

const weeks = computed(() => getMonthWeeks(viewYear.value, viewMonth.value))

const monthLabel = computed(
  () => `${MONTH_LABELS[viewMonth.value]} ${viewYear.value}`
)

const monthStats = computed(() =>
  countMarksInMonth(props.marks, viewYear.value, viewMonth.value)
)

const selectedDateLocal = computed({
  get: () => props.selectedDate,
  set: (v) => emit('update:selectedDate', v),
})

const selectedMarks = computed(() => {
  if (!selectedDateLocal.value) return []
  return marksByDate.value.get(selectedDateLocal.value) ?? []
})

watch(
  () => props.marks,
  (marks) => {
    if (marks.length === 0 || selectedDateLocal.value) return
    const latest = [...marks].sort((a, b) => b.date.localeCompare(a.date))[0]
    if (latest) {
      const d = parseDateKey(latest.date)
      viewYear.value = d.getFullYear()
      viewMonth.value = d.getMonth()
      selectedDateLocal.value = latest.date
    }
  },
  { immediate: true }
)

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function goToToday() {
  const d = parseDateKey(todayKey)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  selectDay(todayKey)
}

function selectDay(date: string) {
  selectedDateLocal.value = date
  emit('select', date, marksByDate.value.get(date) ?? [])
}

function dayNumber(date: string): number {
  return parseDateKey(date).getDate()
}

function cellStatus(date: string): AttendanceDayStatus {
  const marks = marksByDate.value.get(date)
  if (!marks?.length) return 'none'
  return getDominantStatus(marks)
}

function cellClass(date: string): string {
  const status = cellStatus(date)
  const isToday = date === todayKey
  const isSelected = date === selectedDateLocal.value

  const base =
    'relative flex flex-col items-center justify-center min-h-[2.75rem] sm:min-h-[3.25rem] w-full border transition-colors text-sm font-medium'

  const statusBg: Record<AttendanceDayStatus, string> = {
    present: 'bg-success-bg/80 border-success/25 text-success hover:bg-success-bg',
    absent: 'bg-danger-bg/80 border-danger/25 text-danger hover:bg-danger-bg',
    session: 'bg-accent-light/90 border-accent/25 text-accent hover:bg-accent-light',
    partial: 'bg-warning-bg/90 border-warning/25 text-warning hover:bg-warning-bg',
    none: 'bg-white border-line text-ink hover:bg-paper-warm',
  }

  let cls = `${base} ${statusBg[status]}`

  if (isToday && !isSelected) {
    cls += ' ring-2 ring-accent/40 ring-offset-1'
  }
  if (isSelected) {
    cls += ' ring-2 ring-accent ring-offset-1 shadow-sm z-[1]'
  }

  return cls
}

function dotClass(status: AttendanceDayStatus): string {
  const map: Record<AttendanceDayStatus, string> = {
    present: 'bg-success',
    absent: 'bg-danger',
    session: 'bg-accent',
    partial: 'bg-warning',
    none: 'bg-transparent',
  }
  return map[status]
}

const legendItems: { status: AttendanceDayStatus; label: string }[] = [
  { status: 'present', label: 'Présent' },
  { status: 'absent', label: 'Absent' },
  { status: 'session', label: 'Séance complète' },
  { status: 'partial', label: 'Absences signalées' },
]
</script>

<template>
  <div class="attendance-calendar">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 flex items-center justify-center bg-accent-light border border-accent/20">
          <CalendarDays class="w-4 h-4 text-accent" />
        </div>
        <div>
          <p class="font-display text-lg text-ink leading-tight">{{ monthLabel }}</p>
          <p v-if="showMonthStats && monthStats.sessions > 0" class="text-xs text-ink-muted mt-0.5">
            {{ monthStats.sessions }} séance{{ monthStats.sessions > 1 ? 's' : '' }} ce mois
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-11 min-w-11 flex items-center justify-center border border-line bg-white hover:bg-paper-warm text-ink-muted"
          aria-label="Mois précédent"
          @click="prevMonth"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          type="button"
          class="min-h-11 px-4 text-xs font-semibold uppercase tracking-wide border border-line bg-white hover:bg-paper-warm text-ink-muted"
          @click="goToToday"
        >
          Aujourd'hui
        </button>
        <button
          type="button"
          class="min-h-11 min-w-11 flex items-center justify-center border border-line bg-white hover:bg-paper-warm text-ink-muted"
          aria-label="Mois suivant"
          @click="nextMonth"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>
    </div>

    <div class="border border-line bg-white overflow-hidden">
      <div class="grid grid-cols-7 border-b border-line bg-paper-warm">
        <div
          v-for="label in WEEKDAY_LABELS"
          :key="label"
          class="py-2.5 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-ink-faint"
        >
          {{ label }}
        </div>
      </div>

      <div class="divide-y divide-line">
        <div
          v-for="(week, wi) in weeks"
          :key="wi"
          class="grid grid-cols-7 divide-x divide-line"
        >
          <div
            v-for="(date, di) in week"
            :key="`${wi}-${di}`"
            class="aspect-square sm:aspect-auto p-0.5 sm:p-1 bg-paper/40"
          >
            <button
              v-if="date"
              type="button"
              :class="cellClass(date)"
              :aria-label="formatCalendarDayLong(date)"
              :aria-pressed="date === selectedDateLocal"
              @click="selectDay(date)"
            >
              <span class="tabular-nums">{{ dayNumber(date) }}</span>
              <span
                v-if="cellStatus(date) !== 'none'"
                class="absolute bottom-1 sm:bottom-1.5 w-1.5 h-1.5 rounded-full"
                :class="dotClass(cellStatus(date))"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showLegend"
      class="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-ink-muted"
    >
      <span
        v-for="item in legendItems"
        :key="item.status"
        class="inline-flex items-center gap-1.5"
      >
        <span class="w-2.5 h-2.5 rounded-full" :class="dotClass(item.status)" />
        {{ item.label }}
      </span>
    </div>

    <div v-if="selectedDateLocal" class="mt-5 p-4 sm:p-5 border border-line bg-paper-warm/60">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-1">
        {{ formatCalendarDayLong(selectedDateLocal) }}
      </p>

      <div v-if="selectedMarks.length === 0" class="text-sm text-ink-muted py-2">
        Aucune présence enregistrée ce jour.
      </div>

      <slot v-else name="detail" :date="selectedDateLocal" :marks="selectedMarks">
        <ul class="space-y-3 mt-2">
          <li
            v-for="mark in selectedMarks"
            :key="mark.id ?? `${mark.date}-${mark.title}`"
            class="flex items-start justify-between gap-3 text-sm"
          >
            <div class="min-w-0">
              <p v-if="mark.title" class="font-medium text-ink truncate">{{ mark.title }}</p>
              <p v-if="mark.subtitle" class="text-ink-muted text-xs mt-0.5">{{ mark.subtitle }}</p>
            </div>
            <span
              class="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 border"
              :class="{
                'bg-success-bg text-success border-success/20': mark.status === 'present' || mark.status === 'session',
                'bg-danger-bg text-danger border-danger/20': mark.status === 'absent',
                'bg-warning-bg text-warning border-warning/20': mark.status === 'partial',
              }"
            >
              {{
                mark.status === 'present' || mark.status === 'session'
                  ? 'Présent'
                  : mark.status === 'absent'
                    ? 'Absent'
                    : 'Partiel'
              }}
            </span>
          </li>
        </ul>
      </slot>
    </div>
  </div>
</template>
