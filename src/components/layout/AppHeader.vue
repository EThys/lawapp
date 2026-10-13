<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Scale, Menu, X, LogOut, ChevronDown } from '@lucide/vue'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getInitials } from '@/utils/auth'
import { ROLE_LABELS } from '@/types/auth'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mobileOpen = ref(false)
const userMenuOpen = ref(false)
const scrolled = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const initials = computed(() => {
  if (!auth.currentUser) return ''
  return getInitials(auth.currentUser.firstName, auth.currentUser.lastName)
})

const dashboardLink = computed(() => auth.homePath())

const publicNav = [
  { to: '/discover', label: 'Droit Ludique', match: (p: string) => p.startsWith('/discover') },
  { to: '/documents', label: 'Bibliothèque', match: (p: string) => p.startsWith('/documents') },
]

function isNavActive(match: (p: string) => boolean) {
  return match(route.path)
}

function logout() {
  auth.logout()
  router.push('/login')
}

function closeMenus() {
  mobileOpen.value = false
  userMenuOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

function onScroll() {
  scrolled.value = window.scrollY > 10
}

watch(mobileOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('scroll', onScroll)
  document.body.style.overflow = ''
})
</script>

<template>
  <header class="app-header" :class="{ 'app-header--scrolled': scrolled }">
    <div class="app-header__inner">
      <div class="app-header__bar">
        <RouterLink to="/" class="app-header__brand" @click="closeMenus">
          <span class="app-header__brand-mark">
            <Scale class="w-4 h-4" />
          </span>
          <span class="app-header__brand-text">
            <span class="app-header__brand-title">LawApp</span>
            <span class="app-header__brand-sub">Évaluation &amp; droit</span>
          </span>
        </RouterLink>

        <nav class="app-header__nav" aria-label="Navigation principale">
          <RouterLink
            v-for="item in publicNav"
            :key="item.to"
            :to="item.to"
            class="app-header__link"
            :class="{ 'app-header__link--active': isNavActive(item.match) }"
          >
            {{ item.label }}
          </RouterLink>

          <RouterLink
            v-if="auth.isCertified"
            to="/admin"
            class="app-header__link"
            :class="{ 'app-header__link--active': route.path.startsWith('/admin') }"
          >
            Admin
          </RouterLink>

          <RouterLink
            v-if="auth.isAuthenticated"
            :to="dashboardLink"
            class="app-header__link"
            :class="{
              'app-header__link--active':
                route.path.startsWith('/teacher') || route.path.startsWith('/student'),
            }"
          >
            Mon espace
          </RouterLink>

          <RouterLink
            v-if="auth.isStudent"
            to="/student/history"
            class="app-header__link"
            :class="{ 'app-header__link--active': route.path.startsWith('/student/history') }"
          >
            Mon historique
          </RouterLink>

          <RouterLink
            v-if="auth.isTeacher"
            to="/teacher/history"
            class="app-header__link"
            :class="{ 'app-header__link--active': route.path.startsWith('/teacher/history') }"
          >
            Suivi &amp; historique
          </RouterLink>

          <RouterLink
            v-if="auth.isTeacher"
            to="/teacher/create"
            class="app-header__link"
            :class="{ 'app-header__link--active': route.path.startsWith('/teacher/create') }"
          >
            Nouvelle évaluation
          </RouterLink>

          <div class="app-header__actions">
            <template v-if="auth.isAuthenticated">
              <div ref="menuRef" class="relative">
                <button
                  type="button"
                  class="app-header__user-btn"
                  :aria-expanded="userMenuOpen"
                  aria-haspopup="menu"
                  @click.stop="userMenuOpen = !userMenuOpen"
                >
                  <span class="app-header__avatar">{{ initials }}</span>
                  <span class="text-sm text-ink max-w-[7rem] truncate hidden lg:block">
                    {{ auth.currentUser?.firstName }}
                  </span>
                  <ChevronDown class="w-4 h-4 text-ink-faint hidden sm:block" />
                </button>

                <div v-if="userMenuOpen" class="app-header__dropdown" role="menu">
                  <div class="app-header__dropdown-head">
                    <p class="text-sm font-medium text-ink truncate">
                      {{ auth.currentUser?.firstName }} {{ auth.currentUser?.lastName }}
                    </p>
                    <p class="text-xs text-ink-faint truncate mt-0.5">{{ auth.currentUser?.email }}</p>
                    <p class="text-[10px] uppercase tracking-widest text-accent mt-1.5">
                      {{ auth.currentUser ? ROLE_LABELS[auth.currentUser.role] : '' }}
                    </p>
                  </div>
                  <RouterLink
                    :to="dashboardLink"
                    class="app-header__dropdown-item"
                    role="menuitem"
                    @click="userMenuOpen = false"
                  >
                    Tableau de bord
                  </RouterLink>
                  <RouterLink
                    to="/account"
                    class="app-header__dropdown-item"
                    role="menuitem"
                    @click="userMenuOpen = false"
                  >
                    Mon compte
                  </RouterLink>
                  <button
                    type="button"
                    class="app-header__dropdown-item app-header__dropdown-item--danger"
                    role="menuitem"
                    @click="logout"
                  >
                    <LogOut class="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </template>

            <template v-else>
              <RouterLink to="/login" class="app-header__link"> Connexion </RouterLink>
              <RouterLink to="/register">
                <AppButton size="sm">S'inscrire</AppButton>
              </RouterLink>
            </template>
          </div>
        </nav>

        <button
          type="button"
          class="app-header__menu-btn md:hidden"
          :aria-expanded="mobileOpen"
          aria-label="Menu"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="w-5 h-5" />
          <Menu v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="app-header-drawer">
        <div v-if="mobileOpen" class="app-header__drawer-backdrop md:hidden" @click="closeMenus">
          <div class="app-header__drawer-panel" @click.stop>
            <div class="flex items-center justify-between px-4 h-14 border-b border-line">
              <span class="text-sm font-semibold text-ink">Menu</span>
              <button
                type="button"
                class="app-header__menu-btn"
                aria-label="Fermer"
                @click="closeMenus"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <nav class="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              <RouterLink
                v-for="item in publicNav"
                :key="item.to"
                :to="item.to"
                class="app-header__dropdown-item rounded-md"
                @click="closeMenus"
              >
                {{ item.label }}
              </RouterLink>

              <RouterLink
                v-if="auth.isCertified"
                to="/admin"
                class="app-header__dropdown-item rounded-md"
                @click="closeMenus"
              >
                Admin
              </RouterLink>

              <template v-if="auth.isAuthenticated">
                <RouterLink
                  v-if="auth.isStudent"
                  to="/student"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  Mon espace étudiant
                </RouterLink>
                <RouterLink
                  v-if="auth.isStudent"
                  to="/student/history"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  Mon historique
                </RouterLink>
                <RouterLink
                  v-if="auth.isStudent"
                  to="/join/group"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  Rejoindre une évaluation
                </RouterLink>
                <RouterLink
                  :to="dashboardLink"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  {{ auth.isTeacher ? 'Espace enseignant' : 'Tableau de bord' }}
                </RouterLink>
                <RouterLink
                  v-if="auth.isTeacher"
                  to="/teacher/history"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  Suivi &amp; historique
                </RouterLink>
                <RouterLink
                  v-if="auth.isTeacher"
                  to="/teacher/create"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  Nouvelle évaluation
                </RouterLink>
                <RouterLink
                  to="/account"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  Mon compte
                </RouterLink>
                <button
                  type="button"
                  class="app-header__dropdown-item app-header__dropdown-item--danger rounded-md"
                  @click="logout(); closeMenus()"
                >
                  Déconnexion
                </button>
              </template>

              <template v-else>
                <RouterLink
                  to="/login"
                  class="app-header__dropdown-item rounded-md"
                  @click="closeMenus"
                >
                  Connexion
                </RouterLink>
                <RouterLink
                  to="/register"
                  class="app-header__dropdown-item rounded-md text-accent font-medium"
                  @click="closeMenus"
                >
                  S'inscrire
                </RouterLink>
              </template>
            </nav>
          </div>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style src="@/components/layout/app-header.css"></style>
