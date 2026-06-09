<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Component } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

defineProps<{
  icon: Component
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
}>()
</script>

<template>
  <div class="panel-elevated text-center py-16 px-6 animate-scale-in">
    <div class="w-14 h-14 mx-auto mb-5 flex items-center justify-center bg-accent-light border border-accent/20 text-accent animate-float">
      <component :is="icon" class="w-6 h-6" />
    </div>
    <h3 class="font-display text-lg text-ink">{{ title }}</h3>
    <p class="text-sm text-ink-muted mt-2 max-w-sm mx-auto leading-relaxed">{{ description }}</p>
    <div v-if="actionLabel && actionTo" class="mt-8">
      <RouterLink :to="actionTo">
        <AppButton class="hover-lift">{{ actionLabel }}</AppButton>
      </RouterLink>
    </div>
    <slot v-else name="action" />
  </div>
</template>
