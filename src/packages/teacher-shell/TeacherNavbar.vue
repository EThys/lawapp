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
import RoleWorkspaceSwitcher from '@/components/account/RoleWorkspaceSwitcher.vue'
import {
  Menu,
  X,
  LogOut,
  PlusCircle,
  RefreshCw,
  UserCog,
  ChevronDown,
  AlertCircle,
} from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    mobileMenuOpen?: boolean
    variant?: 'teacher' | 'admin'
  }>(),
  { variant: 'teacher' },
)

const emit = defineEmits<{
  toggleMobile: []
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

const profileIncomplete = computed(() => {
  if (isAdmin.value) return false
  const u = auth.currentUser
  if (!auth.hasTeacherQuality) return true
  if (isApiEnabled() && u && !u.hasTeacherProfile && !auth.teacherProfile?.teacherId) return true
  return false
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
  <header class="shell-navbar">
    <div class="shell-navbar__left">
      <button
        id="shell-menu-toggle"
        type="button"
        class="shell-navbar__icon-btn shell-navbar__menu-btn"
        :class="{ 'shell-navbar__icon-btn--menu-open': mobileMenuOpen }"
        aria-controls="shell-drawer"
        :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
        :aria-label="mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="emit('toggleMobile')"
      >
        <X v-if="mobileMenuOpen" class="w-5 h-5" />
        <Menu v-else class="w-5 h-5" />
      </button>

      <div class="shell-navbar__titles min-w-0">
        <p class="shell-navbar__eyebrow">
          {{ isAdmin ? 'LawApp · Administration' : 'LawApp · Enseignant' }}
        </p>
        <h1 class="shell-navbar__title truncate">{{ pageTitle }}</h1>
      </div>
    </div>

    <div class="shell-navbar__right">
      <RoleWorkspaceSwitcher v-if="!isAdmin && auth.showWorkspaceSwitcher" variant="icons" class="hidden sm:flex" />

      <div class="shell-navbar__actions">
        <button
          v-if="isApiEnabled()"
          type="button"
          class="shell-navbar__action"
          :disabled="refreshing || evalStore.apiLoading"
          title="Actualiser le serveur"
          aria-label="Synchroniser avec le serveur"
          @click="refreshServer"
        >
          <RefreshCw
            class="w-4 h-4"
            :class="{ 'shell-navbar__spin': refreshing || evalStore.apiLoading }"
          />
          <span class="hidden sm:inline">Sync</span>
        </button>

        <RouterLink
          v-if="!isAdmin"
          to="/teacher/create"
          class="shell-navbar__action shell-navbar__action--accent"
          title="Publier une évaluation"
        >
          <PlusCircle class="w-4 h-4" />
          <span class="hidden sm:inline">Publier</span>
        </RouterLink>
      </div>

      <div ref="menuRef" class="relative">
        <button
          type="button"
          class="shell-navbar__user-btn"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          @click="menuOpen = !menuOpen"
        >
          <span class="shell-navbar__avatar" :class="{ 'shell-navbar__avatar--alert': profileIncomplete }">
            {{ initials }}
          </span>
          <span class="shell-navbar__user-meta hidden md:flex">
            <span class="shell-navbar__user-name truncate">{{ fullName }}</span>
            <span class="shell-navbar__user-role">{{ roleLabel }}</span>
          </span>
          <ChevronDown
            class="w-4 h-4 text-ink-muted hidden sm:block transition-transform duration-150"
            :class="{ 'rotate-180': menuOpen }"
          />
        </button>

        <Transition name="shell-dropdown">
          <div v-if="menuOpen" class="shell-navbar__dropdown" role="menu">
            <RouterLink
              :to="isAdmin ? '/account' : '/teacher/profile'"
              class="shell-navbar__dropdown-item"
              :class="{ 'shell-navbar__dropdown-item--highlight': profileIncomplete && !isAdmin }"
              role="menuitem"
              @click="menuOpen = false"
            >
              <AlertCircle v-if="profileIncomplete && !isAdmin" class="w-4 h-4" />
              <UserCog v-else class="w-4 h-4" />
              {{
                isAdmin
                  ? 'Compte'
                  : profileIncomplete
                    ? 'Compléter mon profil'
                    : 'Mon profil'
              }}
            </RouterLink>
            <RouterLink
              v-if="!isAdmin"
              to="/account"
              class="shell-navbar__dropdown-item"
              role="menuitem"
              @click="menuOpen = false"
            >
              <UserCog class="w-4 h-4" />
              Compte et espaces
            </RouterLink>
            <div v-if="!isAdmin && auth.showWorkspaceSwitcher" class="shell-navbar__dropdown-switcher">
              <RoleWorkspaceSwitcher variant="icons" />
            </div>
            <button
              type="button"
              class="shell-navbar__dropdown-item shell-navbar__dropdown-item--danger"
              role="menuitem"
              @click="logout"
            >
              <LogOut class="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style src="@/packages/shell/shell-navbar.css"></style>
