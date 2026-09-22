<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { isApiEnabled } from '@/config/features'
import { appToast } from '@/utils/toast'
import { getInitials } from '@/utils/auth'
import { ROLE_LABELS } from '@/types/auth'
import { teacherPageTitle } from './nav'
import { adminPageTitle } from '@/packages/admin-shell/nav'
import {
  Menu,
  LogOut,
  PlusCircle,
  RefreshCw,
  UserCog,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    collapsed: boolean
    variant?: 'teacher' | 'admin'
  }>(),
  { variant: 'teacher' },
)

const emit = defineEmits<{
  openMobile: []
  toggleCollapsed: []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const evalStore = useEvaluationStore()

const refreshing = ref(false)
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const isAdmin = computed(() => props.variant === 'admin')
const pageTitle = computed(() =>
  isAdmin.value ? adminPageTitle(route.path) : teacherPageTitle(route.path),
)
const fullName = computed(() => {
  const u = auth.currentUser
  if (!u) return isAdmin.value ? 'Admin' : 'Enseignant'
  return `${u.firstName} ${u.lastName}`.trim()
})
const initials = computed(() => {
  const u = auth.currentUser
  if (!u) return '?'
  return getInitials(u.firstName, u.lastName)
})
const roleLabel = computed(() => {
  const role = auth.currentUser?.role
  if (isAdmin.value) return 'Administrateur'
  return role ? (ROLE_LABELS[role] ?? 'Enseignant') : 'Enseignant'
})

async function refreshServer() {
  if (!isApiEnabled() || refreshing.value) return
  refreshing.value = true
  try {
    await evalStore.syncFromApi()
    appToast.success('Données synchronisées avec le serveur.')
  } catch (e) {
    appToast.apiError(e, 'Échec de la synchronisation.')
  } finally {
    refreshing.value = false
  }
}

function logout() {
  menuOpen.value = false
  auth.logout()
  void router.push('/login')
}

function onDocClick(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <header class="teacher-navbar">
    <div class="teacher-navbar__left">
      <button
        type="button"
        class="teacher-navbar__icon-btn lg:hidden"
        aria-label="Ouvrir le menu"
        @click="emit('openMobile')"
      >
        <Menu class="w-5 h-5" />
      </button>

      <button
        type="button"
        class="teacher-navbar__icon-btn hidden lg:inline-flex"
        :aria-label="collapsed ? 'Étendre la barre' : 'Réduire la barre'"
        @click="emit('toggleCollapsed')"
      >
        <PanelLeftOpen v-if="collapsed" class="w-5 h-5" />
        <PanelLeftClose v-else class="w-5 h-5" />
      </button>

      <div class="teacher-navbar__titles min-w-0">
        <p class="teacher-navbar__eyebrow">
          {{ isAdmin ? 'LawApp · Administration' : 'LawApp · Enseignant' }}
        </p>
        <h1 class="teacher-navbar__title truncate">{{ pageTitle }}</h1>
      </div>
    </div>

    <div class="teacher-navbar__right">
      <button
        v-if="isApiEnabled()"
        type="button"
        class="teacher-navbar__action"
        :disabled="refreshing || evalStore.apiLoading"
        title="Actualiser le serveur"
        @click="refreshServer"
      >
        <RefreshCw
          class="w-4 h-4"
          :class="{ 'teacher-navbar__spin': refreshing || evalStore.apiLoading }"
        />
        <span class="hidden sm:inline">Sync</span>
      </button>

      <RouterLink
        v-if="!isAdmin"
        to="/teacher/create"
        class="teacher-navbar__action teacher-navbar__action--accent"
      >
        <PlusCircle class="w-4 h-4" />
        <span class="hidden sm:inline">Publier</span>
      </RouterLink>

      <div ref="menuRef" class="relative">
        <button
          type="button"
          class="teacher-navbar__user-btn"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span class="teacher-navbar__avatar">{{ initials }}</span>
          <span class="teacher-navbar__user-meta hidden md:flex">
            <span class="teacher-navbar__user-name truncate">{{ fullName }}</span>
            <span class="teacher-navbar__user-role">{{ roleLabel }}</span>
          </span>
          <ChevronDown class="w-4 h-4 text-ink-muted hidden sm:block" />
        </button>

        <div v-if="menuOpen" class="teacher-navbar__dropdown" role="menu">
          <RouterLink
            :to="isAdmin ? '/account' : '/teacher/profile'"
            class="teacher-navbar__dropdown-item"
            role="menuitem"
            @click="menuOpen = false"
          >
            <UserCog class="w-4 h-4" />
            {{ isAdmin ? 'Compte' : 'Profil enseignant' }}
          </RouterLink>
          <button
            type="button"
            class="teacher-navbar__dropdown-item teacher-navbar__dropdown-item--danger"
            role="menuitem"
            @click="logout"
          >
            <LogOut class="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      <button
        type="button"
        class="teacher-navbar__icon-btn sm:hidden"
        aria-label="Déconnexion"
        @click="logout"
      >
        <LogOut class="w-5 h-5" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.teacher-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 3.75rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--color-line);
  background: color-mix(in srgb, white 92%, var(--color-accent-light));
  backdrop-filter: blur(10px);
}

.teacher-navbar__left,
.teacher-navbar__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.teacher-navbar__right {
  flex-shrink: 0;
}

.teacher-navbar__eyebrow {
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.teacher-navbar__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.2;
}

.teacher-navbar__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.45rem;
  border: 1px solid var(--color-line);
  background: white;
  color: var(--color-ink);
  cursor: pointer;
  flex-shrink: 0;
}

.teacher-navbar__icon-btn:hover {
  background: var(--color-paper-warm);
}

.teacher-navbar__action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.35rem;
  padding: 0 0.75rem;
  border-radius: 0.45rem;
  border: 1px solid var(--color-line);
  background: white;
  color: var(--color-ink);
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.teacher-navbar__action:hover {
  background: var(--color-paper-warm);
}

.teacher-navbar__action:disabled {
  opacity: 0.55;
  cursor: wait;
}

.teacher-navbar__action--accent {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-line));
  background: var(--color-accent-light);
  color: var(--color-brand-dark);
}

.teacher-navbar__user-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.35rem;
  padding: 0.2rem 0.45rem 0.2rem 0.2rem;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: white;
  cursor: pointer;
  max-width: 14rem;
}

.teacher-navbar__user-btn:hover {
  background: var(--color-paper-warm);
}

.teacher-navbar__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.95rem;
  height: 1.95rem;
  border-radius: 999px;
  background: var(--color-brand-dark);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.teacher-navbar__user-meta {
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  line-height: 1.15;
  text-align: left;
}

.teacher-navbar__user-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-ink);
  max-width: 8.5rem;
}

.teacher-navbar__user-role {
  font-size: 0.65rem;
  color: var(--color-ink-faint);
}

.teacher-navbar__dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  min-width: 12rem;
  padding: 0.35rem;
  border: 1px solid var(--color-line);
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / 0.12);
  z-index: 40;
}

.teacher-navbar__dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  min-height: 2.4rem;
  padding: 0.45rem 0.65rem;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
  text-align: left;
}

.teacher-navbar__dropdown-item:hover {
  background: var(--color-paper-warm);
}

.teacher-navbar__dropdown-item--danger {
  color: var(--color-danger);
}

.teacher-navbar__spin {
  animation: teacher-navbar-spin 0.8s linear infinite;
}

@keyframes teacher-navbar-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
