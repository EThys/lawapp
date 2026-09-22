<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useLegalFeedStore } from '@/stores/legalFeed'
import { useAuthStore } from '@/stores/auth'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerFeed from '@/components/loading/AppShimmerFeed.vue'
import {
  DISCOVER_COMMENTS_KEY,
  formatCommentDate,
  getInitials,
  type LegalComment,
  type LegalFeedItem,
} from '@/data/legalFeed'
import { generateId } from '@/utils/helpers'

const feedStore = useLegalFeedStore()
const auth = useAuthStore()
const { showShimmer: feedShimmer } = useServerShimmer(computed(() => feedStore.loading))

const feedItems = computed(() => feedStore.feedItems)

const activeId = ref('')
const commentsOpen = ref(false)
const localLiked = ref<Set<string>>(new Set())
const revealedQuiz = ref<Set<string>>(new Set())
const userComments = ref<Record<string, LegalComment[]>>({})
const newComment = ref('')
const commentAuthor = ref('Visiteur')
const feedRef = ref<HTMLElement | null>(null)

const activeItem = computed(
  () => feedItems.value.find((i) => i.id === activeId.value) ?? feedItems.value[0],
)

const allComments = computed(() => {
  if (!activeItem.value) return []
  const seeded = activeItem.value.comments
  const extra = userComments.value[activeItem.value.id] ?? []
  return [...seeded, ...extra].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
})

function loadUserComments() {
  try {
    const raw = localStorage.getItem(DISCOVER_COMMENTS_KEY)
    if (raw) userComments.value = JSON.parse(raw)
  } catch {
    userComments.value = {}
  }
}

function persistUserComments() {
  localStorage.setItem(DISCOVER_COMMENTS_KEY, JSON.stringify(userComments.value))
}

function isLiked(item: LegalFeedItem): boolean {
  if (item.apiContenuId) return feedStore.isLiked(item)
  return localLiked.value.has(item.id)
}

function likeCount(item: LegalFeedItem): number {
  if (item.apiContenuId) return feedStore.displayLikeCount(item)
  return item.likes + (localLiked.value.has(item.id) ? 1 : 0)
}

async function toggleLike(item: LegalFeedItem) {
  if (item.apiContenuId && auth.isAuthenticated) {
    await feedStore.toggleLike(item)
    return
  }
  const next = new Set(localLiked.value)
  if (next.has(item.id)) next.delete(item.id)
  else next.add(item.id)
  localLiked.value = next
}

function toggleQuiz(id: string) {
  const next = new Set(revealedQuiz.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  revealedQuiz.value = next
}

function openComments(id?: string) {
  if (id) activeId.value = id
  commentsOpen.value = true
}

function closeComments() {
  commentsOpen.value = false
  newComment.value = ''
}

async function submitComment() {
  const text = newComment.value.trim()
  if (!text || !activeItem.value) return

  const author = commentAuthor.value.trim() || 'Visiteur'
  const added = await feedStore.addComment(activeItem.value, text, author)

  if (!added && !activeItem.value.apiContenuId) {
    const comment: LegalComment = {
      id: generateId(),
      author,
      text,
      createdAt: new Date().toISOString(),
    }
    const id = activeItem.value.id
    if (!userComments.value[id]) userComments.value[id] = []
    userComments.value[id].push(comment)
    userComments.value = { ...userComments.value }
    persistUserComments()
  }

  newComment.value = ''
}

let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
  if (!feedRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          const id = entry.target.getAttribute('data-id')
          if (id) activeId.value = id
        }
      }
    },
    { threshold: [0.55, 0.7] },
  )
  feedRef.value.querySelectorAll('[data-id]').forEach((el) => observer!.observe(el))
}

onMounted(async () => {
  loadUserComments()
  await feedStore.sync()
  if (feedItems.value[0]) activeId.value = feedItems.value[0].id
  await nextTick()
  setupObserver()
})

watch(feedItems, async () => {
  if (!activeId.value && feedItems.value[0]) activeId.value = feedItems.value[0].id
  await nextTick()
  setupObserver()
})

watch(
  () => auth.isAuthenticated,
  () => {
    void feedStore.sync()
  },
)

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="discover-app">
    <header class="discover-top">
      <RouterLink to="/" class="discover-back">Accueil</RouterLink>
      <div class="discover-brand">
        <span class="discover-brand-title">Droit Ludique</span>
        <span class="discover-brand-sub">
          {{ feedStore.source === 'api' ? 'Fil en direct' : 'Fil juridique' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink to="/quiz" class="discover-comments-toggle">Quiz</RouterLink>
        <button type="button" class="discover-comments-toggle" @click="openComments()">
          Commentaires
        </button>
      </div>
    </header>

    <p
      v-if="!feedShimmer && !auth.isAuthenticated"
      class="text-center text-xs text-ink-muted py-2 px-4"
    >
      Connectez-vous pour le fil en direct · démo locale affichée
    </p>

    <AppShimmerFeed v-if="feedShimmer" :slides="3" />

    <div v-else class="discover-body" :class="{ 'discover-body--panel-open': commentsOpen }">
      <div ref="feedRef" class="discover-feed">
        <article
          v-for="(item, index) in feedItems"
          :key="item.id"
          :data-id="item.id"
          class="discover-slide"
          :style="item.backgroundColor ? { background: item.backgroundColor } : undefined"
        >
          <div class="discover-slide-inner">
            <div class="discover-meta">
              <span class="discover-category">{{ item.category }}</span>
              <span class="discover-audience">{{ item.audience }}</span>
            </div>

            <p class="discover-hook">{{ item.hook }}</p>
            <h2 class="discover-title">{{ item.title }}</h2>
            <p class="discover-content">{{ item.content }}</p>

            <div v-if="item.quiz" class="discover-quiz">
              <button type="button" class="discover-quiz-btn" @click="toggleQuiz(item.id)">
                {{ revealedQuiz.has(item.id) ? 'Masquer le quiz' : 'Quiz rapide' }}
              </button>
              <div v-if="revealedQuiz.has(item.id)" class="discover-quiz-box">
                <p class="discover-quiz-q">{{ item.quiz.question }}</p>
                <p class="discover-quiz-a">{{ item.quiz.answer }}</p>
              </div>
            </div>

            <div class="discover-slide-footer">
              <button
                type="button"
                class="discover-stat"
                :class="isLiked(item) ? 'discover-stat--active' : ''"
                @click="toggleLike(item)"
              >
                J'aime · {{ likeCount(item) }}
              </button>
              <button type="button" class="discover-stat" @click="openComments(item.id)">
                Commentaires · {{ item.comments.length + (userComments[item.id]?.length ?? 0) }}
              </button>
            </div>
          </div>

          <p v-if="index < feedItems.length - 1" class="discover-scroll-tip">Glisser vers le haut</p>
        </article>
      </div>

      <aside class="discover-panel" :class="{ 'discover-panel--open': commentsOpen }">
        <div class="discover-panel-head">
          <div>
            <p class="discover-panel-label">Commentaires</p>
            <p class="discover-panel-topic">{{ activeItem?.title }}</p>
          </div>
          <button type="button" class="discover-panel-close" @click="closeComments">Fermer</button>
        </div>

        <div class="discover-panel-list">
          <p v-if="allComments.length === 0" class="discover-panel-empty">
            Aucun commentaire. Soyez le premier à réagir.
          </p>
          <article v-for="c in allComments" :key="c.id" class="discover-comment">
            <div class="discover-comment-avatar">{{ getInitials(c.author) }}</div>
            <div class="discover-comment-body">
              <div class="discover-comment-head">
                <span class="discover-comment-author">{{ c.author }}</span>
                <span class="discover-comment-time">{{ formatCommentDate(c.createdAt) }}</span>
              </div>
              <p class="discover-comment-text">{{ c.text }}</p>
            </div>
          </article>
        </div>

        <form class="discover-panel-form" @submit.prevent="submitComment">
          <input
            v-model="commentAuthor"
            type="text"
            placeholder="Votre nom"
            class="discover-panel-input discover-panel-input--sm"
          />
          <textarea
            v-model="newComment"
            rows="2"
            placeholder="Ajouter un commentaire…"
            class="discover-panel-input"
          />
          <button type="submit" class="discover-panel-submit" :disabled="!newComment.trim()">
            Publier
          </button>
        </form>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.discover-app {
  min-height: 100dvh;
  background: linear-gradient(180deg, #0a2f6b 0%, #0d47a1 40%, #0f172a 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.discover-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.12);
  background: rgb(10 47 107 / 0.85);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.discover-back,
.discover-comments-toggle {
  font-size: 0.8125rem;
  color: rgb(255 255 255 / 0.85);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.discover-back:hover,
.discover-comments-toggle:hover {
  color: #fff;
}

.discover-brand {
  text-align: center;
  flex: 1;
  min-width: 0;
}

.discover-brand-title {
  display: block;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
}

.discover-brand-sub {
  display: block;
  font-size: 0.6875rem;
  color: rgb(255 255 255 / 0.65);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.discover-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
}

.discover-body--panel-open {
  grid-template-columns: 1fr min(360px, 42vw);
}

.discover-feed {
  height: calc(100dvh - 3.5rem);
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.discover-feed::-webkit-scrollbar {
  display: none;
}

.discover-slide {
  min-height: calc(100dvh - 3.5rem);
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.5rem 1.25rem 2rem;
  position: relative;
}

.discover-slide-inner {
  max-width: 36rem;
  margin: 0 auto;
  width: 100%;
}

.discover-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.discover-category,
.discover-audience {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.25rem 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.25);
  border-radius: 999px;
}

.discover-hook {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 0.75rem;
  color: #93c5fd;
}

.discover-title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 1rem;
}

.discover-content {
  font-size: 1rem;
  line-height: 1.65;
  color: rgb(255 255 255 / 0.9);
  margin-bottom: 1.25rem;
}

.discover-quiz {
  margin-bottom: 1.25rem;
}

.discover-quiz-btn {
  font-size: 0.8125rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid rgb(255 255 255 / 0.35);
  background: rgb(255 255 255 / 0.08);
  color: #fff;
  cursor: pointer;
}

.discover-quiz-box {
  margin-top: 0.75rem;
  padding: 0.875rem;
  background: rgb(0 0 0 / 0.25);
  border-left: 3px solid #60a5fa;
}

.discover-quiz-q {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.discover-quiz-a {
  font-size: 0.875rem;
  color: #bfdbfe;
}

.discover-slide-footer {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.discover-stat {
  font-size: 0.8125rem;
  padding: 0.5rem 0.75rem;
  background: rgb(255 255 255 / 0.1);
  border: 1px solid rgb(255 255 255 / 0.2);
  color: #fff;
  cursor: pointer;
}

.discover-stat--active {
  background: rgb(25 118 210 / 0.45);
  border-color: #60a5fa;
}

.discover-scroll-tip {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6875rem;
  color: rgb(255 255 255 / 0.45);
  animation: discover-bounce 2s ease infinite;
}

@keyframes discover-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-4px); }
}

.discover-panel {
  display: none;
  flex-direction: column;
  background: #fff;
  color: var(--color-ink);
  border-left: 1px solid var(--color-line);
  height: calc(100dvh - 3.5rem);
}

.discover-panel--open {
  display: flex;
}

.discover-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-line);
}

.discover-panel-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-ink-faint);
}

.discover-panel-topic {
  font-weight: 600;
  font-size: 0.9375rem;
}

.discover-panel-close {
  font-size: 0.8125rem;
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
}

.discover-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.discover-panel-empty {
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.discover-comment {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.discover-comment-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  flex-shrink: 0;
}

.discover-comment-head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.discover-comment-author {
  font-size: 0.8125rem;
  font-weight: 600;
}

.discover-comment-time {
  font-size: 0.6875rem;
  color: var(--color-ink-faint);
}

.discover-comment-text {
  font-size: 0.875rem;
  line-height: 1.5;
}

.discover-panel-form {
  padding: 1rem;
  border-top: 1px solid var(--color-line);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.discover-panel-input {
  width: 100%;
  border: 1px solid var(--color-line);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  resize: vertical;
}

.discover-panel-input--sm {
  resize: none;
}

.discover-panel-submit {
  padding: 0.625rem;
  background: var(--color-accent);
  color: #fff;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.discover-panel-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .discover-body--panel-open {
    grid-template-columns: 1fr;
  }

  .discover-panel {
    position: fixed;
    inset: 0;
    top: 3.5rem;
    z-index: 30;
    height: auto;
  }
}
</style>
