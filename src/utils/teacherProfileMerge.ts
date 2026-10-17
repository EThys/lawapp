import type { TeacherRecord } from '@/api/types'

function pickString(...values: (string | undefined | null)[]): string | undefined {
  for (const v of values) {
    const t = v?.trim()
    if (t) return t
  }
  return undefined
}

function pickNumber(...values: (number | undefined | null)[]): number | undefined {
  for (const v of values) {
    if (v != null && Number.isFinite(v) && v > 0) return v
  }
  return undefined
}

/** Fusionne plusieurs sources (API liste, login, localStorage) en conservant chaque champ renseigné. */
export function mergeTeacherRecords(
  ...sources: (TeacherRecord | null | undefined)[]
): TeacherRecord | null {
  const withId = sources.filter((s): s is TeacherRecord => !!s?.teacherId)
  if (!withId.length) return null

  const teacherId = withId[0]!.teacherId

  return {
    teacherId,
    departement: pickString(...withId.map((t) => t.departement)),
    gender: pickString(...withId.map((t) => t.gender)),
    justificatif: pickString(...withId.map((t) => t.justificatif)),
    typeTeacherId: pickNumber(...withId.map((t) => t.typeTeacherId)),
    userId: pickNumber(...withId.map((t) => t.userId)),
    email: pickString(...withId.map((t) => t.email)),
    username: pickString(...withId.map((t) => t.username)),
  }
}
