import type { Evaluation } from '@/types'
import type { User } from '@/types/auth'
import type { useCourseStore } from '@/stores/courses'
import { getEvaluationAvailabilityMessage, isEvaluationAvailable } from '@/utils/helpers'
import {
  getStudentParcoursJoinBlockReason,
  isAccessCodeExpired,
} from '@/utils/evaluationAudience'
import { usePresenceSessionStore } from '@/stores/presenceSessions'

export function getTodayDateString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getGroupShareUrl(code: string): string {
  return `${window.location.origin}/join/group/${code}`
}

/** @deprecated alias */
export function getNetworkShareUrl(code: string): string {
  return getGroupShareUrl(code)
}

export function getCourseShareUrl(code: string): string {
  return getGroupShareUrl(code)
}

type CourseStore = ReturnType<typeof useCourseStore>

export function getEvaluationAccessDeniedReason(
  evaluation: Evaluation,
  studentUserId: string,
  courseStore: CourseStore
): string | null {
  if (evaluation.requireEnrollment && evaluation.courseId) {
    if (!courseStore.isEnrolled(evaluation.courseId, studentUserId)) {
      return 'Vous n\'êtes pas inscrit dans cette salle. Rejoignez-la d\'abord avec le lien classe de l\'enseignant.'
    }
  }

  if (evaluation.presentOnly && evaluation.courseId) {
    const sessionDate = evaluation.sessionDate ?? getTodayDateString()
    const presenceStore = usePresenceSessionStore()
    const presentQr =
      sessionDate === getTodayDateString() &&
      presenceStore.isPresentForClassroomToday(evaluation.courseId, studentUserId)
    if (!presentQr && !courseStore.isPresent(evaluation.courseId, studentUserId, sessionDate)) {
      return 'Cette évaluation est réservée aux présents en salle. Pointez la présence QR pendant la session du cours.'
    }
  }

  return null
}

export function getEvaluationJoinBlockReason(
  evaluation: Evaluation,
  studentUserId?: string,
  courseStore?: CourseStore,
  user?: User | null,
): string | null {
  if (evaluation.status === 'draft') return 'Cette évaluation n\'est pas encore publiée.'
  if (evaluation.status === 'closed') return 'Cette évaluation est terminée.'
  if (isAccessCodeExpired(evaluation)) {
    return 'Le code d’accès a expiré (délai de l’évaluation dépassé).'
  }

  if (user && studentUserId) {
    const parcoursBlock = getStudentParcoursJoinBlockReason(evaluation, user, studentUserId)
    if (parcoursBlock) return parcoursBlock
  }

  const scheduleMsg = getEvaluationAvailabilityMessage({
    availableFrom: evaluation.availableFrom ?? null,
    availableUntil: evaluation.availableUntil ?? null,
    title: evaluation.title,
  })
  if (scheduleMsg) return scheduleMsg

  if (!isEvaluationAvailable(evaluation)) {
    return 'Cette évaluation n\'est pas accessible pour le moment.'
  }

  if (studentUserId && courseStore) {
    const accessDenied = getEvaluationAccessDeniedReason(evaluation, studentUserId, courseStore)
    if (accessDenied) return accessDenied
  }

  return null
}

export function evaluationAvailabilityLabel(evaluation: Evaluation): 'open' | 'upcoming' | 'closed' {
  if (evaluation.status === 'closed') return 'closed'
  if (!isEvaluationAvailable(evaluation)) {
    const msg = getEvaluationAvailabilityMessage({
      availableFrom: evaluation.availableFrom ?? null,
      availableUntil: evaluation.availableUntil ?? null,
      title: evaluation.title,
    })
    if (msg?.includes('sera disponible')) return 'upcoming'
    return 'closed'
  }
  return 'open'
}
