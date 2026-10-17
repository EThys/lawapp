<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
</script>

<template>
  <div class="settings-stack" aria-busy="true" aria-label="Chargement">
    <div class="settings-group p-4 space-y-3">
      <AppSkeleton width="40%" height="0.75rem" />
      <AppSkeleton height="2.5rem" />
      <AppSkeleton height="2.5rem" />
    </div>
    <div class="settings-group p-4 space-y-3">
      <AppSkeleton width="35%" height="0.75rem" />
      <AppSkeleton height="2.75rem" />
      <AppSkeleton height="2.75rem" />
      <AppSkeleton height="2.75rem" />
      <AppSkeleton width="45%" height="2.75rem" class="mt-1" />
    </div>
  </div>
</template>

<style src="@/components/settings/settings-shell.css"></style>
