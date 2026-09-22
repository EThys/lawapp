import { rootGet, rootPost, apiGet } from '@/api/http'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'
import type { DocumentEntity, DocumentRequest, TypeDocumentEntity } from '@/api/types'

function unwrapDocuments(data: unknown): DocumentEntity[] {
  return unwrapList<DocumentEntity>(data).filter((d) => d && typeof d.id === 'number')
}

function unwrapDocument(data: unknown): DocumentEntity | null {
  const direct = unwrapObject<DocumentEntity>(data)
  if (direct && typeof direct.id === 'number') return direct
  const list = unwrapDocuments(data)
  return list[0] ?? null
}

/** GET /protected/document — liste des documents (Swagger document-controller). */
export async function listDocuments(): Promise<DocumentEntity[]> {
  const data = await rootGet<unknown>('protected/document')
  return unwrapDocuments(data)
}

/** GET /private/document/{id} — détail d'un document. */
export async function getDocumentById(id: number): Promise<DocumentEntity | null> {
  const data = await rootGet<unknown>(`private/document/${id}`)
  return unwrapDocument(data)
}

/** POST /private/document — création d'un document. */
export async function createDocument(payload: DocumentRequest): Promise<DocumentEntity | null> {
  const data = await rootPost<unknown>('private/document', payload)
  return unwrapDocument(data)
}

/** GET /api/v1/protected/type-document — types de documents (catalogue). */
export async function listTypeDocuments(): Promise<TypeDocumentEntity[]> {
  const data = await apiGet<unknown>('protected/type-document')
  return unwrapList<TypeDocumentEntity>(data).filter((t) => t && typeof t.id === 'number')
}
