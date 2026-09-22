<script setup lang="ts">
import TeacherSidebar from './TeacherSidebar.vue'
import TeacherNavbar from './TeacherNavbar.vue'
import { useTeacherShell } from './useTeacherShell'
import { ADMIN_SIDEBAR_STORAGE_KEY } from '@/packages/admin-shell/nav'
import { TEACHER_SIDEBAR_STORAGE_KEY } from './nav'

const props = withDefaults(
  defineProps<{
    variant?: 'teacher' | 'admin'
  }>(),
  { variant: 'teacher' },
)

const {
  collapsed,
  mobileOpen,
  toggleCollapsed,
  openMobile,
  closeMobile,
} = useTeacherShell(
  props.variant === 'admin' ? ADMIN_SIDEBAR_STORAGE_KEY : TEACHER_SIDEBAR_STORAGE_KEY,
)
</script>

<template>
  <div
    class="teacher-shell"
    :class="{
      'teacher-shell--collapsed': collapsed,
      'teacher-shell--drawer': mobileOpen,
    }"
  >
    <div class="teacher-shell__sidebar-slot">
      <TeacherSidebar
        :collapsed="collapsed"
        :variant="variant"
        @update:collapsed="collapsed = $event"
        @close-mobile="closeMobile"
      />
    </div>

    <div
      v-if="mobileOpen"
      class="teacher-shell__backdrop"
      role="presentation"
      @click="closeMobile"
    />

    <div class="teacher-shell__content">
      <TeacherNavbar
        :collapsed="collapsed"
        :variant="variant"
        @open-mobile="openMobile"
        @toggle-collapsed="toggleCollapsed"
      />
      <div class="teacher-shell__main">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.teacher-shell {
  --sidebar-w: 16.25rem;
  --sidebar-w-collapsed: 4.75rem;
  display: grid;
  grid-template-columns: 1fr;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  background:
    radial-gradient(
      ellipse 70% 45% at 100% 0%,
      color-mix(in srgb, var(--color-accent-light) 70%, white),
      transparent 55%
    ),
    var(--color-paper);
}

.teacher-shell__sidebar-slot {
  position: fixed;
  z-index: 50;
  inset: 0 auto 0 0;
  width: min(17.5rem, 86vw);
  transform: translateX(-110%);
  transition: transform 0.22s ease, width 0.2s ease;
}

.teacher-shell--drawer .teacher-shell__sidebar-slot {
  transform: translateX(0);
}

.teacher-shell__backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  border: 0;
  background: rgb(15 23 42 / 0.45);
  cursor: pointer;
}

.teacher-shell__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
}

.teacher-shell__main {
  flex: 1;
  min-width: 0;
  width: 100%;
}

@media (min-width: 1024px) {
  .teacher-shell {
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  }

  .teacher-shell--collapsed {
    grid-template-columns: var(--sidebar-w-collapsed) minmax(0, 1fr);
  }

  .teacher-shell__sidebar-slot {
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    width: auto;
    transform: none;
    grid-row: 1 / -1;
  }

  .teacher-shell--collapsed .teacher-shell__sidebar-slot {
    width: var(--sidebar-w-collapsed);
  }

  .teacher-shell__backdrop {
    display: none;
  }
}
</style>
