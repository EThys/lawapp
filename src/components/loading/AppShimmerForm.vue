<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'

withDefaults(
  defineProps<{
    fields?: number
  }>(),
  { fields: 5 },
)
</script>

<template>
  <div class="space-y-5" aria-busy="true" aria-label="Chargement du formulaire">
    <div v-for="i in fields" :key="i" class="space-y-2">
      <AppSkeleton width="6rem" height="0.75rem" />
      <AppSkeleton height="2.75rem" />
    </div>
    <AppSkeleton width="8rem" height="2.75rem" class="mt-2" />
  </div>
</template>
