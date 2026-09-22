import { computed, ref, type Ref } from 'vue'
import type { AttendanceRecord } from '@/types/course'
import type { AttendanceCalendarMark } from '@/utils/attendanceCalendar'

export interface TeacherAbsenceDayRow {
  key: string
  courseId: string
  courseName: string
  date: string
  presentCount: number
  absentCount: number
  totalEnrolled: number
  presentRecords: AttendanceRecord[]
  absentStudents: { userId: string; name: string; studentId: string }[]
}

export function useTeacherAttendanceCalendar(options: {
  attendanceRecords: Ref<AttendanceRecord[]>
  courseFilter: Ref<string>
  getCourseById: (
    id: string
  ) => { id: string; name: string; studentUserIds: string[] } | undefined
  getUserById: (
    id: string
  ) => { firstName: string; lastName: string; studentId?: string } | undefined
}) {
  const selectedDate = ref<string | null>(null)

  const absenceRows = computed((): TeacherAbsenceDayRow[] => {
    const grouped = new Map<string, AttendanceRecord[]>()
    for (const record of options.attendanceRecords.value) {
      const key = `${record.courseId}:${record.date}`
      const list = grouped.get(key) ?? []
      list.push(record)
      grouped.set(key, list)
    }

    const rows: TeacherAbsenceDayRow[] = []

    for (const [key, dayRecords] of grouped) {
      const courseId = dayRecords[0].courseId
      const course = options.getCourseById(courseId)
      if (!course) continue
      if (options.courseFilter.value !== 'all' && courseId !== options.courseFilter.value) {
        continue
      }

      const presentUserIds = new Set(dayRecords.map((r) => r.studentUserId))
      const absentStudents = course.studentUserIds
        .filter((uid) => !presentUserIds.has(uid))
        .map((uid) => {
          const user = options.getUserById(uid)
          return {
            userId: uid,
            name: user ? `${user.lastName} ${user.firstName}` : 'Étudiant',
            studentId: user?.studentId ?? '-',
          }
        })

      rows.push({
        key,
        courseId,
        courseName: course.name,
        date: dayRecords[0].date,
        presentCount: dayRecords.length,
        absentCount: absentStudents.length,
        totalEnrolled: course.studentUserIds.length,
        presentRecords: dayRecords,
        absentStudents,
      })
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date))
  })

  const absenceRowByKey = computed(() => {
    const map = new Map<string, TeacherAbsenceDayRow>()
    for (const row of absenceRows.value) map.set(row.key, row)
    return map
  })

  const presenceCalendarMarks = computed((): AttendanceCalendarMark[] =>
    absenceRows.value.map((row) => ({
      date: row.date,
      id: row.key,
      status: row.absentCount > 0 ? 'partial' : 'session',
      title: row.courseName,
      subtitle: `${row.presentCount}/${row.totalEnrolled} présent(s)`,
    }))
  )

  function absenceRowForMark(mark: AttendanceCalendarMark): TeacherAbsenceDayRow | undefined {
    return mark.id ? absenceRowByKey.value.get(mark.id) : undefined
  }

  const totalAbsences = computed(() =>
    absenceRows.value.reduce((sum, row) => sum + row.absentCount, 0)
  )

  return {
    selectedDate,
    absenceRows,
    presenceCalendarMarks,
    absenceRowForMark,
    totalAbsences,
  }
}
