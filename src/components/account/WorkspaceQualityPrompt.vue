<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { GraduationCap, BookOpen, X } from '@lucide/vue'

const props = defineProps<{
  target: 'teacher' | 'student'
}>()

const auth = useAuthStore()
const dismissed = ref(false)

const storageKey = computed(
  () => `lawapp_ws_prompt_${props.target}_${auth.currentUser?.id ?? 'anon'}`,
)

const copy = computed(() =>
  props.target === 'teacher'
    ? { title: 'Profil enseignant', to: '/teacher/profile', icon: GraduationCap }
    : { title: 'Profil étudiant', to: '/student/profile', icon: BookOpen },
)

function loadDismissed() {
  if (!storageKey.value) return
  dismissed.value = localStorage.getItem(storageKey.value) === '1'
}

function dismiss() {
  dismissed.value = true
  localStorage.setItem(storageKey.value, '1')
}

watch(storageKey, loadDismissed, { immediate: true })
</script>

<template>
  <div
    v-if="!dismissed"
    class="ws-quality-prompt"
    role="status"
  >
    <component :is="copy.icon" class="ws-quality-prompt__icon" aria-hidden="true" />
    <p class="ws-quality-prompt__text">
      <RouterLink :to="copy.to" class="ws-quality-prompt__link">{{ copy.title }}</RouterLink>
      <span class="ws-quality-prompt__muted"> · optionnel</span>
    </p>
    <div class="ws-quality-prompt__actions">
      <RouterLink :to="copy.to" class="ws-quality-prompt__go">Activer</RouterLink>
      <button type="button" class="ws-quality-prompt__skip" @click="dismiss">
        Plus tard
      </button>
      <button type="button" class="ws-quality-prompt__close" aria-label="Fermer" @click="dismiss">
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ws-quality-prompt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-accent-light) 40%, white);
}

.ws-quality-prompt__icon {
  width: 1.125rem;
  height: 1.125rem;
  color: var(--color-brand);
  flex-shrink: 0;
}

.ws-quality-prompt__text {
  flex: 1;
  min-width: 10rem;
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--color-ink);
}

.ws-quality-prompt__link {
  font-weight: 600;
  color: var(--color-brand-dark);
  text-decoration: none;
}

.ws-quality-prompt__link:hover {
  color: var(--color-accent);
}

.ws-quality-prompt__muted {
  color: var(--color-ink-muted);
}

.ws-quality-prompt__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}

.ws-quality-prompt__go {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-brand);
  text-decoration: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.35rem;
  background: white;
  border: 1px solid var(--color-line);
}

.ws-quality-prompt__go:hover {
  border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-line));
}

.ws-quality-prompt__skip {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-ink-muted);
  padding: 0.25rem 0.35rem;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.ws-quality-prompt__skip:hover {
  color: var(--color-ink);
}

.ws-quality-prompt__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border: 0;
  background: transparent;
  color: var(--color-ink-faint);
  cursor: pointer;
  border-radius: 0.25rem;
}

.ws-quality-prompt__close:hover {
  color: var(--color-ink-muted);
  background: rgb(255 255 255 / 0.7);
}
</style>
