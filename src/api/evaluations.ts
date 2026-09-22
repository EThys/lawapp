import { apiGet, apiPost } from '@/api/client'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'
import type {
  ApiEvaluation,
  EvaluationAnswerableSummary,
  EvaluationPassageView,
  EvaluationRequest,
  EvaluationAnswerSubmitRequest,
  EvaluationSubmissionSummary,
  EvaluationSubmissionDetail,
  GradeSubmissionRequest,
  ApiMessageResponse,
} from '@/api/types'

/** Extrait la liste d'évaluations depuis les wrappers backend (`session`, `data`, …). */
function unwrapEvaluations(data: unknown): ApiEvaluation[] {
  return unwrapList<ApiEvaluation>(data).filter((e) => e && typeof e.id === 'number')
}

/** GET /api/v1/public/evaluations — liste (souvent avec bonnes réponses QCM). */
export async function listPublicEvaluations(): Promise<ApiEvaluation[]> {
  const data = await apiGet<unknown>('public/evaluations', true)
  return unwrapEvaluations(data)
}

/**
 * GET /api/v1/public/evaluations/{id}
 * Le backend renvoie le même wrapper que la liste (`{ message, session: [...] }`).
 */
export async function getPublicEvaluation(id: number): Promise<ApiEvaluation | null> {
  const data = await apiGet<unknown>(`public/evaluations/${id}`, true)
  const list = unwrapEvaluations(data)
  return list.find((e) => e.id === id) ?? list[0] ?? unwrapObject<ApiEvaluation>(data)
}

/** POST /api/v1/private/evaluations — création (enseignant). */
export async function createEvaluation(
  payload: EvaluationRequest,
): Promise<ApiMessageResponse & { id?: number | string; evaluationId?: number | string }> {
  const body = toBackendEvaluationBody(payload)
  if (import.meta.env.DEV) {
    console.info('[LawApp] POST private/evaluations FINAL body', JSON.parse(JSON.stringify(body)))
  }
  return apiPost('private/evaluations', body)
}

function questionPoint(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 1
  return n
}

function optionFlags(raw: { option?: string; isGoal?: boolean; goal?: boolean; isValid?: boolean }) {
  const goal = Boolean(raw.isGoal ?? raw.goal ?? raw.isValid)
  // Swagger: `goal`. Backend historique: `isGoal`. Les deux évitent un NPE côté serveur.
  return { option: String(raw.option || ''), goal, isGoal: goal }
}

/** Aligné sur EvaluationRequest OpenAPI + script de publication validé. */
function toBackendEvaluationBody(payload: EvaluationRequest): Record<string, unknown> {
  const mapOpts = (block: NonNullable<EvaluationRequest['option']>[number]) => ({
    question: {
      title: String(block.question?.title || 'Question'),
      point: questionPoint(block.question?.point),
    },
    questionOption: (block.questionOption ?? []).map((o) =>
      optionFlags(o as { option?: string; isGoal?: boolean; goal?: boolean; isValid?: boolean }),
    ),
  })

  const mapOuverte = (block: NonNullable<EvaluationRequest['ouverte']>[number]) => ({
    question: {
      title: String(block.question?.title || 'Question ouverte'),
      point: questionPoint(block.question?.point),
    },
    questionOuverte: (block.questionOuverte ?? []).map((o) => ({
      title: String(o.title || 'Consignes'),
      fileContent: String(o.fileContent ?? ''),
    })),
  })

  const mapCase = (block: NonNullable<EvaluationRequest['caseStudy']>[number]) => ({
    question: {
      title: String(block.question?.title || 'Cas pratique'),
      point: questionPoint(block.question?.point),
    },
    questionCaseStudy: (block.questionCaseStudy ?? []).map((o) => ({
      title: String(o.title || 'Consignes'),
      fileContent: String(o.fileContent ?? ''),
    })),
  })

  const option = (payload.option ?? []).map(mapOpts)
  const ouverte = (payload.ouverte ?? []).map(mapOuverte)
  const caseStudy = (payload.caseStudy ?? []).map(mapCase)

  const body: Record<string, unknown> = {
    title: String(payload.title || 'Évaluation'),
    description: String(payload.description || payload.title || ''),
    compteur: Number(payload.compteur) || 0,
    fileContent: String(payload.fileContent ?? ''),
    startDate: String(payload.startDate || ''),
    endDate: String(payload.endDate || ''),
  }
  if (payload.anticheat) {
    const a = payload.anticheat
    body.anticheat = {
      failOnTabChange: !!a.failOnTabChange,
      failImmediately: !!a.failImmediately,
      failOnFocusLoss: !!a.failOnFocusLoss,
      failOnWindowChange: !!a.failOnWindowChange,
      blockCopyPaste: !!a.blockCopyPaste,
      forbidCtrlCV: !!a.forbidCtrlCV,
      requireFullscreen: !!a.requireFullscreen,
      failOnExit: !!a.failOnExit,
      shuffleQuestions: !!a.shuffleQuestions,
      randomOrder: !!a.randomOrder,
    }
  }
  if (payload.criteres) {
    const c = payload.criteres
    body.criteres = {
      openingStartDate: c.openingStartDate,
      openingEndDate: c.openingEndDate,
      allowDocumentUpload: c.allowDocumentUpload === true,
      ...(c.classroomId != null && c.classroomId > 0 ? { classroomId: c.classroomId } : {}),
      ...(c.accessCode?.trim() ? { accessCode: c.accessCode.trim() } : {}),
    }
  }
  if (option.length) body.option = option
  if (ouverte.length) body.ouverte = ouverte
  if (caseStudy.length) body.caseStudy = caseStudy
  return body
}

/**
 * GET /api/v1/protected/evaluations/repondre
 * Évaluations ouvertes auxquelles l'utilisateur connecté peut répondre (hors les siennes).
 */
export async function listAnswerableEvaluations(): Promise<EvaluationAnswerableSummary[]> {
  const data = await apiGet<unknown>('protected/evaluations/repondre')
  return unwrapList<EvaluationAnswerableSummary>(data).filter((e) => e && typeof e.id === 'number')
}

/**
 * GET /api/v1/protected/evaluations/{id}/passage
 * Feuille pour passer l’évaluation (questions sans bonnes réponses QCM).
 */
export async function getEvaluationPassage(id: number): Promise<EvaluationPassageView> {
  const data = await apiGet<unknown>(`protected/evaluations/${id}/passage`)

  const asPassage = (value: unknown): EvaluationPassageView | null => {
    if (!value || typeof value !== 'object') return null
    const obj = value as EvaluationPassageView & Record<string, unknown>
    if (Array.isArray(obj.questions)) return obj
    return null
  }

  const direct = asPassage(data) ?? asPassage(unwrapObject(data))
  if (direct) return direct

  if (data && typeof data === 'object') {
    for (const val of Object.values(data as Record<string, unknown>)) {
      const nested = asPassage(val)
      if (nested) return nested
      if (Array.isArray(val)) {
        for (const item of val) {
          const fromItem = asPassage(item)
          if (fromItem) return fromItem
        }
      }
    }
  }

  throw new Error('Feuille d\'évaluation introuvable ou format inattendu.')
}

/** POST /api/v1/protected/evaluations/{id}/reponses — seule API de soumission des réponses. */
export async function submitEvaluationAnswers(
  id: number,
  payload: EvaluationAnswerSubmitRequest,
): Promise<ApiMessageResponse> {
  return apiPost(`protected/evaluations/${id}/reponses`, payload)
}

/** GET /api/v1/private/evaluations/{id}/submissions — liste (enseignant créateur). */
export async function listEvaluationSubmissions(
  evaluationId: number,
): Promise<EvaluationSubmissionSummary[]> {
  const data = await apiGet<unknown>(`private/evaluations/${evaluationId}/submissions`)
  return unwrapList<EvaluationSubmissionSummary>(data).filter(
    (s) => s && typeof s.submissionId === 'number',
  )
}

/** Réponse 200 sans objet `submission` (ex. message « Aucune soumission trouvée »). */
export function parseSubmissionApiResponse(data: unknown): EvaluationSubmissionDetail | null {
  const detail = unwrapSubmissionDetail(data)
  if (detail) return detail
  if (data && typeof data === 'object') {
    const msg = String((data as Record<string, unknown>).message ?? '').toLowerCase()
    if (
      msg.includes('aucune soumission') ||
      msg.includes('no submission') ||
      msg.includes('not found')
    ) {
      return null
    }
  }
  return null
}

/** GET /api/v1/private/evaluations/{id}/submissions/{submissionId} */
export async function getEvaluationSubmission(
  evaluationId: number,
  submissionId: number,
): Promise<EvaluationSubmissionDetail | null> {
  try {
    const data = await apiGet<unknown>(
      `private/evaluations/${evaluationId}/submissions/${submissionId}`,
    )
    return parseSubmissionApiResponse(data)
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 404) return null
    throw e
  }
}

type MySubmissionCacheEntry = {
  result: EvaluationSubmissionDetail | null
  ts: number
}

const mySubmissionCache = new Map<number, MySubmissionCacheEntry>()
const MY_SUBMISSION_NEGATIVE_TTL_MS = 30 * 60 * 1000
const MY_SUBMISSION_POSITIVE_TTL_MS = 90 * 1000

async function fetchMySubmissionFromNetwork(
  evaluationId: number,
): Promise<EvaluationSubmissionDetail | null> {
  try {
    const data = await apiGet<unknown>(`protected/evaluations/${evaluationId}/ma-soumission`)
    return parseSubmissionApiResponse(data)
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 404) return null
    throw e
  }
}

export function clearMySubmissionCache(evaluationId?: number): void {
  if (evaluationId == null) mySubmissionCache.clear()
  else mySubmissionCache.delete(evaluationId)
}

export function seedMySubmissionCache(
  evaluationId: number,
  detail: EvaluationSubmissionDetail | null,
): void {
  mySubmissionCache.set(evaluationId, { result: detail, ts: Date.now() })
}

/** GET ma-soumission — avec cache pour éviter des 404 répétés sur le même id. */
export async function getMySubmission(
  evaluationId: number,
  options?: { force?: boolean },
): Promise<EvaluationSubmissionDetail | null> {
  if (!options?.force) {
    const cached = mySubmissionCache.get(evaluationId)
    if (cached) {
      const ttl =
        cached.result != null ? MY_SUBMISSION_POSITIVE_TTL_MS : MY_SUBMISSION_NEGATIVE_TTL_MS
      if (Date.now() - cached.ts < ttl) return cached.result
    }
  }
  const result = await fetchMySubmissionFromNetwork(evaluationId)
  mySubmissionCache.set(evaluationId, { result, ts: Date.now() })
  return result
}

/** POST /api/v1/private/evaluations/{id}/submissions/{submissionId}/notes */
export async function gradeEvaluationSubmission(
  evaluationId: number,
  submissionId: number,
  payload: GradeSubmissionRequest,
): Promise<unknown> {
  return apiPost(
    `private/evaluations/${evaluationId}/submissions/${submissionId}/notes`,
    payload,
  )
}

function normalizeSubmissionAnswer(
  raw: EvaluationSubmissionAnswerDetail,
): EvaluationSubmissionAnswerDetail {
  const optionCorrect =
    raw.optionCorrect ??
    (raw.isOptionCorrect === true ? true : raw.isOptionCorrect === false ? false : undefined)
  return { ...raw, optionCorrect }
}

export function normalizeSubmissionDetail(
  detail: EvaluationSubmissionDetail,
): EvaluationSubmissionDetail {
  return {
    ...detail,
    answers: detail.answers?.map((a) => normalizeSubmissionAnswer(a)),
  }
}

function findSubmissionDetailNode(data: unknown, depth = 0): EvaluationSubmissionDetail | null {
  if (!data || typeof data !== 'object' || depth > 6) return null
  const obj = data as Record<string, unknown>
  if (typeof obj.submissionId === 'number') {
    return normalizeSubmissionDetail(obj as EvaluationSubmissionDetail)
  }
  for (const key of ['submission', 'session', 'data', 'result']) {
    if (key in obj) {
      const hit = findSubmissionDetailNode(obj[key], depth + 1)
      if (hit) return hit
    }
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        const hit = findSubmissionDetailNode(item, depth + 1)
        if (hit) return hit
      }
    } else {
      const hit = findSubmissionDetailNode(val, depth + 1)
      if (hit) return hit
    }
  }
  return null
}

export function unwrapSubmissionDetail(data: unknown): EvaluationSubmissionDetail | null {
  return findSubmissionDetailNode(data)
}
