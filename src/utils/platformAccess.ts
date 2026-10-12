import type { User } from '@/types/auth'
import type { InstitutionMembership, InstitutionRole, PlatformRole } from '@/types/platformRoles'
import {
  institutionRoleCanManageReferentials,
  institutionRoleCanValidateStudents,
  institutionRoleCanValidateTeachers,
} from '@/types/platformRoles'

/** Super admin plateforme (aujourd’hui : compte certifié — backend : claim `platformRole`). */
export function resolvePlatformRole(user: User | null | undefined): PlatformRole {
  if (!user) return 'none'
  if (user.platformRole === 'super_admin') return 'super_admin'
  if (user.certified === true) return 'super_admin'
  return 'none'
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return resolvePlatformRole(user) === 'super_admin'
}

export function getInstitutionMemberships(user: User | null | undefined): InstitutionMembership[] {
  return user?.institutionMemberships?.filter((m) => m.active !== false) ?? []
}

export function getPrimaryInstitutionMembership(
  user: User | null | undefined,
): InstitutionMembership | null {
  const list = getInstitutionMemberships(user)
  return list.find((m) => m.role === 'institution_admin') ?? list[0] ?? null
}

export function hasInstitutionAccess(user: User | null | undefined, etablissementId?: number): boolean {
  const list = getInstitutionMemberships(user)
  if (!list.length) return false
  if (etablissementId == null) return true
  return list.some((m) => m.etablissementId === etablissementId)
}

export function hasInstitutionRole(
  user: User | null | undefined,
  roles: InstitutionRole[],
  etablissementId?: number,
): boolean {
  return getInstitutionMemberships(user).some(
    (m) =>
      roles.includes(m.role) &&
      (etablissementId == null || m.etablissementId === etablissementId),
  )
}

export function canValidateTeachersAtInstitution(user: User | null | undefined, etabId: number): boolean {
  return getInstitutionMemberships(user).some(
    (m) => m.etablissementId === etabId && institutionRoleCanValidateTeachers(m.role),
  )
}

export function canValidateStudentsAtInstitution(user: User | null | undefined, etabId: number): boolean {
  return getInstitutionMemberships(user).some(
    (m) => m.etablissementId === etabId && institutionRoleCanValidateStudents(m.role),
  )
}

export function canManageInstitutionReferentials(user: User | null | undefined, etabId: number): boolean {
  return getInstitutionMemberships(user).some(
    (m) => m.etablissementId === etabId && institutionRoleCanManageReferentials(m.role),
  )
}
