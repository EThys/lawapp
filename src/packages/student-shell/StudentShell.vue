<script setup lang="ts">
import StudentSidebar from './StudentSidebar.vue'
import StudentNavbar from './StudentNavbar.vue'
import { useStudentShell } from './useStudentShell'

const { collapsed, mobileOpen, closeMobile, toggleMobile } = useStudentShell()
</script>

<template>
  <div
    class="student-shell shell-layout"
    :class="{
      'shell-layout--collapsed': collapsed,
      'shell-layout--drawer': mobileOpen,
    }"
  >
    <div id="shell-drawer" class="shell-layout__sidebar-slot">
      <StudentSidebar
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        @update:collapsed="collapsed = $event"
        @close-mobile="closeMobile"
      />
    </div>

    <Transition name="shell-backdrop">
      <button
        v-if="mobileOpen"
        type="button"
        class="shell-layout__backdrop"
        aria-label="Fermer le menu"
        @click="closeMobile"
      />
    </Transition>

    <div
      class="shell-layout__content"
      :aria-hidden="mobileOpen ? 'true' : undefined"
    >
      <StudentNavbar
        :mobile-menu-open="mobileOpen"
        @toggle-mobile="toggleMobile"
      />
      <div class="shell-layout__main">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-shell {
  background:
    radial-gradient(
      ellipse 70% 45% at 100% 0%,
      color-mix(in srgb, var(--color-accent-light) 70%, white),
      transparent 55%
    ),
    var(--color-paper);
}
</style>

<style src="@/packages/shell/shell-layout.css"></style>
