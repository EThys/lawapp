<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'

withDefaults(
  defineProps<{
    count?: number
    columns?: 2 | 3 | 4
  }>(),
  { count: 3, columns: 3 },
)
</script>

<template>
  <div
    class="grid grid-cols-1 gap-px bg-line border border-line shimmer-surface"
    :class="{
      'sm:grid-cols-2': columns === 2,
      'sm:grid-cols-3': columns === 3,
      'sm:grid-cols-2 lg:grid-cols-4': columns === 4,
    }"
    aria-busy="true"
    aria-label="Chargement des statistiques"
  >
    <div v-for="i in count" :key="i" class="bg-white p-6 space-y-3">
      <AppSkeleton width="2.5rem" height="2.5rem" rounded="sm" />
      <AppSkeleton width="3rem" height="1.75rem" />
      <AppSkeleton width="5rem" height="0.75rem" />
    </div>
  </div>
</template>
