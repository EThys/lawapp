import type { InstitutionAffiliation } from '@/types/auth'
import type { Evaluation, EvaluationPublicationScope } from '@/types'
import type { Etablissement } from '@/api/types'
import { etablissementLabelFromList } from '@/utils/referentielOptions'

/** Sans API : pas de liste statique (référentiels via GET public/*). */
export function institutionLinkSelectOptions(): {
  value: string
  label: string
  group?: string
  disabled?: boolean
}[] {
  return []
}

export function institutionLabelForKey(key: string, etablissements?: Etablissement[]): string {
  if (etablissements?.length) return etablissementLabelFromList(key, etablissements)
  return key
}

export function isTeacherInstitutionVerified(
  affiliation: InstitutionAffiliation | undefined,
  institutionKey: string | null | undefined,
): boolean {
  if (!affiliation || affiliation.status !== 'verified') return false
  if (!institutionKey) return true
  return affiliation.institutionKey === institutionKey
}

export function evaluationInstitutionPending(evaluation: Evaluation): boolean {
  return (
    evaluation.publicationScope === 'institution' && evaluation.institutionPublicationPending === true
  )
}

export function canPublishInstitutionEvaluation(
  evaluation: Evaluation,
  teacherAffiliation: InstitutionAffiliation | undefined,
): boolean {
  if (evaluation.publicationScope !== 'institution') return true
  const key = evaluation.linkedInstitutionKey
  return isTeacherInstitutionVerified(teacherAffiliation, key)
}

export function resolveEvaluationPublication(input: {
  asDraft: boolean
  publicationScope: EvaluationPublicationScope
  linkedInstitutionKey: string | null
  linkedInstitutionLabel: string | null
  teacherAffiliation: InstitutionAffiliation | undefined
}): Pick<
  Evaluation,
  | 'status'
  | 'publicationScope'
  | 'linkedInstitutionKey'
  | 'linkedInstitutionLabel'
  | 'institutionPublicationPending'
> {
  const scope = input.publicationScope
  const linkKey = scope === 'institution' ? input.linkedInstitutionKey : null
  const linkLabel = scope === 'institution' ? input.linkedInstitutionLabel : null

  const base = {
    publicationScope: scope,
    linkedInstitutionKey: linkKey,
    linkedInstitutionLabel: linkLabel,
  }

  if (input.asDraft) {
    return {
      ...base,
      status: 'draft',
      institutionPublicationPending:
        scope === 'institution' &&
        !isTeacherInstitutionVerified(input.teacherAffiliation, linkKey),
    }
  }

  if (scope === 'open' || scope === 'cohort') {
    return {
      ...base,
      status: 'active',
      institutionPublicationPending: false,
    }
  }

  if (!linkKey) {
    return {
      ...base,
      status: 'draft',
      institutionPublicationPending: true,
    }
  }

  if (isTeacherInstitutionVerified(input.teacherAffiliation, linkKey)) {
    return {
      ...base,
      status: 'active',
      institutionPublicationPending: false,
    }
  }

  return {
    ...base,
    status: 'draft',
    institutionPublicationPending: true,
  }
}

export function evaluationStatusDisplay(evaluation: Evaluation): string {
  if (evaluation.institutionPublicationPending && evaluation.status === 'draft') {
    return 'Brouillon · validation établissement'
  }
  if (evaluation.status === 'active') return 'Active'
  if (evaluation.status === 'closed') return 'Fermée'
  return 'Brouillon'
}

export function affiliationStatusLabel(status: InstitutionAffiliation['status']): string {
  return status === 'verified' ? 'Validée' : 'En attente de validation'
}
