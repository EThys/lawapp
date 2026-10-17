<script setup lang="ts">
import AppShimmerSettings from '@/components/loading/AppShimmerSettings.vue'

defineProps<{
  eyebrow?: string
  title: string
  description?: string
  initials?: string
  loading?: boolean
}>()
</script>

<template>
  <div class="settings-page">
    <header class="settings-hero">
      <div v-if="initials" class="settings-hero__avatar" aria-hidden="true">{{ initials }}</div>
      <div class="settings-hero__text">
        <p v-if="eyebrow" class="settings-hero__eyebrow">{{ eyebrow }}</p>
        <h1 class="settings-hero__title">{{ title }}</h1>
        <p v-if="description" class="settings-hero__desc">{{ description }}</p>
      </div>
    </header>

    <AppShimmerSettings v-if="loading" />
    <div v-else class="settings-stack">
      <slot />
    </div>
  </div>
</template>

<style src="./settings-shell.css"></style>
