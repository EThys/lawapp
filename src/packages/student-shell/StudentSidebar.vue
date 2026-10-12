<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { buildStudentMenuItems } from './nav'
import { getInitials } from '@/utils/auth'
import {
  BookOpen,
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from '@lucide/vue'

const props = defineProps<{
  collapsed: boolean
  mobileOpen?: boolean
}>()

const sidebarCollapsed = computed(() => props.collapsed && !props.mobileOpen)

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  closeMobile: []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const menuItems = computed(() => buildStudentMenuItems())

const displayName = computed(() => {
  const u = auth.currentUser
  if (!u) return 'Étudiant'
  return `${u.firstName} ${u.lastName}`.trim()
})

const initials = computed(() => {
  const u = auth.currentUser
  if (!u) return '?'
  return getInitials(u.firstName, u.lastName)
})

function isActive(to: string, exact?: boolean) {
  if (exact) return route.path === to
  return route.path === to || route.path.startsWith(`${to}/`)
}

function logout() {
  auth.logout()
  void router.push('/login')
}
</script>

<template>
  <aside
    class="shell-sidebar"
    :class="{
      'shell-sidebar--drawer': mobileOpen,
      'shell-sidebar--collapsed': sidebarCollapsed,
    }"
    aria-label="Navigation étudiant"
    :role="mobileOpen ? 'dialog' : undefined"
    :aria-modal="mobileOpen ? true : undefined"
  >
    <div class="shell-sidebar__head">
      <RouterLink to="/student" class="shell-sidebar__brand" @click="emit('closeMobile')">
        <span class="shell-sidebar__brand-mark">
          <GraduationCap class="w-5 h-5" />
        </span>
        <span class="shell-sidebar__brand-text">
          <span class="shell-sidebar__brand-title">LawApp</span>
          <span class="shell-sidebar__brand-sub">Étudiant</span>
        </span>
      </RouterLink>

      <div class="shell-sidebar__head-actions">
        <button
          type="button"
          class="shell-sidebar__icon-btn shell-sidebar__collapse-btn"
          :aria-label="collapsed ? 'Étendre la barre' : 'Réduire la barre'"
          @click="emit('update:collapsed', !collapsed)"
        >
          <PanelLeftOpen v-if="collapsed" class="w-4 h-4" />
          <PanelLeftClose v-else class="w-4 h-4" />
        </button>

        <button
          id="shell-drawer-close"
          type="button"
          class="shell-sidebar__icon-btn shell-sidebar__close-btn"
          aria-label="Fermer le menu"
          @click="emit('closeMobile')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>

    <nav class="shell-sidebar__nav" aria-label="Pages">
      <p class="shell-sidebar__nav-label-section">Menu</p>
      <RouterLink
        v-for="item in menuItems"
        :key="item.id"
        :to="String(item.to)"
        class="shell-sidebar__nav-item"
        :class="{
          'shell-sidebar__nav-item--active': isActive(
            String(item.to),
            item.activeMatch === 'exact',
          ),
        }"
        :title="sidebarCollapsed ? item.label : undefined"
        :aria-current="
          isActive(String(item.to), item.activeMatch === 'exact') ? 'page' : undefined
        "
        @click="emit('closeMobile')"
      >
        <component
          :is="(item.icon as { component?: unknown })?.component || item.icon"
          class="shell-sidebar__nav-icon"
        />
        <span class="shell-sidebar__nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="shell-sidebar__foot">
      <div class="shell-sidebar__user-card">
        <span class="shell-sidebar__user-avatar" aria-hidden="true">{{ initials }}</span>
        <div class="shell-sidebar__user-text min-w-0">
          <p class="shell-sidebar__user-name truncate">{{ displayName }}</p>
          <p class="shell-sidebar__user-meta">
            <BookOpen class="w-3.5 h-3.5" />
            Espace étudiant
          </p>
        </div>
      </div>
      <button type="button" class="shell-sidebar__logout" @click="logout">
        <LogOut class="w-4 h-4" />
        <span>Déconnexion</span>
      </button>
    </div>
  </aside>
</template>

<style src="@/packages/shell/shell-sidebar.css"></style>
