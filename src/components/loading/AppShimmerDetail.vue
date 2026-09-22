<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
</script>

<template>
  <div class="space-y-8" aria-busy="true" aria-label="Chargement du détail">
    <AppSkeleton width="6rem" height="0.875rem" />
    <div class="space-y-3">
      <AppSkeleton width="20rem" height="2rem" />
      <AppSkeleton width="14rem" height="0.875rem" />
    </div>
    <div class="grid sm:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="border border-line p-4 space-y-2 bg-white">
        <AppSkeleton width="4rem" height="0.75rem" />
        <AppSkeleton width="3rem" height="1.25rem" />
      </div>
    </div>
    <div class="border border-line bg-white p-6 space-y-4">
      <AppSkeleton width="8rem" height="1rem" />
      <div v-for="i in 5" :key="i" class="flex gap-4 py-3 border-t border-line">
        <AppSkeleton width="30%" height="0.875rem" />
        <AppSkeleton width="15%" height="0.875rem" />
        <AppSkeleton width="10%" height="0.875rem" />
      </div>
    </div>
  </div>
</template>
