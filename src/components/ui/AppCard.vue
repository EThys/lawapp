<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}>()
</script>

<template>
  <div
    class="panel-elevated min-w-0 overflow-x-clip transition-all duration-300"
    :class="[
      padding === 'sm' && 'p-4 sm:p-5',
      padding === 'lg' && 'p-6 sm:p-8',
      (!padding || padding === 'md') && 'p-5 sm:p-6',
      hover && 'hover-lift hover:border-accent/30 cursor-default',
    ]"
  >
    <div
      v-if="title || subtitle"
      class="border-b border-line"
      :class="padding === 'sm' ? 'mb-3 pb-3' : 'mb-4 sm:mb-5 pb-4'"
    >
      <h3 v-if="title" class="font-display text-ink" :class="padding === 'sm' ? 'text-base' : 'text-lg'">
        {{ title }}
      </h3>
      <p v-if="subtitle" class="text-xs text-ink-faint mt-1">{{ subtitle }}</p>
    </div>
    <slot />
  </div>
</template>
