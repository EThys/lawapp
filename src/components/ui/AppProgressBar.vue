<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  max?: number
  label?: string
  urgency?: 'normal' | 'warning' | 'critical'
}>()

const pct = computed(() => {
  if (!props.max || props.max <= 0) return 100
  return Math.min(100, Math.max(0, (props.value / props.max) * 100))
})
</script>

<template>
  <div class="space-y-1.5">
    <div v-if="label" class="flex items-center justify-between text-xs">
      <span class="text-ink-faint">{{ label }}</span>
      <span
        class="font-mono font-semibold tabular-nums"
        :class="{
          'text-ink': urgency === 'normal' || !urgency,
          'text-warning': urgency === 'warning',
          'text-danger animate-pulse-soft': urgency === 'critical',
        }"
      >
        <slot />
      </span>
    </div>
    <div class="h-1 bg-line overflow-hidden">
      <div
        class="h-full transition-all duration-1000 ease-linear"
        :class="{
          'bg-accent': urgency === 'normal' || !urgency,
          'bg-warning': urgency === 'warning',
          'bg-danger': urgency === 'critical',
        }"
        :style="{ width: `${pct}%` }"
      />
    </div>
  </div>
</template>
