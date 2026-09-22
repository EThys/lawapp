<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useDocumentStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { isApiEnabled } from '@/config/features'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { BookOpen, ArrowLeft, LogIn, Plus } from '@lucide/vue'

const docStore = useDocumentStore()
const auth = useAuthStore()
const { showShimmer } = useServerShimmer(computed(() => docStore.loading))

function typeLabel(typeId?: number) {
  if (typeId == null) return null
  return docStore.typeDocuments.find((t) => t.id === typeId)?.titre ?? `Type ${typeId}`
}

onMounted(() => {
  if (auth.isAuthenticated && isApiEnabled()) {
    void docStore.fetchList()
    void docStore.fetchTypes()
  }
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <header class="border-b border-line bg-white">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <RouterLink to="/" class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft class="w-4 h-4" />
          Accueil
        </RouterLink>
        <span class="font-display text-lg text-ink">Bibliothèque</span>
        <RouterLink v-if="auth.isAuthenticated" to="/documents/create">
          <AppButton size="sm">
            <Plus class="w-4 h-4" />
            Publier
          </AppButton>
        </RouterLink>
        <span v-else class="w-16" aria-hidden="true" />
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <div v-if="!isApiEnabled()" class="p-6 border border-line bg-white text-sm text-ink-muted">
        Mode API désactivé. Activez <code class="text-accent">VITE_USE_API=true</code> pour charger les documents.
      </div>

      <div v-else-if="!auth.isAuthenticated" class="p-8 border border-line bg-white text-center space-y-4">
        <BookOpen class="w-10 h-10 mx-auto text-accent" />
        <p class="text-ink">Connectez-vous pour consulter et publier des documents.</p>
        <RouterLink to="/login">
          <AppButton>
            <LogIn class="w-4 h-4" />
            Se connecter
          </AppButton>
        </RouterLink>
      </div>

      <AppShimmerList v-else-if="showShimmer" variant="row" :count="5" />

      <div v-else-if="docStore.error" class="p-4 bg-danger-bg border border-danger/20 text-sm text-danger">
        {{ docStore.error }}
      </div>

      <div v-else-if="docStore.documents.length === 0" class="p-6 border border-line bg-white text-center space-y-4">
        <p class="text-sm text-ink-muted">Aucun document publié pour le moment.</p>
        <RouterLink to="/documents/create">
          <AppButton>
            <Plus class="w-4 h-4" />
            Publier un document
          </AppButton>
        </RouterLink>
      </div>

      <ul v-else class="space-y-3">
        <li v-for="doc in docStore.activeDocuments" :key="doc.id">
          <RouterLink
            :to="`/documents/${doc.id}`"
            class="block p-5 border border-line bg-white hover:border-accent hover:shadow-sm transition-all"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="font-medium text-ink truncate">{{ doc.title || `Document #${doc.id}` }}</h2>
                <p v-if="doc.description" class="mt-1 text-sm text-ink-muted line-clamp-2">
                  {{ doc.description }}
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <AppBadge v-if="typeLabel(doc.typeDocument)" variant="muted">
                    {{ typeLabel(doc.typeDocument) }}
                  </AppBadge>
                  <AppBadge v-if="doc.premium" variant="warning">Premium</AppBadge>
                  <span v-if="doc.price != null" class="text-xs text-ink-faint">
                    {{ doc.price === 0 ? 'Gratuit' : `${doc.price}` }}
                  </span>
                </div>
              </div>
              <BookOpen class="w-5 h-5 text-accent flex-shrink-0" />
            </div>
          </RouterLink>
        </li>
      </ul>
    </main>
  </div>
</template>
