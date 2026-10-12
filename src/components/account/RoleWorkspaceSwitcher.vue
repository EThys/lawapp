<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/auth'
import { GraduationCap, BookOpen } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    /** Barre compacte dans la navbar vs bloc plus large (compte). */
    variant?: 'navbar' | 'panel'
  }>(),
  { variant: 'navbar' },
)

const auth = useAuthStore()
const router = useRouter()

const active = computed(() => auth.activeWorkspace)
const canSwitch = computed(() => auth.canSwitchWorkspace)

function go(role: UserRole) {
  if (role === active.value) return
  if (!auth.setActiveWorkspace(role)) return
  void router.push(role === 'teacher' ? '/teacher' : '/student')
}
</script>

<template>
  <div
    v-if="canSwitch"
    class="role-workspace-switcher"
    :class="`role-workspace-switcher--${variant}`"
    role="group"
    aria-label="Changer d'espace"
  >
    <button
      type="button"
      class="role-workspace-switcher__btn"
      :class="{ 'role-workspace-switcher__btn--active': active === 'teacher' }"
      :aria-pressed="active === 'teacher'"
      title="Espace enseignant"
      @click="go('teacher')"
    >
      <GraduationCap class="w-4 h-4 shrink-0" />
      <span class="role-workspace-switcher__label">Enseignant</span>
    </button>
    <button
      type="button"
      class="role-workspace-switcher__btn"
      :class="{ 'role-workspace-switcher__btn--active': active === 'student' }"
      :aria-pressed="active === 'student'"
      title="Espace étudiant"
      @click="go('student')"
    >
      <BookOpen class="w-4 h-4 shrink-0" />
      <span class="role-workspace-switcher__label">Étudiant</span>
    </button>
  </div>
</template>

<style scoped>
.role-workspace-switcher {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--color-line);
  background: var(--color-paper-warm);
  border-radius: 0;
}

.role-workspace-switcher--navbar {
  max-width: min(100%, 16rem);
}

.role-workspace-switcher--panel {
  width: 100%;
  max-width: 22rem;
}

.role-workspace-switcher__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex: 1 1 0;
  min-height: 2.75rem;
  padding: 0.5rem 0.65rem;
  border: 0;
  background: transparent;
  color: var(--color-ink-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.role-workspace-switcher__btn + .role-workspace-switcher__btn {
  border-left: 1px solid var(--color-line);
}

.role-workspace-switcher__btn:hover {
  background: rgb(255 255 255 / 0.65);
  color: var(--color-ink);
}

.role-workspace-switcher__btn--active {
  background: white;
  color: var(--color-ink);
  box-shadow: inset 0 -2px 0 var(--color-accent);
}

.role-workspace-switcher--navbar .role-workspace-switcher__label {
  display: none;
}

@media (min-width: 768px) {
  .role-workspace-switcher--navbar .role-workspace-switcher__label {
    display: inline;
  }
}
</style>
