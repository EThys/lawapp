import type { Evaluation } from '@/types'
import type { useCourseStore } from '@/stores/courses'

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
