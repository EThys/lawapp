<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import AttendanceListPanel from '@/components/attendance/AttendanceListPanel.vue'
import { useStudentAttendanceList } from '@/composables/useStudentAttendanceList'
import type { AttendanceListType } from '@/utils/attendanceTable'
import { ArrowLeft, CalendarCheck } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()

const studentId = computed(() => auth.currentUser?.id ?? '')

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
  { immediate: true }
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
  { immediate: true }
)

watch(courseFilter, (c) => {
  const nextQuery = { ...route.query }
  if (c !== 'all') nextQuery.course = c
  else delete nextQuery.course
  router.replace({ query: nextQuery })
})

function onSelectDate(date: string) {
  selectedDate.value = date
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
    <RouterLink
      to="/student/history?tab=presences"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors min-h-11"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour à mon historique
    </RouterLink>

    <div v-reveal class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
      <div>
        <p class="label-caps mb-2 flex items-center gap-2">
          <CalendarCheck class="w-4 h-4 text-accent" />
          Espace étudiant
        </p>
        <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight">
          Mes présences & absences
        </h1>
        <p class="mt-1 text-sm text-ink-muted">
          {{ stats.presents }} présence(s) · {{ stats.absences }} absence(s) · calendrier interactif
        </p>
      </div>
    </div>

    <div v-if="myCourses.length === 0" class="text-center py-16 text-sm text-ink-muted">
      Rejoignez une salle pour voir votre historique de présences.
    </div>

    <AttendanceListPanel
      v-else
      v-reveal="80"
      mode="student"
      layout="split"
      dedicated-view-path="/student/attendance"
      export-title="Présences étudiant"
      :calendar-marks="calendarMarks"
      :table-rows="tableRows"
      :filtered-count="filteredRows.length"
      :course-options="myCourses.map((c) => ({ id: c.id, name: c.name }))"
      :selected-date="selectedDate"
      :selected-date-label="selectedDateLabel"
      :search="search"
      :course-filter="courseFilter"
      :type-filter="typeFilter"
      :session-count="stats.sessions"
      @update:selected-date="selectedDate = $event"
      @update:search="search = $event"
      @update:course-filter="courseFilter = $event"
      @update:type-filter="typeFilter = $event as AttendanceListType"
      @select-date="onSelectDate"
    />
  </div>
</template>
