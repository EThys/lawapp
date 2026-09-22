<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { buildStudentMenuItems } from './nav'
import {
  BookOpen,
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from '@lucide/vue'

defineProps<{
  collapsed: boolean
}>()

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
  <aside class="ss-sidebar" aria-label="Navigation étudiant">
    <div class="ss-sidebar__head">
      <RouterLink to="/student" class="ss-sidebar__brand" @click="emit('closeMobile')">
        <span class="ss-sidebar__brand-mark">
          <GraduationCap class="w-5 h-5" />
        </span>
        <span v-show="!collapsed" class="ss-sidebar__brand-text">
          <span class="ss-sidebar__brand-title">LawApp</span>
          <span class="ss-sidebar__brand-sub">Étudiant</span>
        </span>
      </RouterLink>

      <button
        type="button"
        class="ss-sidebar__icon-btn ss-sidebar__collapse-btn"
        :aria-label="collapsed ? 'Étendre la barre' : 'Réduire la barre'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <PanelLeftOpen v-if="collapsed" class="w-4 h-4" />
        <PanelLeftClose v-else class="w-4 h-4" />
      </button>

      <button
        type="button"
        class="ss-sidebar__icon-btn ss-sidebar__close-btn"
        aria-label="Fermer"
        @click="emit('closeMobile')"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <nav class="ss-sidebar__nav">
      <RouterLink
        v-for="item in menuItems"
        :key="item.id"
        :to="String(item.to)"
        class="ss-sidebar__nav-item"
        :class="{
          'ss-sidebar__nav-item--active': isActive(
            String(item.to),
            item.activeMatch === 'exact',
          ),
        }"
        :title="item.label"
        @click="emit('closeMobile')"
      >
        <component
          :is="(item.icon as { component?: unknown })?.component || item.icon"
          class="ss-sidebar__nav-icon"
        />
        <span v-show="!collapsed" class="ss-sidebar__nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div v-show="!collapsed" class="ss-sidebar__foot">
      <div class="ss-sidebar__user">
        <p class="ss-sidebar__user-name">{{ displayName }}</p>
        <p class="ss-sidebar__user-meta">
          <BookOpen class="w-3.5 h-3.5" />
          Espace étudiant
        </p>
      </div>
      <button type="button" class="ss-sidebar__logout" @click="logout">
        <LogOut class="w-4 h-4" />
        Déconnexion
      </button>
    </div>
  </aside>
</template>

<style scoped>
.ss-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0a2f6b 0%, #0d47a1 48%, #1565c0 100%);
  color: white;
  box-shadow: 10px 0 36px rgb(10 47 107 / 0.28);
}

.ss-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1rem 0.85rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.12);
}

.ss-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.ss-sidebar__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 0.14);
  flex-shrink: 0;
}

.ss-sidebar__brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

.ss-sidebar__brand-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
}

.ss-sidebar__brand-sub {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.7);
}

.ss-sidebar__icon-btn {
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

.ss-sidebar__icon-btn:hover {
  background: rgb(255 255 255 / 0.18);
}

.ss-sidebar__collapse-btn {
  display: none;
}

.ss-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.85rem 0.65rem;
  flex: 1;
  overflow-y: auto;
}

.ss-sidebar__nav-item {
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

.ss-sidebar__nav-item:hover {
  background: rgb(255 255 255 / 0.12);
  color: white;
}

.ss-sidebar__nav-item--active {
  background: white;
  color: var(--color-brand-dark);
  font-weight: 600;
  box-shadow: 0 8px 18px rgb(10 47 107 / 0.2);
}

.ss-sidebar__nav-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.ss-sidebar__foot {
  padding: 0.9rem;
  border-top: 1px solid rgb(255 255 255 / 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.ss-sidebar__user-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.ss-sidebar__user-meta {
  margin: 0.35rem 0 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: rgb(255 255 255 / 0.7);
}

.ss-sidebar__logout {
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

.ss-sidebar__logout:hover {
  background: rgb(255 255 255 / 0.18);
}

@media (min-width: 1024px) {
  .ss-sidebar__collapse-btn {
    display: inline-flex;
  }

  .ss-sidebar__close-btn {
    display: none;
  }
}
</style>
