import { v1Get, v1Post } from '@/api/http'
import type {
  Quiz,
  QuizDetail,
  QuizNotionType,
  QuizNotionTypeProgress,
  QuizNotionTypeRequest,
  QuizProgressUpdateRequest,
  QuizRequest,
  QuizUserProgressOverview,
} from '@/api/types'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'
import {
  normalizeQuizDetail,
  normalizeQuizNotionType,
  normalizeQuizProgressOverview,
  normalizeQuizNotionTypeProgress,
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

/** POST /v1/private/quiz/notion-types */
export async function createNotionType(
  payload: QuizNotionTypeRequest,
): Promise<QuizNotionType> {
  const body: QuizNotionTypeRequest = {
    code: payload.code.trim(),
    label: payload.label.trim(),
    description: payload.description?.trim() || undefined,
  }
  const data = await v1Post<unknown>('private/quiz/notion-types', body)
  const created = normalizeQuizNotionType(data)
  if (!created) {
    throw new Error('Type de notion créé, mais la confirmation est incomplète.')
  }
  return created
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
    throw new Error('Quiz créé, mais la confirmation est incomplète. Actualisez la liste des quiz.')
  }
  return created
}

/** POST /v1/protected/quiz/{id}/progression — complétion d’un niveau */
export async function recordQuizProgression(
  quizId: number,
  payload: QuizProgressUpdateRequest,
): Promise<unknown> {
  const body: QuizProgressUpdateRequest = {
    levelOrder: Math.max(1, Math.floor(Number(payload.levelOrder) || 1)),
    score: Number(payload.score) || 0,
  }
  return v1Post<unknown>(`protected/quiz/${quizId}/progression`, body)
}

/** GET /v1/protected/quiz/progression — avancement global */
export async function getQuizProgressionOverview(): Promise<QuizUserProgressOverview> {
  const data = await v1Get<unknown>('protected/quiz/progression')
  return normalizeQuizProgressOverview(data)
}

/** GET /v1/protected/quiz/progression/{notionTypeId} */
export async function getQuizProgressionByNotionType(
  notionTypeId: number,
): Promise<QuizNotionTypeProgress | null> {
  const data = await v1Get<unknown>(`protected/quiz/progression/${notionTypeId}`)
  return normalizeQuizNotionTypeProgress(data) ?? unwrapObject<QuizNotionTypeProgress>(data)
}
