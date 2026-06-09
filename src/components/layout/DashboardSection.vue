<script setup lang="ts">
withDefaults(
  defineProps<{
    spacing?: 'default' | 'loose' | 'none'
  }>(),
  { spacing: 'default' }
)
</script>

<template>
  <section
    class="dashboard-section"
    :class="{
      'dashboard-section--loose': spacing === 'loose',
      'dashboard-section--none': spacing === 'none',
    }"
  >
    <slot />
  </section>
</template>
