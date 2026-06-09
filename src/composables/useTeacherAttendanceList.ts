import { computed, ref, type Ref } from 'vue'
import { useTeacherAttendanceCalendar } from '@/composables/useTeacherAttendanceCalendar'
import {
  buildTeacherAttendanceRows,
  filterAttendanceRows,
  type AttendanceListType,
} from '@/utils/attendanceTable'
import { formatDate } from '@/utils/helpers'
import { formatCalendarDayLong } from '@/utils/attendanceCalendar'
import type { AttendanceRecord } from '@/types/course'

export function useTeacherAttendanceList(options: {
  teacherUserId: Ref<string>
  getAttendanceRecords: (teacherId: string) => AttendanceRecord[]
  getCourses: () => { id: string; name: string }[]
  getCourseById: (
    id: string
  ) => { id: string; name: string; studentUserIds: string[] } | undefined
  getUserById: (
    id: string
  ) => { firstName: string; lastName: string; studentId?: string } | undefined
}) {
  const search = ref('')
  const courseFilter = ref('all')
  const typeFilter = ref<AttendanceListType>('all')

  const attendanceRecords = computed(() =>
    options.teacherUserId.value
      ? options.getAttendanceRecords(options.teacherUserId.value)
      : []
  )

  const {
    selectedDate,
    absenceRows,
    presenceCalendarMarks,
    absenceRowForMark,
    totalAbsences,
  } = useTeacherAttendanceCalendar({
    attendanceRecords,
    courseFilter,
    getCourseById: options.getCourseById,
  getUserById: options.getUserById,
})

  const myCourses = computed(() => options.getCourses())

  const allRows = computed(() =>
    buildTeacherAttendanceRows(
      absenceRows.value,
      options.getUserById,
      formatDate
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
      typeLabel: row.type === 'present' ? 'Présent' : 'Absent',
      markedAtLabel: row.markedAtLabel ?? '—',
    }))
  )

  const selectedDateLabel = computed(() =>
    selectedDate.value ? formatCalendarDayLong(selectedDate.value) : null
  )

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
    calendarMarks: presenceCalendarMarks,
    absenceRows,
    absenceRowForMark,
    totalAbsences,
    filteredRows,
    tableRows,
    selectedDateLabel,
    selectCalendarDate,
    clearDateFilter,
  }
}
