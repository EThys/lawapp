<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import {
  LEGAL_FEED,
  DISCOVER_COMMENTS_KEY,
  formatCommentDate,
  getInitials,
  type LegalComment,
} from '@/data/legalFeed'
import { generateId } from '@/utils/helpers'

const activeId = ref(LEGAL_FEED[0].id)
const commentsOpen = ref(false)
const liked = ref<Set<string>>(new Set())
const likeCounts = ref<Record<string, number>>({})
const revealedQuiz = ref<Set<string>>(new Set())
const userComments = ref<Record<string, LegalComment[]>>({})
const newComment = ref('')
const commentAuthor = ref('Visiteur')
const feedRef = ref<HTMLElement | null>(null)

const activeItem = computed(() => LEGAL_FEED.find((i) => i.id === activeId.value) ?? LEGAL_FEED[0])

const allComments = computed(() => {
  const seeded = activeItem.value.comments
  const extra = userComments.value[activeItem.value.id] ?? []
  return [...seeded, ...extra].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
})

function initLikeCounts() {
  const map: Record<string, number> = {}
  for (const item of LEGAL_FEED) map[item.id] = item.likes
  likeCounts.value = map
}

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

function toggleLike(id: string) {
  const next = new Set(liked.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  liked.value = next
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

function submitComment() {
  const text = newComment.value.trim()
  if (!text) return

  const comment: LegalComment = {
    id: generateId(),
    author: commentAuthor.value.trim() || 'Visiteur',
    text,
    createdAt: new Date().toISOString(),
  }

  const id = activeItem.value.id
  if (!userComments.value[id]) userComments.value[id] = []
  userComments.value[id].push(comment)
  userComments.value = { ...userComments.value }
  persistUserComments()
  newComment.value = ''
}

let observer: IntersectionObserver | null = null

onMounted(async () => {
  initLikeCounts()
  loadUserComments()

  await nextTick()
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
    { threshold: [0.55, 0.7] }
  )

  feedRef.value.querySelectorAll('[data-id]').forEach((el) => observer!.observe(el))
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="discover-app">
    <header class="discover-top">
      <RouterLink to="/" class="discover-back">Accueil</RouterLink>
      <div class="discover-brand">
        <span class="discover-brand-title">Droit Ludique</span>
        <span class="discover-brand-sub">Fil juridique</span>
      </div>
      <button type="button" class="discover-comments-toggle" @click="openComments()">
        Commentaires
      </button>
    </header>

    <div class="discover-body" :class="{ 'discover-body--panel-open': commentsOpen }">
      <div ref="feedRef" class="discover-feed">
        <article
          v-for="(item, index) in LEGAL_FEED"
          :key="item.id"
          :data-id="item.id"
          class="discover-slide"
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
                :class="liked.has(item.id) ? 'discover-stat--active' : ''"
                @click="toggleLike(item.id)"
              >
                J'aime · {{ (likeCounts[item.id] ?? item.likes) + (liked.has(item.id) ? 1 : 0) }}
              </button>
              <button type="button" class="discover-stat" @click="openComments(item.id)">
                Commentaires · {{ item.comments.length + (userComments[item.id]?.length ?? 0) }}
              </button>
            </div>
          </div>

          <p v-if="index < LEGAL_FEED.length - 1" class="discover-scroll-tip">Glisser vers le haut</p>
        </article>
      </div>

      <aside class="discover-panel" :class="{ 'discover-panel--open': commentsOpen }">
        <div class="discover-panel-head">
          <div>
            <p class="discover-panel-label">Commentaires</p>
            <p class="discover-panel-topic">{{ activeItem.title }}</p>
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
            class="discover-input discover-input--sm"
            placeholder="Votre prénom"
            maxlength="32"
          />
          <textarea
            v-model="newComment"
            class="discover-input discover-input--area"
            rows="2"
            placeholder="Écrire un commentaire…"
            maxlength="400"
          />
          <button type="submit" class="discover-submit" :disabled="!newComment.trim()">
            Publier
          </button>
        </form>
      </aside>
    </div>

    <div
      v-if="commentsOpen"
      class="discover-overlay lg:hidden"
      @click="closeComments"
    />
  </div>
</template>

<style scoped>
.discover-app {
  height: 100dvh;
  background: var(--color-green-darker);
  color: white;
  overflow: hidden;
}

.discover-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--color-green-darker) 95%, transparent), color-mix(in srgb, var(--color-green-darker) 60%, transparent));
  border-bottom: 1px solid rgb(255 255 255 / 0.06);
}

.discover-back {
  font-size: 0.8125rem;
  color: rgb(255 255 255 / 0.65);
  transition: color 0.2s;
}

.discover-back:hover {
  color: white;
}

.discover-brand {
  text-align: center;
}

.discover-brand-title {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.discover-brand-sub {
  display: block;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgb(255 255 255 / 0.4);
  margin-top: 0.1rem;
}

.discover-comments-toggle {
  justify-self: end;
  font-size: 0.75rem;
  color: var(--color-accent-muted);
  padding: 0.35rem 0.5rem;
}

.discover-body {
  display: flex;
  height: 100dvh;
  padding-top: 3.25rem;
}

.discover-feed {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.discover-slide {
  position: relative;
  min-height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.25rem 1rem 2rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.06);
}

.discover-slide-inner {
  max-width: 32rem;
  margin: 0 auto;
  width: 100%;
  padding-left: 0.875rem;
  border-left: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
}

.discover-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.discover-category,
.discover-audience {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.2rem 0.45rem;
  border: 1px solid rgb(255 255 255 / 0.15);
  color: rgb(255 255 255 / 0.55);
}

.discover-audience {
  border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
  color: var(--color-accent-muted);
}

.discover-hook {
  font-size: 0.8125rem;
  color: var(--color-accent-muted);
  margin-bottom: 0.5rem;
}

.discover-title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 4vw, 2rem);
  line-height: 1.15;
  margin-bottom: 0.75rem;
}

.discover-content {
  font-size: 0.9375rem;
  line-height: 1.65;
  color: rgb(255 255 255 / 0.72);
}

.discover-quiz {
  margin-top: 1.25rem;
}

.discover-quiz-btn {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.discover-quiz-box {
  margin-top: 0.65rem;
  padding: 0.75rem 0.875rem;
  background: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.1);
}

.discover-quiz-q {
  font-size: 0.8125rem;
  font-weight: 500;
}

.discover-quiz-a {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: rgb(74 222 128 / 0.85);
}

.discover-slide-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(255 255 255 / 0.08);
}

.discover-stat {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.45rem 0.65rem;
  border: 1px solid rgb(255 255 255 / 0.12);
  background: rgb(255 255 255 / 0.04);
  color: rgb(255 255 255 / 0.75);
  transition: background 0.2s, border-color 0.2s;
}

.discover-stat:hover {
  background: rgb(255 255 255 / 0.08);
}

.discover-stat--active {
  border-color: rgb(220 80 80 / 0.5);
  color: rgb(255 180 180);
}

.discover-scroll-tip {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgb(255 255 255 / 0.25);
}

.discover-panel {
  position: fixed;
  z-index: 50;
  right: 0;
  bottom: 0;
  width: 100%;
  max-height: 72dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-paper);
  color: var(--color-ink);
  border-top: 1px solid var(--color-line);
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.discover-panel--open {
  transform: translateY(0);
}

.discover-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-line);
}

.discover-panel-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.discover-panel-topic {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--color-ink);
  margin-top: 0.15rem;
}

.discover-panel-close {
  font-size: 0.75rem;
  color: var(--color-ink-muted);
  padding: 0.25rem;
}

.discover-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  min-height: 8rem;
  max-height: 40dvh;
}

.discover-panel-empty {
  font-size: 0.8125rem;
  color: var(--color-ink-faint);
  text-align: center;
  padding: 2rem 0;
}

.discover-comment {
  display: flex;
  gap: 0.65rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--color-line);
}

.discover-comment:last-child {
  border-bottom: none;
}

.discover-comment-avatar {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  background: var(--color-green-dark);
  color: white;
}

.discover-comment-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.discover-comment-author {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink);
}

.discover-comment-time {
  font-size: 0.6875rem;
  color: var(--color-ink-faint);
}

.discover-comment-text {
  margin-top: 0.2rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

.discover-panel-form {
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid var(--color-line);
  background: white;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.discover-input {
  width: 100%;
  padding: 0.55rem 0.65rem;
  font-size: 0.8125rem;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  color: var(--color-ink);
}

.discover-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.discover-input--area {
  resize: vertical;
  min-height: 3.5rem;
}

.discover-submit {
  align-self: flex-end;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-accent);
  color: white;
  transition: background 0.2s;
}

.discover-submit:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.discover-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.discover-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgb(5 46 22 / 0.5);
}

@media (min-width: 1024px) {
  .discover-body--panel-open .discover-feed {
    margin-right: 22rem;
  }

  .discover-panel {
    top: 3.25rem;
    bottom: 0;
    max-height: none;
    width: 22rem;
    border-top: none;
    border-left: 1px solid var(--color-line);
    transform: translateX(100%);
  }

  .discover-panel--open {
    transform: translateX(0);
  }

  .discover-panel-list {
    max-height: none;
  }

  .discover-slide {
    padding-right: 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .discover-panel {
    transition: none;
  }
}
</style>
