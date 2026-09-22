<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { buildTeacherMenuItems, type TeacherMenuItem } from './nav'
import { buildAdminMenuItems, type AdminMenuItem } from '@/packages/admin-shell/nav'
import {
  GraduationCap,
  Shield,
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
    variant?: 'teacher' | 'admin'
  }>(),
  { variant: 'teacher' },
)

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
    class="ts-sidebar"
    :class="{ 'ts-sidebar--collapsed': collapsed }"
    :aria-label="isAdmin ? 'Navigation admin' : 'Navigation enseignant'"
  >
    <div class="ts-sidebar__head">
      <RouterLink
        :to="isAdmin ? '/admin' : '/teacher'"
        class="ts-sidebar__brand"
        @click="emit('closeMobile')"
      >
        <span class="ts-sidebar__brand-mark">
          <Shield v-if="isAdmin" class="w-5 h-5" />
          <GraduationCap v-else class="w-5 h-5" />
        </span>
        <span v-show="!collapsed" class="ts-sidebar__brand-text">
          <span class="ts-sidebar__brand-title">LawApp</span>
          <span class="ts-sidebar__brand-sub">{{ isAdmin ? 'Admin' : 'Enseignant' }}</span>
        </span>
      </RouterLink>

      <button
        type="button"
        class="ts-sidebar__icon-btn ts-sidebar__collapse-btn"
        :aria-label="collapsed ? 'Étendre la barre' : 'Réduire la barre'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <PanelLeftOpen v-if="collapsed" class="w-4 h-4" />
        <PanelLeftClose v-else class="w-4 h-4" />
      </button>

      <button
        type="button"
        class="ts-sidebar__icon-btn ts-sidebar__close-btn"
        aria-label="Fermer"
        @click="emit('closeMobile')"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <nav class="ts-sidebar__nav">
      <template v-for="item in menuItems" :key="item.id">
        <div v-if="item.children?.length" class="ts-sidebar__group">
          <button
            type="button"
            class="ts-sidebar__nav-item ts-sidebar__nav-btn"
            :class="{ 'ts-sidebar__nav-item--active': isGroupActive(item) && collapsed }"
            :title="item.label"
            :aria-expanded="isGroupOpen(item)"
            @click="toggleGroup(item)"
          >
            <component
              :is="(item.icon as { component?: unknown })?.component || item.icon"
              class="ts-sidebar__nav-icon"
            />
            <span v-show="!collapsed" class="ts-sidebar__nav-label">{{ item.label }}</span>
            <ChevronDown
              v-show="!collapsed"
              class="ts-sidebar__chevron"
              :class="{ 'ts-sidebar__chevron--open': isGroupOpen(item) }"
            />
          </button>
          <div
            v-show="isGroupOpen(item)"
            class="ts-sidebar__submenu"
            :class="{ 'ts-sidebar__submenu--flyout': collapsed }"
          >
            <RouterLink
              v-for="child in item.children"
              :key="child.id"
              :to="child.to"
              class="ts-sidebar__nav-item ts-sidebar__nav-item--sub"
              :class="{ 'ts-sidebar__nav-item--active': isChildActive(child.to) }"
              :title="child.label"
              @click="emit('closeMobile')"
            >
              <span class="ts-sidebar__nav-label">{{ child.label }}</span>
            </RouterLink>
          </div>
        </div>
        <RouterLink
          v-else-if="item.to"
          :to="item.to"
          class="ts-sidebar__nav-item"
          :class="{
            'ts-sidebar__nav-item--active': isActive(item.to, item.activeMatch === 'exact'),
          }"
          :title="item.label"
          @click="emit('closeMobile')"
        >
          <component
            :is="(item.icon as { component?: unknown })?.component || item.icon"
            class="ts-sidebar__nav-icon"
          />
          <span v-show="!collapsed" class="ts-sidebar__nav-label">{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div v-show="!collapsed" class="ts-sidebar__foot">
      <div class="ts-sidebar__user">
        <p class="ts-sidebar__user-name">{{ displayName }}</p>
        <p class="ts-sidebar__user-meta">
          <ClipboardList class="w-3.5 h-3.5" />
          {{ isAdmin ? 'Administration' : 'Espace pédagogique' }}
        </p>
      </div>
      <button type="button" class="ts-sidebar__logout" @click="logout">
        <LogOut class="w-4 h-4" />
        Déconnexion
      </button>
    </div>
  </aside>
</template>

<style scoped>
.ts-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0a2f6b 0%, #0d47a1 48%, #1565c0 100%);
  color: white;
  box-shadow: 10px 0 36px rgb(10 47 107 / 0.28);
}

.ts-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1rem 0.85rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.12);
}

.ts-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.ts-sidebar__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 0.14);
  flex-shrink: 0;
}

.ts-sidebar__brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

.ts-sidebar__brand-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
}

.ts-sidebar__brand-sub {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.7);
}

.ts-sidebar__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.45rem;
  border: 1px solid rgb(255 255 255 / 0.16);
  background: rgb(255 255 255 / 0.08);
  color: white;
  cursor: pointer;
  flex-shrink: 0;
}

.ts-sidebar__icon-btn:hover {
  background: rgb(255 255 255 / 0.18);
}

.ts-sidebar__collapse-btn {
  display: none;
}

.ts-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.85rem 0.65rem;
  flex: 1;
  overflow-y: auto;
}

.ts-sidebar--collapsed .ts-sidebar__nav {
  overflow: visible;
}

.ts-sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.55rem;
  padding: 0.55rem 0.7rem;
  border-radius: 0.55rem;
  color: rgb(255 255 255 / 0.88);
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.ts-sidebar__nav-item:hover {
  background: rgb(255 255 255 / 0.12);
  color: white;
}

.ts-sidebar__nav-item--active {
  background: white;
  color: var(--color-brand-dark);
  font-weight: 600;
  box-shadow: 0 8px 18px rgb(10 47 107 / 0.2);
}

.ts-sidebar__nav-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.ts-sidebar__nav-label {
  flex: 1;
  min-width: 0;
}

.ts-sidebar__group {
  position: relative;
}

.ts-sidebar__chevron {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
  opacity: 0.75;
  transition: transform 0.15s ease;
}

.ts-sidebar__chevron--open {
  transform: rotate(180deg);
}

.ts-sidebar__submenu {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.15rem 0 0.25rem 0.55rem;
}

.ts-sidebar__nav-item--sub {
  min-height: 2.2rem;
  padding-left: 2.1rem;
  font-size: 0.8125rem;
}

.ts-sidebar__submenu--flyout {
  position: absolute;
  left: calc(100% + 0.45rem);
  top: 0;
  z-index: 20;
  min-width: 11.5rem;
  padding: 0.35rem;
  border-radius: 0.55rem;
  background: #0a2f6b;
  box-shadow: 0 12px 28px rgb(10 47 107 / 0.28);
}

.ts-sidebar__submenu--flyout .ts-sidebar__nav-item--sub {
  padding-left: 0.7rem;
}

.ts-sidebar__nav-btn {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.ts-sidebar__foot {
  padding: 0.9rem;
  border-top: 1px solid rgb(255 255 255 / 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.ts-sidebar__user-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.ts-sidebar__user-meta {
  margin: 0.35rem 0 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: rgb(255 255 255 / 0.7);
}

.ts-sidebar__logout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 2.4rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.22);
  background: rgb(255 255 255 / 0.1);
  color: white;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.ts-sidebar__logout:hover {
  background: rgb(255 255 255 / 0.18);
}

@media (min-width: 1024px) {
  .ts-sidebar__collapse-btn {
    display: inline-flex;
  }

  .ts-sidebar__close-btn {
    display: none;
  }
}
</style>
