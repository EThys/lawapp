<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import { useAuthStore } from '@/stores/auth'
import { isApiEnabled } from '@/config/features'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { Brain, ArrowLeft, LogIn, Plus } from '@lucide/vue'

const quizStore = useQuizStore()
const auth = useAuthStore()
const { showShimmer: quizShimmer } = useServerShimmer(computed(() => quizStore.loading))
const isTeacher = computed(() => auth.isTeacher)

onMounted(() => {
  if (auth.isAuthenticated) void quizStore.fetchList()
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <header class="border-b border-line bg-white">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <RouterLink to="/discover" class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft class="w-4 h-4" />
          Droit Ludique
        </RouterLink>
        <span class="font-display text-lg text-ink">Quiz juridiques</span>
        <RouterLink v-if="isTeacher" to="/quiz/create">
          <AppButton size="sm">
            <Plus class="w-4 h-4" />
            Créer un quiz
          </AppButton>
        </RouterLink>
        <span v-else class="w-16" aria-hidden="true" />
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <div v-if="!isApiEnabled()" class="p-6 border border-line bg-white text-sm text-ink-muted">
        Mode API désactivé. Activez <code class="text-accent">VITE_USE_API=true</code> pour charger les quiz du serveur.
      </div>

      <div v-else-if="!auth.isAuthenticated" class="p-8 border border-line bg-white text-center space-y-4">
        <Brain class="w-10 h-10 mx-auto text-accent" />
        <p class="text-ink">Connectez-vous pour accéder aux quiz structurés par niveaux.</p>
        <RouterLink to="/login">
          <AppButton>
            <LogIn class="w-4 h-4" />
            Se connecter
          </AppButton>
        </RouterLink>
      </div>

      <AppShimmerList v-else-if="quizShimmer" variant="quiz" :count="5" />
      <div v-else-if="quizStore.error" class="p-4 bg-danger-bg border border-danger/20 text-sm text-danger">
        {{ quizStore.error }}
      </div>

      <div v-else-if="quizStore.quizzes.length === 0" class="p-6 border border-line bg-white text-center space-y-4">
        <p class="text-sm text-ink-muted">Aucun quiz disponible pour le moment.</p>
        <RouterLink v-if="isTeacher" to="/quiz/create">
          <AppButton>
            <Plus class="w-4 h-4" />
            Créer un quiz
          </AppButton>
        </RouterLink>
      </div>

      <ul v-else class="space-y-3">
        <li v-for="quiz in quizStore.quizzes" :key="quiz.id">
          <RouterLink
            :to="`/quiz/${quiz.id}`"
            class="block p-5 border border-line bg-white hover:border-accent hover:shadow-sm transition-all"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-semibold text-ink">{{ quiz.title }}</h2>
                <p v-if="quiz.description" class="text-sm text-ink-muted mt-1">{{ quiz.description }}</p>
              </div>
              <AppBadge variant="brand">QCM</AppBadge>
            </div>
          </RouterLink>
        </li>
      </ul>
    </main>
  </div>
</template>
