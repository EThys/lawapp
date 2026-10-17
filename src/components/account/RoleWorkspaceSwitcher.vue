<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/auth'
import { GraduationCap, BookOpen } from '@lucide/vue'
import { appToast } from '@/utils/toast'

const props = withDefaults(
  defineProps<{
    variant?: 'navbar' | 'panel' | 'icons'
  }>(),
  { variant: 'navbar' },
)

const auth = useAuthStore()
const router = useRouter()

const active = computed(() => auth.activeWorkspace)
const visible = computed(() => auth.showWorkspaceSwitcher)
const switching = ref(false)

const thumbStyle = computed(() => ({
  transform: active.value === 'student' ? 'translateX(0%)' : 'translateX(100%)',
}))

function hasQuality(role: UserRole): boolean {
  return role === 'teacher' ? auth.hasTeacherQuality : auth.hasStudentQuality
}

function profilePath(role: UserRole): string {
  return role === 'teacher' ? '/teacher/profile' : '/student/profile'
}

async function go(role: UserRole) {
  if (switching.value) return

  if (!hasQuality(role)) {
    appToast.info(
      role === 'teacher'
        ? 'Activez d’abord votre profil enseignant pour basculer.'
        : 'Activez d’abord votre profil étudiant pour basculer.',
    )
    await router.push(profilePath(role))
    return
  }

  if (role === active.value) return
  if (!auth.canSwitchWorkspace) return

  switching.value = true
  try {
    const ok = await auth.setActiveWorkspace(role)
    if (!ok) return
    await router.push(role === 'teacher' ? '/teacher' : '/student')
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="workspace-segment"
    :class="[
      `workspace-segment--${variant}`,
      { 'workspace-segment--busy': switching, 'workspace-segment--partial': !auth.canSwitchWorkspace },
    ]"
    role="tablist"
    aria-label="Basculer entre espace enseignant et espace étudiant"
  >
    <div class="workspace-segment__track">
      <div
        class="workspace-segment__thumb"
        :class="{ 'workspace-segment__thumb--solo': !auth.canSwitchWorkspace }"
        :style="thumbStyle"
        aria-hidden="true"
      />
      <button
        type="button"
        role="tab"
        class="workspace-segment__tab"
        :class="{
          'workspace-segment__tab--active': active === 'student',
          'workspace-segment__tab--ready': hasQuality('student') && active !== 'student',
          'workspace-segment__tab--needs-setup': !hasQuality('student'),
        }"
        :aria-selected="active === 'student'"
        :disabled="switching"
        :title="hasQuality('student') ? 'Espace étudiant' : 'Activer le profil étudiant'"
        @click="go('student')"
      >
        <BookOpen class="workspace-segment__icon" aria-hidden="true" />
        <span v-if="variant !== 'icons'" class="workspace-segment__label">Étudiant</span>
        <span v-if="variant === 'icons'" class="sr-only">Espace étudiant</span>
      </button>
      <button
        type="button"
        role="tab"
        class="workspace-segment__tab"
        :class="{
          'workspace-segment__tab--active': active === 'teacher',
          'workspace-segment__tab--ready': hasQuality('teacher') && active !== 'teacher',
          'workspace-segment__tab--needs-setup': !hasQuality('teacher'),
        }"
        :aria-selected="active === 'teacher'"
        :disabled="switching"
        :title="hasQuality('teacher') ? 'Espace enseignant' : 'Activer le profil enseignant'"
        @click="go('teacher')"
      >
        <GraduationCap class="workspace-segment__icon" aria-hidden="true" />
        <span v-if="variant !== 'icons'" class="workspace-segment__label">Enseignant</span>
        <span v-if="variant === 'icons'" class="sr-only">Espace enseignant</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.workspace-segment {
  --ws-track: color-mix(in srgb, var(--color-accent-light) 50%, white);
  --ws-track-border: color-mix(in srgb, var(--color-accent) 28%, var(--color-line));
  --ws-thumb-shadow: 0 2px 10px rgb(25 118 210 / 0.38);
}

.workspace-segment--navbar {
  max-width: min(100%, 15.5rem);
}

.workspace-segment--panel {
  width: 100%;
  max-width: 22rem;
}

.workspace-segment--icons {
  width: auto;
}

.workspace-segment--icons .workspace-segment__track {
  min-height: 2.25rem;
  width: 5.75rem;
}

.workspace-segment--icons .workspace-segment__tab {
  padding: 0.35rem;
}

.workspace-segment--icons .workspace-segment__icon {
  width: 1.05rem;
  height: 1.05rem;
}

.workspace-segment__track {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  padding: 3px;
  border-radius: 9999px;
  background: var(--ws-track);
  border: 1px solid var(--ws-track-border);
  min-height: 2.25rem;
  box-shadow: inset 0 1px 2px rgb(25 118 210 / 0.06);
}

.workspace-segment--panel .workspace-segment__track {
  min-height: 2.75rem;
}

.workspace-segment__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  border-radius: 9999px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-accent) 92%, white) 0%,
    var(--color-accent) 100%
  );
  box-shadow: var(--ws-thumb-shadow);
  transition:
    transform 0.28s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.2s ease;
  pointer-events: none;
}

.workspace-segment__thumb--solo {
  opacity: 1;
}

.workspace-segment__tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--color-ink-muted) 88%, var(--color-accent));
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    color 0.2s ease,
    opacity 0.2s ease,
    transform 0.15s ease;
  border-radius: 9999px;
}

.workspace-segment__tab:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.workspace-segment__tab--active {
  color: #fff;
}

.workspace-segment__tab--active .workspace-segment__icon {
  color: #fff;
}

.workspace-segment__tab--ready {
  color: var(--color-accent);
  opacity: 0.85;
}

.workspace-segment__tab--ready:hover {
  opacity: 1;
  color: var(--color-accent-hover);
}

.workspace-segment__tab--needs-setup:not(.workspace-segment__tab--active) {
  opacity: 0.45;
  color: var(--color-ink-faint);
}

.workspace-segment--partial .workspace-segment__tab--needs-setup:not(.workspace-segment__tab--active) {
  opacity: 0.55;
}

.workspace-segment--partial .workspace-segment__tab--needs-setup:not(.workspace-segment__tab--active):hover {
  opacity: 0.75;
  color: var(--color-accent);
}

.workspace-segment__tab:disabled {
  cursor: wait;
  opacity: 0.85;
}

.workspace-segment__icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.workspace-segment--navbar .workspace-segment__label {
  display: none;
}

@media (min-width: 768px) {
  .workspace-segment--navbar .workspace-segment__label {
    display: inline;
  }

  .workspace-segment--navbar .workspace-segment__tab {
    font-size: 0.75rem;
  }
}

.workspace-segment--busy .workspace-segment__thumb {
  opacity: 0.92;
}
</style>
