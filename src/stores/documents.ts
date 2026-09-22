import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  listDocuments,
  getDocumentById,
  createDocument,
  listTypeDocuments,
} from '@/api/documents'
import type { DocumentEntity, DocumentRequest, TypeDocumentEntity } from '@/api/types'
import { extractApiError } from '@/api/client'
import { isApiEnabled, USER_KEY } from '@/config/features'
import type { User } from '@/types/auth'

function apiUserIdFromStorage(): number | undefined {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return undefined
    const u = JSON.parse(raw) as User
    return u.apiUserId
  } catch {
    return undefined
  }
}

export const useDocumentStore = defineStore('documents', () => {
  const documents = ref<DocumentEntity[]>([])
  const current = ref<DocumentEntity | null>(null)
  const typeDocuments = ref<TypeDocumentEntity[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeDocuments = computed(() =>
    documents.value.filter((d) => d.active !== false),
  )

  async function fetchList(): Promise<DocumentEntity[]> {
    if (!isApiEnabled()) {
      error.value = 'Mode API désactivé.'
      return []
    }
    loading.value = true
    error.value = null
    try {
      documents.value = await listDocuments()
      return documents.value
    } catch (e) {
      error.value = extractApiError(e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id: number): Promise<DocumentEntity | null> {
    if (!isApiEnabled()) {
      error.value = 'Mode API désactivé.'
      return null
    }
    loading.value = true
    error.value = null
    try {
      current.value = await getDocumentById(id)
      if (current.value) {
        const idx = documents.value.findIndex((d) => d.id === current.value!.id)
        if (idx >= 0) documents.value[idx] = current.value
        else documents.value.push(current.value)
      }
      return current.value
    } catch (e) {
      error.value = extractApiError(e)
      current.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchTypes(): Promise<TypeDocumentEntity[]> {
    if (!isApiEnabled()) return []
    try {
      typeDocuments.value = await listTypeDocuments()
      return typeDocuments.value
    } catch {
      typeDocuments.value = []
      return []
    }
  }

  async function create(
    payload: Omit<DocumentRequest, 'userId'> & { userId?: number },
  ): Promise<{ ok: true; document: DocumentEntity } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Disponible uniquement en mode API.' }
    }
    const title = payload.title?.trim()
    if (!title) return { ok: false, error: 'Le titre est requis.' }

    const userId = payload.userId ?? apiUserIdFromStorage()
    if (!userId) {
      return { ok: false, error: 'Utilisateur non identifié. Reconnectez-vous.' }
    }

    loading.value = true
    error.value = null
    try {
      const body: DocumentRequest = {
        userId,
        title,
        description: payload.description?.trim() || title,
        typeDocument: payload.typeDocument,
        backGroundImage: payload.backGroundImage?.trim() || undefined,
        fileBook: payload.fileBook?.trim() || undefined,
        price: payload.price ?? 0,
        deviseId: payload.deviseId,
      }
      const created = await createDocument(body)
      if (!created?.id) {
        // Création OK mais réponse partielle : resynchroniser la liste.
        await fetchList()
        const matched = documents.value.find((d) => d.title === title)
        if (matched) {
          current.value = matched
          return { ok: true, document: matched }
        }
        return { ok: false, error: 'Document créé, mais la réponse serveur est incomplète.' }
      }
      current.value = created
      const idx = documents.value.findIndex((d) => d.id === created.id)
      if (idx >= 0) documents.value[idx] = created
      else documents.value.unshift(created)
      return { ok: true, document: created }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  function clearCurrent() {
    current.value = null
  }

  return {
    documents,
    current,
    typeDocuments,
    loading,
    error,
    activeDocuments,
    fetchList,
    fetchById,
    fetchTypes,
    create,
    clearCurrent,
  }
})
