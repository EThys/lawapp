<script setup lang="ts">
import StudentSidebar from './StudentSidebar.vue'
import StudentNavbar from './StudentNavbar.vue'
import { useStudentShell } from './useStudentShell'

const {
  collapsed,
  mobileOpen,
  toggleCollapsed,
  openMobile,
  closeMobile,
} = useStudentShell()
</script>

<template>
  <div
    class="student-shell"
    :class="{
      'student-shell--collapsed': collapsed,
      'student-shell--drawer': mobileOpen,
    }"
  >
    <div class="student-shell__sidebar-slot">
      <StudentSidebar
        :collapsed="collapsed"
        @update:collapsed="collapsed = $event"
        @close-mobile="closeMobile"
      />
    </div>

    <div
      v-if="mobileOpen"
      class="student-shell__backdrop"
      role="presentation"
      @click="closeMobile"
    />

    <div class="student-shell__content">
      <StudentNavbar
        :collapsed="collapsed"
        @open-mobile="openMobile"
        @toggle-collapsed="toggleCollapsed"
      />
      <div class="student-shell__main">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-shell {
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

.student-shell__sidebar-slot {
  position: fixed;
  z-index: 50;
  inset: 0 auto 0 0;
  width: min(17.5rem, 86vw);
  transform: translateX(-110%);
  transition: transform 0.22s ease, width 0.2s ease;
}

.student-shell--drawer .student-shell__sidebar-slot {
  transform: translateX(0);
}

.student-shell__backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  border: 0;
  background: rgb(15 23 42 / 0.45);
  cursor: pointer;
}

.student-shell__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
}

.student-shell__main {
  flex: 1;
  min-width: 0;
  width: 100%;
}

@media (min-width: 1024px) {
  .student-shell {
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  }

  .student-shell--collapsed {
    grid-template-columns: var(--sidebar-w-collapsed) minmax(0, 1fr);
  }

  .student-shell__sidebar-slot {
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    width: auto;
    transform: none;
    grid-row: 1 / -1;
  }

  .student-shell--collapsed .student-shell__sidebar-slot {
    width: var(--sidebar-w-collapsed);
  }

  .student-shell__backdrop {
    display: none;
  }
}
</style>
