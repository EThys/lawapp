import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createCategorie,
  listCategories,
  getCategorieById,
  createCategorieContenu,
  listCategorieContenus,
  getCategorieContenuById,
  createDocumentCategory,
  listDocumentCategories,
  getDocumentCategoryById,
} from '@/api/categories'
import type {
  CategorieEntity,
  CategorieContenuEntity,
  DocumentCategoryEntity,
} from '@/api/types'
import { extractApiError } from '@/api/client'
import { isApiEnabled } from '@/config/features'

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref<CategorieEntity[]>([])
  const categorieContenus = ref<CategorieContenuEntity[]>([])
  const documentCategories = ref<DocumentCategoryEntity[]>([])
  const currentCategory = ref<CategorieEntity | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeCategories = computed(() =>
    categories.value.filter((c) => c.active !== false),
  )

  async function syncCategories(): Promise<CategorieEntity[]> {
    if (!isApiEnabled()) return []
    loading.value = true
    error.value = null
    try {
      categories.value = await listCategories()
      return categories.value
    } catch (e) {
      error.value = extractApiError(e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchCategory(id: number): Promise<CategorieEntity | null> {
    if (!isApiEnabled()) return null
    loading.value = true
    error.value = null
    try {
      currentCategory.value = await getCategorieById(id)
      return currentCategory.value
    } catch (e) {
      error.value = extractApiError(e)
      currentCategory.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function createCategory(
    name: string,
  ): Promise<{ ok: true; category: CategorieEntity } | { ok: false; error: string }> {
    if (!isApiEnabled()) return { ok: false, error: 'Mode API requis.' }
    const trimmed = name.trim()
    if (!trimmed) return { ok: false, error: 'Le nom est requis.' }

    loading.value = true
    error.value = null
    try {
      let created = await createCategorie({ name: trimmed })
      await syncCategories()
      if (!created?.id) {
        created =
          categories.value.find((c) => c.name?.toLowerCase() === trimmed.toLowerCase()) ?? null
      }
      if (!created?.id) {
        return { ok: false, error: 'Catégorie créée, mais réponse incomplète.' }
      }
      currentCategory.value = created
      return { ok: true, category: created }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  async function syncCategorieContenus(): Promise<CategorieContenuEntity[]> {
    if (!isApiEnabled()) return []
    try {
      categorieContenus.value = await listCategorieContenus()
      return categorieContenus.value
    } catch (e) {
      error.value = extractApiError(e)
      return []
    }
  }

  async function linkContenuToCategory(
    categorieId: number,
    contenuId: number,
  ): Promise<{ ok: true; link: CategorieContenuEntity } | { ok: false; error: string }> {
    if (!isApiEnabled()) return { ok: false, error: 'Mode API requis.' }
    try {
      let link = await createCategorieContenu({ categorieId, contenuId })
      await syncCategorieContenus()
      if (!link?.id) {
        link =
          categorieContenus.value.find(
            (c) => c.categorieId === categorieId && c.contenuId === contenuId,
          ) ?? null
      }
      if (!link?.id) return { ok: false, error: 'Liaison créée, mais réponse incomplète.' }
      return { ok: true, link }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    }
  }

  async function fetchCategorieContenu(id: number): Promise<CategorieContenuEntity | null> {
    if (!isApiEnabled()) return null
    try {
      return await getCategorieContenuById(id)
    } catch (e) {
      error.value = extractApiError(e)
      return null
    }
  }

  async function syncDocumentCategories(): Promise<DocumentCategoryEntity[]> {
    if (!isApiEnabled()) return []
    try {
      documentCategories.value = await listDocumentCategories()
      return documentCategories.value
    } catch (e) {
      error.value = extractApiError(e)
      return []
    }
  }

  async function linkDocumentToCategory(
    documentId: number,
    categoryId: number,
  ): Promise<{ ok: true; link: DocumentCategoryEntity } | { ok: false; error: string }> {
    if (!isApiEnabled()) return { ok: false, error: 'Mode API requis.' }
    try {
      let link = await createDocumentCategory({ documentId, categoryId })
      await syncDocumentCategories()
      if (!link?.id) {
        link =
          documentCategories.value.find(
            (c) => c.documentId === documentId && c.categoryId === categoryId,
          ) ?? null
      }
      if (!link?.id) return { ok: false, error: 'Liaison créée, mais réponse incomplète.' }
      return { ok: true, link }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    }
  }

  async function fetchDocumentCategory(id: number): Promise<DocumentCategoryEntity | null> {
    if (!isApiEnabled()) return null
    try {
      return await getDocumentCategoryById(id)
    } catch (e) {
      error.value = extractApiError(e)
      return null
    }
  }

  return {
    categories,
    categorieContenus,
    documentCategories,
    currentCategory,
    loading,
    error,
    activeCategories,
    syncCategories,
    fetchCategory,
    createCategory,
    syncCategorieContenus,
    linkContenuToCategory,
    fetchCategorieContenu,
    syncDocumentCategories,
    linkDocumentToCategory,
    fetchDocumentCategory,
  }
})
