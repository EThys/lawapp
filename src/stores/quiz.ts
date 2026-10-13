import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Quiz, QuizDetail, QuizNotionType, QuizRequest } from '@/api/types'
import {
  listQuizzes,
  getQuizById,
  listNotionTypes,
  createQuiz as createQuizApi,
} from '@/api/quiz'
import { extractApiError } from '@/api/client'
import { isApiEnabled } from '@/config/features'

export const useQuizStore = defineStore('quiz', () => {
  const quizzes = ref<Quiz[]>([])
  const notionTypes = ref<QuizNotionType[]>([])
  const current = ref<QuizDetail | null>(null)
  const loading = ref(false)
  const notionTypesLoading = ref(false)
  const creating = ref(false)
  const error = ref<string | null>(null)

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

  function clearCurrent() {
    current.value = null
  }

  return {
    quizzes,
    notionTypes,
    current,
    loading,
    notionTypesLoading,
    creating,
    error,
    fetchList,
    fetchNotionTypes,
    fetchById,
    createQuiz,
    clearCurrent,
  }
})
