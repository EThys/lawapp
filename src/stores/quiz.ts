import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Quiz,
  QuizDetail,
  QuizNotionType,
  QuizNotionTypeRequest,
  QuizProgressUpdateRequest,
  QuizRequest,
  QuizUserProgressItem,
  QuizUserProgressOverview,
} from '@/api/types'
import {
  listQuizzes,
  getQuizById,
  listNotionTypes,
  createQuiz as createQuizApi,
  createNotionType as createNotionTypeApi,
  recordQuizProgression as recordQuizProgressionApi,
  getQuizProgressionOverview,
} from '@/api/quiz'
import { extractApiError } from '@/api/client'
import { isApiEnabled } from '@/config/features'
import { flattenQuizProgressById } from '@/utils/quizApiMapper'

export const useQuizStore = defineStore('quiz', () => {
  const quizzes = ref<Quiz[]>([])
  const notionTypes = ref<QuizNotionType[]>([])
  const current = ref<QuizDetail | null>(null)
  const progressOverview = ref<QuizUserProgressOverview | null>(null)
  const loading = ref(false)
  const notionTypesLoading = ref(false)
  const progressLoading = ref(false)
  const creating = ref(false)
  const creatingNotionType = ref(false)
  const savingProgress = ref(false)
  const error = ref<string | null>(null)

  const progressByQuizId = computed(() => flattenQuizProgressById(progressOverview.value))

  function progressForQuiz(quizId: number): QuizUserProgressItem | undefined {
    return progressByQuizId.value.get(quizId)
  }

  async function fetchList() {
    if (!isApiEnabled()) {
      quizzes.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      quizzes.value = await listQuizzes()
    } catch (e) {
      error.value = extractApiError(e)
      quizzes.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchNotionTypes() {
    if (!isApiEnabled()) {
      notionTypes.value = []
      return
    }
    notionTypesLoading.value = true
    error.value = null
    try {
      notionTypes.value = await listNotionTypes()
    } catch (e) {
      notionTypes.value = []
      error.value = extractApiError(e)
    } finally {
      notionTypesLoading.value = false
    }
  }

  async function fetchProgressOverview() {
    if (!isApiEnabled()) {
      progressOverview.value = null
      return
    }
    progressLoading.value = true
    try {
      progressOverview.value = await getQuizProgressionOverview()
    } catch {
      // Progression optionnelle : ne pas bloquer la liste.
      progressOverview.value = progressOverview.value ?? { notionTypes: [] }
    } finally {
      progressLoading.value = false
    }
  }

  async function fetchById(id: number) {
    loading.value = true
    error.value = null
    current.value = null
    try {
      current.value = await getQuizById(id)
      if (!current.value) error.value = 'Quiz introuvable.'
    } catch (e) {
      error.value = extractApiError(e)
    } finally {
      loading.value = false
    }
  }

  async function createQuiz(
    payload: QuizRequest,
  ): Promise<{ ok: true; quiz: Quiz | QuizDetail } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Mode API désactivé.' }
    }
    creating.value = true
    error.value = null
    try {
      const quiz = await createQuizApi(payload)
      await fetchList()
      return { ok: true, quiz }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      creating.value = false
    }
  }

  async function createNotionType(
    payload: QuizNotionTypeRequest,
  ): Promise<{ ok: true; type: QuizNotionType } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Mode API désactivé.' }
    }
    creatingNotionType.value = true
    error.value = null
    try {
      const type = await createNotionTypeApi(payload)
      await fetchNotionTypes()
      return { ok: true, type }
    } catch (e) {
      const msg = extractApiError(e)
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      creatingNotionType.value = false
    }
  }

  /** Enregistre la complétion d’un niveau (API progression). */
  async function recordLevelProgress(
    quizId: number,
    payload: QuizProgressUpdateRequest,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isApiEnabled()) {
      return { ok: false, error: 'Mode API désactivé.' }
    }
    savingProgress.value = true
    try {
      await recordQuizProgressionApi(quizId, payload)
      void fetchProgressOverview()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: extractApiError(e) }
    } finally {
      savingProgress.value = false
    }
  }

  function clearCurrent() {
    current.value = null
  }

  return {
    quizzes,
    notionTypes,
    current,
    progressOverview,
    progressByQuizId,
    loading,
    notionTypesLoading,
    progressLoading,
    creating,
    creatingNotionType,
    savingProgress,
    error,
    progressForQuiz,
    fetchList,
    fetchNotionTypes,
    fetchProgressOverview,
    fetchById,
    createQuiz,
    createNotionType,
    recordLevelProgress,
    clearCurrent,
  }
})
