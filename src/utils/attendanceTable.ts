import { formatCalendarDayLong } from '@/utils/attendanceCalendar'
import type { AttendanceRecord } from '@/types/course'
import type { TeacherAbsenceDayRow } from '@/composables/useTeacherAttendanceCalendar'

export type AttendanceListType = 'all' | 'present' | 'absent' | 'session_with_absences'

export interface StudentAttendanceTableRow {
  id: string
  date: string
  dateLabel: string
  courseId: string
  courseName: string
  type: 'present' | 'absent'
  detail: string
}

export interface TeacherAttendanceTableRow {
  id: string
  date: string
  dateLabel: string
  courseId: string
  courseName: string
  studentName: string
  studentId: string
  type: 'present' | 'absent'
  markedAt?: string
  markedAtLabel?: string
}

export function buildStudentAttendanceRows(
  presenceRecords: AttendanceRecord[],
  absenceDays: { courseId: string; courseName: string; date: string }[],
  courseNameFor: (courseId: string) => string
): StudentAttendanceTableRow[] {
  const rows: StudentAttendanceTableRow[] = []

  for (const record of presenceRecords) {
    rows.push({
      id: record.id,
      date: record.date,
      dateLabel: formatCalendarDayLong(record.date),
      courseId: record.courseId,
      courseName: courseNameFor(record.courseId),
      type: 'present',
      detail: record.markedAt,
    })
  }

  for (const absence of absenceDays) {
    rows.push({
      id: `absent-${absence.courseId}-${absence.date}`,
      date: absence.date,
      dateLabel: formatCalendarDayLong(absence.date),
      courseId: absence.courseId,
      courseName: absence.courseName,
      type: 'absent',
      detail: '',
    })
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date))
}

export function buildTeacherAttendanceRows(
  absenceRows: TeacherAbsenceDayRow[],
  getUserById: (id: string) => { firstName: string; lastName: string; studentId?: string } | undefined,
  formatMarkedAt: (iso: string) => string
): TeacherAttendanceTableRow[] {
  const rows: TeacherAttendanceTableRow[] = []

  for (const day of absenceRows) {
    for (const record of day.presentRecords) {
      const user = getUserById(record.studentUserId)
      rows.push({
        id: record.id,
        date: day.date,
        dateLabel: formatCalendarDayLong(day.date),
        courseId: day.courseId,
        courseName: day.courseName,
        studentName: user ? `${user.lastName} ${user.firstName}` : 'Étudiant',
        studentId: user?.studentId ?? '—',
        type: 'present',
        markedAt: record.markedAt,
        markedAtLabel: formatMarkedAt(record.markedAt),
      })
    }

    for (const student of day.absentStudents) {
      rows.push({
        id: `absent-${day.key}-${student.userId}`,
        date: day.date,
        dateLabel: formatCalendarDayLong(day.date),
        courseId: day.courseId,
        courseName: day.courseName,
        studentName: student.name,
        studentId: student.studentId,
        type: 'absent',
      })
    }
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.studentName.localeCompare(b.studentName))
}

export function filterAttendanceRows<
  T extends { date: string; courseId: string; type: 'present' | 'absent'; courseName: string; studentName?: string; studentId?: string; detail?: string; markedAtLabel?: string },
>(rows: T[], options: { courseId: string; type: AttendanceListType; search: string; date?: string | null }): T[] {
  let list = rows

  if (options.date) {
    list = list.filter((r) => r.date === options.date)
  }

  if (options.courseId !== 'all') {
    list = list.filter((r) => r.courseId === options.courseId)
  }

  if (options.type === 'present') {
    list = list.filter((r) => r.type === 'present')
  } else if (options.type === 'absent') {
    list = list.filter((r) => r.type === 'absent')
  } else if (options.type === 'session_with_absences') {
    const datesWithAbsences = new Set(
      rows.filter((r) => r.type === 'absent').map((r) => `${r.courseId}:${r.date}`)
    )
    list = list.filter((r) => datesWithAbsences.has(`${r.courseId}:${r.date}`))
  }

  const q = options.search.trim().toLowerCase()
  if (q) {
    list = list.filter((r) => {
      const haystack = [
        r.courseName,
        r.date,
        r.type === 'present' ? 'présent' : 'absent',
        r.studentName,
        r.studentId,
        r.detail,
        r.markedAtLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }

  return list
}
