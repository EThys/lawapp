export interface UserDto {
  userId: number
  email: string
  username?: string
  phone?: string
  city?: string
  firstName: string
  lastName: string
  premium?: boolean
  certified?: boolean
  /** Variantes de champs parfois renvoyées par le backend login. */
  isPremium?: boolean
  isCertified?: boolean
}

export interface BackendRegisterResponse {
  user?: UserDto
  message?: string
}

export interface BackendLoginAccount {
  id: number
  name: string
  typeAccount: {
    typeAccountId: number
    name: string
  }
}

/** Ancien format éventuel (liste de comptes). */
export interface BackendLoginProfileLegacy {
  account: BackendLoginAccount
  organism: { id: number; city: string; name: string } | null
}

export interface BackendTeacherSlice {
  teacherId: number
  typeTeacherId?: number | null
  departement?: string
  justificatif?: string
  gender?: string
}

export interface BackendStudentSlice {
  studentId: number
  matricule?: string
  gender?: string
  promotionId?: number
  etablissementId?: number
}

/**
 * Profil métier au login, ex. :
 * `{ type: 3, teacher: { teacher: { teacherId, ... } } }`
 * ou `{ type: 3, teacher: { teacherId, ... } }`
 */
export interface BackendMemberProfile {
  type?: number
  teacher?: BackendTeacherSlice | { teacher?: BackendTeacherSlice | null } | null
  student?: BackendStudentSlice | { student?: BackendStudentSlice | null } | null
  [key: string]: unknown
}

export interface BackendLoginResponse {
  member: {
    user: UserDto
    profile?: BackendMemberProfile | BackendLoginProfileLegacy[] | null
  }
  token: string
  refresh_token?: string
  message?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface UserPasswordRequest {
  newPassword: string
}

export interface CertificationStateRequest {
  state: boolean
}

export interface IdentifiantRequest {
  identifier: string
}

export interface VerifyOtpRequest {
  identifier: string
  code: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface ApiMessageResponse {
  message?: string
  [key: string]: string | undefined
}

export interface ApiEvaluationOption {
  id: number
  questionId: number
  option: string
  isValid?: boolean
}

export interface ApiEvaluationQuestion {
  id: number
  evaluationId: number
  title: string
  point: number
}

export interface ApiQuestionOptionBlock {
  question: ApiEvaluationQuestion
  questionOption: ApiEvaluationOption[]
}

export interface ApiQuestionOuverteBlock {
  question: ApiEvaluationQuestion
  questionOuverte: { id?: number; title: string; fileContent?: string }[]
}

export interface ApiQuestionCaseStudyBlock {
  question: ApiEvaluationQuestion
  questionCaseStudy: { title: string; fileContent?: string }[]
}

export interface ApiEvaluation {
  id: number
  title: string
  description?: string
  compteur?: number
  fileContent?: string
  startDate?: string
  endDate?: string
  anticheat?: EvaluationAnticheat
  criteres?: EvaluationCriteresRequest
  option?: ApiQuestionOptionBlock[]
  ouverte?: ApiQuestionOuverteBlock[]
  caseStudy?: ApiQuestionCaseStudyBlock[]
}

export interface ApiEvaluationsListResponse {
  message?: string
  session?: ApiEvaluation[]
  data?: ApiEvaluation[]
}

export interface EvaluationAnswerableSummary {
  id: number
  title: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface EvaluationAnticheatRequest {
  failOnTabChange?: boolean
  failImmediately?: boolean
  failOnFocusLoss?: boolean
  failOnWindowChange?: boolean
  blockCopyPaste?: boolean
  forbidCtrlCV?: boolean
  requireFullscreen?: boolean
  failOnExit?: boolean
  shuffleQuestions?: boolean
  randomOrder?: boolean
}

export interface EvaluationCriteresRequest {
  openingStartDate?: string
  openingEndDate?: string
  allowDocumentUpload?: boolean
  classroomId?: number
  accessCode?: string
}

export interface EvaluationAnticheat extends EvaluationAnticheatRequest {
  id?: number
  evaluationId?: number
  createdAt?: string
}

export interface EvaluationPassageView {
  id: number
  title: string
  description?: string
  startDate?: string
  endDate?: string
  durationMinutes?: number
  anticheat?: EvaluationAnticheat
  allowDocumentUpload?: boolean
  questions: EvaluationQuestionPassageView[]
}

export interface EvaluationQuestionPassageView {
  id: number
  title: string
  point: number
  kind: string
  options?: { id: number; option: string }[]
  promptTitle?: string
  promptFileContent?: string
}

export interface EvaluationRequest {
  title: string
  description?: string
  compteur?: number
  fileContent?: string
  startDate?: string
  endDate?: string
  anticheat?: EvaluationAnticheatRequest
  criteres?: EvaluationCriteresRequest
  option?: QuestionOptionRequestDAO[]
  ouverte?: QuestionOuverteRequestDAO[]
  caseStudy?: QuestionCaseStudyRequestDAO[]
}

export interface QuestionRequest {
  title: string
  point: number
}

export interface QuestionOptionRequest {
  option: string
  /** OpenAPI : `goal`. */
  goal?: boolean
  /** Variante JavaBean encore lue par certains builds. */
  isGoal?: boolean
}

export interface QuestionOptionRequestDAO {
  question: QuestionRequest
  questionOption: QuestionOptionRequest[]
}

export interface QuestionOuverteRequestDAO {
  question: QuestionRequest
  questionOuverte: { title: string; fileContent?: string }[]
}

export interface QuestionCaseStudyRequestDAO {
  question: QuestionRequest
  questionCaseStudy: { title: string; fileContent?: string }[]
}

export interface QuestionAnswerItemRequest {
  questionId: number
  selectedOptionId?: number
  textResponse?: string
}

export interface EvaluationAnswerSubmitRequest {
  answers: QuestionAnswerItemRequest[]
  /** Non documenté OpenAPI — accepté si le backend le persiste. */
  timeSpentSeconds?: number
  startedAt?: string
}

/** GET private/evaluations/{id}/submissions */
export interface EvaluationSubmissionSummary {
  submissionId: number
  evaluationId: number
  userId?: number
  studentFirstName?: string
  studentLastName?: string
  studentEmail?: string
  matricule?: string
  submittedAt?: string
  startedAt?: string
  /** Durée en secondes (si le backend l’expose). */
  timeSpentSeconds?: number
  scoreQcm?: number
  totalScore?: number
}

/** GET private/.../submissions/{id} (enseignant) */
export interface EvaluationSubmissionAnswerDetail {
  answerId?: number
  questionId: number
  questionTitle?: string
  questionPoint?: number
  kind?: string
  selectedOptionId?: number
  selectedOptionText?: string
  textResponse?: string
  score?: number
  feedback?: string
  gradedAt?: string
  optionCorrect?: boolean
  /** Variante renvoyée par certains builds backend. */
  isOptionCorrect?: boolean | null
  /** Variante renvoyée par certains builds backend. */
  isOptionCorrect?: boolean | null
  /** Cas pratique — consigne (Swagger passage / soumission). */
  promptTitle?: string
  promptFileContent?: string
  fileContent?: string
}

export interface EvaluationSubmissionDetail {
  submissionId: number
  evaluationId: number
  evaluationTitle?: string
  userId?: number
  studentFirstName?: string
  studentLastName?: string
  studentEmail?: string
  matricule?: string
  submittedAt?: string
  startedAt?: string
  timeSpentSeconds?: number
  scoreQcm?: number
  totalScore?: number
  answers?: EvaluationSubmissionAnswerDetail[]
}

/** POST private/.../submissions/{id}/notes */
export interface GradeItemRequest {
  questionId: number
  score: number
  feedback?: string
}

export interface GradeSubmissionRequest {
  grades: GradeItemRequest[]
}

export interface TeacherRecord {
  teacherId: number
  typeTeacherId?: number
  departement?: string
  justificatif?: string
  gender?: string
  /** Présent selon le backend (non documenté OpenAPI). */
  userId?: number
  email?: string
  username?: string
}

export interface StudentRecord {
  studentId: number
  matricule?: string
  gender?: string
  userId?: number
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  promotionId?: number
  etablissementId?: number
  promotion?: Promotion
  etablissement?: Etablissement
}

/** Alias OpenAPI StudentDetailDto (liste enrichie). */
export type StudentDetailDto = StudentRecord


export interface StudentRequest {
  userId: number
  promotionId: number
  etablissementId?: number
  matricule?: string
  gender?: string
}

export interface Promotion {
  id: number
  name?: string
  active?: boolean
  /** Alias runtime backend (souvent `isActive` au lieu de `active`). */
  isActive?: boolean
}

export interface Etablissement {
  id: number
  name?: string
  active?: boolean
  isActive?: boolean
}

/** OpenAPI matiere-controller */
export interface Matiere {
  id: number
  name?: string
  code?: string
  active?: boolean
  isActive?: boolean
}

export interface MatiereRequest {
  name: string
  code?: string
}

/** OpenAPI Devise (GET public/payment/devises) */
export interface Devise {
  id: number
  name?: string
  code?: string
  tauxLocal?: number
  active?: boolean
  isActive?: boolean
}

export interface TeacherType {
  id: number
  name?: string
  active?: boolean
}

export interface EtablissementRequest {
  etablisementId?: number
}

export interface TeacherRequest {
  typeTeacherId?: number
  departement?: string
  justificatif?: string
  gender?: string
  etablissement?: EtablissementRequest[]
}

export interface ValidationAccountTeacher {
  teacherId: number
  state: boolean
}

/** OpenAPI document-controller */
export interface DocumentRequest {
  userId?: number
  title?: string
  description?: string
  typeDocument?: number
  backGroundImage?: string
  fileBook?: string
  price?: number
  deviseId?: number
}

export interface DocumentEntity {
  id: number
  userId?: number
  title?: string
  description?: string
  typeDocument?: number
  backGroundImage?: string
  fileBook?: string
  price?: number
  deviseId?: number
  datePublication?: string
  active?: boolean
  premium?: boolean
}

export interface TypeDocumentEntity {
  id: number
  titre?: string
  active?: boolean
}

/** classroom-controller */
export interface Classroom {
  id: number
  name?: string
  description?: string
  ownerId?: number
  createdAt?: string
  active?: boolean
}

export interface ClassroomRequest {
  name: string
  description?: string
}

export interface ClassroomUser {
  id: number
  classroomId?: number
  userId?: number
  createdAt?: string
  active?: boolean
}

export interface ClassroomUserRequest {
  classroomId: number
  userId: number
}

/** categorie-controller */
export interface CategorieEntity {
  id: number
  name?: string
  active?: boolean
}

export interface CategorieRequest {
  name: string
}

/** categorie-contenu-controller */
export interface CategorieContenuEntity {
  id: number
  categorieId?: number
  contenuId?: number
  active?: boolean
}

export interface CategorieContenuRequest {
  categorieId: number
  contenuId: number
}

/** document-categorie-controller */
export interface DocumentCategoryEntity {
  id: number
  documentId?: number
  categoryId?: number
}

export interface DocumentCategoryRequest {
  documentId?: number
  categoryId?: number
}

export interface ContenuEntity {
  id: number
  userId?: number
  typeContenuId?: number
  title: string
  description?: string
  fileContent?: string
  createdAt?: string
  active?: boolean
}

export interface StatusPost {
  id: number
  userId?: number
  backgroundColor?: string
  note: string
  dateCreated?: string
  active?: boolean
}

export interface CommentaireContenuEntity {
  id: number
  contenuId: number
  userId: number
  description: string
  createdAt?: string
  active?: boolean
}

export interface LikeContenusEntity {
  id: number
  contenuId: number
  like?: boolean
  userId: number
  createdAt?: string
  active?: boolean
}

export interface QuizNotionType {
  id: number
  code?: string
  label?: string
  description?: string
  createdAt?: string
  active?: boolean
}

export interface Quiz {
  id: number
  title: string
  description?: string
  userId?: number
  notionTypeId?: number
  createdAt?: string
  active?: boolean
}

export interface QuizOptionNode {
  id: number
  option: string
  valid?: boolean
}

export interface QuizQuestionNode {
  id: number
  title: string
  point?: number
  options?: QuizOptionNode[]
}

export interface QuizLevelNode {
  id: number
  title: string
  levelOrder?: number
  questions?: QuizQuestionNode[]
}

export interface QuizDetail extends Quiz {
  levels?: QuizLevelNode[]
}

/** POST /v1/private/quiz - création */
export interface QuizOptionRequest {
  option: string
  /** Swagger : true = bonne réponse. Ne pas envoyer isGoal. */
  goal?: boolean
}

export interface QuizQuestionRequest {
  title: string
  point?: number
  options: QuizOptionRequest[]
}

export interface QuizLevelRequest {
  title: string
  levelOrder?: number
  questions: QuizQuestionRequest[]
}

export interface QuizRequest {
  title: string
  description?: string
  /** Requis côté backend (types Droit, Info, …). */
  notionTypeId: number
  levels: QuizLevelRequest[]
}
