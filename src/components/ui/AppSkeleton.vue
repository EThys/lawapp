<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    rounded?: 'none' | 'sm' | 'md' | 'full'
    class?: string
  }>(),
  {
    width: '100%',
    height: '1rem',
    rounded: 'sm',
  }
)
</script>

<template>
  <div
    class="skeleton-block"
    :class="[
      rounded === 'none' && 'rounded-none',
      rounded === 'sm' && 'rounded-sm',
      rounded === 'md' && 'rounded-md',
      rounded === 'full' && 'rounded-full',
      $props.class,
    ]"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>
