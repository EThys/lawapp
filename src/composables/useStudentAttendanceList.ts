import { computed, ref, type Ref } from 'vue'
import type { AttendanceCalendarMark } from '@/utils/attendanceCalendar'
import {
  buildStudentAttendanceRows,
  filterAttendanceRows,
  type AttendanceListType,
} from '@/utils/attendanceTable'
import { formatDate } from '@/utils/helpers'
import { formatCalendarDayLong } from '@/utils/attendanceCalendar'

export function useStudentAttendanceList(options: {
  studentUserId: Ref<string>
  getCourses: () => { id: string; name: string }[]
  getPresenceRecords: (userId: string) => import('@/types/course').AttendanceRecord[]
  getAbsenceDays: (userId: string) => { courseId: string; courseName: string; date: string }[]
  getCourseName: (courseId: string) => string
}) {
  const search = ref('')
  const courseFilter = ref('all')
  const typeFilter = ref<AttendanceListType>('all')
  const selectedDate = ref<string | null>(null)

  const myCourses = computed(() => options.getCourses())

  const presenceRecords = computed(() =>
    options.studentUserId.value
      ? options.getPresenceRecords(options.studentUserId.value)
      : []
  )

  const absenceDays = computed(() =>
    options.studentUserId.value ? options.getAbsenceDays(options.studentUserId.value) : []
  )

  const calendarMarks = computed((): AttendanceCalendarMark[] => {
    const marks: AttendanceCalendarMark[] = []
    for (const record of presenceRecords.value) {
      marks.push({
        date: record.date,
        id: record.id,
        status: 'present',
        title: options.getCourseName(record.courseId),
        subtitle: `Marqué à ${formatDate(record.markedAt)}`,
      })
    }
    for (const absence of absenceDays.value) {
      marks.push({
        date: absence.date,
        id: `absent-${absence.courseId}-${absence.date}`,
        status: 'absent',
        title: absence.courseName,
        subtitle: 'Absent à la séance',
      })
    }
    return marks
  })

  const allRows = computed(() =>
    buildStudentAttendanceRows(
      presenceRecords.value,
      absenceDays.value,
      options.getCourseName
    )
  )

  const filteredRows = computed(() =>
    filterAttendanceRows(allRows.value, {
      courseId: courseFilter.value,
      type: typeFilter.value,
      search: search.value,
      date: selectedDate.value,
    })
  )

  const tableRows = computed(() =>
    filteredRows.value.map((row) => ({
      ...row,
      detail: row.type === 'present' && row.detail ? formatDate(row.detail) : '—',
      typeLabel: row.type === 'present' ? 'Présent' : 'Absent',
    }))
  )

  const selectedDateLabel = computed(() =>
    selectedDate.value ? formatCalendarDayLong(selectedDate.value) : null
  )

  const stats = computed(() => ({
    sessions: new Set(calendarMarks.value.map((m) => m.date)).size,
    presents: presenceRecords.value.length,
    absences: absenceDays.value.length,
  }))

  function selectCalendarDate(date: string) {
    selectedDate.value = date
  }

  function clearDateFilter() {
    selectedDate.value = null
  }

  return {
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
    selectCalendarDate,
    clearDateFilter,
  }
}
