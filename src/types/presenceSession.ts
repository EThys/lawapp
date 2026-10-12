export type PresenceSessionStatus = 'open' | 'closed'

export type PresenceAttemptReason =
  | 'SLOT_EXPIRED'
  | 'SESSION_CLOSED'
  | 'INVALID_TOKEN'
  | 'NOT_ENROLLED'

export interface PresenceRelayGrant {
  userId: string
  displayName?: string
  grantedAt: string
  revokedAt: string | null
}

export interface PresenceCheckInSnapshot {
  firstName: string
  lastName: string
  genderLabel: string
  university: string
  faculty: string
  promotion: string
}

export interface PresenceCheckIn {
  id: string
  sessionId: string
  classroomId: string
  studentUserId: string
  checkedInAt: string
  slotIndex: number
  relayUserId?: string
  /** Figé au pointage (registre prof). */
  snapshot?: PresenceCheckInSnapshot
}

export interface PresenceAttempt {
  id: string
  sessionId: string
  classroomId: string
  studentUserId: string
  reasonCode: PresenceAttemptReason
  explanation?: string
  attemptedAt: string
}

export interface PresenceSession {
  id: string
  classroomId: string
  classroomName: string
  teacherId: string
  status: PresenceSessionStatus
  maxDurationSeconds: number
  slotRotationSeconds: number
  openedAt: string
  closesAt: string
  closedAt: string | null
  /** Inscrits au moment de l’ouverture (gate check-in). */
  enrolledUserIds: string[]
  relayGrants: PresenceRelayGrant[]
  sessionSecret: string
}

export interface PresenceDisplayPayload {
  sessionId: string
  slotIndex: number
  slotRemainingSeconds: number
  sessionRemainingSeconds: number
  numericCode: string
  qrToken: string
  status: PresenceSessionStatus
}

export const PRESENCE_SLOT_ROTATION_SECONDS = 15
export const PRESENCE_DEFAULT_MAX_DURATION_SECONDS = 300
export const PRESENCE_MIN_DURATION_SECONDS = 120
export const PRESENCE_MAX_DURATION_SECONDS = 900
