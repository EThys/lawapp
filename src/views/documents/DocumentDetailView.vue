<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useDocumentStore } from '@/stores/documents'
import { isApiEnabled } from '@/config/features'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerDetail from '@/components/loading/AppShimmerDetail.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ArrowLeft, BookOpen, ExternalLink } from '@lucide/vue'

const route = useRoute()
const docStore = useDocumentStore()
const { showShimmer } = useServerShimmer(computed(() => docStore.loading && !docStore.current))

const docId = computed(() => Number(route.params.id))

const typeLabel = computed(() => {
  const id = docStore.current?.typeDocument
  if (id == null) return null
  return docStore.typeDocuments.find((t) => t.id === id)?.titre ?? `Type ${id}`
})

async function load() {
  if (!isApiEnabled() || !docId.value) return
  await Promise.all([docStore.fetchById(docId.value), docStore.fetchTypes()])
}

onMounted(() => {
  void load()
})

watch(docId, () => {
  void load()
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <header class="border-b border-line bg-white">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <RouterLink to="/documents" class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft class="w-4 h-4" />
          Bibliothèque
        </RouterLink>
        <span class="font-display text-lg text-ink">Document</span>
        <span class="w-16" aria-hidden="true" />
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <div v-if="!isApiEnabled()" class="p-4 border border-line bg-white text-sm text-ink-muted">
        Mode API requis.
      </div>

      <AppShimmerDetail v-else-if="showShimmer" />

      <div v-else-if="docStore.error" class="p-4 bg-danger-bg border border-danger/20 text-sm text-danger">
        {{ docStore.error }}
      </div>

      <div v-else-if="!docStore.current" class="p-6 border border-line bg-white text-center text-sm text-ink-muted">
        Document introuvable.
      </div>

      <article v-else class="border border-line bg-white overflow-hidden">
        <div
          v-if="docStore.current.backGroundImage"
          class="h-40 bg-cover bg-center border-b border-line"
          :style="{ backgroundImage: `url(${docStore.current.backGroundImage})` }"
        />
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-3">
            <BookOpen class="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
            <div class="min-w-0">
              <h1 class="font-display text-2xl text-ink tracking-tight">
                {{ docStore.current.title || `Document #${docStore.current.id}` }}
              </h1>
              <div class="mt-2 flex flex-wrap gap-2">
                <AppBadge v-if="typeLabel" variant="muted">{{ typeLabel }}</AppBadge>
                <AppBadge v-if="docStore.current.premium" variant="warning">Premium</AppBadge>
                <AppBadge v-if="docStore.current.active === false" variant="muted">Inactif</AppBadge>
              </div>
            </div>
          </div>

          <p v-if="docStore.current.description" class="text-sm text-ink-muted leading-relaxed">
            {{ docStore.current.description }}
          </p>

          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-ink-faint">Prix</dt>
              <dd class="text-ink font-medium">
                {{ docStore.current.price == null || docStore.current.price === 0 ? 'Gratuit' : docStore.current.price }}
              </dd>
            </div>
            <div v-if="docStore.current.datePublication">
              <dt class="text-ink-faint">Publication</dt>
              <dd class="text-ink font-medium">
                {{ new Date(docStore.current.datePublication).toLocaleDateString('fr-FR') }}
              </dd>
            </div>
          </dl>

          <a
            v-if="docStore.current.fileBook"
            :href="docStore.current.fileBook"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex"
          >
            <AppButton>
              <ExternalLink class="w-4 h-4" />
              Ouvrir le fichier
            </AppButton>
          </a>
        </div>
      </article>
    </main>
  </div>
</template>
