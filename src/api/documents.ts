import { apiGet, apiPost } from '@/api/http'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'
import type { DocumentEntity, DocumentRequest, TypeDocumentEntity } from '@/api/types'

function asDocument(raw: unknown): DocumentEntity | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'number' ? o.id : Number(o.id)
  if (!Number.isFinite(id)) return null
  return {
    ...(o as unknown as DocumentEntity),
    id,
    title:
      (typeof o.title === 'string' && o.title) ||
      (typeof o.titre === 'string' && o.titre) ||
      undefined,
    description:
      (typeof o.description === 'string' && o.description) ||
      (typeof o.desc === 'string' && o.desc) ||
      undefined,
  }
}

/** Réponse Swagger : objet `{ clé: DocumentEntity[] }` ou tableau. */
function unwrapDocuments(data: unknown): DocumentEntity[] {
  const out: DocumentEntity[] = []
  const seen = new Set<number>()

  const push = (item: unknown) => {
    const doc = asDocument(item)
    if (!doc || seen.has(doc.id)) return
    seen.add(doc.id)
    out.push(doc)
  }

  if (Array.isArray(data)) {
    data.forEach(push)
    return out
  }

  if (data && typeof data === 'object') {
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val)) val.forEach(push)
      else push(val)
    }
  }

  if (!out.length) {
    for (const item of unwrapList<unknown>(data)) push(item)
  }
  return out
}

function unwrapDocument(data: unknown): DocumentEntity | null {
  const direct = asDocument(unwrapObject<DocumentEntity>(data))
  if (direct) return direct
  return unwrapDocuments(data)[0] ?? null
}

/** GET /api/v1/protected/document — liste des documents. */
export async function listDocuments(): Promise<DocumentEntity[]> {
  const data = await apiGet<unknown>('protected/document')
  return unwrapDocuments(data)
}

/** GET /api/v1/private/document/{id} — détail. */
export async function getDocumentById(id: number): Promise<DocumentEntity | null> {
  const data = await apiGet<unknown>(`private/document/${id}`)
  return unwrapDocument(data)
}

/** POST /api/v1/private/document — création. */
export async function createDocument(payload: DocumentRequest): Promise<DocumentEntity | null> {
  const data = await apiPost<unknown>('private/document', payload)
  return unwrapDocument(data)
}

/** GET /api/v1/protected/type-document — types. */
export async function listTypeDocuments(): Promise<TypeDocumentEntity[]> {
  const data = await apiGet<unknown>('protected/type-document')
  return unwrapList<TypeDocumentEntity>(data).filter((t) => t && typeof t.id === 'number')
}
