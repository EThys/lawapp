import type { User } from '@/types/auth'
import type { Course, AttendanceRecord, PresenceTunnel } from '@/types/course'
import type { Evaluation, ExamSession, Question, Violation } from '@/types'
import type { AppNotification } from '@/types/notification'
import { DEFAULT_ANTI_CHEAT, DEFAULT_SETTINGS } from '@/types'
import { hashPassword } from '@/utils/auth'
import { PARTNER_INSTITUTION } from '@/data/universities'
import { getTodayDateString } from '@/utils/access'

const SEED_VERSION = 'demo-v4'
const SEED_FLAG_KEY = 'lawapp_demo_seed_version'
const DEMO_PASSWORD = 'Demo1234'

export const DEMO_LOGINS = {
  teacher: { email: 'prof.demo@ucc.cd', password: DEMO_PASSWORD },
  students: {
    muzola: { email: 'muzola.matondo@ucc.cd', password: DEMO_PASSWORD },
    elie: { email: 'elie.oko@ucc.cd', password: DEMO_PASSWORD },
    emy: { email: 'emy.mayumbi@ucc.cd', password: DEMO_PASSWORD },
  },
} as const

const IDS = {
  teacher: 'demo-teacher-ucc-001',
  studentMuzola: 'demo-student-muzola-001',
  studentElie: 'demo-student-elie-001',
  studentEmy: 'demo-student-emy-001',
  course: 'demo-course-l2-droit-001',
  tunnel: 'demo-tunnel-presence-001',
  evalContrats: 'demo-eval-contrats-001',
  evalRc: 'demo-eval-rc-001',
  evalPersonnes: 'demo-eval-personnes-001',
  sessionMuzolaContrats: 'demo-session-muzola-contrats',
  sessionElieContrats: 'demo-session-elie-contrats',
  sessionEmyContrats: 'demo-session-emy-contrats',
  sessionMuzolaRc: 'demo-session-muzola-rc',
  sessionElieRc: 'demo-session-elie-rc',
  sessionEmyRc: 'demo-session-emy-rc',
  sessionEmyPersonnesPending: 'demo-session-emy-personnes-pending',
} as const

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJson<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx === -1) return [item, ...list]
  const next = [...list]
  next[idx] = item
  return next
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function isoDaysAgo(n: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function farFutureIso(ms = 365 * 24 * 60 * 60 * 1000): string {
  return new Date(Date.now() + ms).toISOString()
}

function isDemoSeeded(): boolean {
  const v = localStorage.getItem(SEED_FLAG_KEY)
  return !!v && v.startsWith('demo-')
}

const sampleQuestions: Question[] = [
  {
    id: 'demo-q1',
    type: 'qcm',
    text: 'Quel principe fondamental régit la formation du contrat en droit congolais ?',
    points: 5,
    options: [
      { id: 'demo-q1-a', text: 'Le consentement', isCorrect: true },
      { id: 'demo-q1-b', text: 'La force majeure', isCorrect: false },
      { id: 'demo-q1-c', text: 'La prescription', isCorrect: false },
    ],
  },
  {
    id: 'demo-q2',
    type: 'truefalse',
    text: 'Un contrat verbal peut être valablement formé entre parties.',
    points: 5,
    correctAnswer: true,
  },
  {
    id: 'demo-q3',
    type: 'short',
    text: 'Citez un élément essentiel de la responsabilité civile délictuelle.',
    points: 5,
    correctAnswer: 'faute',
  },
  {
    id: 'demo-q4',
    type: 'qcm',
    text: 'La responsabilité civile contractuelle suppose :',
    points: 5,
    options: [
      { id: 'demo-q4-a', text: 'Un lien contractuel préexistant', isCorrect: true },
      { id: 'demo-q4-b', text: 'Un délit pénal', isCorrect: false },
      { id: 'demo-q4-c', text: 'Une décision administrative', isCorrect: false },
    ],
  },
]

const personnesQuestions: Question[] = [
  {
    id: 'demo-p1',
    type: 'qcm',
    text: 'La personnalité juridique est attribuée :',
    points: 5,
    options: [
      { id: 'demo-p1-a', text: 'À toute personne physique dès la naissance', isCorrect: true },
      { id: 'demo-p1-b', text: 'Uniquement aux majeurs', isCorrect: false },
      { id: 'demo-p1-c', text: 'Seulement aux personnes morales', isCorrect: false },
    ],
    explanation: 'La personnalité juridique s\'attache à la personne physique dès la naissance.',
  },
  {
    id: 'demo-p2',
    type: 'truefalse',
    text: 'Les biens immeubles par nature comprennent notamment le sol et les constructions.',
    points: 5,
    correctAnswer: true,
    explanation: 'Le sol et les constructions sont des immeubles par nature.',
  },
  {
    id: 'demo-p3',
    type: 'short',
    text: 'Citez une distinction fondamentale entre personnes physiques et personnes morales.',
    points: 5,
    correctAnswer: 'personnalité',
  },
  {
    id: 'demo-p4',
    type: 'qcm',
    text: 'Le droit de propriété confère au titulaire le droit de :',
    points: 5,
    options: [
      { id: 'demo-p4-a', text: 'User, jouir et disposer du bien', isCorrect: true },
      { id: 'demo-p4-b', text: 'Vendre uniquement avec autorisation judiciaire', isCorrect: false },
      { id: 'demo-p4-c', text: 'Posséder sans jouissance', isCorrect: false },
    ],
  },
]

function violation(type: Violation['type'], message: string, daysBack: number): Violation {
  return { type, message, timestamp: isoDaysAgo(daysBack, 11) }
}

export async function seedDemoData(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const now = new Date().toISOString()

  let users = loadJson<User[]>('lawapp_users', [])

  const demoTeacher: User = {
    id: IDS.teacher,
    email: DEMO_LOGINS.teacher.email,
    passwordHash,
    firstName: 'Prof.',
    lastName: 'Démo UCC',
    role: 'teacher',
    institution: PARTNER_INSTITUTION,
    createdAt: isoDaysAgo(90),
  }

  const demoStudents: User[] = [
    {
      id: IDS.studentMuzola,
      email: DEMO_LOGINS.students.muzola.email,
      passwordHash,
      firstName: 'Muzola',
      lastName: 'Matondo Ethberg',
      role: 'student',
      studentId: 'UCC-L2-2024-014',
      institution: PARTNER_INSTITUTION,
      createdAt: isoDaysAgo(60),
    },
    {
      id: IDS.studentElie,
      email: DEMO_LOGINS.students.elie.email,
      passwordHash,
      firstName: 'Elie',
      lastName: 'oko Sondzo',
      role: 'student',
      studentId: 'UCC-L2-2024-027',
      institution: PARTNER_INSTITUTION,
      createdAt: isoDaysAgo(58),
    },
    {
      id: IDS.studentEmy,
      email: DEMO_LOGINS.students.emy.email,
      passwordHash,
      firstName: 'Emy',
      lastName: 'Mayumbi',
      role: 'student',
      studentId: 'UCC-L2-2024-033',
      institution: PARTNER_INSTITUTION,
      createdAt: isoDaysAgo(55),
    },
  ]

  users = upsertById(users, demoTeacher)
  for (const s of demoStudents) users = upsertById(users, s)

  const teacher = demoTeacher
  const teacherName = `${teacher.firstName} ${teacher.lastName}`

  const course: Course = {
    id: IDS.course,
    teacherId: teacher.id,
    teacherName,
    name: 'L2 Droit civil — Groupe A',
    subject: 'Droit civil',
    enrollmentCode: 'CLASSE',
    enrollmentPublishedAt: isoDaysAgo(30),
    enrollmentSharedAt: isoDaysAgo(28),
    studentUserIds: demoStudents.map((s) => s.id),
    createdAt: isoDaysAgo(45),
    updatedAt: now,
  }

  let courses = loadJson<Course[]>('lawapp_courses', [])
  courses = upsertById(courses, course)

  const attendanceDays: { date: string; present: string[] }[] = [
    { date: daysAgo(2), present: [IDS.studentMuzola, IDS.studentElie] },
    { date: daysAgo(5), present: [IDS.studentMuzola, IDS.studentEmy] },
    { date: daysAgo(9), present: [IDS.studentMuzola, IDS.studentElie, IDS.studentEmy] },
    { date: daysAgo(16), present: [IDS.studentElie, IDS.studentEmy] },
  ]

  let attendance = loadJson<AttendanceRecord[]>('lawapp_attendance', [])
  for (const day of attendanceDays) {
    for (const studentUserId of day.present) {
      const record: AttendanceRecord = {
        id: `demo-att-${day.date}-${studentUserId}`,
        courseId: IDS.course,
        studentUserId,
        tunnelId: IDS.tunnel,
        date: day.date,
        markedAt: `${day.date}T09:15:00.000Z`,
      }
      attendance = upsertById(attendance, record)
    }
  }

  const today = getTodayDateString()
  for (const studentUserId of [IDS.studentMuzola, IDS.studentElie]) {
    attendance = upsertById(attendance, {
      id: `demo-att-${today}-${studentUserId}`,
      courseId: IDS.course,
      studentUserId,
      tunnelId: IDS.tunnel,
      date: today,
      markedAt: new Date().toISOString(),
    })
  }

  const evalContrats: Evaluation = {
    id: IDS.evalContrats,
    code: 'DEMO01',
    title: 'Interro — Droit des contrats',
    description: 'Évaluation de démonstration — séance du 2 juin',
    type: 'interro',
    status: 'active',
    durationMinutes: 45,
    questions: sampleQuestions.slice(0, 3),
    antiCheat: { ...DEFAULT_ANTI_CHEAT },
    settings: { ...DEFAULT_SETTINGS, instantFeedback: true, correctionMode: 'auto' },
    createdAt: isoDaysAgo(20),
    updatedAt: isoDaysAgo(3),
    teacherId: teacher.id,
    teacherName,
    subject: 'Droit civil',
    availableFrom: isoDaysAgo(15),
    availableUntil: null,
    correctionPdfName: null,
    correctionPdfData: null,
    correctionPublished: false,
    correctionPublishedAt: null,
    courseId: IDS.course,
    requireEnrollment: true,
    presentOnly: false,
    sessionDate: null,
    sharedToClassAt: isoDaysAgo(10),
  }

  const evalRc: Evaluation = {
    id: IDS.evalRc,
    code: 'DEMO02',
    title: 'TP — Responsabilité civile',
    description: 'Travaux pratiques de démonstration',
    type: 'tp',
    status: 'closed',
    durationMinutes: 60,
    questions: sampleQuestions,
    antiCheat: { ...DEFAULT_ANTI_CHEAT },
    settings: { ...DEFAULT_SETTINGS, instantFeedback: false, correctionMode: 'auto' },
    createdAt: isoDaysAgo(40),
    updatedAt: isoDaysAgo(7),
    teacherId: teacher.id,
    teacherName,
    subject: 'Droit civil',
    availableFrom: isoDaysAgo(35),
    availableUntil: isoDaysAgo(6),
    correctionPdfName: null,
    correctionPdfData: null,
    correctionPublished: false,
    correctionPublishedAt: null,
    courseId: IDS.course,
    requireEnrollment: true,
    presentOnly: false,
    sessionDate: null,
    sharedToClassAt: isoDaysAgo(32),
  }

  const evalPersonnes: Evaluation = {
    id: IDS.evalPersonnes,
    code: 'DEMO03',
    title: 'Quiz — Personnes et biens',
    description: 'Évaluation de démonstration — chapitre en cours',
    type: 'exercice',
    status: 'active',
    durationMinutes: 30,
    questions: personnesQuestions,
    antiCheat: { ...DEFAULT_ANTI_CHEAT, maxViolations: 3 },
    settings: {
      ...DEFAULT_SETTINGS,
      instantFeedback: true,
      correctionMode: 'auto',
      showCorrectAnswers: true,
      showResultsImmediately: true,
      allowReview: true,
      instructions:
        'Lisez chaque question avec attention. Les QCM et vrai/faux affichent un retour immédiat. Vous pouvez revoir vos réponses avant de soumettre.',
    },
    createdAt: isoDaysAgo(5),
    updatedAt: isoDaysAgo(1),
    teacherId: teacher.id,
    teacherName,
    subject: 'Droit civil',
    availableFrom: isoDaysAgo(1),
    availableUntil: null,
    correctionPdfName: null,
    correctionPdfData: null,
    correctionPublished: false,
    correctionPublishedAt: null,
    courseId: IDS.course,
    requireEnrollment: true,
    presentOnly: false,
    sessionDate: null,
    sharedToClassAt: isoDaysAgo(0),
  }

  let evaluations = loadJson<Evaluation[]>('lawapp_evaluations', [])
  evaluations = upsertById(evaluations, evalContrats)
  evaluations = upsertById(evaluations, evalRc)
  evaluations = upsertById(evaluations, evalPersonnes)

  const sessions: ExamSession[] = [
    {
      id: IDS.sessionMuzolaContrats,
      evaluationId: IDS.evalContrats,
      evaluationCode: 'DEMO01',
      studentUserId: IDS.studentMuzola,
      studentFirstName: 'Muzola',
      studentLastName: 'Matondo Ethberg',
      studentId: 'UCC-L2-2024-014',
      startedAt: isoDaysAgo(8, 9),
      submittedAt: isoDaysAgo(8, 9),
      expiresAt: isoDaysAgo(8, 10),
      status: 'submitted',
      answers: [
        { questionId: 'demo-q1', value: 'demo-q1-a' },
        { questionId: 'demo-q2', value: true },
        { questionId: 'demo-q3', value: 'Faute, préjudice et lien de causalité' },
      ],
      score: 14,
      maxScore: 15,
      violations: [],
      timeSpentSeconds: 2140,
    },
    {
      id: IDS.sessionElieContrats,
      evaluationId: IDS.evalContrats,
      evaluationCode: 'DEMO01',
      studentUserId: IDS.studentElie,
      studentFirstName: 'Elie',
      studentLastName: 'oko Sondzo',
      studentId: 'UCC-L2-2024-027',
      startedAt: isoDaysAgo(8, 10),
      submittedAt: isoDaysAgo(8, 10),
      expiresAt: isoDaysAgo(8, 11),
      status: 'submitted',
      answers: [
        { questionId: 'demo-q1', value: 'demo-q1-b' },
        { questionId: 'demo-q2', value: true },
        { questionId: 'demo-q3', value: 'La faute' },
      ],
      score: 10,
      maxScore: 15,
      violations: [
        violation('copy_attempt', 'Tentative de copie bloquée.', 8),
      ],
      timeSpentSeconds: 2480,
    },
    {
      id: IDS.sessionEmyContrats,
      evaluationId: IDS.evalContrats,
      evaluationCode: 'DEMO01',
      studentUserId: IDS.studentEmy,
      studentFirstName: 'Emy',
      studentLastName: 'Mayumbi',
      studentId: 'UCC-L2-2024-033',
      startedAt: isoDaysAgo(8, 11),
      submittedAt: undefined,
      expiresAt: isoDaysAgo(8, 12),
      status: 'failed',
      answers: [
        { questionId: 'demo-q1', value: 'demo-q1-c' },
        { questionId: 'demo-q2', value: false },
      ],
      score: undefined,
      maxScore: 15,
      violations: [
        violation('tab_switch', 'Vous avez quitté l\'onglet de l\'évaluation.', 8),
        violation('fullscreen_exit', 'Mode plein écran quitté.', 8),
        violation('paste_attempt', 'Tentative de collage bloquée.', 8),
      ],
      timeSpentSeconds: 620,
    },
    {
      id: IDS.sessionMuzolaRc,
      evaluationId: IDS.evalRc,
      evaluationCode: 'DEMO02',
      studentUserId: IDS.studentMuzola,
      studentFirstName: 'Muzola',
      studentLastName: 'Matondo Ethberg',
      studentId: 'UCC-L2-2024-014',
      startedAt: isoDaysAgo(12, 14),
      submittedAt: undefined,
      expiresAt: isoDaysAgo(12, 15),
      status: 'expired',
      answers: [{ questionId: 'demo-q1', value: 'demo-q1-a' }],
      score: undefined,
      maxScore: 20,
      violations: [],
      timeSpentSeconds: 1800,
    },
    {
      id: IDS.sessionElieRc,
      evaluationId: IDS.evalRc,
      evaluationCode: 'DEMO02',
      studentUserId: IDS.studentElie,
      studentFirstName: 'Elie',
      studentLastName: 'oko Sondzo',
      studentId: 'UCC-L2-2024-027',
      startedAt: isoDaysAgo(12, 14),
      submittedAt: undefined,
      expiresAt: isoDaysAgo(12, 15),
      status: 'expired',
      answers: [],
      score: undefined,
      maxScore: 20,
      violations: [
        violation('window_blur', 'La fenêtre a perdu le focus.', 12),
      ],
      timeSpentSeconds: 300,
    },
    {
      id: IDS.sessionEmyRc,
      evaluationId: IDS.evalRc,
      evaluationCode: 'DEMO02',
      studentUserId: IDS.studentEmy,
      studentFirstName: 'Emy',
      studentLastName: 'Mayumbi',
      studentId: 'UCC-L2-2024-033',
      startedAt: isoDaysAgo(12, 14),
      submittedAt: isoDaysAgo(12, 14),
      expiresAt: isoDaysAgo(12, 15),
      status: 'submitted',
      answers: [
        { questionId: 'demo-q1', value: 'demo-q1-a' },
        { questionId: 'demo-q2', value: true },
        { questionId: 'demo-q3', value: 'Faute et préjudice' },
        { questionId: 'demo-q4', value: 'demo-q4-a' },
      ],
      score: 17,
      maxScore: 20,
      violations: [],
      timeSpentSeconds: 3200,
    },
    {
      id: IDS.sessionEmyPersonnesPending,
      evaluationId: IDS.evalPersonnes,
      evaluationCode: 'DEMO03',
      studentUserId: IDS.studentEmy,
      studentFirstName: 'Emy',
      studentLastName: 'Mayumbi',
      studentId: 'UCC-L2-2024-033',
      startedAt: isoDaysAgo(0, 8),
      expiresAt: isoDaysAgo(0, 8),
      status: 'pending',
      answers: [],
      violations: [],
      timeSpentSeconds: 0,
    },
  ]

  let examSessions = loadJson<ExamSession[]>('lawapp_sessions', [])
  for (const s of sessions) examSessions = upsertById(examSessions, s)

  const demoTunnel: PresenceTunnel = {
    id: IDS.tunnel,
    courseId: IDS.course,
    teacherId: teacher.id,
    shareCode: 'PRSUC1',
    wifiLabel: 'UCC-L2-DROIT',
    networkFingerprint: { publicIp: 'demo-seed', localIpPrefix: '192.168' },
    code: '847291',
    startedAt: new Date().toISOString(),
    expiresAt: farFutureIso(),
    codeExpiresAt: farFutureIso(),
    isActive: true,
    sharedToClassAt: new Date().toISOString(),
  }

  let tunnels = loadJson<PresenceTunnel[]>('lawapp_tunnels', [])
  tunnels = upsertById(tunnels, demoTunnel)

  const demoNotifications: AppNotification[] = [
    {
      id: 'demo-notif-emy-presence',
      userId: IDS.studentEmy,
      title: 'Présence · L2 Droit civil — Groupe A',
      body: 'WiFi « UCC-L2-DROIT ». Code : 847291. Pointez votre présence depuis l\'app.',
      link: '/join/presence/PRSUC1',
      type: 'presence',
      read: false,
      createdAt: isoDaysAgo(0, 8),
    },
    {
      id: 'demo-notif-emy-eval',
      userId: IDS.studentEmy,
      title: 'Évaluation · Quiz — Personnes et biens',
      body: 'Code DEMO03 partagé avec votre salle. Disponible dans votre espace étudiant.',
      link: '/student?code=DEMO03',
      type: 'evaluation',
      read: false,
      createdAt: isoDaysAgo(0, 9),
    },
    {
      id: 'demo-notif-emy-result',
      userId: IDS.studentEmy,
      title: 'Résultat · TP Responsabilité civile',
      body: 'Votre copie a été soumise. Score : 17/20.',
      link: '/student/history?tab=passed',
      type: 'info',
      read: true,
      createdAt: isoDaysAgo(12),
    },
    {
      id: 'demo-notif-muzola-presence',
      userId: IDS.studentMuzola,
      title: 'Présence · L2 Droit civil — Groupe A',
      body: 'WiFi « UCC-L2-DROIT ». Vous êtes marqué présent aujourd\'hui.',
      link: '/student',
      type: 'presence',
      read: false,
      createdAt: isoDaysAgo(0, 8),
    },
    {
      id: 'demo-notif-muzola-eval',
      userId: IDS.studentMuzola,
      title: 'Évaluation · Quiz — Personnes et biens',
      body: 'Nouvelle évaluation partagée. Code : DEMO03.',
      link: '/student?code=DEMO03',
      type: 'evaluation',
      read: false,
      createdAt: isoDaysAgo(0, 9),
    },
    {
      id: 'demo-notif-muzola-correction',
      userId: IDS.studentMuzola,
      title: 'Interro — Droit des contrats',
      body: 'Votre copie a été enregistrée. Score : 14/15.',
      link: '/student/history?tab=passed',
      type: 'info',
      read: true,
      createdAt: isoDaysAgo(8),
    },
    {
      id: 'demo-notif-elie-presence',
      userId: IDS.studentElie,
      title: 'Présence · L2 Droit civil — Groupe A',
      body: 'Session de présence ouverte. WiFi « UCC-L2-DROIT ».',
      link: '/join/presence/PRSUC1',
      type: 'presence',
      read: false,
      createdAt: isoDaysAgo(0, 8),
    },
    {
      id: 'demo-notif-elie-alert',
      userId: IDS.studentElie,
      title: 'Alerte anti-triche · Interro contrats',
      body: 'Tentative de copie détectée lors de votre dernière session.',
      link: '/student/history?tab=alerts',
      type: 'info',
      read: false,
      createdAt: isoDaysAgo(8),
    },
    {
      id: 'demo-notif-elie-eval',
      userId: IDS.studentElie,
      title: 'Évaluation · Quiz — Personnes et biens',
      body: 'Code DEMO03 — à compléter avant la fin de semaine.',
      link: '/student?code=DEMO03',
      type: 'evaluation',
      read: false,
      createdAt: isoDaysAgo(0, 10),
    },
  ]

  let notifications = loadJson<AppNotification[]>('lawapp_notifications', [])
  for (const n of demoNotifications) notifications = upsertById(notifications, n)

  saveJson('lawapp_users', users)
  saveJson('lawapp_courses', courses)
  saveJson('lawapp_attendance', attendance)
  saveJson('lawapp_evaluations', evaluations)
  saveJson('lawapp_sessions', examSessions)
  saveJson('lawapp_tunnels', tunnels)
  saveJson('lawapp_notifications', notifications)
  localStorage.setItem(SEED_FLAG_KEY, SEED_VERSION)
}

/** Garde le tunnel et la présence démo utilisables après expiration normale (20 min). */
export function refreshDemoLiveData(): void {
  if (!isDemoSeeded()) return

  let tunnels = loadJson<PresenceTunnel[]>('lawapp_tunnels', [])
  const idx = tunnels.findIndex((t) => t.id === IDS.tunnel)
  if (idx === -1) return

  const tunnel = tunnels[idx]
  const now = Date.now()
  const expired =
    !tunnel.isActive ||
    new Date(tunnel.expiresAt).getTime() <= now ||
    new Date(tunnel.codeExpiresAt).getTime() <= now

  if (expired || !tunnel.sharedToClassAt) {
    tunnels[idx] = {
      ...tunnel,
      isActive: true,
      code: tunnel.code || '847291',
      shareCode: tunnel.shareCode || 'PRSUC1',
      expiresAt: farFutureIso(),
      codeExpiresAt: farFutureIso(),
      sharedToClassAt: tunnel.sharedToClassAt ?? new Date().toISOString(),
    }
    saveJson('lawapp_tunnels', tunnels)
  }
}
