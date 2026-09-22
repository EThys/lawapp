<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'

withDefaults(
  defineProps<{
    count?: number
    variant?: 'eval' | 'quiz' | 'teacher' | 'row'
  }>(),
  { count: 4, variant: 'row' },
)
</script>

<template>
  <div class="space-y-3 shimmer-surface" aria-busy="true" aria-label="Chargement des données">
    <div
      v-for="i in count"
      :key="i"
      class="border border-line bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <!-- Évaluation -->
      <template v-if="variant === 'eval'">
        <div class="flex-1 space-y-2 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <AppSkeleton :width="`${55 + (i % 3) * 8}%`" height="1rem" />
            <AppSkeleton width="4.5rem" height="1.25rem" rounded="full" />
          </div>
          <AppSkeleton width="70%" height="0.75rem" />
        </div>
        <AppSkeleton width="6.5rem" height="2.25rem" class="flex-shrink-0" />
      </template>

      <!-- Quiz -->
      <template v-else-if="variant === 'quiz'">
        <div class="flex-1 space-y-2 min-w-0">
          <AppSkeleton :width="`${50 + (i % 4) * 10}%`" height="1.125rem" />
          <AppSkeleton width="85%" height="0.875rem" />
        </div>
        <AppSkeleton width="3rem" height="1.5rem" rounded="full" class="flex-shrink-0" />
      </template>

      <!-- Enseignant (validation admin) -->
      <template v-else-if="variant === 'teacher'">
        <div class="flex-1 space-y-2 min-w-0">
          <AppSkeleton width="40%" height="1rem" />
          <AppSkeleton width="60%" height="0.75rem" />
        </div>
        <AppSkeleton width="5rem" height="1.5rem" rounded="full" />
      </template>

      <!-- Ligne générique -->
      <template v-else>
        <div class="flex-1 space-y-2 min-w-0">
          <AppSkeleton :width="`${60 + (i % 3) * 5}%`" height="1rem" />
          <AppSkeleton width="45%" height="0.75rem" />
        </div>
        <AppSkeleton width="5rem" height="2rem" class="flex-shrink-0" />
      </template>
    </div>
  </div>
</template>
