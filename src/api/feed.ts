import { apiGet, apiPost } from '@/api/client'
import type {
  ContenuEntity,
  StatusPost,
  CommentaireContenuEntity,
  LikeContenusEntity,
  CategorieEntity,
} from '@/api/types'
import { unwrapList } from '@/utils/apiHelpers'

export async function listContenus(): Promise<ContenuEntity[]> {
  const data = await apiGet<unknown>('protected/contenu')
  return unwrapList<ContenuEntity>(data)
}

export async function listStatuses(): Promise<StatusPost[]> {
  const data = await apiGet<unknown>('protected/status')
  return unwrapList<StatusPost>(data)
}

export async function listCommentaires(): Promise<CommentaireContenuEntity[]> {
  const data = await apiGet<unknown>('private/commentaire')
  return unwrapList<CommentaireContenuEntity>(data)
}

export async function listLikes(): Promise<LikeContenusEntity[]> {
  const data = await apiGet<unknown>('protected/like')
  return unwrapList<LikeContenusEntity>(data)
}

export async function listCategories(): Promise<CategorieEntity[]> {
  const data = await apiGet<unknown>('protected/categorie')
  return unwrapList<CategorieEntity>(data)
}

export async function createLike(contenuId: number, userId: number): Promise<unknown> {
  return apiPost('private/like', { contenuId, userId })
}

export async function createCommentaire(
  contenuId: number,
  userId: number,
  description: string,
): Promise<unknown> {
  return apiPost('private/commentaire', { contenuId, userId, description })
}
