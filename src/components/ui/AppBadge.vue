<script setup lang="ts">
type Variant = 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'muted'

defineProps<{
  variant?: Variant
}>()
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
    :class="{
      'bg-paper-warm text-ink-muted': variant === 'default' || !variant,
      'bg-accent-light text-accent': variant === 'brand',
      'bg-success-bg text-success': variant === 'success',
      'bg-warning-bg text-warning': variant === 'warning',
      'bg-danger-bg text-danger': variant === 'danger',
      'bg-paper-dark text-ink-faint': variant === 'muted',
    }"
  >
    <slot />
  </span>
</template>
