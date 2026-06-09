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
    class="panel-elevated transition-all duration-300"
    :class="[
      padding === 'sm' && 'p-5',
      padding === 'lg' && 'p-8',
      (!padding || padding === 'md') && 'p-6',
      hover && 'hover-lift hover:border-accent/30 cursor-default',
    ]"
  >
    <div v-if="title || subtitle" class="mb-5 pb-4 border-b border-line">
      <h3 v-if="title" class="font-display text-lg text-ink">{{ title }}</h3>
      <p v-if="subtitle" class="text-xs text-ink-faint mt-1">{{ subtitle }}</p>
    </div>
    <slot />
  </div>
</template>
