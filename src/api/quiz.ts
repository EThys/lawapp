import { v1Get, v1Post } from '@/api/http'
import type { Quiz, QuizDetail, QuizNotionType, QuizRequest } from '@/api/types'
import { unwrapList } from '@/utils/apiHelpers'
import {
  normalizeQuizDetail,
  normalizeQuizRequest,
  parseNotionTypes,
  unwrapQuizCreated,
} from '@/utils/quizApiMapper'

const NOTION_TYPE_PATHS = [
  'public/quiz/notion-types',
  'protected/quiz/notion-types',
  'private/quiz/notion-types',
] as const

/** GET notion-types — essaie public puis protected/private si besoin. */
export async function listNotionTypes(): Promise<QuizNotionType[]> {
  let lastError: unknown
  for (const path of NOTION_TYPE_PATHS) {
    try {
      const data = await v1Get<unknown>(path)
      const list = parseNotionTypes(data)
      if (list.length) return list
    } catch (e) {
      lastError = e
    }
  }
  if (lastError) throw lastError
  return []
}

/** GET /v1/protected/quiz - liste des quiz actifs */
export async function listQuizzes(): Promise<Quiz[]> {
  const data = await v1Get<unknown>('protected/quiz')
  return unwrapList<Quiz>(data)
}

/** GET /v1/private/quiz/{id} - détail (niveaux, questions, options) */
export async function getQuizById(id: number): Promise<QuizDetail | null> {
  const data = await v1Get<unknown>(`private/quiz/${id}`)
  return normalizeQuizDetail(data)
}

/** POST /v1/private/quiz - création d'un quiz avec niveaux et questions */
export async function createQuiz(payload: QuizRequest): Promise<QuizDetail | Quiz> {
  const body = normalizeQuizRequest(payload)
  if (import.meta.env.DEV) {
    console.info('[LawApp] POST private/quiz payload', JSON.stringify(body, null, 2))
  }
  const data = await v1Post<unknown>('private/quiz', body)
  const created = unwrapQuizCreated(data)
  if (!created) {
    throw new Error('Réponse du serveur invalide après création du quiz.')
  }
  return created
}
