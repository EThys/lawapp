export type AttendanceDayStatus = 'present' | 'absent' | 'session' | 'partial' | 'none'

export interface AttendanceCalendarMark {
  date: string
  status: AttendanceDayStatus
  id?: string
  title?: string
  subtitle?: string
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

export const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

export function formatCalendarDayLong(date: string): string {
  return parseDateKey(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function isSameMonth(dateKey: string, year: number, month: number): boolean {
  const d = parseDateKey(dateKey)
  return d.getFullYear() === year && d.getMonth() === month
}

export function getTodayKey(): string {
  const d = new Date()
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Semaines du mois (lun → dim), `null` pour les cases vides. */
export function getMonthWeeks(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  let startOffset = first.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const cells: (string | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= lastDay; day++) {
    cells.push(toDateKey(year, month, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

export function getDominantStatus(marks: AttendanceCalendarMark[]): AttendanceDayStatus {
  if (marks.some((m) => m.status === 'absent')) return 'absent'
  if (marks.some((m) => m.status === 'partial')) return 'partial'
  if (marks.some((m) => m.status === 'present')) return 'present'
  if (marks.some((m) => m.status === 'session')) return 'session'
  return 'none'
}

export function groupMarksByDate(marks: AttendanceCalendarMark[]): Map<string, AttendanceCalendarMark[]> {
  const map = new Map<string, AttendanceCalendarMark[]>()
  for (const mark of marks) {
    const list = map.get(mark.date) ?? []
    list.push(mark)
    map.set(mark.date, list)
  }
  return map
}

export function countMarksInMonth(
  marks: AttendanceCalendarMark[],
  year: number,
  month: number
): { sessions: number; present: number; absent: number } {
  const byDate = groupMarksByDate(marks)
  let sessions = 0
  let present = 0
  let absent = 0

  for (const [date, dayMarks] of byDate) {
    if (!isSameMonth(date, year, month)) continue
    sessions++
    for (const m of dayMarks) {
      if (m.status === 'present' || m.status === 'session') present++
      if (m.status === 'absent') absent++
      if (m.status === 'partial') {
        present++
        absent++
      }
    }
  }

  return { sessions, present, absent }
}
