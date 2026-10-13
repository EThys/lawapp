import type { Etablissement, FacultyRecord, Promotion } from '@/api/types'
import type { EtablissementGovernanceFlags } from '@/types/platformRoles'

export type ReferentielSelectOption = {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

export function isReferentielActive(item: { active?: boolean; isActive?: boolean }): boolean {
  const active = item.active ?? item.isActive
  return active !== false
}

export function resolveEtablissementGovernance(
  e: Etablissement,
  flags?: Pick<EtablissementGovernanceFlags, 'publiclyListed' | 'partnerEnabled'>,
): { publiclyListed: boolean; partnerEnabled: boolean; selectable: boolean } {
  const publiclyListed = e.publiclyListed ?? flags?.publiclyListed ?? true
  const partnerEnabled = e.partnerEnabled ?? flags?.partnerEnabled ?? true
  const selectable = isReferentielActive(e) && partnerEnabled
  return { publiclyListed, partnerEnabled, selectable }
}

/** Établissements visibles dans les listes (y compris non sélectionnables). */
export function filterPublicEtablissements(
  list: Etablissement[],
  getFlags: (id: number) => EtablissementGovernanceFlags,
): Etablissement[] {
  return list.filter((e) => resolveEtablissementGovernance(e, getFlags(e.id)).publiclyListed)
}

export function etablissementSelectOptions(
  list: Etablissement[],
  getFlags: (id: number) => EtablissementGovernanceFlags,
): ReferentielSelectOption[] {
  return filterPublicEtablissements(list, getFlags)
    .map((e) => {
      const g = resolveEtablissementGovernance(e, getFlags(e.id))
      const base = e.name?.trim() || `Établissement #${e.id}`
      return {
        value: String(e.id),
        label: g.selectable ? base : `${base} (non disponible)`,
        disabled: !g.selectable,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

export function findDefaultSelectableEtablissement(
  list: Etablissement[],
  getFlags: (id: number) => EtablissementGovernanceFlags,
): Etablissement | undefined {
  return filterPublicEtablissements(list, getFlags).find(
    (e) => resolveEtablissementGovernance(e, getFlags(e.id)).selectable,
  )
}

export function promotionSelectOptions(list: Promotion[]): ReferentielSelectOption[] {
  return list
    .filter(isReferentielActive)
    .map((p) => ({
      value: String(p.id),
      label: p.name?.trim() || `Promotion #${p.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

export function facultySelectOptions(list: FacultyRecord[]): ReferentielSelectOption[] {
  return list
    .filter((f) => isReferentielActive(f) && (f.id != null || f.name?.trim()))
    .map((f) => {
      const name = f.name?.trim() || (f.id != null ? `Faculté #${f.id}` : 'Faculté')
      return {
        value: f.id != null ? String(f.id) : name,
        label: name,
        disabled: f.id == null,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

export function parseNumericReferentielId(value: string): number | null {
  const n = Number.parseInt(value.trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function etablissementLabelFromList(
  key: string,
  list: Etablissement[],
): string {
  const id = parseNumericReferentielId(key)
  if (id == null) return key
  return list.find((e) => e.id === id)?.name?.trim() ?? `Établissement #${id}`
}

export function isEtablissementKeySelectable(
  key: string,
  list: Etablissement[],
  getFlags: (id: number) => EtablissementGovernanceFlags,
): boolean {
  const id = parseNumericReferentielId(key)
  if (id == null) return false
  const e = list.find((x) => x.id === id)
  if (!e) return false
  return resolveEtablissementGovernance(e, getFlags(id)).selectable
}
