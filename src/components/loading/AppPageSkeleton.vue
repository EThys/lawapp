<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'

withDefaults(
  defineProps<{
    variant?: 'dashboard' | 'list' | 'detail' | 'form' | 'exam' | 'auth' | 'home'
  }>(),
  { variant: 'list' }
)
</script>

<template>
  <div class="page-skeleton" aria-busy="true" aria-label="Chargement de la page">
    <!-- Dashboard -->
    <div v-if="variant === 'dashboard'" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      <div class="space-y-3">
        <AppSkeleton width="8rem" height="0.75rem" />
        <AppSkeleton width="16rem" height="2rem" />
        <AppSkeleton width="12rem" height="0.875rem" />
      </div>
      <div class="grid sm:grid-cols-3 gap-px bg-line border border-line">
        <div v-for="i in 3" :key="i" class="bg-white p-6 space-y-3">
          <AppSkeleton width="2.5rem" height="2.5rem" rounded="sm" />
          <AppSkeleton width="3rem" height="1.75rem" />
          <AppSkeleton width="5rem" height="0.75rem" />
        </div>
      </div>
      <div class="border border-line bg-line space-y-px">
        <div v-for="i in 4" :key="i" class="bg-white p-5 sm:p-6 flex gap-4">
          <div class="flex-1 space-y-2">
            <AppSkeleton width="70%" height="1rem" />
            <AppSkeleton width="45%" height="0.75rem" />
          </div>
          <AppSkeleton width="5rem" height="2.25rem" />
        </div>
      </div>
    </div>

    <!-- List / history -->
    <div v-else-if="variant === 'list'" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      <AppSkeleton width="10rem" height="0.875rem" />
      <AppSkeleton width="14rem" height="2rem" />
      <div class="flex gap-2 overflow-hidden">
        <AppSkeleton v-for="i in 4" :key="i" width="7rem" height="2.75rem" class="flex-shrink-0" />
      </div>
      <div class="border border-line divide-y divide-line">
        <div v-for="i in 6" :key="i" class="bg-white p-4 sm:p-5 flex justify-between gap-4">
          <div class="flex-1 space-y-2">
            <AppSkeleton width="55%" height="1rem" />
            <AppSkeleton width="35%" height="0.75rem" />
          </div>
          <AppSkeleton width="4rem" height="1.5rem" rounded="full" />
        </div>
      </div>
    </div>

    <!-- Detail -->
    <div v-else-if="variant === 'detail'" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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

    <!-- Form -->
    <div v-else-if="variant === 'form'" class="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <AppSkeleton width="12rem" height="1.75rem" />
      <div class="border border-line bg-white p-6 sm:p-8 space-y-5">
        <div v-for="i in 5" :key="i" class="space-y-2">
          <AppSkeleton width="6rem" height="0.75rem" />
          <AppSkeleton height="2.75rem" />
        </div>
        <AppSkeleton width="8rem" height="2.75rem" class="mt-4" />
      </div>
    </div>

    <!-- Exam -->
    <div v-else-if="variant === 'exam'" class="min-h-dvh flex flex-col bg-paper">
      <div class="border-b border-line bg-white p-4 space-y-3">
        <AppSkeleton width="60%" height="1rem" />
        <AppSkeleton width="40%" height="0.75rem" />
        <AppSkeleton height="0.25rem" />
      </div>
      <div class="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-5">
        <div class="flex gap-2">
          <AppSkeleton width="5rem" height="1.5rem" rounded="full" />
          <AppSkeleton width="4rem" height="1.5rem" rounded="full" />
        </div>
        <div class="border border-line bg-white p-6 sm:p-8 space-y-3">
          <AppSkeleton height="1rem" />
          <AppSkeleton height="1rem" width="85%" />
          <AppSkeleton height="1rem" width="70%" />
        </div>
        <div v-for="i in 3" :key="i" class="border border-line p-4 flex gap-3 bg-white">
          <AppSkeleton width="1rem" height="1rem" rounded="full" class="flex-shrink-0" />
          <AppSkeleton height="1rem" class="flex-1" />
        </div>
      </div>
      <div class="border-t border-line bg-white p-4 flex justify-between">
        <AppSkeleton width="6rem" height="2.75rem" />
        <AppSkeleton width="6rem" height="2.75rem" />
      </div>
    </div>

    <!-- Auth -->
    <div v-else-if="variant === 'auth'" class="min-h-dvh flex items-center justify-center p-4">
      <div class="w-full max-w-md border border-line bg-white p-8 space-y-6">
        <div class="space-y-2 text-center">
          <AppSkeleton width="3rem" height="3rem" class="mx-auto" rounded="sm" />
          <AppSkeleton width="10rem" height="1.5rem" class="mx-auto" />
        </div>
        <div class="space-y-4">
          <div v-for="i in 3" :key="i" class="space-y-2">
            <AppSkeleton width="5rem" height="0.75rem" />
            <AppSkeleton height="2.75rem" />
          </div>
        </div>
        <AppSkeleton height="2.75rem" />
      </div>
    </div>

    <!-- Home hero -->
    <div v-else class="space-y-0">
      <div class="min-h-[70vh] flex flex-col justify-center px-6 sm:px-10 py-16 space-y-6 max-w-3xl">
        <AppSkeleton width="10rem" height="0.75rem" />
        <AppSkeleton width="90%" height="3rem" />
        <AppSkeleton width="75%" height="3rem" />
        <AppSkeleton width="100%" height="1rem" class="max-w-xl" />
        <AppSkeleton width="100%" height="1rem" class="max-w-lg" />
        <div class="flex gap-3 pt-4">
          <AppSkeleton width="10rem" height="3rem" />
          <AppSkeleton width="10rem" height="3rem" />
        </div>
      </div>
      <div class="border-t border-line py-8 px-6">
        <div class="flex flex-wrap justify-center gap-8">
          <AppSkeleton v-for="i in 6" :key="i" width="8rem" height="0.875rem" />
        </div>
      </div>
    </div>
  </div>
</template>
