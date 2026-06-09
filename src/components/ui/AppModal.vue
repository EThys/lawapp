<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{
  title: string
  size?: 'sm' | 'md' | 'lg'
}>()

defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-surface-950/50 backdrop-blur-sm" @click="$emit('close')" />
      <div
        class="relative bg-white rounded-2xl card-shadow-lg w-full animate-in fade-in zoom-in duration-200"
        :class="{
          'max-w-sm': size === 'sm',
          'max-w-lg': !size || size === 'md',
          'max-w-2xl': size === 'lg',
        }"
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 class="text-lg font-semibold text-surface-900">{{ title }}</h2>
          <button
            class="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
            @click="$emit('close')"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="px-6 py-5">
          <slot />
        </div>
        <div v-if="$slots.footer" class="px-6 py-4 border-t border-surface-100 bg-surface-50/50 rounded-b-2xl">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes zoom-in {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
}
.animate-in { animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out; }
</style>
