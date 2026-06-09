<script setup lang="ts">
import { useCountUp } from '@/composables/useCountUp'
import type { Component } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    label: string
    suffix?: string
    icon?: Component
    delay?: number
  }>(),
  { suffix: '', delay: 0 }
)

const display = useCountUp(() => props.value)
</script>

<template>
  <div
    class="bg-white p-4 sm:p-5 relative overflow-hidden group hover-lift animate-fade-up"
    :style="{ animationDelay: `${delay * 80}ms` }"
  >
    <div class="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    <div class="relative flex items-start justify-between gap-3">
      <div>
        <p class="label-caps mb-2">{{ label }}</p>
        <p class="text-2xl font-semibold text-ink tabular-nums">
          {{ display }}{{ suffix }}
        </p>
      </div>
      <div
        v-if="icon"
        class="w-9 h-9 flex items-center justify-center bg-accent-light border border-accent/15 text-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
      >
        <component :is="icon" class="w-4 h-4" />
      </div>
    </div>
  </div>
</template>
