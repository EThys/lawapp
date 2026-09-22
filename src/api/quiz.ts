import { v1Get, v1Post } from '@/api/http'
import type { Quiz, QuizDetail, QuizNotionType, QuizRequest } from '@/api/types'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'
import { normalizeQuizRequest } from '@/utils/quizApiMapper'

/** GET /v1/public/quiz/notion-types — types (Droit, Info, …). Auth souvent requise côté backend. */
export async function listNotionTypes(): Promise<QuizNotionType[]> {
  const data = await v1Get<unknown>('public/quiz/notion-types')
  if (Array.isArray(data)) {
    return data.filter((t): t is QuizNotionType => !!t && typeof t.id === 'number')
  }
  // Wrapper classique OU map de listes (schema OpenAPI additionalProperties).
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

/** GET /v1/protected/quiz - liste des quiz actifs */
export async function listQuizzes(): Promise<Quiz[]> {
  const data = await v1Get<unknown>('protected/quiz')
  return unwrapList<Quiz>(data)
}

/** GET /v1/private/quiz/{id} - détail (niveaux, questions, options) */
export async function getQuizById(id: number): Promise<QuizDetail | null> {
  const data = await v1Get<unknown>(`private/quiz/${id}`)
  return unwrapObject<QuizDetail>(data)
}

/** POST /v1/private/quiz - création d'un quiz avec niveaux et questions */
export async function createQuiz(payload: QuizRequest): Promise<QuizDetail | Quiz> {
  const body = normalizeQuizRequest(payload)
  if (import.meta.env.DEV) {
    console.info('[LawApp] POST private/quiz payload', JSON.stringify(body, null, 2))
  }
  const data = await v1Post<unknown>('private/quiz', body)
  return unwrapObject<QuizDetail>(data) ?? (data as QuizDetail)
}
