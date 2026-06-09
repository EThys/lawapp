<script setup lang="ts">

import { RouterLink, useRouter } from 'vue-router'

import { Scale, Menu, X, LogOut, ChevronDown } from '@lucide/vue'

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

import { useAuthStore } from '@/stores/auth'

import { getInitials } from '@/utils/auth'

import { ROLE_LABELS } from '@/types/auth'

import AppButton from '@/components/ui/AppButton.vue'



const router = useRouter()

const auth = useAuthStore()

const mobileOpen = ref(false)

const userMenuOpen = ref(false)

const menuRef = ref<HTMLElement | null>(null)



const initials = computed(() => {

  if (!auth.currentUser) return ''

  return getInitials(auth.currentUser.firstName, auth.currentUser.lastName)

})



const dashboardLink = computed(() => (auth.isTeacher ? '/teacher' : '/student'))



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



watch(mobileOpen, (open) => {

  document.body.style.overflow = open ? 'hidden' : ''

})



onMounted(() => document.addEventListener('click', onClickOutside))

onUnmounted(() => {

  document.removeEventListener('click', onClickOutside)

  document.body.style.overflow = ''

})

</script>



<template>

  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-line animate-fade-in pt-safe">

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="flex items-center justify-between h-14">

        <RouterLink to="/" class="flex items-center gap-2.5 group min-h-11" @click="closeMenus">

          <div class="w-8 h-8 bg-accent flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">

            <Scale class="w-4 h-4 text-white" />

          </div>

          <span class="text-base font-semibold text-ink tracking-tight">LawApp</span>

        </RouterLink>



        <nav class="hidden md:flex items-center gap-6">

          <RouterLink

            to="/discover"

            class="text-sm text-ink-muted hover:text-ink transition-colors"

          >

            Droit Ludique

          </RouterLink>

          <RouterLink

            v-if="auth.isAuthenticated"

            :to="dashboardLink"

            class="text-sm text-ink-muted hover:text-ink transition-colors"

          >

            Mon espace

          </RouterLink>

          <RouterLink

            v-if="auth.isStudent"

            to="/student/history"

            class="text-sm text-ink-muted hover:text-ink transition-colors"

          >

            Mon historique

          </RouterLink>

          <RouterLink

            v-if="auth.isTeacher"

            to="/teacher/history"

            class="text-sm text-ink-muted hover:text-ink transition-colors"

          >

            Suivi & historique

          </RouterLink>

          <RouterLink

            v-if="auth.isTeacher"

            to="/teacher/create"

            class="text-sm text-ink-muted hover:text-ink transition-colors"

          >

            Nouvelle évaluation

          </RouterLink>



          <template v-if="auth.isAuthenticated">

            <div ref="menuRef" class="relative">

              <button

                class="flex items-center gap-2.5 pl-1 pr-2 py-1 min-h-11 border border-line hover:border-line-strong transition-colors"

                @click.stop="userMenuOpen = !userMenuOpen"

              >

                <span class="w-7 h-7 bg-green-dark text-white text-xs font-semibold flex items-center justify-center">

                  {{ initials }}

                </span>

                <span class="text-sm text-ink max-w-[120px] truncate hidden lg:block">

                  {{ auth.currentUser?.firstName }}

                </span>

                <ChevronDown class="w-3.5 h-3.5 text-ink-faint" />

              </button>



              <div

                v-if="userMenuOpen"

                class="absolute right-0 top-full mt-1 w-56 panel-elevated py-1 z-50"

              >

                <div class="px-4 py-3 border-b border-line">

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

                  class="block px-4 py-3 min-h-11 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink"

                  @click="userMenuOpen = false"

                >

                  Tableau de bord

                </RouterLink>

                <button

                  class="w-full flex items-center gap-2 px-4 py-3 min-h-11 text-sm text-danger hover:bg-danger-bg text-left"

                  @click="logout"

                >

                  <LogOut class="w-4 h-4" />

                  Déconnexion

                </button>

              </div>

            </div>

          </template>



          <template v-else>

            <RouterLink to="/login" class="text-sm text-ink-muted hover:text-ink transition-colors">

              Connexion

            </RouterLink>

            <RouterLink to="/register">

              <AppButton size="sm">S'inscrire</AppButton>

            </RouterLink>

          </template>

        </nav>



        <button

          class="md:hidden flex items-center justify-center min-h-11 min-w-11 -mr-2 text-ink-muted hover:text-ink"

          :aria-expanded="mobileOpen"

          aria-label="Menu"

          @click="mobileOpen = !mobileOpen"

        >

          <Menu v-if="!mobileOpen" class="w-5 h-5" />

          <X v-else class="w-5 h-5" />

        </button>

      </div>

    </div>



    <Teleport to="body">

      <div

        v-if="mobileOpen"

        class="md:hidden fixed inset-0 z-50"

        @click="closeMenus"

      >

        <div class="absolute inset-0 bg-ink/30" />

        <div

          class="absolute top-0 right-0 bottom-0 w-full max-w-xs bg-white border-l border-line shadow-xl flex flex-col pt-safe"

          @click.stop

        >

          <div class="flex items-center justify-between px-4 h-14 border-b border-line">

            <span class="text-sm font-semibold text-ink">Menu</span>

            <button

              class="flex items-center justify-center min-h-11 min-w-11 text-ink-muted"

              aria-label="Fermer"

              @click="closeMenus"

            >

              <X class="w-5 h-5" />

            </button>

          </div>



          <nav class="flex-1 overflow-y-auto px-4 py-3 space-y-1">

            <RouterLink

              to="/discover"

              class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

              @click="closeMenus"

            >

              Droit Ludique

            </RouterLink>



            <template v-if="auth.isAuthenticated">

              <div v-if="auth.isStudent" class="pt-2 pb-1 px-3">

                <p class="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Étudiant</p>

              </div>

              <RouterLink

                v-if="auth.isStudent"

                to="/student"

                class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                Mon espace

              </RouterLink>

              <RouterLink

                v-if="auth.isStudent"

                to="/student/history"

                class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                Mon historique

              </RouterLink>

              <RouterLink

                v-if="auth.isStudent"

                to="/join/group"

                class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                Rejoindre une évaluation

              </RouterLink>



              <RouterLink

                :to="dashboardLink"

                class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                {{ auth.isTeacher ? 'Espace enseignant' : 'Tableau de bord' }}

              </RouterLink>



              <RouterLink

                v-if="auth.isTeacher"

                to="/teacher/history"

                class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                Suivi & historique

              </RouterLink>



              <RouterLink

                v-if="auth.isTeacher"

                to="/teacher/create"

                class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                Nouvelle évaluation

              </RouterLink>



              <div class="px-3 py-3 mt-2 border-t border-line">

                <p class="text-sm font-medium text-ink truncate">

                  {{ auth.currentUser?.firstName }} {{ auth.currentUser?.lastName }}

                </p>

                <p class="text-xs text-ink-faint truncate mt-0.5">{{ auth.currentUser?.email }}</p>

              </div>



              <button

                class="w-full flex items-center min-h-11 px-3 text-sm text-danger rounded-sm hover:bg-danger-bg text-left"

                @click="logout(); closeMenus()"

              >

                Déconnexion

              </button>

            </template>



            <template v-else>

              <RouterLink

                to="/login"

                class="flex items-center min-h-11 px-3 text-sm text-ink rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                Connexion

              </RouterLink>

              <RouterLink

                to="/register"

                class="flex items-center min-h-11 px-3 text-sm text-accent font-medium rounded-sm hover:bg-paper-warm"

                @click="closeMenus"

              >

                S'inscrire

              </RouterLink>

            </template>

          </nav>

        </div>

      </div>

    </Teleport>

  </header>

</template>

