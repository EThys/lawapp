import type { Evaluation } from '@/types'
import type { AttendanceCalendarMark } from '@/utils/attendanceCalendar'
import { toDateKey } from '@/utils/attendanceCalendar'
import { EVALUATION_TYPE_LABELS } from '@/types'

export type ExamCalendarSource = 'for_you' | 'catalog' | 'cohort' | 'other'

export interface StudentExamCalendarEvent {
  evaluationId: string
  title: string
  subject: string
  typeLabel: string
  source: ExamCalendarSource
  code: string
  start: Date
  end: Date
  /** Jours couverts (YYYY-MM-DD) pour le calendrier mensuel. */
  dateKeys: string[]
  hasExplicitSchedule: boolean
  joinPath: string
}

function dateKeysBetween(start: Date, end: Date): string[] {
  const keys: string[] = []
  const cursor = new Date(start)
  cursor.setHours(12, 0, 0, 0)
  const last = new Date(end)
  last.setHours(12, 0, 0, 0)
  while (cursor.getTime() <= last.getTime()) {
    keys.push(toDateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys.length ? keys : [toDateKey(start.getFullYear(), start.getMonth(), start.getDate())]
}

export function resolveEvaluationEventTimes(
  evaluation: Evaluation,
): { start: Date; end: Date } | null {
  const durationMs = Math.max(15, evaluation.durationMinutes || 60) * 60 * 1000
  const from = evaluation.availableFrom ? new Date(evaluation.availableFrom) : null
  const until = evaluation.availableUntil ? new Date(evaluation.availableUntil) : null

  if (from && until && until.getTime() > from.getTime()) {
    return { start: from, end: until }
  }
  if (from) {
    return { start: from, end: new Date(from.getTime() + durationMs) }
  }
  if (until) {
    return { start: new Date(until.getTime() - durationMs), end: until }
  }
  return null
}

export function buildStudentExamCalendarEvents(
  evaluations: Evaluation[],
  sourceById: Map<string, ExamCalendarSource>,
): StudentExamCalendarEvent[] {
  const events: StudentExamCalendarEvent[] = []

  for (const e of evaluations) {
    const times = resolveEvaluationEventTimes(e)
    if (!times) continue

    const source = sourceById.get(e.id) ?? 'other'
    events.push({
      evaluationId: e.id,
      title: e.title,
      subject: e.subject,
      typeLabel: EVALUATION_TYPE_LABELS[e.type] ?? e.type,
      source,
      code: e.code,
      start: times.start,
      end: times.end,
      dateKeys: dateKeysBetween(times.start, times.end),
      hasExplicitSchedule: !!(e.availableFrom || e.availableUntil),
      joinPath: `/student?code=${encodeURIComponent(e.code)}`,
    })
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function examEventsToCalendarMarks(events: StudentExamCalendarEvent[]): AttendanceCalendarMark[] {
  const marks: AttendanceCalendarMark[] = []
  for (const ev of events) {
    for (const date of ev.dateKeys) {
      marks.push({
        date,
        status: 'session',
        id: `${ev.evaluationId}-${date}`,
        title: ev.title,
        subtitle: ev.subject,
      })
    }
  }
  return marks
}

function formatIcsUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function buildExamCalendarIcs(
  events: StudentExamCalendarEvent[],
  origin: string,
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LawApp//Epreuves etudiant//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LawApp — Mes épreuves',
  ]

  const stamp = formatIcsUtc(new Date())
  for (const ev of events) {
    const url = `${origin}${ev.joinPath}`
    const desc = [
      ev.typeLabel,
      ev.subject,
      `Code: ${ev.code}`,
      url,
    ].join('\\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:lawapp-eval-${ev.evaluationId}@lawapp`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsUtc(ev.start)}`,
      `DTEND:${formatIcsUtc(ev.end)}`,
      `SUMMARY:${escapeIcsText(ev.title)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      `URL:${url}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

/** Lien « Ajouter à Google Calendar » (une épreuve). */
export function googleCalendarUrlForEvent(ev: StudentExamCalendarEvent, origin: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${formatIcsUtc(ev.start)}/${formatIcsUtc(ev.end)}`,
    details: `${ev.typeLabel} · ${ev.subject}\nCode: ${ev.code}\n${origin}${ev.joinPath}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export const SOURCE_LABELS: Record<ExamCalendarSource, string> = {
  for_you: 'Pour vous',
  catalog: 'Catalogue',
  cohort: 'Formation',
  other: 'Autre',
}
