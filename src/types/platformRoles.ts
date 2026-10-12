/** Rôle global plateforme (LawApp). */
export type PlatformRole = 'none' | 'super_admin'

/**
 * Rôles au sein d’un établissement (université partenaire).
 * Un même compte peut avoir un rôle institution + profil enseignant/étudiant.
 */
export type InstitutionRole =
  | 'institution_admin'
  | 'scolarite'
  | 'validator_teacher'
  | 'validator_student'
  | 'faculty_manager'
  | 'read_only'

export interface InstitutionMembership {
  etablissementId: number
  etablissementLabel: string
  role: InstitutionRole
  /** Compte actif dans cet établissement */
  active: boolean
  grantedAt: string
}

/** Visibilité d’un établissement (super admin). */
export interface EtablissementGovernanceFlags {
  etablissementId: number
  /** Présent dans GET public/etablissements (liste ouverte). */
  publiclyListed: boolean
  /** Sélectionnable par profs/étudiants (affiliation, éval université). */
  partnerEnabled: boolean
}

export const INSTITUTION_ROLE_LABELS: Record<InstitutionRole, string> = {
  institution_admin: 'Administrateur établissement',
  scolarite: 'Scolarité',
  validator_teacher: 'Validation enseignants',
  validator_student: 'Validation étudiants',
  faculty_manager: 'Référent facultés & promotions',
  read_only: 'Lecture seule',
}

/** Peut approuver / refuser une demande enseignant. */
export function institutionRoleCanValidateTeachers(role: InstitutionRole): boolean {
  return role === 'institution_admin' || role === 'validator_teacher' || role === 'scolarite'
}

/** Peut approuver / refuser un parcours étudiant. */
export function institutionRoleCanValidateStudents(role: InstitutionRole): boolean {
  return role === 'institution_admin' || role === 'validator_student' || role === 'scolarite'
}

/** Peut gérer facultés / promotions de l’établissement. */
export function institutionRoleCanManageReferentials(role: InstitutionRole): boolean {
  return role === 'institution_admin' || role === 'faculty_manager'
}
