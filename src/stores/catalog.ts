import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createDevise,
  createEtablissement,
  createMatiere,
  createPromotion,
  listDevises,
  listEtablissements,
  listMatieres,
  listPromotions,
} from '@/api/catalog'
import type { Devise, Etablissement, Matiere, Promotion } from '@/api/types'
import { extractApiError } from '@/api/client'
import { isApiEnabled } from '@/config/features'

export const useCatalogStore = defineStore('catalog', () => {
  const matieres = ref<Matiere[]>([])
  const promotions = ref<Promotion[]>([])
  const etablissements = ref<Etablissement[]>([])
  const devises = ref<Devise[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeMatieres = computed(() => matieres.value.filter((m) => m.active !== false))
  const activePromotions = computed(() => promotions.value.filter((p) => p.active !== false))
  const activeEtablissements = computed(() =>
    etablissements.value.filter((e) => e.active !== false),
  )

  async function syncAll(): Promise<void> {
    if (!isApiEnabled()) return
    loading.value = true
    error.value = null
    try {
      const [m, p, e, d] = await Promise.all([
        listMatieres(),
        listPromotions(),
        listEtablissements(),
        listDevises(),
      ])
      matieres.value = m
      promotions.value = p
      etablissements.value = e
      devises.value = d
    } catch (err) {
      error.value = extractApiError(err)
    } finally {
      loading.value = false
    }
  }

  async function syncMatieres(): Promise<Matiere[]> {
    if (!isApiEnabled()) return []
    loading.value = true
    error.value = null
    try {
      matieres.value = await listMatieres()
      return matieres.value
    } catch (err) {
      error.value = extractApiError(err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function addMatiere(name: string, code?: string) {
    const trimmed = name.trim()
    if (!trimmed) return { ok: false as const, error: 'Le nom est requis.' }
    try {
      const created = await createMatiere({
        name: trimmed,
        code:
          code?.trim() ||
          trimmed
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '')
            .slice(0, 8)
            .toUpperCase() ||
          'MAT',
      })
      await syncMatieres()
      const item =
        created ??
        matieres.value.find((m) => m.name?.toLowerCase() === trimmed.toLowerCase()) ??
        null
      if (!item) return { ok: false as const, error: 'Matière créée mais introuvable à la relecture.' }
      return { ok: true as const, item }
    } catch (err) {
      return { ok: false as const, error: extractApiError(err) }
    }
  }

  async function addPromotion(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return { ok: false as const, error: 'Le nom est requis.' }
    try {
      const created = await createPromotion({ name: trimmed })
      promotions.value = await listPromotions()
      const item =
        created ??
        promotions.value.find((p) => p.name?.toLowerCase() === trimmed.toLowerCase()) ??
        null
      if (!item) return { ok: false as const, error: 'Promotion créée mais introuvable à la relecture.' }
      return { ok: true as const, item }
    } catch (err) {
      return { ok: false as const, error: extractApiError(err) }
    }
  }

  async function addEtablissement(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return { ok: false as const, error: 'Le nom est requis.' }
    try {
      const created = await createEtablissement({ name: trimmed })
      etablissements.value = await listEtablissements()
      const item =
        created ??
        etablissements.value.find((e) => e.name?.toLowerCase() === trimmed.toLowerCase()) ??
        null
      if (!item) return { ok: false as const, error: 'Établissement créé mais introuvable à la relecture.' }
      return { ok: true as const, item }
    } catch (err) {
      return { ok: false as const, error: extractApiError(err) }
    }
  }

  async function addDevise(name: string, code?: string, tauxLocal?: number) {
    const trimmed = name.trim()
    if (!trimmed) return { ok: false as const, error: 'Le nom est requis.' }
    try {
      const created = await createDevise({
        name: trimmed,
        code: code?.trim() || undefined,
        tauxLocal,
      })
      devises.value = await listDevises()
      const item =
        created ??
        devises.value.find((d) => d.name?.toLowerCase() === trimmed.toLowerCase()) ??
        null
      if (!item) return { ok: false as const, error: 'Devise créée mais introuvable à la relecture.' }
      return { ok: true as const, item }
    } catch (err) {
      return { ok: false as const, error: extractApiError(err) }
    }
  }

  return {
    matieres,
    promotions,
    etablissements,
    devises,
    loading,
    error,
    activeMatieres,
    activePromotions,
    activeEtablissements,
    syncAll,
    syncMatieres,
    addMatiere,
    addPromotion,
    addEtablissement,
    addDevise,
  }
})
