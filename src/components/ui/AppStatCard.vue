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
    class="app-stat-card bg-white p-4 sm:p-5 relative overflow-hidden group animate-fade-up border border-line rounded-[0.85rem]"
    :style="{ animationDelay: `${delay * 80}ms` }"
  >
    <div class="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    <div class="relative flex items-start justify-between gap-3">
      <div>
        <p class="label-caps mb-2">{{ label }}</p>
        <p class="text-2xl font-semibold text-brand-dark tabular-nums font-display">
          {{ display }}{{ suffix }}
        </p>
      </div>
      <div
        v-if="icon"
        class="w-10 h-10 flex items-center justify-center rounded-[0.65rem] bg-accent-light border border-accent/15 text-brand transition-transform duration-300 group-hover:scale-105"
      >
        <component :is="icon" class="w-4 h-4" />
      </div>
    </div>
  </div>
</template>
