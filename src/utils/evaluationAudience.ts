import type { User } from '@/types/auth'
import type { Evaluation, EvaluationAudienceMode } from '@/types'
import { useCourseStore } from '@/stores/courses'

export function computeAccessCodeExpiresAt(
  evaluation: Pick<Evaluation, 'availableUntil' | 'availableFrom' | 'durationMinutes'>,
): string {
  if (evaluation.availableUntil) return evaluation.availableUntil
  const start = evaluation.availableFrom ? new Date(evaluation.availableFrom) : new Date()
  const minutes =
    evaluation.durationMinutes > 0 ? evaluation.durationMinutes : 7 * 24 * 60
  return new Date(start.getTime() + minutes * 60_000).toISOString()
}

export function isAccessCodeExpired(evaluation: Evaluation, at = Date.now()): boolean {
  const raw = evaluation.accessCodeExpiresAt
  if (!raw) return false
  return new Date(raw).getTime() < at
}

export function accessCodeExpiryLabel(evaluation: Evaluation): string | null {
  if (!evaluation.accessCodeExpiresAt) return null
  const d = new Date(evaluation.accessCodeExpiresAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export interface StudentPlacement {
  institutionKey: string | null
  institutionLabel: string | null
  faculty: string | null
  promotion: string | null
  classroomIds: string[]
  verified: boolean
}

export function resolveStudentPlacement(user: User | null | undefined): StudentPlacement {
  const empty: StudentPlacement = {
    institutionKey: null,
    institutionLabel: null,
    faculty: null,
    promotion: null,
    classroomIds: [],
    verified: false,
  }
  if (!user) return empty

  const academic = user.studentAcademicAffiliation
  if (academic) {
    return {
      institutionKey: academic.institutionKey,
      institutionLabel: academic.institutionLabel,
      faculty: academic.faculty,
      promotion: academic.promotion,
      classroomIds: academic.classroomId ? [academic.classroomId] : [],
      verified: academic.status === 'verified',
    }
  }

  const legacy = user.studentInstitutionAffiliation
  if (legacy?.status === 'verified') {
    return {
      institutionKey: legacy.institutionKey,
      institutionLabel: legacy.institutionLabel,
      faculty: null,
      promotion: null,
      classroomIds: [],
      verified: true,
    }
  }

  return empty
}

function norm(s: string | null | undefined): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function promotionMatches(target: string, student: string | null): boolean {
  if (!student) return false
  return norm(target) === norm(student)
}

function facultyMatches(target: string, student: string | null): boolean {
  if (!student) return false
  const a = norm(target)
  const b = norm(student)
  if (a === b) return true
  if (a.includes('informatique') && b.includes('informatique')) return true
  return false
}

export function isEvaluationLibre(evaluation: Evaluation): boolean {
  return (evaluation.audienceMode ?? 'open') === 'open'
}

export function isCohortEvaluation(evaluation: Evaluation): boolean {
  return (
    evaluation.publicationScope === 'cohort' ||
    evaluation.excludeFromOpenCatalog === true
  )
}

/** Visible dans « Catalogue & codes » (sans parcours validé). */
export function isOpenCatalogEvaluation(evaluation: Evaluation): boolean {
  return isEvaluationLibre(evaluation) && !isCohortEvaluation(evaluation)
}

export function isStudentAcademicPending(user: User | null | undefined): boolean {
  if (!user) return false
  if (user.studentAcademicAffiliation?.status === 'pending') return true
  if (
    user.studentInstitutionAffiliation?.status === 'pending' &&
    !user.studentAcademicAffiliation
  ) {
    return true
  }
  return false
}

export function isStudentAcademicVerified(user: User | null | undefined): boolean {
  return resolveStudentPlacement(user).verified
}

export const STUDENT_PARCOURS_PENDING_BANNER =
  'Votre parcours (université, faculté, promotion) est en attente de validation. Vous pouvez consulter et passer les évaluations libres. Les évaluations ciblées (promo, faculté) et leurs codes restent indisponibles tant que l’établissement ne vous a pas confirmé.'

/** Blocage participation / code pour une épreuve ciblée tant que le parcours n’est pas confirmé. */
export const STUDENT_PARCOURS_PENDING_MESSAGE =
  'Votre parcours n’est pas encore validé. Cette évaluation ciblée (ou son code) sera accessible après confirmation par l’établissement.'

export function studentTargetedAccessDeniedMessage(): string {
  return 'Cette évaluation ne correspond pas à votre faculté ou promotion confirmée.'
}

/** Accès direct ou par code : parcours validé requis si l’épreuve est ciblée. */
export function getStudentParcoursJoinBlockReason(
  evaluation: Evaluation,
  user: User | null | undefined,
  studentUserId: string,
): string | null {
  if (isCohortEvaluation(evaluation)) {
    return null
  }

  if (isEvaluationLibre(evaluation)) {
    return null
  }

  if (isStudentAcademicPending(user)) {
    return STUDENT_PARCOURS_PENDING_MESSAGE
  }

  if (!isStudentAcademicVerified(user)) {
    return 'Enregistrez et faites valider votre parcours (profil étudiant) pour accéder aux évaluations ciblées.'
  }

  if (!studentMatchesEvaluationAudience(evaluation, user, studentUserId)) {
    return studentTargetedAccessDeniedMessage()
  }

  return null
}

export function studentMatchesEvaluationAudience(
  evaluation: Evaluation,
  user: User | null | undefined,
  studentUserId: string,
): boolean {
  const courseStore = useCourseStore()
  const enrolledCourseIds = new Set(
    courseStore.getCoursesForStudent(studentUserId).map((c) => c.id),
  )

  if (isCohortEvaluation(evaluation)) {
    const cid = evaluation.audienceClassroomId ?? evaluation.courseId
    return !!cid && enrolledCourseIds.has(cid)
  }

  const mode: EvaluationAudienceMode = evaluation.audienceMode ?? 'open'
  if (mode === 'open') return false

  const placement = resolveStudentPlacement(user)
  if (!placement.verified) return false

  switch (mode) {
    case 'faculty': {
      const sameInst =
        !evaluation.audienceInstitutionKey ||
        placement.institutionKey === evaluation.audienceInstitutionKey
      const sameFac =
        !evaluation.audienceFaculty ||
        facultyMatches(evaluation.audienceFaculty, placement.faculty)
      return sameInst && sameFac
    }
    case 'promotions': {
      const labels = evaluation.audiencePromotionLabels ?? []
      if (!labels.length) return false
      const key = evaluation.audienceInstitutionKey
      const label = evaluation.audienceInstitutionLabel
      const instOk =
        (!key && !label) ||
        placement.institutionKey === key ||
        (label && norm(placement.institutionLabel) === norm(label)) ||
        (key && norm(placement.institutionLabel) === norm(key))
      if (!instOk) return false
      if (
        evaluation.audienceFaculty &&
        !facultyMatches(evaluation.audienceFaculty, placement.faculty)
      ) {
        return false
      }
      return labels.some((p) => promotionMatches(p, placement.promotion))
    }
    case 'classroom': {
      const cid = evaluation.courseId
      if (cid && enrolledCourseIds.has(cid)) return true
      if (evaluation.audienceClassroomId && placement.classroomIds.includes(evaluation.audienceClassroomId)) {
        return true
      }
      return false
    }
    case 'students': {
      const ids = evaluation.audienceStudentUserIds ?? []
      return ids.includes(studentUserId)
    }
    default:
      return false
  }
}

export function audienceModeLabel(mode: EvaluationAudienceMode | undefined): string {
  switch (mode) {
    case 'faculty':
      return 'Faculté'
    case 'promotions':
      return 'Promotions'
    case 'classroom':
      return 'Salle / groupe'
    case 'students':
      return 'Étudiants ciblés'
    default:
      return 'Libre (code ou lien)'
  }
}

export function describeEvaluationAudience(evaluation: Evaluation): string {
  const mode = evaluation.audienceMode ?? 'open'
  if (mode === 'open') return 'Ouverte — code unique ou lien partagé.'
  if (mode === 'faculty') {
    return `${evaluation.audienceInstitutionLabel ?? 'Établissement'} · ${evaluation.audienceFaculty ?? 'Faculté'}`
  }
  if (mode === 'promotions') {
    const promos = (evaluation.audiencePromotionLabels ?? []).join(', ')
    return `${evaluation.audienceInstitutionLabel ?? 'Établissement'} · ${promos || 'Promotions'}`
  }
  if (mode === 'classroom') return 'Étudiants de la salle liée.'
  if (mode === 'students') {
    const n = evaluation.audienceStudentUserIds?.length ?? 0
    return n === 1 ? '1 étudiant ciblé' : `${n} étudiants ciblés`
  }
  return audienceModeLabel(mode)
}
