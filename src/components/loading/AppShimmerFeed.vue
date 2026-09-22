<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'

withDefaults(
  defineProps<{
    slides?: number
  }>(),
  { slides: 3 },
)
</script>

<template>
  <div class="discover-feed" aria-busy="true" aria-label="Chargement du fil">
    <div
      v-for="i in slides"
      :key="i"
      class="discover-slide bg-paper-warm"
    >
      <div class="discover-slide-inner space-y-4 px-6 py-10">
        <div class="flex gap-2">
          <AppSkeleton width="5rem" height="1.25rem" rounded="full" />
          <AppSkeleton width="4rem" height="1.25rem" rounded="full" />
        </div>
        <AppSkeleton width="90%" height="1rem" />
        <AppSkeleton width="75%" height="2rem" />
        <AppSkeleton width="100%" height="0.875rem" />
        <AppSkeleton width="95%" height="0.875rem" />
        <AppSkeleton width="80%" height="0.875rem" />
        <div class="flex gap-3 pt-4">
          <AppSkeleton width="4rem" height="2rem" rounded="full" />
          <AppSkeleton width="6rem" height="2rem" rounded="full" />
        </div>
      </div>
    </div>
  </div>
</template>
