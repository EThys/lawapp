import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  PresenceAttempt,
  PresenceCheckIn,
  PresenceDisplayPayload,
  PresenceSession,
} from '@/types/presenceSession'
import {
  PRESENCE_DEFAULT_MAX_DURATION_SECONDS,
  PRESENCE_MAX_DURATION_SECONDS,
  PRESENCE_MIN_DURATION_SECONDS,
  PRESENCE_SLOT_ROTATION_SECONDS,
} from '@/types/presenceSession'
import { generateId } from '@/utils/helpers'
import {
  buildPresenceToken,
  newSessionSecret,
  numericCodeForSlot,
  parsePresenceToken,
} from '@/utils/presenceToken'
import { useCourseStore } from '@/stores/courses'
import { useNotificationStore } from '@/stores/notifications'
import { getTodayDateString } from '@/utils/access'
import { resolvePresenceCheckInSnapshot } from '@/utils/presenceCheckInProfile'

const STORAGE_KEY = 'lawapp_presence_sessions'

function loadSessions(): {
  sessions: PresenceSession[]
  checkIns: PresenceCheckIn[]
  attempts: PresenceAttempt[]
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { sessions: [], checkIns: [], attempts: [] }
    return JSON.parse(raw) as {
      sessions: PresenceSession[]
      checkIns: PresenceCheckIn[]
      attempts: PresenceAttempt[]
    }
  } catch {
    return { sessions: [], checkIns: [], attempts: [] }
  }
}

function saveAll(data: {
  sessions: PresenceSession[]
  checkIns: PresenceCheckIn[]
  attempts: PresenceAttempt[]
}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function clampDuration(seconds: number): number {
  return Math.min(
    PRESENCE_MAX_DURATION_SECONDS,
    Math.max(PRESENCE_MIN_DURATION_SECONDS, Math.round(seconds)),
  )
}

export const usePresenceSessionStore = defineStore('presenceSessions', () => {
  const loaded = loadSessions()
  const sessions = ref<PresenceSession[]>(loaded.sessions)
  const checkIns = ref<PresenceCheckIn[]>(loaded.checkIns)
  const attempts = ref<PresenceAttempt[]>(loaded.attempts)

  function persist() {
    saveAll({
      sessions: sessions.value,
      checkIns: checkIns.value,
      attempts: attempts.value,
    })
  }

  function reloadFromStorage() {
    const data = loadSessions()
    sessions.value = data.sessions
    checkIns.value = data.checkIns
    attempts.value = data.attempts
  }

  function getSession(sessionId: string): PresenceSession | undefined {
    refreshSessionStatus(sessionId)
    return sessions.value.find((s) => s.id === sessionId)
  }

  function refreshSessionStatus(sessionId?: string) {
    const now = Date.now()
    let changed = false
    for (const s of sessions.value) {
      if (s.status !== 'open') continue
      if (sessionId && s.id !== sessionId) continue
      if (new Date(s.closesAt).getTime() <= now) {
        s.status = 'closed'
        s.closedAt = new Date(now).toISOString()
        changed = true
      }
    }
    if (changed) persist()
  }

  function getOpenSessionForClassroom(classroomId: string): PresenceSession | undefined {
    refreshSessionStatus()
    return sessions.value.find((s) => s.classroomId === classroomId && s.status === 'open')
  }

  function getSlotIndex(session: PresenceSession, nowMs = Date.now()): number {
    const opened = new Date(session.openedAt).getTime()
    const elapsed = Math.max(0, nowMs - opened)
    return Math.floor(elapsed / (session.slotRotationSeconds * 1000))
  }

  function getSlotExpiresAtMs(session: PresenceSession, slotIndex: number): number {
    const opened = new Date(session.openedAt).getTime()
    return opened + (slotIndex + 1) * session.slotRotationSeconds * 1000
  }

  function getDisplayPayload(sessionId: string): PresenceDisplayPayload | null {
    const session = getSession(sessionId)
    if (!session) return null
    const now = Date.now()
    if (session.status === 'closed') {
      return {
        sessionId: session.id,
        slotIndex: 0,
        slotRemainingSeconds: 0,
        sessionRemainingSeconds: 0,
        numericCode: '------',
        qrToken: '',
        status: 'closed',
      }
    }
    const sessionEnd = new Date(session.closesAt).getTime()
    const sessionRemainingSeconds = Math.max(0, Math.ceil((sessionEnd - now) / 1000))
    const slotIndex = getSlotIndex(session, now)
    const slotExpires = getSlotExpiresAtMs(session, slotIndex)
    const slotRemainingSeconds = Math.max(0, Math.ceil((slotExpires - now) / 1000))
    const qrToken = buildPresenceToken(
      session.id,
      slotIndex,
      slotExpires,
      session.sessionSecret,
    )
    return {
      sessionId: session.id,
      slotIndex,
      slotRemainingSeconds,
      sessionRemainingSeconds,
      numericCode: numericCodeForSlot(session.sessionSecret, slotIndex),
      qrToken,
      status: session.status,
    }
  }

  function canDisplaySession(sessionId: string, userId: string): boolean {
    const session = getSession(sessionId)
    if (!session || session.status !== 'open') return false
    if (session.teacherId === userId) return true
    const grant = session.relayGrants.find((g) => g.userId === userId)
    return !!grant && !grant.revokedAt
  }

  function startSession(input: {
    classroomId: string
    classroomName: string
    teacherId: string
    maxDurationSeconds?: number
    enrolledUserIds: string[]
    slotRotationSeconds?: number
  }): PresenceSession {
    refreshSessionStatus()
    const existing = getOpenSessionForClassroom(input.classroomId)
    if (existing) {
      closeSession(existing.id, input.teacherId)
    }
    const maxDurationSeconds = clampDuration(
      input.maxDurationSeconds ?? PRESENCE_DEFAULT_MAX_DURATION_SECONDS,
    )
    const now = new Date()
    const session: PresenceSession = {
      id: generateId(),
      classroomId: input.classroomId,
      classroomName: input.classroomName,
      teacherId: input.teacherId,
      status: 'open',
      maxDurationSeconds,
      slotRotationSeconds: input.slotRotationSeconds ?? PRESENCE_SLOT_ROTATION_SECONDS,
      openedAt: now.toISOString(),
      closesAt: new Date(now.getTime() + maxDurationSeconds * 1000).toISOString(),
      closedAt: null,
      enrolledUserIds: [...input.enrolledUserIds],
      relayGrants: [],
      sessionSecret: newSessionSecret(),
    }
    sessions.value.unshift(session)
    persist()
    return session
  }

  function closeSession(sessionId: string, actorUserId: string): boolean {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (!session || session.status === 'closed') return false
    if (session.teacherId !== actorUserId) return false
    session.status = 'closed'
    session.closedAt = new Date().toISOString()
    persist()
    return true
  }

  function grantRelay(
    sessionId: string,
    teacherId: string,
    studentUserId: string,
    displayName?: string,
  ): { ok: true } | { ok: false; error: string } {
    const session = getSession(sessionId)
    if (!session || session.teacherId !== teacherId) {
      return { ok: false, error: 'Session introuvable.' }
    }
    if (session.status !== 'open') {
      return { ok: false, error: 'Session terminée.' }
    }
    if (!session.enrolledUserIds.includes(studentUserId)) {
      return { ok: false, error: 'Étudiant non inscrit à cette salle.' }
    }
    const existing = session.relayGrants.find((g) => g.userId === studentUserId && !g.revokedAt)
    if (existing) return { ok: true }

    session.relayGrants.push({
      userId: studentUserId,
      displayName,
      grantedAt: new Date().toISOString(),
      revokedAt: null,
    })
    persist()

    useNotificationStore().push({
      userId: studentUserId,
      title: 'Relais présence',
      body: `Affichez le QR de présence pour ${session.classroomName}.`,
      link: `/presence/relay/${sessionId}`,
      type: 'presence',
    })
    return { ok: true }
  }

  function revokeRelay(sessionId: string, teacherId: string, studentUserId: string): boolean {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (!session || session.teacherId !== teacherId) return false
    const grant = session.relayGrants.find((g) => g.userId === studentUserId && !g.revokedAt)
    if (!grant) return false
    grant.revokedAt = new Date().toISOString()
    persist()
    return true
  }

  function revokeAllRelays(sessionId: string, teacherId: string) {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (!session || session.teacherId !== teacherId) return
    const now = new Date().toISOString()
    for (const g of session.relayGrants) {
      if (!g.revokedAt) g.revokedAt = now
    }
    persist()
  }

  function logAttempt(data: Omit<PresenceAttempt, 'id' | 'attemptedAt'>) {
    const dup = attempts.value.find(
      (a) =>
        a.sessionId === data.sessionId &&
        a.studentUserId === data.studentUserId &&
        a.reasonCode === 'SESSION_CLOSED' &&
        data.reasonCode === 'SESSION_CLOSED',
    )
    if (dup && data.reasonCode === 'SESSION_CLOSED') return dup.id
    const row: PresenceAttempt = {
      ...data,
      id: generateId(),
      attemptedAt: new Date().toISOString(),
    }
    attempts.value.unshift(row)
    persist()
    return row.id
  }

  function syncCourseAttendance(classroomId: string, studentUserId: string, sessionId: string) {
    const courseStore = useCourseStore()
    const day = getTodayDateString()
    const course = courseStore.getById(classroomId)
    if (!course) return
    const already = courseStore.isPresent(classroomId, studentUserId, day)
    if (already) return
    courseStore.markPresenceFromQrSession(classroomId, studentUserId, sessionId)
  }

  function checkInWithToken(
    token: string,
    studentUserId: string,
    relayUserId?: string,
  ):
    | { ok: true; already: boolean; sessionId: string; classroomName: string }
    | { ok: false; code: PresenceAttempt['reasonCode']; message: string } {
    const parsed = parsePresenceToken(token)
    if (!parsed) {
      return { ok: false, code: 'INVALID_TOKEN', message: 'QR non reconnu.' }
    }
    const session = getSession(parsed.sessionId)
    if (!session || parsed.sessionSecret !== session.sessionSecret) {
      return { ok: false, code: 'INVALID_TOKEN', message: 'QR non reconnu.' }
    }

    if (session.status === 'closed') {
      logAttempt({
        sessionId: session.id,
        classroomId: session.classroomId,
        studentUserId,
        reasonCode: 'SESSION_CLOSED',
      })
      return {
        ok: false,
        code: 'SESSION_CLOSED',
        message: 'La présence est terminée.',
      }
    }

    const now = Date.now()
    if (now > parsed.slotExpiresAtMs) {
      logAttempt({
        sessionId: session.id,
        classroomId: session.classroomId,
        studentUserId,
        reasonCode: 'SLOT_EXPIRED',
      })
      return {
        ok: false,
        code: 'SLOT_EXPIRED',
        message: 'Ce QR a expiré. Scannez le code affiché maintenant.',
      }
    }

    const currentSlot = getSlotIndex(session, now)
    if (parsed.slotIndex !== currentSlot) {
      logAttempt({
        sessionId: session.id,
        classroomId: session.classroomId,
        studentUserId,
        reasonCode: 'SLOT_EXPIRED',
      })
      return {
        ok: false,
        code: 'SLOT_EXPIRED',
        message: 'Ce QR a été remplacé. Utilisez le QR actuel.',
      }
    }

    if (!session.enrolledUserIds.includes(studentUserId)) {
      logAttempt({
        sessionId: session.id,
        classroomId: session.classroomId,
        studentUserId,
        reasonCode: 'NOT_ENROLLED',
      })
      return { ok: false, code: 'NOT_ENROLLED', message: 'Vous n’êtes pas inscrit à cette salle.' }
    }

    const existing = checkIns.value.find(
      (c) => c.sessionId === session.id && c.studentUserId === studentUserId,
    )
    if (existing) {
      return {
        ok: true,
        already: true,
        sessionId: session.id,
        classroomName: session.classroomName,
      }
    }

    checkIns.value.unshift({
      id: generateId(),
      sessionId: session.id,
      classroomId: session.classroomId,
      studentUserId,
      checkedInAt: new Date().toISOString(),
      slotIndex: parsed.slotIndex,
      relayUserId,
      snapshot: resolvePresenceCheckInSnapshot(studentUserId),
    })
    persist()
    syncCourseAttendance(session.classroomId, studentUserId, session.id)

    return {
      ok: true,
      already: false,
      sessionId: session.id,
      classroomName: session.classroomName,
    }
  }

  function checkInWithNumericCode(
    sessionId: string,
    code: string,
    studentUserId: string,
  ): ReturnType<typeof checkInWithToken> {
    const session = getSession(sessionId)
    if (!session) {
      return { ok: false, code: 'INVALID_TOKEN', message: 'Session introuvable.' }
    }
    if (session.status === 'closed') {
      logAttempt({
        sessionId: session.id,
        classroomId: session.classroomId,
        studentUserId,
        reasonCode: 'SESSION_CLOSED',
      })
      return { ok: false, code: 'SESSION_CLOSED', message: 'La présence est terminée.' }
    }
    const display = getDisplayPayload(sessionId)
    if (!display || display.numericCode !== code.replace(/\s/g, '')) {
      logAttempt({
        sessionId: session.id,
        classroomId: session.classroomId,
        studentUserId,
        reasonCode: 'SLOT_EXPIRED',
      })
      return {
        ok: false,
        code: 'SLOT_EXPIRED',
        message: 'Code incorrect ou expiré.',
      }
    }
    return checkInWithToken(display.qrToken, studentUserId)
  }

  function submitLateExplanation(
    sessionId: string,
    studentUserId: string,
    explanation: string,
  ): { ok: true } | { ok: false; error: string } {
    const text = explanation.trim()
    if (text.length < 10) {
      return { ok: false, error: 'Merci de préciser en au moins 10 caractères.' }
    }
    const session = getSession(sessionId)
    if (!session) return { ok: false, error: 'Session introuvable.' }
    const existing = attempts.value.find(
      (a) =>
        a.sessionId === sessionId &&
        a.studentUserId === studentUserId &&
        a.reasonCode === 'SESSION_CLOSED' &&
        a.explanation,
    )
    if (existing) return { ok: false, error: 'Explication déjà envoyée.' }
    logAttempt({
      sessionId,
      classroomId: session.classroomId,
      studentUserId,
      reasonCode: 'SESSION_CLOSED',
      explanation: text,
    })
    return { ok: true }
  }

  function hasCheckIn(sessionId: string, studentUserId: string): boolean {
    return checkIns.value.some(
      (c) => c.sessionId === sessionId && c.studentUserId === studentUserId,
    )
  }

  function isPresentForClassroomToday(classroomId: string, studentUserId: string): boolean {
    const day = getTodayDateString()
    const sessionIds = sessions.value
      .filter((s) => s.classroomId === classroomId)
      .map((s) => s.id)
    return checkIns.value.some(
      (c) =>
        sessionIds.includes(c.sessionId) &&
        c.studentUserId === studentUserId &&
        c.checkedInAt.startsWith(day),
    )
  }

  function getCheckInsForSession(sessionId: string): PresenceCheckIn[] {
    return checkIns.value.filter((c) => c.sessionId === sessionId)
  }

  function getAttemptsForSession(sessionId: string) {
    return attempts.value.filter((a) => a.sessionId === sessionId)
  }

  function getOpenSessionsForStudent(studentUserId: string): PresenceSession[] {
    refreshSessionStatus()
    return sessions.value.filter(
      (s) => s.status === 'open' && s.enrolledUserIds.includes(studentUserId),
    )
  }

  function getActiveRelaySessionForStudent(studentUserId: string): PresenceSession | undefined {
    refreshSessionStatus()
    return sessions.value.find(
      (s) =>
        s.status === 'open' &&
        s.relayGrants.some((g) => g.userId === studentUserId && !g.revokedAt),
    )
  }

  return {
    sessions,
    checkIns,
    attempts,
    getSession,
    getDisplayPayload,
    canDisplaySession,
    getOpenSessionForClassroom,
    startSession,
    closeSession,
    grantRelay,
    revokeRelay,
    revokeAllRelays,
    checkInWithToken,
    checkInWithNumericCode,
    submitLateExplanation,
    hasCheckIn,
    isPresentForClassroomToday,
    getCheckInsForSession,
    getAttemptsForSession,
    getOpenSessionsForStudent,
    getActiveRelaySessionForStudent,
    reloadFromStorage,
  }
})
