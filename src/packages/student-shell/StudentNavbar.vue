<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { isApiEnabled } from '@/config/features'
import { appToast } from '@/utils/toast'
import { getInitials } from '@/utils/auth'
import { ROLE_LABELS } from '@/types/auth'
import { studentPageTitle } from './nav'
import RoleWorkspaceSwitcher from '@/components/account/RoleWorkspaceSwitcher.vue'
import {
  Menu,
  X,
  LogOut,
  UserPlus,
  RefreshCw,
  UserCog,
  ChevronDown,
  AlertCircle,
} from '@lucide/vue'

defineProps<{
  mobileMenuOpen?: boolean
}>()

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

const pageTitle = computed(() => studentPageTitle(route.path))
const fullName = computed(() => {
  const u = auth.currentUser
  if (!u) return 'Étudiant'
  return `${u.firstName} ${u.lastName}`.trim()
})
const initials = computed(() => {
  const u = auth.currentUser
  if (!u) return '?'
  return getInitials(u.firstName, u.lastName)
})
const roleLabel = computed(() => {
  const role = auth.currentUser?.role
  return role ? (ROLE_LABELS[role] ?? 'Étudiant') : 'Étudiant'
})

const profileIncomplete = computed(() => !auth.hasStudentQuality)

async function refreshServer() {
  if (!isApiEnabled() || refreshing.value) return
  refreshing.value = true
  try {
    await evalStore.syncStudentCatalog()
    if (evalStore.apiError) {
      appToast.error(evalStore.apiError)
    } else {
      appToast.success('Catalogue actualisé.')
    }
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

      <RouterLink to="/" class="shell-navbar__logo-link" aria-label="LawApp50, accueil" title="Retour au site public">
        <img src="/logo.png" alt="" class="shell-navbar__logo" width="584" height="640" />
      </RouterLink>

      <RouterLink to="/" class="shell-navbar__titles shell-navbar__titles--link min-w-0" title="Retour au site public">
        <p class="shell-navbar__eyebrow">LawApp50 · Étudiant</p>
        <h1 class="shell-navbar__title truncate">{{ pageTitle }}</h1>
      </RouterLink>
    </div>

    <div class="shell-navbar__right">
      <RoleWorkspaceSwitcher v-if="auth.showWorkspaceSwitcher" variant="icons" class="hidden sm:flex" />

      <div class="shell-navbar__actions">
        <button
          v-if="isApiEnabled()"
          type="button"
          class="shell-navbar__action"
          :disabled="refreshing || evalStore.apiLoading"
          title="Actualiser le catalogue"
          aria-label="Synchroniser le catalogue"
          @click="refreshServer"
        >
          <RefreshCw
            class="w-4 h-4"
            :class="{ 'shell-navbar__spin': refreshing || evalStore.apiLoading }"
          />
          <span class="hidden sm:inline">Sync</span>
        </button>

        <RouterLink
          to="/join/group"
          class="shell-navbar__action shell-navbar__action--accent"
          title="Rejoindre une formation"
        >
          <UserPlus class="w-4 h-4" />
          <span class="hidden sm:inline">Rejoindre</span>
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
              to="/student/profile"
              class="shell-navbar__dropdown-item"
              :class="{ 'shell-navbar__dropdown-item--highlight': profileIncomplete }"
              role="menuitem"
              @click="menuOpen = false"
            >
              <AlertCircle v-if="profileIncomplete" class="w-4 h-4" />
              <UserCog v-else class="w-4 h-4" />
              {{ profileIncomplete ? 'Compléter mon profil' : 'Mon profil' }}
            </RouterLink>
            <RouterLink
              to="/account"
              class="shell-navbar__dropdown-item"
              role="menuitem"
              @click="menuOpen = false"
            >
              <UserCog class="w-4 h-4" />
              Compte et espaces
            </RouterLink>
            <RouterLink
              to="/"
              class="shell-navbar__dropdown-item"
              role="menuitem"
              @click="menuOpen = false"
            >
              Site public
            </RouterLink>
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
