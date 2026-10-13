<script setup lang="ts">
withDefaults(
  defineProps<{
    spacing?: 'default' | 'loose' | 'none'
    variant?: 'default' | 'intro'
    eyebrow?: string
    title?: string
    subtitle?: string
  }>(),
  { spacing: 'default', variant: 'default' },
)
</script>

<template>
  <section
    class="dashboard-section"
    :class="{
      'dashboard-section--loose': spacing === 'loose',
      'dashboard-section--none': spacing === 'none',
      'dashboard-section--intro': variant === 'intro',
    }"
  >
    <header
      v-if="eyebrow || title || subtitle"
      class="dashboard-section__head"
    >
      <p v-if="eyebrow" class="dashboard-section__eyebrow label-caps">{{ eyebrow }}</p>
      <h2 v-if="title" class="dashboard-section__title">{{ title }}</h2>
      <p v-if="subtitle" class="dashboard-section__subtitle">{{ subtitle }}</p>
    </header>
    <slot />
  </section>
</template>
