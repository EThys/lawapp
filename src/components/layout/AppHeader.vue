<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
  House,
  Scale,
  LayoutDashboard,
  History,
  Plus,
  Shield,
  UserRound,
} from '@lucide/vue'
import gsap from 'gsap'
import AppLogo from '@/components/brand/AppLogo.vue'
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getInitials } from '@/utils/auth'
import { ROLE_LABELS } from '@/types/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const menuOpen = ref(false)
const userMenuOpen = ref(false)
const scrolled = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)

let motionCtx: gsap.Context | null = null

const initials = computed(() => {
  if (!auth.currentUser) return ''
  return getInitials(auth.currentUser.firstName, auth.currentUser.lastName)
})

const dashboardLink = computed(() => auth.homePath())

const galaxyLinks = [
  { to: '/', label: 'LawApp50', match: (p: string) => p === '/' },
  { to: '/discover', label: 'Droit Ludique', match: (p: string) => p.startsWith('/discover') },
]

const quickLinks = computed(() => {
  const items: { to: string; label: string; match: (p: string) => boolean }[] = [
    { to: '/', label: 'Accueil', match: (p) => p === '/' },
    { to: '/discover', label: 'Droit Ludique', match: (p) => p.startsWith('/discover') },
  ]

  if (auth.isCertified) {
    items.push({ to: '/admin', label: 'Admin', match: (p) => p.startsWith('/admin') })
  }
  if (auth.isAuthenticated) {
    items.push({
      to: dashboardLink.value,
      label: 'Mon espace',
      match: (p) => p.startsWith('/teacher') || p.startsWith('/student'),
    })
  }
  if (auth.isStudent) {
    items.push({
      to: '/student/history',
      label: 'Mon historique',
      match: (p) => p.startsWith('/student/history'),
    })
  }
  if (auth.isTeacher) {
    items.push({
      to: '/teacher/history',
      label: 'Suivi & historique',
      match: (p) => p.startsWith('/teacher/history'),
    })
    items.push({
      to: '/teacher/create',
      label: 'Nouvelle évaluation',
      match: (p) => p.startsWith('/teacher/create'),
    })
  }

  return items
})

const menuGroups = computed(() => {
  const platform = [
    { to: '/', label: 'Accueil', icon: House },
    { to: '/discover', label: 'Droit Ludique', icon: Scale },
  ]

  const account: { to: string; label: string; icon: typeof House; danger?: boolean }[] = []

  if (auth.isCertified) {
    account.push({ to: '/admin', label: 'Admin', icon: Shield })
  }
  if (auth.isAuthenticated) {
    account.push({
      to: dashboardLink.value,
      label: auth.isTeacher ? 'Espace enseignant' : auth.isStudent ? 'Mon espace étudiant' : 'Tableau de bord',
      icon: LayoutDashboard,
    })
    if (auth.isStudent) {
      account.push({ to: '/student/history', label: 'Mon historique', icon: History })
      account.push({ to: '/join/group', label: 'Rejoindre une évaluation', icon: Plus })
    }
    if (auth.isTeacher) {
      account.push({ to: '/teacher/history', label: 'Suivi & historique', icon: History })
      account.push({ to: '/teacher/create', label: 'Nouvelle évaluation', icon: Plus })
    }
    account.push({ to: '/account', label: 'Mon compte', icon: UserRound })
  } else {
    account.push({ to: '/login', label: 'Connexion', icon: LogIn })
    account.push({ to: '/register', label: "S'inscrire", icon: UserPlus })
  }

  return [
    { title: 'Plateforme', items: platform },
    { title: 'Compte', items: account },
  ]
})

function isNavActive(match: (p: string) => boolean) {
  return match(route.path)
}

function closeMenus() {
  menuOpen.value = false
  userMenuOpen.value = false
  document.body.style.overflow = ''
}

async function go(to: string) {
  closeMenus()
  if (route.fullPath === to || route.path === to) return
  await router.push(to)
}

function logout() {
  auth.logout()
  closeMenus()
  void router.push('/login')
}

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

function onScroll() {
  scrolled.value = window.scrollY > 8
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenus()
}

watch(menuOpen, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    userMenuOpen.value = false
    await nextTick()
    closeBtnRef.value?.focus()
  }
})

watch(
  () => route.fullPath,
  () => closeMenus(),
)

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce && headerRef.value) {
    motionCtx = gsap.context(() => {
      gsap.from('.app-header__galaxy', {
        yPercent: -100,
        duration: 0.45,
        ease: 'power3.out',
        clearProps: 'transform',
      })
      gsap.from('.app-header__main', {
        y: -14,
        opacity: 0,
        duration: 0.5,
        delay: 0.1,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      })
      gsap.from('.app-header__quick-link', {
        y: 8,
        opacity: 0,
        duration: 0.35,
        stagger: 0.045,
        delay: 0.22,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      })
    }, headerRef.value)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll)
  document.body.style.overflow = ''
  motionCtx?.revert()
})
</script>

<template>
  <header ref="headerRef" class="app-header" :class="{ 'app-header--scrolled': scrolled }">
    <div class="app-header__galaxy">
      <nav class="app-header__galaxy-nav" aria-label="Raccourcis LawApp50">
        <RouterLink
          v-for="item in galaxyLinks"
          :key="item.to"
          :to="item.to"
          class="app-header__galaxy-link"
          :class="{ 'app-header__galaxy-link--active': isNavActive(item.match) }"
          @click="closeMenus"
        >
          <img
            v-if="item.to === '/'"
            src="/logo.png"
            alt=""
            class="app-header__galaxy-mark"
            width="18"
            height="18"
          />
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>

    <div class="app-header__main">
      <div class="app-header__start">
        <button
          type="button"
          class="app-header__burger"
          :aria-expanded="menuOpen"
          aria-controls="app-header-menu"
          aria-label="Menu"
          @click="menuOpen = !menuOpen"
        >
          <Menu class="app-header__icon" />
        </button>

        <RouterLink to="/" class="app-header__brand" aria-label="LawApp50, accueil" @click="closeMenus">
          <AppLogo size="sm" caption="Évaluation & Formation" />
        </RouterLink>

        <nav class="app-header__quick" aria-label="Navigation principale">
          <RouterLink
            v-for="item in quickLinks"
            :key="item.to + item.label"
            :to="item.to"
            class="app-header__quick-link"
            :class="{ 'app-header__quick-link--active': isNavActive(item.match) }"
            @click="closeMenus"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>

      <div class="app-header__end">
        <template v-if="auth.isAuthenticated">
          <div ref="menuRef" class="app-header__user">
            <button
              type="button"
              class="app-header__user-btn"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
              @click.stop="userMenuOpen = !userMenuOpen"
            >
              <span class="app-header__avatar">{{ initials }}</span>
              <span class="app-header__user-name">{{ auth.currentUser?.firstName }}</span>
              <ChevronDown class="app-header__icon app-header__icon--sm" />
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
              <button
                type="button"
                class="app-header__dropdown-item"
                role="menuitem"
                @click="go(dashboardLink)"
              >
                <LayoutDashboard class="app-header__icon app-header__icon--sm" />
                Tableau de bord
              </button>
              <button
                type="button"
                class="app-header__dropdown-item"
                role="menuitem"
                @click="go('/account')"
              >
                <UserRound class="app-header__icon app-header__icon--sm" />
                Mon compte
              </button>
              <button
                type="button"
                class="app-header__dropdown-item app-header__dropdown-item--danger"
                role="menuitem"
                @click="logout"
              >
                <LogOut class="app-header__icon app-header__icon--sm" />
                Déconnexion
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <button type="button" class="app-header__tool" @click="go('/login')">
            <LogIn class="app-header__icon app-header__icon--sm" />
            <span>Connexion</span>
          </button>
          <button type="button" class="app-header__tool app-header__tool--solid" @click="go('/register')">
            <UserPlus class="app-header__icon app-header__icon--sm" />
            <span>S'inscrire</span>
          </button>
        </template>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="app-header-overlay">
      <div
        v-if="menuOpen"
        key="overlay"
        class="app-header__overlay"
        @click="closeMenus"
      />
    </Transition>
    <Transition name="app-header-panel">
      <div
        v-if="menuOpen"
        id="app-header-menu"
        key="panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        class="app-header__panel"
      >
        <div class="app-header__panel-head">
          <AppLogo size="sm" caption="Évaluation & Formation" />
          <button
            ref="closeBtnRef"
            type="button"
            class="app-header__burger"
            aria-label="Fermer"
            @click="closeMenus"
          >
            <X class="app-header__icon" />
          </button>
        </div>

        <nav class="app-header__panel-nav">
          <section v-for="group in menuGroups" :key="group.title" class="app-header__panel-group">
            <p class="app-header__panel-label">{{ group.title }}</p>
            <button
              v-for="item in group.items"
              :key="item.to + item.label"
              type="button"
              class="app-header__panel-link"
              @click="go(item.to)"
            >
              <component :is="item.icon" class="app-header__icon app-header__icon--sm" />
              {{ item.label }}
            </button>
            <button
              v-if="group.title === 'Compte' && auth.isAuthenticated"
              type="button"
              class="app-header__panel-link app-header__panel-link--danger"
              @click="logout"
            >
              <LogOut class="app-header__icon app-header__icon--sm" />
              Déconnexion
            </button>
          </section>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<style src="@/components/layout/app-header.css"></style>
