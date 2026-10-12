import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Etablissement } from '@/api/types'
import type { EtablissementGovernanceFlags } from '@/types/platformRoles'

const FLAGS_KEY = 'lawapp_etablissement_governance'

function defaultFlags(id: number): EtablissementGovernanceFlags {
  return {
    etablissementId: id,
    publiclyListed: true,
    partnerEnabled: true,
  }
}

function loadFlags(): Record<number, EtablissementGovernanceFlags> {
  try {
    const raw = localStorage.getItem(FLAGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EtablissementGovernanceFlags>
    const out: Record<number, EtablissementGovernanceFlags> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k)
      if (Number.isFinite(id) && v) out[id] = { ...defaultFlags(id), ...v, etablissementId: id }
    }
    return out
  } catch {
    return {}
  }
}

function saveFlags(map: Record<number, EtablissementGovernanceFlags>) {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(map))
}

export const usePlatformGovernanceStore = defineStore('platformGovernance', () => {
  const flagsById = ref<Record<number, EtablissementGovernanceFlags>>(loadFlags())

  function getFlags(etablissementId: number): EtablissementGovernanceFlags {
    return flagsById.value[etablissementId] ?? defaultFlags(etablissementId)
  }

  function setPubliclyListed(etablissementId: number, value: boolean) {
    const next = { ...getFlags(etablissementId), publiclyListed: value }
    flagsById.value = { ...flagsById.value, [etablissementId]: next }
    saveFlags(flagsById.value)
  }

  function setPartnerEnabled(etablissementId: number, value: boolean) {
    const next = { ...getFlags(etablissementId), partnerEnabled: value }
    flagsById.value = { ...flagsById.value, [etablissementId]: next }
    saveFlags(flagsById.value)
  }

  /** Aligné sur GET public/etablissements (super admin filtre). */
  function filterPubliclyListed(list: Etablissement[]): Etablissement[] {
    return list.filter((e) => {
      if (e.active === false || e.isActive === false) return false
      return getFlags(e.id).publiclyListed
    })
  }

  /** Listes affiliation prof / étudiant / éval université. */
  function filterPartnerEnabled(list: Etablissement[]): Etablissement[] {
    return filterPubliclyListed(list).filter((e) => getFlags(e.id).partnerEnabled)
  }

  return {
    flagsById,
    getFlags,
    setPubliclyListed,
    setPartnerEnabled,
    filterPubliclyListed,
    filterPartnerEnabled,
  }
})
