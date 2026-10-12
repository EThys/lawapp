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

const { collapsed, mobileOpen, closeMobile, toggleMobile } = useTeacherShell(
  props.variant === 'admin' ? ADMIN_SIDEBAR_STORAGE_KEY : TEACHER_SIDEBAR_STORAGE_KEY,
)
</script>

<template>
  <div
    class="teacher-shell shell-layout"
    :class="{
      'shell-layout--collapsed': collapsed,
      'shell-layout--drawer': mobileOpen,
    }"
  >
    <div id="shell-drawer" class="shell-layout__sidebar-slot">
      <TeacherSidebar
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        :variant="variant"
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
      <TeacherNavbar
        :mobile-menu-open="mobileOpen"
        :variant="variant"
        @toggle-mobile="toggleMobile"
      />
      <div class="shell-layout__main">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.teacher-shell {
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
