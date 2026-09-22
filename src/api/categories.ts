import { apiGet, apiPost } from '@/api/http'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'
import type {
  CategorieEntity,
  CategorieRequest,
  CategorieContenuEntity,
  CategorieContenuRequest,
  DocumentCategoryEntity,
  DocumentCategoryRequest,
  ApiMessageResponse,
} from '@/api/types'

function unwrapCategories(data: unknown): CategorieEntity[] {
  return unwrapList<CategorieEntity>(data).filter((c) => c && typeof c.id === 'number')
}

function unwrapCategory(data: unknown): CategorieEntity | null {
  const direct = unwrapObject<CategorieEntity>(data)
  if (direct && typeof direct.id === 'number') return direct
  return unwrapCategories(data)[0] ?? null
}

function unwrapCategorieContenus(data: unknown): CategorieContenuEntity[] {
  return unwrapList<CategorieContenuEntity>(data).filter((c) => c && typeof c.id === 'number')
}

function unwrapDocumentCategories(data: unknown): DocumentCategoryEntity[] {
  return unwrapList<DocumentCategoryEntity>(data).filter((c) => c && typeof c.id === 'number')
}

// —— categorie-controller ——

/** POST /api/v1/private/categorie */
export async function createCategorie(payload: CategorieRequest): Promise<CategorieEntity | null> {
  const data = await apiPost<unknown>('private/categorie', payload)
  return unwrapCategory(data)
}

/** GET /api/v1/protected/categorie */
export async function listCategories(): Promise<CategorieEntity[]> {
  const data = await apiGet<unknown>('protected/categorie')
  return unwrapCategories(data)
}

/** GET /api/v1/private/categorie/{id} */
export async function getCategorieById(id: number): Promise<CategorieEntity | null> {
  const data = await apiGet<unknown>(`private/categorie/${id}`)
  return unwrapCategory(data)
}

// —— categorie-contenu-controller ——

/** POST /api/v1/private/categoriecontenu */
export async function createCategorieContenu(
  payload: CategorieContenuRequest,
): Promise<CategorieContenuEntity | null> {
  const data = await apiPost<unknown>('private/categoriecontenu', payload)
  const direct = unwrapObject<CategorieContenuEntity>(data)
  if (direct && typeof direct.id === 'number') return direct
  return unwrapCategorieContenus(data)[0] ?? null
}

/** GET /api/v1/protected/categoriecontenu */
export async function listCategorieContenus(): Promise<CategorieContenuEntity[]> {
  const data = await apiGet<unknown>('protected/categoriecontenu')
  return unwrapCategorieContenus(data)
}

/** GET /api/v1/private/categoriecontenu/{id} */
export async function getCategorieContenuById(id: number): Promise<CategorieContenuEntity | null> {
  const data = await apiGet<unknown>(`private/categoriecontenu/${id}`)
  const direct = unwrapObject<CategorieContenuEntity>(data)
  if (direct && typeof direct.id === 'number') return direct
  return unwrapCategorieContenus(data)[0] ?? null
}

// —— document-categorie-controller ——

/** POST /api/v1/private/cat-document */
export async function createDocumentCategory(
  payload: DocumentCategoryRequest,
): Promise<DocumentCategoryEntity | null> {
  const data = await apiPost<unknown>('private/cat-document', payload)
  const direct = unwrapObject<DocumentCategoryEntity>(data)
  if (direct && typeof direct.id === 'number') return direct
  return unwrapDocumentCategories(data)[0] ?? null
}

/** GET /api/v1/protected/cat-document */
export async function listDocumentCategories(): Promise<DocumentCategoryEntity[]> {
  const data = await apiGet<unknown>('protected/cat-document')
  return unwrapDocumentCategories(data)
}

/** GET /api/v1/private/cat-document/{id} */
export async function getDocumentCategoryById(id: number): Promise<DocumentCategoryEntity | null> {
  const data = await apiGet<unknown>(`private/cat-document/${id}`)
  const direct = unwrapObject<DocumentCategoryEntity>(data)
  if (direct && typeof direct.id === 'number') return direct
  return unwrapDocumentCategories(data)[0] ?? null
}

/** Helper message-only responses. */
export type CategoryMutationResult = ApiMessageResponse
