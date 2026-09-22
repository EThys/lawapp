import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LEGAL_FEED, type LegalFeedItem, type LegalComment } from '@/data/legalFeed'
import { isApiEnabled } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import * as feedApi from '@/api/feed'
import { buildFeedFromApi } from '@/utils/feedMapper'
import { extractApiError } from '@/api/client'
import { generateId } from '@/utils/helpers'

export const useLegalFeedStore = defineStore('legalFeed', () => {
  const items = ref<LegalFeedItem[]>([...LEGAL_FEED])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const source = ref<'local' | 'api' | 'mixed'>('local')
  const likedContenuIds = ref<Set<number>>(new Set())

  const feedItems = computed(() => items.value)

  async function sync() {
    if (!isApiEnabled()) {
      items.value = [...LEGAL_FEED]
      source.value = 'local'
      return
    }

    const auth = useAuthStore()
    if (!auth.isAuthenticated) {
      items.value = [...LEGAL_FEED]
      source.value = 'local'
      return
    }

    loading.value = true
    error.value = null
    try {
      const [contenus, statuses, commentaires, likes] = await Promise.all([
        feedApi.listContenus().catch(() => []),
        feedApi.listStatuses().catch(() => []),
        feedApi.listCommentaires().catch(() => []),
        feedApi.listLikes().catch(() => []),
      ])

      const apiItems = buildFeedFromApi({ contenus, statuses, commentaires, likes })
      if (apiItems.length > 0) {
        items.value = apiItems
        source.value = 'api'
        const userId = auth.currentUser?.apiUserId
        if (userId) {
          likedContenuIds.value = new Set(
            likes.filter((l) => l.userId === userId && l.like !== false).map((l) => l.contenuId),
          )
        }
      } else {
        items.value = [...LEGAL_FEED]
        source.value = 'local'
      }
    } catch (e) {
      error.value = extractApiError(e)
      items.value = [...LEGAL_FEED]
      source.value = 'local'
    } finally {
      loading.value = false
    }
  }

  function isLiked(item: LegalFeedItem): boolean {
    if (!item.apiContenuId) return false
    return likedContenuIds.value.has(item.apiContenuId)
  }

  function displayLikeCount(item: LegalFeedItem): number {
    return item.likes + (isLiked(item) ? 1 : 0)
  }

  async function toggleLike(item: LegalFeedItem) {
    const auth = useAuthStore()
    if (!item.apiContenuId || !auth.currentUser?.apiUserId) return false

    const id = item.apiContenuId
    const next = new Set(likedContenuIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    likedContenuIds.value = next

    try {
      await feedApi.createLike(id, auth.currentUser.apiUserId)
      return true
    } catch {
      const rollback = new Set(likedContenuIds.value)
      if (rollback.has(id)) rollback.delete(id)
      else rollback.add(id)
      likedContenuIds.value = rollback
      return false
    }
  }

  async function addComment(item: LegalFeedItem, text: string, author: string): Promise<LegalComment | null> {
    const auth = useAuthStore()
    if (!item.apiContenuId || !auth.currentUser?.apiUserId) {
      const local: LegalComment = {
        id: generateId(),
        author,
        text,
        createdAt: new Date().toISOString(),
      }
      const idx = items.value.findIndex((i) => i.id === item.id)
      if (idx >= 0) {
        items.value[idx] = {
          ...items.value[idx],
          comments: [...items.value[idx].comments, local],
        }
        items.value = [...items.value]
      }
      return local
    }

    try {
      await feedApi.createCommentaire(item.apiContenuId, auth.currentUser.apiUserId, text)
      const comment: LegalComment = {
        id: generateId(),
        author: auth.currentUser.firstName
          ? `${auth.currentUser.firstName} ${auth.currentUser.lastName[0] ?? ''}.`
          : author,
        text,
        createdAt: new Date().toISOString(),
      }
      const idx = items.value.findIndex((i) => i.id === item.id)
      if (idx >= 0) {
        items.value[idx] = {
          ...items.value[idx],
          comments: [...items.value[idx].comments, comment],
        }
        items.value = [...items.value]
      }
      return comment
    } catch {
      return null
    }
  }

  return {
    items,
    feedItems,
    loading,
    error,
    source,
    sync,
    isLiked,
    displayLikeCount,
    toggleLike,
    addComment,
  }
})
