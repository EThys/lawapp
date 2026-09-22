import { apiGet, apiPost } from '@/api/http'
import type {
  Devise,
  Etablissement,
  Matiere,
  MatiereRequest,
  Promotion,
  TeacherType,
} from '@/api/types'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'

function normalizeActiveFlag<T extends { active?: boolean; isActive?: boolean }>(item: T): T {
  const active = item.active ?? item.isActive
  return active === undefined ? item : { ...item, active }
}

function unwrapNamed<T extends { id?: number }>(data: unknown): T[] {
  return unwrapList<T>(data)
    .filter((item) => item && typeof item.id === 'number')
    .map((item) => normalizeActiveFlag(item as T & { active?: boolean; isActive?: boolean }))
}

function unwrapCreated<T extends { id?: number }>(data: unknown): T | null {
  const direct = unwrapObject<T>(data)
  if (direct && typeof direct.id === 'number') return normalizeActiveFlag(direct as T & { active?: boolean })
  return unwrapNamed<T>(data)[0] ?? null
}

/** GET /api/v1/public/promotions — promotion-controller */
export async function listPromotions(): Promise<Promotion[]> {
  const data = await apiGet<unknown>('public/promotions', true)
  return unwrapNamed<Promotion>(data)
}

/** POST /api/v1/private/promotions — création admin (même modèle que matières). */
export async function createPromotion(payload: { name: string }): Promise<Promotion | null> {
  const data = await apiPost<unknown>('private/promotions', payload)
  return unwrapCreated<Promotion>(data)
}

/** GET /api/v1/public/etablissements — etablissement-controller */
export async function listEtablissements(): Promise<Etablissement[]> {
  const data = await apiGet<unknown>('public/etablissements', true)
  return unwrapNamed<Etablissement>(data)
}

/** POST /api/v1/private/etablissements — création admin. */
export async function createEtablissement(payload: { name: string }): Promise<Etablissement | null> {
  const data = await apiPost<unknown>('private/etablissements', payload)
  return unwrapCreated<Etablissement>(data)
}

/** GET /api/v1/public/matieres — matiere-controller */
export async function listMatieres(): Promise<Matiere[]> {
  const data = await apiGet<unknown>('public/matieres', true)
  return unwrapNamed<Matiere>(data)
}

/** POST /api/v1/private/matieres — matiere-controller */
export async function createMatiere(payload: MatiereRequest): Promise<Matiere | null> {
  const data = await apiPost<unknown>('private/matieres', payload)
  return unwrapCreated<Matiere>(data)
}

/** GET /api/v1/public/payment/devises — Devise */
export async function listDevises(): Promise<Devise[]> {
  const data = await apiGet<unknown>('public/payment/devises', true)
  return unwrapNamed<Devise>(data)
}

/** POST /api/v1/private/devises — création admin (non listée OpenAPI, parallèle aux matières). */
export async function createDevise(payload: {
  name: string
  code?: string
  tauxLocal?: number
}): Promise<Devise | null> {
  const data = await apiPost<unknown>('private/devises', payload)
  return unwrapCreated<Devise>(data)
}

/** GET /api/v1/public/teacher-types */
export async function listTeacherTypes(): Promise<TeacherType[]> {
  const data = await apiGet<unknown>('public/teacher-types', true)
  return unwrapNamed<TeacherType>(data)
}
