export type EvaluationType = 'tp' | 'interro' | 'devoir' | 'exercice'

export type QuestionType = 'qcm' | 'short' | 'truefalse' | 'document'

export type CorrectionMode = 'auto' | 'manual'

export type EvaluationStatus = 'draft' | 'active' | 'closed'

export type SessionStatus = 'pending' | 'in_progress' | 'submitted' | 'failed' | 'expired'

export type ViolationType =
  | 'tab_switch'
  | 'window_blur'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'context_menu'
  | 'fullscreen_exit'
  | 'devtools'
  | 'resize'

export interface QuestionOption {
  id: string
  text: string
  isCorrect?: boolean
}

export interface QuestionSubItem {
  title: string
  fileContent?: string
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  points: number
  options?: QuestionOption[]
  correctAnswer?: string | boolean
  explanation?: string
  /** Cas pratique — énoncé principal (Swagger passage). */
  promptTitle?: string
  /** Pièce jointe consigne (base64 ou URL). */
  promptFileContent?: string
  /** Sous-consignes ouvertes / cas (Swagger ouverte / caseStudy). */
  subItems?: QuestionSubItem[]
}

export interface AntiCheatConfig {
  failOnTabSwitch: boolean
  failOnWindowBlur: boolean
  blockCopyPaste: boolean
  blockContextMenu: boolean
  requireFullscreen: boolean
  maxViolations: number
  detectDevTools: boolean
}

export interface EvaluationSettings {
  shuffleQuestions: boolean
  showResultsImmediately: boolean
  /** Afficher les bonnes réponses (QCM, vrai/faux) à la fin si correctionMode = auto */
  showCorrectAnswers: boolean
  /** Retour immédiat correct/incorrect pendant l'épreuve (QCM et vrai/faux) */
  instantFeedback: boolean
  /** auto = réponses immédiates · manual = correction PDF publiée par l'enseignant */
  correctionMode: CorrectionMode
  /** Permet des questions avec dépôt de documents (PDF, Word…) */
  allowDocumentUpload: boolean
  allowReview: boolean
  maxAttempts: number
  passingScore: number
  instructions: string
}

export interface Evaluation {
  id: string
  /** Identifiant numérique backend (évaluations API). */
  apiId?: number
  isFromApi?: boolean
  code: string
  title: string
  description: string
  type: EvaluationType
  status: EvaluationStatus
  durationMinutes: number
  questions: Question[]
  antiCheat: AntiCheatConfig
  settings: EvaluationSettings
  createdAt: string
  updatedAt: string
  teacherId: string
  /** Compte LawApp ayant créé l’épreuve (mode API). */
  createdByUserId?: string
  teacherName: string
  subject: string
  /** Date/heure à partir de laquelle l'évaluation est accessible (ISO). Null = immédiat. */
  availableFrom: string | null
  /** Date/heure limite de fin d'accès (ISO). Null = pas de limite. */
  availableUntil: string | null
  correctionPdfName: string | null
  correctionPdfData: string | null
  correctionPublished: boolean
  correctionPublishedAt: string | null
  /** Cours lié (classe de l'enseignant). Null = ouvert à tout étudiant inscrit sur la plateforme. */
  courseId: string | null
  /** Si true, seuls les étudiants inscrits au cours peuvent participer. */
  requireEnrollment: boolean
  /** Si true, seuls les étudiants présents (date sessionDate) peuvent participer. */
  presentOnly: boolean
  /** Date de séance pour le contrôle de présence (YYYY-MM-DD). Null = jour courant. */
  sessionDate: string | null
  /** Date de partage aux étudiants de la salle liée */
  sharedToClassAt: string | null
  /** Si true, l'étudiant doit saisir le code avant de rejoindre. */
  requiresAccessCode: boolean
  /** Swagger EvaluationRequest — durée ou compteur métier backend. */
  compteur?: number
  /** Swagger — annexe générale (base64 / URL). */
  fileContent?: string
}

export interface StudentAnswer {
  questionId: string
  value: string | boolean | string[]
  /** Nom du fichier déposé (questions document) */
  fileName?: string
}

/** Note manuelle enseignant par question (ouverte / document). Stockage local — pas d’API backend. */
export interface QuestionGrade {
  questionId: string
  pointsAwarded: number
  comment?: string
}

export interface Violation {
  type: ViolationType
  timestamp: string
  message: string
}

export interface ExamSession {
  id: string
  evaluationId: string
  evaluationCode: string
  studentUserId?: string
  studentFirstName: string
  studentLastName: string
  studentId: string
  startedAt: string
  submittedAt?: string
  expiresAt: string
  status: SessionStatus
  answers: StudentAnswer[]
  score?: number
  maxScore?: number
  violations: Violation[]
  timeSpentSeconds: number
  /** Commentaire global enseignant (local). */
  teacherComment?: string
  /** Notes manuelles par question (local). */
  questionGrades?: QuestionGrade[]
  gradedAt?: string
  /** Ids API soumission (GET private/.../submissions). */
  apiSubmissionId?: number
  apiEvaluationId?: number
  scoreQcm?: number
  studentEmail?: string
  /** Détail réponses API (kind, optionCorrect, feedback…). */
  apiAnswers?: import('@/api/types').EvaluationSubmissionAnswerDetail[]
}

export const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  tp: 'Travaux Pratiques',
  interro: 'Interrogation',
  devoir: 'Devoir',
  exercice: 'Exercice',
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  pending: 'À commencer',
  in_progress: 'En cours',
  submitted: 'Soumis',
  failed: 'Échoué',
  expired: 'Expiré',
}

export const VIOLATION_TYPE_LABELS: Record<ViolationType, string> = {
  tab_switch: 'Changement d\'onglet',
  window_blur: 'Fenêtre perdue',
  copy_attempt: 'Tentative de copie',
  paste_attempt: 'Tentative de collage',
  context_menu: 'Menu contextuel',
  fullscreen_exit: 'Sortie plein écran',
  devtools: 'Outils développeur',
  resize: 'Redimensionnement',
}

export const DEFAULT_ANTI_CHEAT: AntiCheatConfig = {
  failOnTabSwitch: true,
  failOnWindowBlur: true,
  blockCopyPaste: true,
  blockContextMenu: true,
  requireFullscreen: true,
  maxViolations: 2,
  /** Heuristique taille fenêtre désactivée côté runtime (faux positifs). */
  detectDevTools: false,
}

export const DEFAULT_SETTINGS: EvaluationSettings = {
  shuffleQuestions: false,
  showResultsImmediately: true,
  showCorrectAnswers: true,
  instantFeedback: true,
  correctionMode: 'auto',
  allowDocumentUpload: false,
  allowReview: false,
  maxAttempts: 1,
  passingScore: 50,
  instructions: 'Lisez attentivement chaque question. Ne quittez pas l\'onglet pendant l\'évaluation.',
}
