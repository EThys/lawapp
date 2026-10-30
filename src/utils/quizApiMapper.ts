import type {
  Quiz,
  QuizDetail,
  QuizNotionType,
  QuizNotionTypeProgress,
  QuizOptionRequest,
  QuizRequest,
  QuizUserProgressItem,
  QuizUserProgressOverview,
} from '@/api/types'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'

/** Option quiz pour POST /v1/private/quiz.
 * Swagger QuizOptionRequest : uniquement `option` + `goal`.
 * Ne pas envoyer `isGoal` → Spring répond « Format de requête JSON invalide ».
 */
export function toQuizOptionPayload(
  option: string,
  isCorrect: boolean,
): QuizOptionRequest {
  return {
    option: option.trim(),
    goal: !!isCorrect,
  }
}

/** Parse GET notion-types (tableau, wrapper ou map de listes). */
export function parseNotionTypes(data: unknown): QuizNotionType[] {
  if (Array.isArray(data)) {
    return data.filter((t): t is QuizNotionType => !!t && typeof t.id === 'number')
  }
  if (data && typeof data === 'object') {
    const out: QuizNotionType[] = []
    const seen = new Set<number>()
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (!Array.isArray(val)) continue
      for (const item of val) {
        if (!item || typeof item !== 'object') continue
        const t = item as QuizNotionType
        if (typeof t.id !== 'number' || seen.has(t.id)) continue
        seen.add(t.id)
        out.push(t)
      }
    }
    if (out.length) return out
  }
  return unwrapList<QuizNotionType>(data).filter((t) => t && typeof t.id === 'number')
}

/** Détail quiz : tri des niveaux + `valid` sur les options (réponse API). */
export function normalizeQuizDetail(data: unknown): QuizDetail | null {
  const raw = unwrapObject<QuizDetail>(data)
  if (!raw || typeof raw.id !== 'number') return null

  const levels = [...(raw.levels ?? [])].sort(
    (a, b) => (a.levelOrder ?? 0) - (b.levelOrder ?? 0),
  )

  return {
    ...raw,
    levels: levels.map((level) => ({
      ...level,
      questions: (level.questions ?? []).map((q) => ({
        ...q,
        options: (q.options ?? []).map((o) => {
          const legacy = o as { goal?: boolean }
          return {
            ...o,
            valid: o.valid ?? !!legacy.goal,
          }
        }),
      })),
    })),
  }
}

export function unwrapQuizCreated(data: unknown): Quiz | QuizDetail | null {
  const direct = normalizeQuizDetail(data)
  if (direct) return direct
  for (const item of unwrapList<QuizDetail>(data)) {
    const normalized = normalizeQuizDetail(item)
    if (normalized) return normalized
  }
  return null
}

export function extractQuizId(quiz: Quiz | QuizDetail | null | undefined): number | null {
  if (quiz && typeof quiz.id === 'number' && Number.isFinite(quiz.id)) return quiz.id
  return null
}

export function normalizeQuizRequest(payload: QuizRequest): QuizRequest {
  return {
    title: payload.title.trim(),
    description: payload.description?.trim() || undefined,
    notionTypeId: Number(payload.notionTypeId),
    levels: payload.levels.map((level, li) => ({
      title: level.title.trim(),
      levelOrder: level.levelOrder ?? li + 1,
      questions: level.questions.map((q) => {
        const options = q.options
          .filter((o) => o.option?.trim())
          .map((o) =>
            toQuizOptionPayload(o.option, !!(o.goal || (o as { isGoal?: boolean }).isGoal)),
          )
        // Dédupliquer les libellés en préférant l'option marquée bonne.
        const seen = new Map<string, (typeof options)[number]>()
        for (const opt of options) {
          const key = opt.option.toLowerCase()
          const prev = seen.get(key)
          if (!prev || (opt.goal && !prev.goal)) seen.set(key, opt)
        }
        return {
          title: q.title.trim(),
          point: Number(q.point) > 0 ? Number(q.point) : 1,
          options: [...seen.values()],
        }
      }),
    })),
  }
}

export function normalizeQuizNotionType(data: unknown): QuizNotionType | null {
  const raw = unwrapObject<QuizNotionType>(data)
  if (!raw || typeof raw.id !== 'number') return null
  return raw
}

function normalizeProgressItem(raw: unknown): QuizUserProgressItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as QuizUserProgressItem
  if (typeof item.quizId !== 'number') return null
  return item
}

export function normalizeQuizNotionTypeProgress(
  data: unknown,
): QuizNotionTypeProgress | null {
  const raw = unwrapObject<QuizNotionTypeProgress>(data)
  if (!raw) return null
  const quizzes = (raw.quizzes ?? [])
    .map(normalizeProgressItem)
    .filter((q): q is QuizUserProgressItem => !!q)
  return { ...raw, quizzes }
}

export function normalizeQuizProgressOverview(
  data: unknown,
): QuizUserProgressOverview {
  const raw = unwrapObject<QuizUserProgressOverview>(data)
  if (!raw) {
    const asList = unwrapList<QuizNotionTypeProgress>(data)
    if (asList.length) {
      return {
        notionTypes: asList
          .map((n) => normalizeQuizNotionTypeProgress(n))
          .filter((n): n is QuizNotionTypeProgress => !!n),
      }
    }
    return { notionTypes: [] }
  }
  return {
    userId: raw.userId,
    notionTypes: (raw.notionTypes ?? [])
      .map((n) => normalizeQuizNotionTypeProgress(n))
      .filter((n): n is QuizNotionTypeProgress => !!n),
  }
}

/** Indexe l’avancement par quizId à partir de l’overview. */
export function flattenQuizProgressById(
  overview: QuizUserProgressOverview | null | undefined,
): Map<number, QuizUserProgressItem> {
  const map = new Map<number, QuizUserProgressItem>()
  for (const notion of overview?.notionTypes ?? []) {
    for (const item of notion.quizzes ?? []) {
      if (typeof item.quizId === 'number') map.set(item.quizId, item)
    }
  }
  return map
}

export function scoreQuizLevel(
  level: { questions?: Array<{ id: number; point?: number; options?: Array<{ id: number; valid?: boolean }> }> },
  answers: Record<number, number>,
): number {
  let pts = 0
  for (const q of level.questions ?? []) {
    const chosen = answers[q.id]
    const correct = q.options?.find((o) => o.valid)
    if (chosen != null && correct && chosen === correct.id) {
      pts += q.point ?? 1
    }
  }
  return pts
}
