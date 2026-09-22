import type { Evaluation } from '@/types'
import type { useCourseStore } from '@/stores/courses'
import { getEvaluationAvailabilityMessage, isEvaluationAvailable } from '@/utils/helpers'

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
    if (!courseStore.isPresent(evaluation.courseId, studentUserId, sessionDate)) {
      return 'Cette évaluation est réservée aux présents en salle. Votre matricule n\'a pas pointé sa présence sur le réseau local du cours.'
    }
  }

  return null
}

export function getEvaluationJoinBlockReason(
  evaluation: Evaluation,
  studentUserId?: string,
  courseStore?: CourseStore,
): string | null {
  if (evaluation.status === 'draft') return 'Cette évaluation n\'est pas encore publiée.'
  if (evaluation.status === 'closed') return 'Cette évaluation est terminée.'

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
  const now = new Date()
  if (evaluation.status === 'closed') return 'closed'
  if (evaluation.availableUntil && new Date(evaluation.availableUntil) < now) return 'closed'
  if (evaluation.availableFrom && new Date(evaluation.availableFrom) > now) return 'upcoming'
  if (!isEvaluationAvailable(evaluation)) return 'closed'
  return 'open'
}
