import type { StudentDetailDto } from '@/api/types'
import type { User } from '@/types/auth'
import type { PresenceCheckInSnapshot } from '@/types/presenceSession'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/students'
import { loadStoredMemberProfile, extractStudentFromProfile } from '@/utils/memberProfile'

const GENDER_LABELS: Record<string, string> = {
  M: 'Masculin',
  F: 'Féminin',
  'N/A': 'Non précisé',
  male: 'Masculin',
  female: 'Féminin',
}

export function formatGenderLabel(raw?: string | null): string {
  if (!raw?.trim()) return '—'
  const key = raw.trim()
  return GENDER_LABELS[key] ?? GENDER_LABELS[key.toUpperCase()] ?? key
}

function profileFromCatalog(dto: StudentDetailDto): PresenceCheckInSnapshot {
  return {
    firstName: dto.firstName?.trim() || '—',
    lastName: dto.lastName?.trim() || '—',
    genderLabel: formatGenderLabel(dto.gender),
    university: dto.etablissement?.name?.trim() || '—',
    faculty: '—',
    promotion: dto.promotion?.name?.trim() || (dto.promotionId ? `Promo #${dto.promotionId}` : '—'),
  }
}

function profileFromUser(user: User, studentUserId: string): PresenceCheckInSnapshot {
  const acad = user.studentAcademicAffiliation
  const auth = useAuthStore()
  let gender: string | undefined
  if (user.id === studentUserId && user.id === auth.currentUser?.id) {
    gender = extractStudentFromProfile(loadStoredMemberProfile())?.gender
  }
  return {
    firstName: user.firstName?.trim() || '—',
    lastName: user.lastName?.trim() || '—',
    genderLabel: formatGenderLabel(gender),
    university:
      acad?.institutionLabel?.trim() ||
      user.studentInstitutionAffiliation?.institutionLabel?.trim() ||
      user.institution?.trim() ||
      '—',
    faculty: acad?.faculty?.trim() || '—',
    promotion: acad?.promotion?.trim() || '—',
  }
}

/** Profil affiché sur le registre de présence (API catalogue ou compte local). */
export function resolvePresenceCheckInSnapshot(studentUserId: string): PresenceCheckInSnapshot {
  const studentStore = useStudentStore()
  const auth = useAuthStore()
  const n = Number(studentUserId)
  if (Number.isFinite(n)) {
    const dto = studentStore.catalogByUserId.get(n)
    if (dto) return profileFromCatalog(dto)
  }
  const user = auth.getUserById(studentUserId)
  if (user) return profileFromUser(user, studentUserId)
  return {
    firstName: '—',
    lastName: studentUserId,
    genderLabel: '—',
    university: '—',
    faculty: '—',
    promotion: '—',
  }
}

export function formatPresenceCheckInDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}
