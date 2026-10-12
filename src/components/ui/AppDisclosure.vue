<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    defaultOpen?: boolean
  }>(),
  { defaultOpen: false },
)

const open = ref(props.defaultOpen)
</script>

<template>
  <div class="app-disclosure border border-line bg-white">
    <button
      type="button"
      class="app-disclosure__trigger"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="min-w-0 text-left">
        <span class="block text-sm font-medium text-ink">{{ title }}</span>
        <span v-if="hint && !open" class="block text-xs text-ink-muted mt-0.5 truncate">{{ hint }}</span>
      </span>
      <ChevronDown class="w-5 h-5 shrink-0 text-ink-muted transition-transform" :class="{ 'rotate-180': open }" />
    </button>
    <div v-show="open" class="app-disclosure__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-disclosure__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.85rem 1rem;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.app-disclosure__trigger:hover {
  background: var(--color-paper-warm);
}

.app-disclosure__body {
  padding: 0 1rem 1rem;
  border-top: 1px solid var(--color-line);
}
</style>
