import type {
  Quiz,
  QuizDetail,
  QuizNotionType,
  QuizOptionRequest,
  QuizRequest,
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
