import type { QuizOptionRequest, QuizRequest } from '@/api/types'

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
