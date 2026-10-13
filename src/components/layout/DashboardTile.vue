<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    to?: string
    caption: string
    value: string | number
    hint?: string
    icon: Component
    tone?: 'default' | 'warning' | 'danger' | 'muted'
  }>(),
  { tone: 'default' },
)
</script>

<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="dashboard-tile"
    :class="`dashboard-tile--${tone}`"
  >
    <span class="dashboard-tile__icon" aria-hidden="true">
      <component :is="icon" class="w-[1.125rem] h-[1.125rem]" />
    </span>
    <p class="dashboard-tile__caption">{{ caption }}</p>
    <p class="dashboard-tile__value">{{ value }}</p>
    <p v-if="hint" class="dashboard-tile__hint">{{ hint }}</p>
  </RouterLink>
  <div v-else class="dashboard-tile" :class="`dashboard-tile--${tone}`">
    <span class="dashboard-tile__icon" aria-hidden="true">
      <component :is="icon" class="w-[1.125rem] h-[1.125rem]" />
    </span>
    <p class="dashboard-tile__caption">{{ caption }}</p>
    <p class="dashboard-tile__value">{{ value }}</p>
    <p v-if="hint" class="dashboard-tile__hint">{{ hint }}</p>
  </div>
</template>
