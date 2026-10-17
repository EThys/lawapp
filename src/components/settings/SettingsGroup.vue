<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  flush?: boolean
}>()
</script>

<template>
  <section class="settings-group">
    <header v-if="title || description" class="settings-group__head">
      <h2 v-if="title" class="settings-group__title">{{ title }}</h2>
      <p v-if="description" class="settings-group__desc">{{ description }}</p>
    </header>
    <div
      class="settings-group__body"
      :class="{ 'settings-group__body--flush': flush }"
    >
      <slot />
    </div>
  </section>
</template>

<style src="./settings-shell.css"></style>
