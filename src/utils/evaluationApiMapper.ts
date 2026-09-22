import type {
  Evaluation,
  Question,
  EvaluationType,
  EvaluationStatus,
  StudentAnswer,
  ExamSession,
  QuestionGrade,
  AntiCheatConfig,
  EvaluationSettings,
} from '@/types'
import { DEFAULT_ANTI_CHEAT, DEFAULT_SETTINGS } from '@/types'
import type {
  ApiEvaluation,
  EvaluationPassageView,
  EvaluationRequest,
  EvaluationAnticheatRequest,
  EvaluationAnticheat,
  EvaluationCriteresRequest,
  QuestionAnswerItemRequest,
  EvaluationAnswerableSummary,
  EvaluationSubmissionSummary,
  EvaluationSubmissionDetail,
  EvaluationSubmissionAnswerDetail,
} from '@/api/types'

export const API_TEACHER_PLACEHOLDER_ID = 'api-backend'

const API_TEACHER_ID = API_TEACHER_PLACEHOLDER_ID

/** Évaluation créée / gérée par l’enseignant connecté (pas le catalogue public). */
export function isEvaluationOwnedByTeacher(
  evaluation: { teacherId?: string; createdByUserId?: string },
  teacherUserId: string | undefined | null,
): boolean {
  if (!teacherUserId) return false
  if (evaluation.createdByUserId === teacherUserId) return true
  return (
    evaluation.teacherId === teacherUserId &&
    evaluation.teacherId !== API_TEACHER_PLACEHOLDER_ID
  )
}

export function evaluationCodeFromApiId(id: number): string {
  return `EV${id}`
}

export function parseApiEvaluationId(codeOrId: string): number | null {
  const trimmed = codeOrId.trim()
  const evMatch = /^EV(\d+)$/i.exec(trimmed)
  if (evMatch) return Number(evMatch[1])
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return null
}

function inferStatus(startDate?: string, endDate?: string): EvaluationStatus {
  const now = Date.now()
  if (endDate) {
    const end = new Date(endDate).getTime()
    if (!Number.isNaN(end) && now > end + 86400000) return 'closed'
  }
  if (startDate) {
    const start = new Date(startDate).getTime()
    if (!Number.isNaN(start) && now < start) return 'draft'
  }
  return 'active'
}

function durationFromDates(startDate?: string, endDate?: string): number {
  if (startDate && endDate) {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      return Math.max(15, Math.round((end - start) / 60000))
    }
  }
  return 60
}

export function mapApiEvaluationToLocal(
  api: ApiEvaluation,
  teacherName = 'Enseignant',
): Evaluation {
  const questions: Question[] = []

  for (const block of api.option ?? []) {
    const opts = block.questionOption ?? []
    const isTf =
      opts.length === 2 &&
      opts.some((o) => /^vrai$/i.test(o.option.trim())) &&
      opts.some((o) => /^faux$/i.test(o.option.trim()))

    if (isTf) {
      const vrai = opts.find((o) => /^vrai$/i.test(o.option.trim()))
      questions.push({
        id: String(block.question.id),
        type: 'truefalse',
        text: block.question.title,
        points: block.question.point || 1,
        correctAnswer: !!vrai?.isValid,
        options: opts.map((o) => ({
          id: String(o.id),
          text: o.option,
          isCorrect: o.isValid,
        })),
      })
    } else {
      questions.push({
        id: String(block.question.id),
        type: 'qcm',
        text: block.question.title,
        points: block.question.point || 1,
        options: opts.map((o) => ({
          id: String(o.id),
          text: o.option,
          isCorrect: o.isValid,
        })),
      })
    }
  }

  for (const block of api.ouverte ?? []) {
    const subItems = (block.questionOuverte ?? []).map((i) => ({
      title: i.title,
      fileContent: i.fileContent,
    }))
    const prompt = subItems.map((i) => i.title).filter(Boolean).join('\n')
    questions.push({
      id: String(block.question.id),
      type: 'short',
      text: block.question.title,
      points: block.question.point || 1,
      explanation: prompt || undefined,
      subItems: subItems.length ? subItems : undefined,
    })
  }

  for (const block of api.caseStudy ?? []) {
    const subItems = (block.questionCaseStudy ?? []).map((i) => ({
      title: i.title,
      fileContent: i.fileContent,
    }))
    const prompt = subItems.map((i) => i.title).filter(Boolean).join('\n')
    questions.push({
      id: String(block.question.id),
      type: 'document',
      text: block.question.title,
      points: block.question.point || 1,
      explanation: prompt || undefined,
      subItems: subItems.length ? subItems : undefined,
    })
  }

  const fromAnticheat = mapApiAnticheatToLocal(api.anticheat ?? null)

  const now = new Date().toISOString()
  return {
    id: String(api.id),
    apiId: api.id,
    code: evaluationCodeFromApiId(api.id),
    title: api.title,
    description: api.description ?? '',
    type: 'interro' as EvaluationType,
    status: inferStatus(api.startDate, api.endDate),
    durationMinutes:
      api.compteur != null && api.compteur > 0
        ? api.compteur
        : durationFromDates(api.startDate, api.endDate),
    questions,
    antiCheat: api.anticheat ? fromAnticheat.antiCheat : { ...DEFAULT_ANTI_CHEAT },
    settings: {
      ...DEFAULT_SETTINGS,
      shuffleQuestions: fromAnticheat.settings.shuffleQuestions,
      allowDocumentUpload: api.criteres?.allowDocumentUpload === true,
    },
    createdAt: now,
    updatedAt: now,
    teacherId: API_TEACHER_ID,
    teacherName,
    subject: 'Général',
    availableFrom: api.startDate ? `${api.startDate}T00:00:00.000Z` : null,
    availableUntil: api.endDate ? `${api.endDate}T23:59:59.000Z` : null,
    correctionPdfName: null,
    correctionPdfData: null,
    correctionPublished: false,
    correctionPublishedAt: null,
    courseId: null,
    requireEnrollment: false,
    presentOnly: false,
    sessionDate: null,
    sharedToClassAt: null,
    isFromApi: true,
    requiresAccessCode: false,
    compteur: api.compteur,
    fileContent: api.fileContent,
  }
}

export function mapAnswerableSummaryToLocal(
  summary: EvaluationAnswerableSummary,
  teacherName = 'Enseignant',
): Evaluation {
  const now = new Date().toISOString()
  return {
    id: String(summary.id),
    apiId: summary.id,
    code: evaluationCodeFromApiId(summary.id),
    title: summary.title,
    description: summary.description ?? '',
    type: 'interro',
    status: inferStatus(summary.startDate, summary.endDate),
    durationMinutes: durationFromDates(summary.startDate, summary.endDate),
    questions: [],
    antiCheat: { ...DEFAULT_ANTI_CHEAT },
    settings: { ...DEFAULT_SETTINGS },
    createdAt: summary.startDate ? `${summary.startDate}T00:00:00.000Z` : now,
    updatedAt: now,
    teacherId: API_TEACHER_ID,
    teacherName,
    subject: 'Général',
    availableFrom: summary.startDate ? `${summary.startDate}T00:00:00.000Z` : null,
    availableUntil: summary.endDate ? `${summary.endDate}T23:59:59.000Z` : null,
    correctionPdfName: null,
    correctionPdfData: null,
    correctionPublished: false,
    correctionPublishedAt: null,
    courseId: null,
    requireEnrollment: false,
    presentOnly: false,
    sessionDate: null,
    sharedToClassAt: null,
    isFromApi: true,
    requiresAccessCode: false,
  }
}

/** Tri du plus récent au plus ancien (id API décroissant). */
export function sortEvaluationsNewestFirst(list: Evaluation[]): Evaluation[] {
  return [...list].sort((a, b) => {
    const aId = a.apiId ?? (/^\d+$/.test(a.id) ? Number(a.id) : 0)
    const bId = b.apiId ?? (/^\d+$/.test(b.id) ? Number(b.id) : 0)
    if (bId !== aId) return bId - aId
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

/** Durée affichée à l'étudiant (compteur / passage), pas la fenêtre calendaire start–end. */
export function resolveEvaluationDurationMinutes(ev: {
  compteur?: number
  durationMinutes?: number
}): number | null {
  if (ev.compteur != null && ev.compteur > 0) return ev.compteur
  const d = Number(ev.durationMinutes)
  if (!Number.isFinite(d) || d <= 0) return null
  return d
}

export type ExamIntroRuleTone = 'danger' | 'warning' | 'info'

export interface ExamIntroAnticheatRule {
  id: string
  title: string
  detail?: string
  tone: ExamIntroRuleTone
}

/** Règles affichées à l'intro — alignées sur antiCheat / settings de l'évaluation (API passage). */
export function examIntroAnticheatRules(ev: Evaluation): ExamIntroAnticheatRule[] {
  const ac = ev.antiCheat
  const allowDoc =
    ev.settings.allowDocumentUpload || ev.questions.some((q) => q.type === 'document')
  const rules: ExamIntroAnticheatRule[] = []

  if (ac.failOnTabSwitch) {
    rules.push({
      id: 'tab',
      title: 'Changement d’onglet surveillé',
      detail: allowDoc
        ? 'Interdit pendant l’épreuve, sauf étape de dépôt de document si prévue.'
        : 'Quitter l’onglet peut entraîner la fin immédiate de l’épreuve.',
      tone: 'danger',
    })
  }

  if (ac.failOnWindowBlur) {
    rules.push({
      id: 'focus',
      title: 'Perte de focus interdite',
      detail: allowDoc
        ? 'Ne changez pas de fenêtre ; exception possible pour le dépôt de document.'
        : 'Changer de fenêtre ou d’application peut être compté comme violation.',
      tone: 'danger',
    })
  }

  if (ac.requireFullscreen) {
    rules.push({
      id: 'fullscreen',
      title: 'Mode plein écran requis',
      detail: allowDoc
        ? 'Restez en plein écran ; une sortie brève peut être tolérée pour déposer un fichier.'
        : 'Quitter le plein écran peut entraîner l’arrêt de l’épreuve.',
      tone: 'warning',
    })
  } else if (allowDoc) {
    rules.push({
      id: 'doc-leave',
      title: 'Dépôt de document',
      detail: 'Vous pourrez quitter le plein écran ou l’onglet uniquement pour joindre un fichier PDF.',
      tone: 'info',
    })
  }

  if (ac.blockCopyPaste || ac.blockContextMenu) {
    rules.push({
      id: 'clipboard',
      title: 'Copier-coller et menu contextuel interdits',
      detail: 'Utilisez uniquement la saisie directe dans les champs prévus.',
      tone: 'warning',
    })
  }

  if (ev.settings.shuffleQuestions) {
    rules.push({
      id: 'shuffle',
      title: 'Ordre des questions aléatoire',
      detail: 'L’ordre peut différer d’un candidat à l’autre.',
      tone: 'info',
    })
  }

  if (ac.maxViolations > 0 && (!ac.failOnTabSwitch || ac.maxViolations > 1)) {
    rules.push({
      id: 'max-violations',
      title: `${ac.maxViolations} violation${ac.maxViolations > 1 ? 's' : ''} maximum`,
      detail: 'Les infractions sont enregistrées et peuvent entraîner l’exclusion.',
      tone: 'warning',
    })
  } else if (rules.some((r) => r.tone === 'danger')) {
    rules.push({
      id: 'logged',
      title: 'Violations enregistrées',
      detail: 'Toute infraction est signalée à l’enseignant.',
      tone: 'info',
    })
  }

  return rules
}

export function mapPassageToEvaluation(passage: EvaluationPassageView): Evaluation {
  const questions: Question[] = passage.questions.map((q) => {
    if (q.kind === 'option' || (q.options && q.options.length > 0)) {
      return {
        id: String(q.id),
        type: 'qcm',
        text: q.title,
        points: q.point || 1,
        options: (q.options ?? []).map((o) => ({
          id: String(o.id),
          text: o.option,
        })),
      }
    }
    if (q.kind === 'caseStudy' || q.promptTitle) {
      return {
        id: String(q.id),
        type: 'document',
        text: q.title,
        points: q.point || 1,
        promptTitle: q.promptTitle,
        promptFileContent: q.promptFileContent,
      }
    }
    return {
      id: String(q.id),
      type: 'short',
      text: q.title,
      points: q.point || 1,
      promptTitle: q.promptTitle,
      promptFileContent: q.promptFileContent,
    }
  })

  const fromAnticheat = mapApiAnticheatToLocal(passage.anticheat)
  const durationMinutes =
    passage.durationMinutes != null && passage.durationMinutes > 0
      ? passage.durationMinutes
      : durationFromDates(passage.startDate, passage.endDate)

  const now = new Date().toISOString()
  return {
    id: String(passage.id),
    apiId: passage.id,
    code: evaluationCodeFromApiId(passage.id),
    title: passage.title,
    description: passage.description ?? '',
    type: 'interro',
    status: inferStatus(passage.startDate, passage.endDate),
    durationMinutes,
    compteur: passage.durationMinutes,
    questions,
    antiCheat: fromAnticheat.antiCheat,
    settings: {
      ...DEFAULT_SETTINGS,
      showCorrectAnswers: false,
      shuffleQuestions: fromAnticheat.settings.shuffleQuestions,
      allowDocumentUpload: passage.allowDocumentUpload === true,
    },
    createdAt: now,
    updatedAt: now,
    teacherId: API_TEACHER_ID,
    teacherName: 'Enseignant',
    subject: 'Général',
    availableFrom: passage.startDate ? `${passage.startDate}T00:00:00.000Z` : null,
    availableUntil: passage.endDate ? `${passage.endDate}T23:59:59.000Z` : null,
    correctionPdfName: null,
    correctionPdfData: null,
    correctionPublished: false,
    correctionPublishedAt: null,
    courseId: null,
    requireEnrollment: false,
    presentOnly: false,
    sessionDate: null,
    sharedToClassAt: null,
    isFromApi: true,
    requiresAccessCode: false,
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Date calendrier locale (évite le décalage UTC de toISOString). */
function formatApiDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseLocalDateOnly(yyyyMmDd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(yyyyMmDd.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Le backend rejette une date de début passée (souvent comparée en UTC) ou endDate <= startDate. */
export function normalizeEvaluationDates(
  availableFrom: string | null,
  availableUntil: string | null,
): { startDate: string; endDate: string } {
  const localToday = startOfToday()
  // Jour calendaire UTC (le serveur Spring utilise souvent LocalDate.now() en UTC).
  const utcNow = new Date()
  const utcToday = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()))
  const minStart = localToday > utcToday ? localToday : new Date(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), utcToday.getUTCDate())

  let start =
    (availableFrom ? parseLocalDateOnly(availableFrom.slice(0, 10)) : null) ?? new Date(minStart)
  if (start < minStart) start = new Date(minStart)

  let end = availableUntil ? parseLocalDateOnly(availableUntil.slice(0, 10)) : null
  if (!end) {
    end = new Date(start)
    end.setDate(end.getDate() + 30)
  }
  if (end < start) {
    end = new Date(start)
    end.setDate(end.getDate() + 1)
  }

  return { startDate: formatApiDate(start), endDate: formatApiDate(end) }
}

function toApiQuestionOption(
  text: string,
  isCorrect: boolean,
): { option: string; goal: boolean; isGoal: boolean } {
  return { option: text, goal: isCorrect, isGoal: isCorrect }
}

function dedupeQuestionOptions(
  options: { option: string; goal: boolean; isGoal: boolean }[],
): { option: string; goal: boolean; isGoal: boolean }[] {
  const seen = new Set<string>()
  const result: { option: string; goal: boolean; isGoal: boolean }[] = []
  for (const o of options) {
    const key = o.option.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(o)
  }
  return result
}

/** Valide le payload avant envoi API (messages explicites pour l'utilisateur). */
export function validateEvaluationPayloadForApi(data: {
  title: string
  questions: Question[]
  availableFrom: string | null
  availableUntil: string | null
}): string[] {
  const errors: string[] = []
  if (!data.title.trim()) errors.push('Le titre est requis.')

  const todayStr = formatApiDate(startOfToday())
  const from = data.availableFrom?.slice(0, 10)
  const until = data.availableUntil?.slice(0, 10)
  if (from && from < todayStr) {
    errors.push('La date de début ne peut pas être dans le passé.')
  }
  if (from && until && until < from) {
    errors.push('La date de fin doit être après la date de début.')
  }

  for (const q of data.questions) {
    if (!q.text.trim()) continue
    if (q.type === 'qcm' && q.options?.length) {
      const labels = q.options.filter((o) => o.text.trim()).map((o) => o.text.trim().toLowerCase())
      const dup = labels.find((l, i) => labels.indexOf(l) !== i)
      if (dup) {
        errors.push(`QCM « ${q.text.trim().slice(0, 40)} » : deux réponses identiques (« ${dup} »).`)
      }
      if (labels.length < 2) {
        errors.push(`QCM « ${q.text.trim().slice(0, 40)} » : au moins 2 réponses distinctes.`)
      }
    }
  }

  return errors
}

export function mapLocalAntiCheatToApiRequest(
  antiCheat: AntiCheatConfig,
  shuffleQuestions: boolean,
): EvaluationAnticheatRequest {
  const tab = !!antiCheat.failOnTabSwitch
  const blur = !!antiCheat.failOnWindowBlur
  const clipboard = !!(antiCheat.blockCopyPaste || antiCheat.blockContextMenu)
  const fullscreen = !!antiCheat.requireFullscreen
  const shuffle = !!shuffleQuestions
  return {
    failOnTabChange: tab,
    failImmediately: tab || blur,
    failOnFocusLoss: blur,
    failOnWindowChange: blur,
    blockCopyPaste: clipboard,
    forbidCtrlCV: clipboard,
    requireFullscreen: fullscreen,
    failOnExit: fullscreen,
    shuffleQuestions: shuffle,
    randomOrder: shuffle,
  }
}

export function mapApiAnticheatToLocal(
  api?: EvaluationAnticheat | EvaluationAnticheatRequest | null,
): { antiCheat: AntiCheatConfig; settings: Pick<EvaluationSettings, 'shuffleQuestions'> } {
  if (!api) {
    return {
      antiCheat: { ...DEFAULT_ANTI_CHEAT },
      settings: { shuffleQuestions: DEFAULT_SETTINGS.shuffleQuestions },
    }
  }
  const tab = api.failOnTabChange === true
  const blur = api.failOnFocusLoss === true || api.failOnWindowChange === true
  const clipboard = api.blockCopyPaste === true || api.forbidCtrlCV === true
  const fullscreen = api.requireFullscreen === true
  const shuffle = api.shuffleQuestions === true || api.randomOrder === true
  const failImmediately = api.failImmediately === true
  const maxViolations =
    failImmediately || tab || blur
      ? 1
      : DEFAULT_ANTI_CHEAT.maxViolations
  return {
    antiCheat: {
      failOnTabSwitch: tab,
      failOnWindowBlur: blur,
      blockCopyPaste: clipboard,
      blockContextMenu: clipboard,
      requireFullscreen: fullscreen,
      maxViolations,
      detectDevTools: false,
    },
    settings: { shuffleQuestions: shuffle },
  }
}

export function mapLocalCriteresToApiRequest(data: {
  availableFrom: string | null
  availableUntil: string | null
  allowDocumentUpload?: boolean
  classroomId?: number
  accessCode?: string
}): EvaluationCriteresRequest {
  const { startDate, endDate } = normalizeEvaluationDates(data.availableFrom, data.availableUntil)
  const criteres: EvaluationCriteresRequest = {
    openingStartDate: startDate,
    openingEndDate: endDate,
    allowDocumentUpload: data.allowDocumentUpload === true,
  }
  if (data.classroomId != null && data.classroomId > 0) criteres.classroomId = data.classroomId
  const code = data.accessCode?.trim()
  if (code) criteres.accessCode = code
  return criteres
}

export function mapLocalQuestionsToApiRequest(data: {
  title: string
  description: string
  subject?: string
  availableFrom: string | null
  availableUntil: string | null
  questions: Question[]
  /** Swagger `compteur` — durée de l'épreuve en minutes. */
  durationMinutes?: number
  /** Swagger `fileContent` — annexe PDF (data URL ou base64). */
  fileContent?: string
  antiCheat?: AntiCheatConfig
  settings?: Pick<EvaluationSettings, 'shuffleQuestions' | 'allowDocumentUpload'>
  classroomId?: number
  accessCode?: string
}): EvaluationRequest {
  const option: EvaluationRequest['option'] = []
  const ouverte: EvaluationRequest['ouverte'] = []
  const caseStudy: EvaluationRequest['caseStudy'] = []

  for (const q of data.questions) {
    if (!q.text.trim()) continue
    const base = { title: q.text.trim(), point: Number(q.points) > 0 ? Number(q.points) : 1 }

    if (q.type === 'qcm' && q.options?.length) {
      let questionOption = q.options
        .filter((o) => o.text.trim())
        .map((o) => toApiQuestionOption(o.text.trim(), o.isCorrect === true))
      questionOption = dedupeQuestionOptions(questionOption)
      if (questionOption.length < 2) continue
      if (!questionOption.some((o) => o.isGoal)) {
        questionOption = questionOption.map((o, i) => toApiQuestionOption(o.option, i === 0))
      }
      option.push({ question: base, questionOption })
    } else if (q.type === 'truefalse') {
      const isTrue = q.correctAnswer !== false
      option.push({
        question: base,
        questionOption: [
          toApiQuestionOption('Vrai', isTrue),
          toApiQuestionOption('Faux', !isTrue),
        ],
      })
    } else if (q.type === 'document') {
      caseStudy.push({
        question: base,
        questionCaseStudy: [{ title: q.text.trim() || 'Cas pratique', fileContent: '' }],
      })
    } else {
      ouverte.push({
        question: base,
        questionOuverte: [{ title: q.text.trim() || 'Question ouverte', fileContent: '' }],
      })
    }
  }

  const { startDate, endDate } = normalizeEvaluationDates(data.availableFrom, data.availableUntil)
  const subject = data.subject?.trim()
  const rawDescription = data.description.trim() || data.title.trim()
  const description = subject ? `[${subject}] ${rawDescription}` : rawDescription

  const compteur = Number(data.durationMinutes) > 0 ? Math.round(Number(data.durationMinutes)) : 0

  const antiCheat = data.antiCheat ?? DEFAULT_ANTI_CHEAT
  const shuffle = data.settings?.shuffleQuestions ?? DEFAULT_SETTINGS.shuffleQuestions

  const body: EvaluationRequest = {
    title: data.title.trim() || 'Évaluation',
    description: description || data.title.trim(),
    compteur,
    fileContent: String(data.fileContent ?? ''),
    startDate,
    endDate,
    anticheat: mapLocalAntiCheatToApiRequest(antiCheat, shuffle),
    criteres: mapLocalCriteresToApiRequest({
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil,
      allowDocumentUpload: data.settings?.allowDocumentUpload,
      classroomId: data.classroomId,
      accessCode: data.accessCode,
    }),
  }
  if (option.length) body.option = option
  if (ouverte.length) body.ouverte = ouverte
  if (caseStudy.length) body.caseStudy = caseStudy
  return body
}

/** Nettoie le JSON avant POST — format réel backend (isGoal, dates, compteur, anticheat, criteres). */
export function sanitizeEvaluationRequest(payload: EvaluationRequest): EvaluationRequest {
  const cleanOptions = (payload.option ?? []).map((block) => ({
    question: {
      title: String(block.question.title || 'Question'),
      point: Number(block.question.point) > 0 ? Number(block.question.point) : 1,
    },
    questionOption: (block.questionOption ?? []).map((o) => {
      const raw = o as { option?: string; isGoal?: boolean; goal?: boolean; isValid?: boolean }
      const goal = Boolean(raw.isGoal ?? raw.goal ?? raw.isValid)
      return { option: String(raw.option || ''), goal, isGoal: goal }
    }),
  }))

  const cleanOuverte = (payload.ouverte ?? []).map((block) => ({
    question: {
      title: String(block.question.title || 'Question ouverte'),
      point: Number(block.question.point) > 0 ? Number(block.question.point) : 1,
    },
    questionOuverte: (block.questionOuverte ?? []).map((o) => ({
      title: String(o.title || 'Consignes'),
      fileContent: String(o.fileContent ?? ''),
    })),
  }))

  const cleanCaseStudy = (payload.caseStudy ?? []).map((block) => ({
    question: {
      title: String(block.question.title || 'Cas pratique'),
      point: Number(block.question.point) > 0 ? Number(block.question.point) : 1,
    },
    questionCaseStudy: (block.questionCaseStudy ?? []).map((o) => ({
      title: String(o.title || 'Consignes'),
      fileContent: String(o.fileContent ?? ''),
    })),
  }))

  const body: EvaluationRequest = {
    title: String(payload.title || 'Évaluation'),
    description: String(payload.description || payload.title || ''),
    compteur: Number(payload.compteur) || 0,
    fileContent: String(payload.fileContent ?? ''),
    startDate: String(payload.startDate ?? ''),
    endDate: String(payload.endDate ?? ''),
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
      openingStartDate: c.openingStartDate ? String(c.openingStartDate) : undefined,
      openingEndDate: c.openingEndDate ? String(c.openingEndDate) : undefined,
      allowDocumentUpload: c.allowDocumentUpload === true,
      classroomId: c.classroomId != null && c.classroomId > 0 ? Number(c.classroomId) : undefined,
      accessCode: c.accessCode?.trim() || undefined,
    }
  }
  if (cleanOptions.length) body.option = cleanOptions
  if (cleanOuverte.length) body.ouverte = cleanOuverte
  if (cleanCaseStudy.length) body.caseStudy = cleanCaseStudy
  return body
}

/** Le backend renvoie souvent { message, id } avec des valeurs string. */
export function parseCreateEvaluationId(res: Record<string, unknown>): number | null {
  const direct = [res.id, res.evaluationId, res.evaluation_id]
  for (const val of direct) {
    if (typeof val === 'number' && val > 0) return val
    if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val)
  }
  for (const [key, val] of Object.entries(res)) {
    if (!/id/i.test(key)) continue
    if (typeof val === 'number' && val > 0) return val
    if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val)
  }
  return null
}

export function mapStudentAnswersToApi(
  answers: StudentAnswer[],
  _questions: Question[],
): QuestionAnswerItemRequest[] {
  return answers.map((a) => {
    const questionId = Number(a.questionId)
    if (typeof a.value === 'string' && /^\d+$/.test(a.value)) {
      return { questionId, selectedOptionId: Number(a.value) }
    }
    const text =
      typeof a.value === 'boolean'
        ? a.value
          ? 'Vrai'
          : 'Faux'
        : Array.isArray(a.value)
          ? a.value.join(', ')
          : String(a.value ?? '')
    return { questionId, textResponse: text }
  })
}

export function submissionKindLabel(kind?: string | null): string {
  const k = (kind ?? '').toLowerCase()
  if (k.includes('ouvert')) return 'Question ouverte'
  if (k.includes('case') || k.includes('pratique')) return 'Cas pratique'
  if (k.includes('option') || k.includes('qcm')) return 'QCM'
  if (k.includes('vrai') || k.includes('true')) return 'Vrai / Faux'
  return kind || 'Question'
}

/** QCM / option = auto. Ouverte / cas pratique = note manuelle (POST …/notes). */
export function isManualSubmissionAnswer(kind?: string | null): boolean {
  const k = (kind ?? '').toLowerCase()
  if (!k) return true
  if (k === 'option' || k.includes('option') || k.includes('qcm') || k.includes('truefalse') || k.includes('vrai')) {
    return false
  }
  return (
    k.includes('ouvert') ||
    k.includes('case') ||
    k.includes('pratique') ||
    k.includes('document') ||
    k.includes('short')
  )
}

export function isManualQuestion(question: { type?: string } | null | undefined): boolean {
  const t = (question?.type ?? '').toLowerCase()
  return t === 'short' || t === 'document'
}

/** Relie une session locale à une soumission API (étudiant). */
export function matchSubmissionSummary(
  session: Pick<
    ExamSession,
    'apiSubmissionId' | 'studentUserId' | 'studentEmail' | 'studentId' | 'studentFirstName' | 'studentLastName'
  >,
  list: EvaluationSubmissionSummary[],
): EvaluationSubmissionSummary | null {
  if (session.apiSubmissionId != null) {
    return list.find((s) => s.submissionId === session.apiSubmissionId) ?? null
  }

  const newest = (items: EvaluationSubmissionSummary[]) =>
    items
      .slice()
      .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())[0] ?? null

  if (session.studentUserId) {
    const byUser = list.filter((s) => s.userId != null && String(s.userId) === session.studentUserId)
    if (byUser.length) return newest(byUser)
  }

  const email = session.studentEmail?.trim().toLowerCase()
  if (email) {
    const byEmail = list.filter((s) => (s.studentEmail ?? '').trim().toLowerCase() === email)
    if (byEmail.length) return newest(byEmail)
  }

  const matricule = session.studentId?.trim().toLowerCase()
  if (matricule) {
    const byMat = list.filter((s) => (s.matricule ?? '').trim().toLowerCase() === matricule)
    if (byMat.length === 1) return byMat[0]
  }

  const first = session.studentFirstName.trim().toLowerCase()
  const last = session.studentLastName.trim().toLowerCase()
  if (first || last) {
    const byName = list.filter(
      (s) =>
        (s.studentFirstName ?? '').trim().toLowerCase() === first &&
        (s.studentLastName ?? '').trim().toLowerCase() === last,
    )
    if (byName.length === 1) return byName[0]
  }

  if (list.length === 1) return list[0]
  return null
}

/** Id local stable pour une soumission API. */
export function submissionSessionId(evaluationId: number, submissionId: number): string {
  return `sub-${evaluationId}-${submissionId}`
}

/** Route résultat étudiant stable (priorité id API sub-{eval}-{sub}). */
export function studentResultPath(
  session: Pick<ExamSession, 'id' | 'apiEvaluationId' | 'apiSubmissionId'>,
): string {
  if (session.apiEvaluationId != null && session.apiSubmissionId != null) {
    return `/exam/${submissionSessionId(session.apiEvaluationId, session.apiSubmissionId)}/result`
  }
  return `/exam/${session.id}/result`
}

export function parseSubmissionSessionId(
  id: string,
): { evaluationId: number; submissionId: number } | null {
  const m = /^sub-(\d+)-(\d+)$/i.exec(id.trim())
  if (m) return { evaluationId: Number(m[1]), submissionId: Number(m[2]) }
  const pair = /^(\d+)-(\d+)$/.exec(id.trim())
  if (pair) return { evaluationId: Number(pair[1]), submissionId: Number(pair[2]) }
  return null
}

/** Total de points du barème (questions de l’évaluation). */
export function resolveEvaluationPointsTotal(
  evaluation?: Pick<Evaluation, 'questions'> | null,
): number {
  if (!evaluation?.questions?.length) return 0
  return evaluation.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)
}

/** Score max affiché : barème évaluation, sinon somme des questionPoint de la copie. */
export function mergeSubmissionMaxScore(
  currentMax: number | undefined,
  evaluation?: Pick<Evaluation, 'questions'> | null,
  answerDetails?: EvaluationSubmissionAnswerDetail[],
): number | undefined {
  const fromEval = resolveEvaluationPointsTotal(evaluation)
  const fromAnswers = (answerDetails ?? []).reduce(
    (s, a) => s + (Number(a.questionPoint) || 0),
    0,
  )
  const best = Math.max(fromEval, fromAnswers, currentMax ?? 0)
  return best > 0 ? best : currentMax
}

/** Score affiché : totalScore API, sinon somme des notes par réponse (+ QCM auto). */
export function computeSubmissionTotalScore(detail: {
  totalScore?: number
  scoreQcm?: number
  answers?: EvaluationSubmissionAnswerDetail[]
}): number | undefined {
  if (detail.totalScore != null && Number.isFinite(Number(detail.totalScore))) {
    return Number(detail.totalScore)
  }
  const list = detail.answers ?? []
  if (!list.length) {
    return detail.scoreQcm != null ? Number(detail.scoreQcm) : undefined
  }
  let sum = 0
  let hasScoredPart = false
  for (const a of list) {
    if (a.score != null && Number.isFinite(Number(a.score))) {
      sum += Number(a.score)
      hasScoredPart = true
      continue
    }
    const correct =
      a.optionCorrect === true ||
      (a as { isOptionCorrect?: boolean | null }).isOptionCorrect === true
    const incorrect =
      a.optionCorrect === false ||
      (a as { isOptionCorrect?: boolean | null }).isOptionCorrect === false
    if (correct) {
      sum += Number(a.questionPoint) || 0
      hasScoredPart = true
    } else if (incorrect) {
      hasScoredPart = true
    }
  }
  if (hasScoredPart) return sum
  return detail.scoreQcm != null ? Number(detail.scoreQcm) : undefined
}

/** Session locale étudiante (UUID) avec violations à rattacher à la soumission API. */
export function findCompanionLocalSession(
  mapped: Pick<
    ExamSession,
    | 'id'
    | 'apiSubmissionId'
    | 'apiEvaluationId'
    | 'evaluationId'
    | 'studentUserId'
    | 'studentEmail'
    | 'studentId'
  >,
  sessions: ExamSession[],
): ExamSession | undefined {
  const sameEval = (s: ExamSession) =>
    (mapped.apiEvaluationId != null && s.apiEvaluationId === mapped.apiEvaluationId) ||
    s.evaluationId === mapped.evaluationId ||
    (mapped.apiEvaluationId != null && s.evaluationId === String(mapped.apiEvaluationId))

  const withViolations = (s: ExamSession) =>
    s.id !== mapped.id && s.violations.length > 0 && sameEval(s)

  if (mapped.apiSubmissionId != null) {
    const bySubmission = sessions.find(
      (s) => s.id !== mapped.id && s.apiSubmissionId === mapped.apiSubmissionId && s.violations.length,
    )
    if (bySubmission) return bySubmission
  }

  if (mapped.studentUserId) {
    const hit = sessions.find((s) => withViolations(s) && s.studentUserId === mapped.studentUserId)
    if (hit) return hit
  }

  const email = mapped.studentEmail?.trim().toLowerCase()
  if (email) {
    const hit = sessions.find(
      (s) => withViolations(s) && (s.studentEmail ?? '').trim().toLowerCase() === email,
    )
    if (hit) return hit
  }

  const mat = mapped.studentId?.trim().toLowerCase()
  if (mat) {
    const hits = sessions.filter(
      (s) => withViolations(s) && (s.studentId ?? '').trim().toLowerCase() === mat,
    )
    if (hits.length === 1) return hits[0]
  }

  return undefined
}

function answersFromApiDetail(
  answers: EvaluationSubmissionAnswerDetail[] | undefined,
): { answers: StudentAnswer[]; grades: QuestionGrade[]; maxScore: number; gradedAt?: string } {
  const list = answers ?? []
  const mappedAnswers: StudentAnswer[] = list.map((a) => ({
    questionId: String(a.questionId),
    value:
      a.selectedOptionId != null
        ? String(a.selectedOptionId)
        : (a.textResponse ?? a.selectedOptionText ?? ''),
  }))
  const grades: QuestionGrade[] = list
    .filter((a) => a.score != null)
    .map((a) => ({
      questionId: String(a.questionId),
      pointsAwarded: Number(a.score) || 0,
      comment: a.feedback || undefined,
    }))
  const maxScore = list.reduce((sum, a) => sum + (Number(a.questionPoint) || 0), 0)
  const gradedAt = list
    .map((a) => a.gradedAt)
    .filter(Boolean)
    .sort()
    .pop()
  return { answers: mappedAnswers, grades, maxScore, gradedAt }
}

/** Durée passée sur l’épreuve — champs API possibles ou delta startedAt → submittedAt. */
export function resolveSubmissionTimeSpentSeconds(
  source: EvaluationSubmissionSummary | EvaluationSubmissionDetail | Record<string, unknown>,
  fallback?: { startedAt?: string; submittedAt?: string },
): number {
  const row = source as Record<string, unknown>
  const raw =
    row.timeSpentSeconds ??
    row.timeSpent ??
    row.durationSeconds ??
    row.tempsPasse ??
    row.tempsPasseSecondes
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 0) return Math.round(n)

  const started = String(row.startedAt ?? fallback?.startedAt ?? '')
  const submitted = String(row.submittedAt ?? fallback?.submittedAt ?? '')
  if (started && submitted) {
    const delta = (new Date(submitted).getTime() - new Date(started).getTime()) / 1000
    if (Number.isFinite(delta) && delta > 0) return Math.round(delta)
  }
  return 0
}

export function mapSubmissionSummaryToSession(
  summary: EvaluationSubmissionSummary,
): ExamSession {
  const submittedAt = summary.submittedAt ?? new Date().toISOString()
  const startedAt = summary.startedAt ?? submittedAt
  const timeSpentSeconds = resolveSubmissionTimeSpentSeconds(summary, { startedAt, submittedAt })
  return {
    id: submissionSessionId(summary.evaluationId, summary.submissionId),
    evaluationId: String(summary.evaluationId),
    evaluationCode: evaluationCodeFromApiId(summary.evaluationId),
    studentUserId: summary.userId != null ? String(summary.userId) : undefined,
    studentFirstName: summary.studentFirstName ?? '',
    studentLastName: summary.studentLastName ?? '',
    studentId: summary.matricule ?? summary.studentEmail ?? String(summary.userId ?? summary.submissionId),
    studentEmail: summary.studentEmail,
    startedAt,
    submittedAt,
    expiresAt: submittedAt,
    status: 'submitted',
    answers: [],
    score: computeSubmissionTotalScore(summary),
    scoreQcm: summary.scoreQcm,
    maxScore: undefined,
    violations: [],
    timeSpentSeconds,
    apiSubmissionId: summary.submissionId,
    apiEvaluationId: summary.evaluationId,
  }
}

export function mapSubmissionDetailToSession(
  detail: EvaluationSubmissionDetail,
): ExamSession {
  const { answers, grades, maxScore, gradedAt } = answersFromApiDetail(detail.answers)
  const submittedAt = detail.submittedAt ?? new Date().toISOString()
  const startedAt = detail.startedAt ?? submittedAt
  const timeSpentSeconds = resolveSubmissionTimeSpentSeconds(detail, { startedAt, submittedAt })
  return {
    id: submissionSessionId(detail.evaluationId, detail.submissionId),
    evaluationId: String(detail.evaluationId),
    evaluationCode: evaluationCodeFromApiId(detail.evaluationId),
    studentUserId: detail.userId != null ? String(detail.userId) : undefined,
    studentFirstName: detail.studentFirstName ?? '',
    studentLastName: detail.studentLastName ?? '',
    studentId: detail.matricule ?? detail.studentEmail ?? String(detail.userId ?? detail.submissionId),
    studentEmail: detail.studentEmail,
    startedAt,
    submittedAt,
    expiresAt: submittedAt,
    status: 'submitted',
    answers,
    score: computeSubmissionTotalScore(detail),
    scoreQcm: detail.scoreQcm,
    maxScore:
      mergeSubmissionMaxScore(maxScore || undefined, undefined, detail.answers) || undefined,
    violations: [],
    timeSpentSeconds,
    questionGrades: grades,
    gradedAt: gradedAt ?? (grades.length ? new Date().toISOString() : undefined),
    apiSubmissionId: detail.submissionId,
    apiEvaluationId: detail.evaluationId,
    apiAnswers: detail.answers?.map((a) => ({
      ...a,
      optionCorrect:
        a.optionCorrect ??
        (a.isOptionCorrect === true ? true : a.isOptionCorrect === false ? false : undefined),
    })),
  }
}
