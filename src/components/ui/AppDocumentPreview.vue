<script setup lang="ts">
import { computed } from 'vue'
import { resolveFileContent, downloadResolvedFile } from '@/utils/helpers'
import AppButton from '@/components/ui/AppButton.vue'
import { Download, FileText } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    content?: string | null
    title?: string
    filename?: string
    compact?: boolean
  }>(),
  {
    title: 'Document PDF',
    filename: 'document.pdf',
    compact: false,
  },
)

const file = computed(() => resolveFileContent(props.content, props.filename))

function download() {
  if (!file.value) return
  downloadResolvedFile(file.value)
}
</script>

<template>
  <div v-if="file" class="border border-line bg-white overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-paper">
      <span class="flex items-center gap-2 text-sm font-medium text-ink min-w-0">
        <FileText class="w-4 h-4 flex-shrink-0 text-accent" />
        <span class="truncate">{{ title }}</span>
      </span>
      <AppButton variant="outline" size="sm" @click="download">
        <Download class="w-4 h-4" />
        Télécharger
      </AppButton>
    </div>

    <iframe
      v-if="file.isPdf"
      :src="file.src"
      class="w-full border-0 bg-white block"
      :class="compact ? 'h-[320px]' : 'h-[min(70vh,640px)] min-h-[420px]'"
      :title="title"
    />

    <img
      v-else-if="file.isImage"
      :src="file.src"
      :alt="title"
      class="max-w-full mx-auto block"
    />

    <div v-else class="p-4 text-sm text-ink-muted">
      Aperçu indisponible pour ce format.
    </div>
  </div>
</template>
