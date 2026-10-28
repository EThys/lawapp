<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { buildTeacherMenuItems, type TeacherMenuItem } from './nav'
import { buildAdminMenuItems, type AdminMenuItem } from '@/packages/admin-shell/nav'
import { getInitials } from '@/utils/auth'
import {
  ClipboardList,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    collapsed: boolean
    mobileOpen?: boolean
    variant?: 'teacher' | 'admin'
  }>(),
  { variant: 'teacher' },
)

const sidebarCollapsed = computed(() => props.collapsed && !props.mobileOpen)

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  closeMobile: []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isAdmin = computed(() => props.variant === 'admin')
const menuItems = computed(() =>
  isAdmin.value ? buildAdminMenuItems() : buildTeacherMenuItems(),
)
const openGroups = ref<Record<string, boolean>>({ 'evaluations-group': true })

const displayName = computed(() => {
  const u = auth.currentUser
  if (!u) return isAdmin.value ? 'Admin' : 'Enseignant'
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

function isChildActive(to: string) {
  if (route.path === to || route.path.startsWith(`${to}/`)) return true
  if (to === '/teacher/evaluations') {
    return route.path.startsWith('/teacher/evaluation/')
  }
  if (to === '/teacher/submissions') {
    return route.path.startsWith('/teacher/session/') || route.path.includes('/submission/')
  }
  if (to === '/admin/evaluations') {
    return route.path.startsWith('/admin/evaluation/')
  }
  if (to === '/admin/submissions') {
    return route.path.startsWith('/admin/submission/')
  }
  return false
}

function isGroupActive(item: TeacherMenuItem | AdminMenuItem) {
  return (item.children ?? []).some((child) => isChildActive(child.to))
}

function isGroupOpen(item: TeacherMenuItem | AdminMenuItem) {
  if (openGroups.value[item.id] != null) return openGroups.value[item.id]
  return isGroupActive(item)
}

function toggleGroup(item: TeacherMenuItem | AdminMenuItem) {
  openGroups.value[item.id] = !isGroupOpen(item)
}

watch(
  () => route.path,
  () => {
    for (const item of menuItems.value) {
      if (item.children && isGroupActive(item)) {
        openGroups.value[item.id] = true
      }
    }
  },
  { immediate: true },
)

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
    :aria-label="isAdmin ? 'Navigation admin' : 'Navigation enseignant'"
    :role="mobileOpen ? 'dialog' : undefined"
    :aria-modal="mobileOpen ? true : undefined"
  >
    <div class="shell-sidebar__head">
      <RouterLink
        :to="isAdmin ? '/admin' : '/teacher'"
        class="shell-sidebar__brand"
        @click="emit('closeMobile')"
      >
        <span class="shell-sidebar__brand-mark">
          <img src="/logo.png" alt="" width="584" height="640" />
        </span>
        <span class="shell-sidebar__brand-text">
          <span class="shell-sidebar__brand-title">LawApp50</span>
          <span class="shell-sidebar__brand-sub">{{ isAdmin ? 'Admin' : 'Enseignant' }}</span>
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
      <p class="shell-sidebar__nav-label-section">Navigation</p>
      <template v-for="item in menuItems" :key="item.id">
        <div v-if="item.children?.length" class="shell-sidebar__group">
          <button
            type="button"
            class="shell-sidebar__nav-item shell-sidebar__nav-btn"
            :class="{ 'shell-sidebar__nav-item--active': isGroupActive(item) && sidebarCollapsed }"
            :title="sidebarCollapsed ? item.label : undefined"
            :aria-expanded="isGroupOpen(item)"
            @click="toggleGroup(item)"
          >
            <component
              :is="(item.icon as { component?: unknown })?.component || item.icon"
              class="shell-sidebar__nav-icon"
            />
            <span class="shell-sidebar__nav-label">{{ item.label }}</span>
            <ChevronDown
              class="shell-sidebar__chevron"
              :class="{ 'shell-sidebar__chevron--open': isGroupOpen(item) }"
            />
          </button>
          <div
            v-show="isGroupOpen(item)"
            class="shell-sidebar__submenu"
            :class="{ 'shell-sidebar__submenu--flyout': sidebarCollapsed }"
          >
            <RouterLink
              v-for="child in item.children"
              :key="child.id"
              :to="child.to"
              class="shell-sidebar__nav-item shell-sidebar__nav-item--sub"
              :class="{ 'shell-sidebar__nav-item--active': isChildActive(child.to) }"
              :title="child.label"
              :aria-current="isChildActive(child.to) ? 'page' : undefined"
              @click="emit('closeMobile')"
            >
              <span class="shell-sidebar__nav-label">{{ child.label }}</span>
            </RouterLink>
          </div>
        </div>
        <RouterLink
          v-else-if="item.to"
          :to="item.to"
          class="shell-sidebar__nav-item"
          :class="{
            'shell-sidebar__nav-item--active': isActive(item.to, item.activeMatch === 'exact'),
          }"
          :title="sidebarCollapsed ? item.label : undefined"
          :aria-current="
            isActive(item.to, item.activeMatch === 'exact') ? 'page' : undefined
          "
          @click="emit('closeMobile')"
        >
          <component
            :is="(item.icon as { component?: unknown })?.component || item.icon"
            class="shell-sidebar__nav-icon"
          />
          <span class="shell-sidebar__nav-label">{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="shell-sidebar__foot">
      <div class="shell-sidebar__user-card">
        <span class="shell-sidebar__user-avatar" aria-hidden="true">{{ initials }}</span>
        <div class="shell-sidebar__user-text min-w-0">
          <p class="shell-sidebar__user-name truncate">{{ displayName }}</p>
          <p class="shell-sidebar__user-meta">
            <ClipboardList class="w-3.5 h-3.5" />
            {{ isAdmin ? 'Administration' : 'Espace pédagogique' }}
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
