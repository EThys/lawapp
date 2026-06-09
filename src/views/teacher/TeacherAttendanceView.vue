<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import AttendanceListPanel from '@/components/attendance/AttendanceListPanel.vue'
import { useTeacherAttendanceList } from '@/composables/useTeacherAttendanceList'
import type { AttendanceListType } from '@/utils/attendanceTable'
import { ArrowLeft, CalendarCheck } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()

const teacherId = computed(() => auth.currentUser?.id ?? '')

const {
  search,
  courseFilter,
  typeFilter,
  selectedDate,
  myCourses,
  calendarMarks,
  absenceRowForMark,
  totalAbsences,
  filteredRows,
  tableRows,
  selectedDateLabel,
  absenceRows,
} = useTeacherAttendanceList({
  teacherUserId: teacherId,
  getAttendanceRecords: (id) => courseStore.getAttendanceHistoryForTeacher(id),
  getCourses: () => courseStore.getCoursesForTeacher(teacherId.value),
  getCourseById: (id) => courseStore.getById(id),
  getUserById: (id) => auth.getUserById(id),
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
      to="/teacher/history?tab=absences"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors min-h-11"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour au suivi
    </RouterLink>

    <div v-reveal class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
      <div>
        <p class="label-caps mb-2 flex items-center gap-2">
          <CalendarCheck class="w-4 h-4 text-accent" />
          Espace enseignant
        </p>
        <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight">
          Présences & absences
        </h1>
        <p class="mt-1 text-sm text-ink-muted">
          {{ absenceRows.length }} séance(s) · {{ totalAbsences }} absence(s) au total
        </p>
      </div>
    </div>

    <div v-if="myCourses.length === 0" class="text-center py-16 text-sm text-ink-muted">
      Créez une salle pour enregistrer les présences et consulter l'historique.
    </div>

    <AttendanceListPanel
      v-else
      v-reveal="80"
      mode="teacher"
      layout="split"
      dedicated-view-path="/teacher/attendance"
      export-title="Présences enseignant"
      :calendar-marks="calendarMarks"
      :table-rows="tableRows"
      :filtered-count="filteredRows.length"
      :course-options="myCourses.map((c) => ({ id: c.id, name: c.name }))"
      :selected-date="selectedDate"
      :selected-date-label="selectedDateLabel"
      :search="search"
      :course-filter="courseFilter"
      :type-filter="typeFilter"
      :session-count="absenceRows.length"
      :absence-count="totalAbsences"
      :absence-row-for-mark="absenceRowForMark"
      @update:selected-date="selectedDate = $event"
      @update:search="search = $event"
      @update:course-filter="courseFilter = $event"
      @update:type-filter="typeFilter = $event as AttendanceListType"
      @select-date="onSelectDate"
    />
  </div>
</template>
